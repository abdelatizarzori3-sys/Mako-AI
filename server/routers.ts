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
          const response = await invokeLLM({
            model: "gpt-5-mini",
            maxTokens: 900,
            messages: [
              {
                role: "system",
                content: "You are Marokecho, a calm but powerful AI thinking companion. Reply in clear English only unless the user asks for another language. Start with the direct answer, then add the most useful reasoning, concrete steps, trade-offs, and a concise next action. Use Markdown when it improves scanability: short headings, bullets, numbered steps, code fences, and tables. Tailor the depth to the question, avoid filler and repetition, and never bury the answer in generic preambles. If a request is ambiguous, ask one focused clarifying question. Be explicit about assumptions and uncertainty. Do not claim to have taken actions, accessed accounts, used tools, or verified results you cannot actually verify.",
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
            message: "Marokecho could not generate a reply right now. Please try again.",
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
  }),
});

export type AppRouter = typeof appRouter;
