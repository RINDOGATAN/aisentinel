// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The top bar's search (search.names): names only, scoped on the server to the
 * caller's organization, to the departments a limited member sees, and to the
 * unapproved-tools module where the organization has it.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  const fm = () => ({ findMany: vi.fn(async () => [] as unknown[]) });
  const db = {
    organizationMember: { findUnique: vi.fn() },
    businessUnitMember: { findMany: vi.fn(async () => [] as unknown[]) },
    aISystem: fm(),
    aIVendor: fm(),
    aIPolicy: fm(),
    aIAssessment: fm(),
    oversightGate: fm(),
    aIIncident: fm(),
    shadowAIReport: fm(),
  };
  const shadow = { on: true };
  return { db, shadow };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/server/services/licensing/entitlement", () => ({ hasShadowAiAccess: async () => H.shadow.on }));

import { createInnerTRPCContext } from "@/server/trpc";
import { searchRouter } from "@/server/routers/governance/search";

const KINDS = ["aISystem", "aIVendor", "aIPolicy", "aIAssessment", "oversightGate", "aIIncident", "shadowAIReport"] as const;

function caller(member: Record<string, unknown> | null) {
  H.db.organizationMember.findUnique.mockResolvedValue(
    member && { ...member, organization: { id: "org-a", name: "Org A", pilotFirstSignInAt: new Date(0) } },
  );
  const session = {
    user: { id: "user-a", email: "a@example.test", name: "A" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return searchRouter.createCaller(createInnerTRPCContext({ session, getCookie: () => undefined }));
}
const member = (role = "MEMBER") => ({ id: "mem-a", organizationId: "org-a", userId: "user-a", role });
const whereOf = (k: (typeof KINDS)[number]) =>
  (H.db[k].findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of KINDS) H.db[k].findMany.mockResolvedValue([]);
  H.db.businessUnitMember.findMany.mockResolvedValue([]);
  H.shadow.on = true;
});

describe("search.names", () => {
  it("searches names in the caller's organization only", async () => {
    H.db.aIVendor.findMany.mockResolvedValue([{ id: "v1", name: "Acme AI" }]);
    const hits = await caller(member("OWNER")).names({ organizationId: "org-a", q: "acme" });
    expect(hits).toEqual([{ kind: "vendor", id: "v1", name: "Acme AI", href: "/governance/vendors/v1" }]);
    for (const k of KINDS) expect(whereOf(k).organizationId).toBe("org-a");
    expect(whereOf("aIVendor").name).toEqual({ contains: "acme", mode: "insensitive" });
    expect(whereOf("aIPolicy").title).toEqual({ contains: "acme", mode: "insensitive" });
  });

  it("refuses an organization the caller does not belong to", async () => {
    await expect(caller(null).names({ organizationId: "org-b", q: "acme" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(H.db.aIVendor.findMany).not.toHaveBeenCalled();
  });

  it("confines a member limited to departments to their systems and what hangs on them", async () => {
    H.db.businessUnitMember.findMany.mockResolvedValue([{ businessUnitId: "bu-1" }]);
    await caller(member()).names({ organizationId: "org-a", q: "crm" });
    const scope = { businessUnitId: { in: ["bu-1"] } };
    expect(whereOf("aISystem").businessUnitId).toEqual({ in: ["bu-1"] });
    expect(whereOf("aIAssessment").aiSystem).toEqual(scope);
    expect(whereOf("oversightGate").aiSystem).toMatchObject(scope);
    expect(whereOf("aIIncident").OR).toEqual([{ aiSystemId: null }, { aiSystem: scope }]);
  });

  it("leaves an unlimited member's search on the whole organization", async () => {
    await caller(member("ADMIN")).names({ organizationId: "org-a", q: "crm" });
    expect(whereOf("aISystem").businessUnitId).toBeUndefined();
    expect(whereOf("aIIncident").OR).toBeUndefined();
  });

  it("does not search unapproved tools without the module", async () => {
    H.shadow.on = false;
    await caller(member()).names({ organizationId: "org-a", q: "chat" });
    expect(H.db.shadowAIReport.findMany).not.toHaveBeenCalled();
  });

  it("names a gate by its type and its system", async () => {
    H.db.oversightGate.findMany.mockResolvedValue([
      { id: "g1", gateType: "PRE_DEPLOYMENT", aiSystem: { name: "Credit model" } },
    ]);
    const hits = await caller(member()).names({ organizationId: "org-a", q: "credit" });
    expect(hits).toEqual([
      { kind: "gate", id: "g1", name: "Credit model", detail: "PRE_DEPLOYMENT", href: "/governance/oversight/g1" },
    ]);
  });

  it("needs at least two characters", async () => {
    await expect(caller(member()).names({ organizationId: "org-a", q: "a" })).rejects.toBeTruthy();
  });
});
