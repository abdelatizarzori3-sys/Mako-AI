import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    model: "gpt-5-mini",
    choices: [{ message: { content: "A focused test reply." } }],
  }),
}));

vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    task: "transcribe",
    language: "en",
    duration: 1.2,
    text: "A voice test signal.",
    segments: [],
  }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "voice/test.webm", url: "/manus-storage/voice/test.webm" }),
  storageGetSignedUrl: vi.fn().mockResolvedValue("https://storage.example.test/voice/test.webm"),
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

describe("voice.transcribe", () => {
  it("transcribes a supported audio clip without exposing storage credentials", async () => {
    const caller = appRouter.createCaller({} as never);
    const result = await caller.voice.transcribe({
      audioBase64: Buffer.from("audio bytes").toString("base64"),
      mimeType: "audio/webm",
      language: "en",
    });

    expect(result).toMatchObject({ text: "A voice test signal.", language: "en" });
    expect(result).not.toHaveProperty("audioUrl");
  });
});
