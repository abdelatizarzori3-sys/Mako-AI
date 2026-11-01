import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("./db", () => ({ getDb }));

import { getExportEntitlement, requireExportEntitlement } from "./entitlements";

const user = { id: 7 } as never;

describe("export entitlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed when the entitlement database is unavailable", async () => {
    getDb.mockResolvedValue(null);

    await expect(getExportEntitlement(user)).resolves.toEqual({
      canExport: false,
      status: "purchase_setup_required",
    });
    await expect(requireExportEntitlement(user)).rejects.toThrow(
      "verified Pro subscription"
    );
  });

  it("allows export only when the persistent lookup returns an active record", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 101 }]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    getDb.mockResolvedValue({ select });

    await expect(getExportEntitlement(user)).resolves.toEqual({
      canExport: true,
      status: "active",
    });
    expect(select).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
    expect(limit).toHaveBeenCalledWith(1);
  });
});
