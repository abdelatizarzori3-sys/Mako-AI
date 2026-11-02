import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getExportEntitlement, requireExportEntitlement } = vi.hoisted(() => ({
  getExportEntitlement: vi.fn(),
  requireExportEntitlement: vi.fn(),
}));

vi.mock("./entitlements", () => ({
  getExportEntitlement,
  requireExportEntitlement,
}));

import { appRouter } from "./routers";

const exportInput = {
  title: "Current session",
  messages: [
    {
      role: "user" as const,
      content: "The actual current message.",
      createdAt: "2026-10-31T08:00:00.000Z",
    },
  ],
};

const proUser = { id: 42 };

describe("conversation.exportCurrent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports sign-in as required without treating browser state as a subscription", async () => {
    const caller = appRouter.createCaller({ user: null } as never);

    await expect(caller.billing.exportStatus()).resolves.toEqual({
      canExport: false,
      status: "sign_in_required",
    });
    await expect(
      caller.conversation.exportCurrent(exportInput)
    ).rejects.toThrow("Please login");
  });

  it("does not export when the verified server entitlement rejects access", async () => {
    requireExportEntitlement.mockRejectedValue(
      new TRPCError({
        code: "FORBIDDEN",
        message:
          "A verified Pro subscription is required to export this conversation.",
      })
    );
    const caller = appRouter.createCaller({ user: proUser } as never);

    await expect(
      caller.conversation.exportCurrent(exportInput)
    ).rejects.toThrow("verified Pro subscription");
  });

  it("rejects an invalid export request before checking entitlement", async () => {
    const caller = appRouter.createCaller({ user: proUser } as never);

    await expect(
      caller.conversation.exportCurrent({ ...exportInput, title: "   " })
    ).rejects.toThrow();
    expect(requireExportEntitlement).not.toHaveBeenCalled();
  });

  it("returns Markdown from the submitted messages only after a verified Pro entitlement", async () => {
    getExportEntitlement.mockResolvedValue({
      canExport: true,
      status: "active",
    });
    requireExportEntitlement.mockResolvedValue(undefined);
    const caller = appRouter.createCaller({ user: proUser } as never);

    await expect(caller.billing.exportStatus()).resolves.toEqual({
      canExport: true,
      status: "active",
    });

    const result = await caller.conversation.exportCurrent(exportInput);
    expect(requireExportEntitlement).toHaveBeenCalledWith(proUser);
    expect(result.fileName).toMatch(
      /^marokecho-conversation-\d{4}-\d{2}-\d{2}\.md$/
    );
    expect(result.markdown).toContain("# Current session");
    expect(result.markdown).toContain("The actual current message.");
  });
});
