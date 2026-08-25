import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
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
                content: "You are Marokecho, a calm, incisive AI thinking companion. Reply in clear English only. Be practical and structured, but avoid unnecessary headings. If a request is ambiguous, ask one focused clarifying question. Do not claim to have taken actions you cannot take.",
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
});

export type AppRouter = typeof appRouter;
