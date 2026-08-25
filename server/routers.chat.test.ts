import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    model: "gpt-5-mini",
    choices: [{ message: { content: "A focused test reply." } }],
  }),
}));

import { appRouter } from "./routers";

describe("ai.chat", () => {
  it("returns a model reply for a valid English message", async () => {
    const caller = appRouter.createCaller({} as never);
    const result = await caller.ai.chat({ message: "Help me plan a product launch." });

    expect(result).toEqual({ reply: "A focused test reply.", model: "gpt-5-mini" });
  });

  it("rejects an empty message before calling the model", async () => {
    const caller = appRouter.createCaller({} as never);
    await expect(caller.ai.chat({ message: "   " })).rejects.toThrow("Enter a message.");
  });
});
