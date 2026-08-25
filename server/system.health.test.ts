import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("system.health", () => {
  it("returns an OK health result for deployment monitoring", async () => {
    const caller = appRouter.createCaller({} as never);
    await expect(caller.system.health({ timestamp: Date.now() })).resolves.toEqual({ ok: true });
  });
});
