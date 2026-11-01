import { and, eq, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import type { User } from "../drizzle/schema";
import { subscriptionEntitlements } from "../drizzle/schema";
import { getDb } from "./db";

export type ExportEntitlementStatus = "active" | "purchase_setup_required";

export type ExportEntitlement = {
  canExport: boolean;
  status: ExportEntitlementStatus;
};

/**
 * Only a future, signature-verified payment webhook may create or update these
 * records. This read path deliberately treats missing storage, missing records,
 * expired subscriptions, and canceled subscriptions as not entitled.
 */
export async function getExportEntitlement(
  user: Pick<User, "id">
): Promise<ExportEntitlement> {
  if (!user.id) return { canExport: false, status: "purchase_setup_required" };

  try {
    const db = await getDb();
    if (!db) return { canExport: false, status: "purchase_setup_required" };

    const activeEntitlement = await db
      .select({ id: subscriptionEntitlements.id })
      .from(subscriptionEntitlements)
      .where(
        and(
          eq(subscriptionEntitlements.userId, user.id),
          eq(subscriptionEntitlements.plan, "pro"),
          eq(subscriptionEntitlements.status, "active"),
          gt(subscriptionEntitlements.currentPeriodEndsAt, new Date())
        )
      )
      .limit(1);

    return activeEntitlement.length > 0
      ? { canExport: true, status: "active" }
      : { canExport: false, status: "purchase_setup_required" };
  } catch (error) {
    // The client must never infer paid access from an unavailable entitlement store.
    console.error("[Entitlements] Export entitlement lookup failed", error);
    return { canExport: false, status: "purchase_setup_required" };
  }
}

export async function requireExportEntitlement(
  user: Pick<User, "id">
): Promise<void> {
  const entitlement = await getExportEntitlement(user);
  if (!entitlement.canExport) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "A verified Pro subscription is required to export this conversation.",
    });
  }
}
