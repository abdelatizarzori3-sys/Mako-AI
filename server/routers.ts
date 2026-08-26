import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { systemRouter } from "./_core/systemRouter";
import { storageGetSignedUrl, storagePut } from "./storage";
import { publicProcedure, router } from "./_core/trpc";

const chatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(3_000),
});

const codeAnalysisInput = z.object({
  code: z.string().trim().min(1).max(40_000),
  fileName: z.string().trim().min(1).max(240),
  language: z.string().trim().min(1).max(40),
});

const codeAnalysisSchema = {
  type: "json_schema" as const,
  json_schema: {
    name: "scriptguard_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        safety: { type: "integer", minimum: 0, maximum: 100 },
        efficiency: { type: "integer", minimum: 0, maximum: 100 },
        quality: { type: "integer", minimum: 0, maximum: 100 },
        issues: { type: "array", maxItems: 6, items: { type: "object", properties: { type: { type: "string", enum: ["info", "warning"] }, severity: { type: "string", enum: ["critical", "high", "medium", "low"] }, title: { type: "string" }, description: { type: "string" }, line: { type: "integer", minimum: 1 }, code: { type: "string" } }, required: ["type", "severity", "title", "description", "line", "code"], additionalProperties: false } },
        fixCode: { type: "string" },
      },
      required: ["safety", "efficiency", "quality", "issues", "fixCode"],
      additionalProperties: false,
    },
  },
};

function analysisStatus(safety: number) {
  if (safety < 40) return { statusTitle: "ثغرات تحتاج معالجة", statusDesc: "تم اكتشاف مخاطر مهمة؛ راجع التوصيات قبل تشغيل الكود.", statusBadge: "مخاطر مرتفعة", statusIcon: "⚠️", statusIconBg: "bg-red-500/20", statusBadgeClass: "bg-red-500/20 text-red-400 border border-red-500/30" };
  if (safety < 70) return { statusTitle: "توجد نقاط تحتاج مراجعة", statusDesc: "التحليل وجد ملاحظات أمنية أو تشغيلية قابلة للتحسين.", statusBadge: "يحتاج مراجعة", statusIcon: "🔎", statusIconBg: "bg-yellow-500/20", statusBadgeClass: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" };
  return { statusTitle: "النتيجة الأولية جيدة", statusDesc: "لم يظهر خطر كبير في التحليل الأولي، لكن راجع الكود قبل الإنتاج.", statusBadge: "مراجعة مكتملة", statusIcon: "🛡️", statusIconBg: "bg-green-500/20", statusBadgeClass: "bg-green-500/20 text-green-400 border border-green-500/30" };
}

function containsArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  ai: router({
    chat: publicProcedure
      .input(z.object({
        message: z.string().trim().min(1, "Enter a message.").max(3_000, "Messages are limited to 3,000 characters."),
        history: z.array(chatMessage).max(12).default([]),
      }))
      .mutation(async ({ input }) => {
        try {
          const isArabic = containsArabic(input.message);
          const languageInstruction = isArabic
            ? "Respond in clear Modern Standard Arabic only. Use natural, complete sentences, correct Arabic punctuation, and simple headings. Do not mix English words unless they are an unavoidable product or code name."
            : "Respond in clear English only.";
          const response = await invokeLLM({
            model: "gpt-5-mini",
            maxTokens: 900,
            messages: [
              {
                role: "system",
                content: `You are Marokecho, a calm but powerful AI thinking companion. ${languageInstruction} Start with the direct answer, then give the most useful explanation, concrete steps, trade-offs, and one concise next action. Never reveal private chain-of-thought; provide a short, useful rationale or summary instead. Use Markdown when it improves scanability: short headings, numbered steps, bullets, code fences, and tables. Keep the response coherent and appropriately detailed, avoid filler, repetition, and vague motivational language. If a request is ambiguous, ask one focused clarifying question. State assumptions and uncertainty clearly. Do not claim to have taken actions, accessed accounts, used tools, or verified results you cannot actually verify.`,
              },
              ...input.history,
              { role: "user", content: input.message },
            ],
          });

          const content = response.choices[0]?.message.content;
          const reply = typeof content === "string" ? content.trim() : "";
          if (!reply) {
            throw new Error("The language model returned an empty response.");
          }

          return { reply, model: response.model };
        } catch (error) {
          console.error("[Marokecho AI] chat failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: containsArabic(input.message)
              ? "تعذر إنشاء الرد الآن. حاول مرة أخرى بعد لحظات."
              : "Marokecho could not generate a reply right now. Please try again.",
          });
        }
      }),
  }),
  voice: router({
    transcribe: publicProcedure
      .input(z.object({
        audioBase64: z.string().min(1).max(11_200_000),
        mimeType: z.enum(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"]),
        language: z.string().trim().min(2).max(8).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const audio = Buffer.from(input.audioBase64, "base64");
          if (!audio.length || audio.length > 8 * 1024 * 1024) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Voice clips must be between 1 byte and 8 MB." });
          }
          const uploaded = await storagePut(`voice/marokecho-${Date.now()}.webm`, audio, input.mimeType);
          const signedUrl = await storageGetSignedUrl(uploaded.key);
          const result = await transcribeAudio({ audioUrl: signedUrl, language: input.language, prompt: "Transcribe the user's voice accurately. Preserve intent and punctuation." });
          if ("error" in result) {
            throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
          }
          return { text: result.text, language: result.language, duration: result.duration };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Marokecho Voice] transcription failed", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Voice transcription is temporarily unavailable. Please try again." });
        }
      }),
    codeAnalyze: publicProcedure
      .input(codeAnalysisInput)
      .mutation(async ({ input }) => {
        try {
          const response = await invokeLLM({
            model: "gpt-5-mini",
            maxTokens: 1_200,
            response_format: codeAnalysisSchema,
            messages: [{ role: "system", content: "You are ScriptGuard, a careful code-review assistant. Review the supplied source for security, reliability, and performance concerns. This is an advisory review, not a guarantee of safety. Return only the requested JSON schema. Write titles and descriptions in Arabic. Keep suggested code concise and preserve the user's language where practical." }, { role: "user", content: `File: ${input.fileName}\nLanguage: ${input.language}\n\n${input.code}` }],
          });
          const content = response.choices[0]?.message.content;
          const parsed = typeof content === "string" ? JSON.parse(content) : null;
          if (!parsed || typeof parsed !== "object") throw new Error("The analysis model returned invalid JSON.");
          const safety = Math.max(0, Math.min(100, Number(parsed.safety) || 0));
          return { ...parsed, safety, ...analysisStatus(safety), language: input.language, model: response.model };
        } catch (error) {
          console.error("[ScriptGuard AI] analysis failed", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر تحليل الكود الآن. حاول مرة أخرى بعد لحظات." });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
