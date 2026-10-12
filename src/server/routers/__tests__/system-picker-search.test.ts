// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The system pickers' search (search.systems, search.system): names of every
 * system in the caller's organization, not a first page of them; a small
 * number at a time; the departments of a limited member; the vendor link's
 * rule of leaving out systems already linked.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  const db = {
    organizationMember: { findUnique: vi.fn() },
    businessUnitMember: { findMany: vi.fn(async () => [] as unknown[]) },
    aISystem: { findMany: vi.fn(async () => [] as unknown[]), findFirst: vi.fn(async () => null as unknown) },
  };
  return { db };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/server/services/licensing/entitlement", () => ({ hasShadowAiAccess: async () => true }));

import { createInnerTRPCContext } from "@/server/trpc";
import { searchRouter, SYSTEM_PICK_LIMIT } from "@/server/routers/governance/search";

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
type Args = { where: { organizationId: string; AND?: Record<string, unknown>[]; id?: string; businessUnitId?: unknown }; take?: number; orderBy?: unknown };
const findManyArgs = () => (H.db.aISystem.findMany.mock.calls[0] as unknown as [Args])[0];
const findFirstArgs = () => (H.db.aISystem.findFirst.mock.calls[0] as unknown as [Args])[0];
const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, name: `System ${i + 1}`, status: "DRAFT" }));

beforeEach(() => {
  vi.clearAllMocks();
  H.db.aISystem.findMany.mockResolvedValue([]);
  H.db.aISystem.findFirst.mockResolvedValue(null);
  H.db.businessUnitMember.findMany.mockResolvedValue([]);
});

describe("search.systems", () => {
  it("searches system names in the caller's organization, case-insensitively", async () => {
    H.db.aISystem.findMany.mockResolvedValue([{ id: "s120", name: "System 120", status: "DEPLOYED" }]);
    const res = await caller(member("OWNER")).systems({ organizationId: "org-a", q: " system 120 " });
    expect(res).toEqual({ items: [{ id: "s120", name: "System 120", status: "DEPLOYED" }], more: false });
    const args = findManyArgs();
    expect(args.where.organizationId).toBe("org-a");
    expect(args.where.AND).toContainEqual({ name: { contains: "system 120", mode: "insensitive" } });
    expect(args.orderBy).toEqual([{ name: "asc" }, { id: "asc" }]);
  });

  it("returns a small number at a time and says when more match", async () => {
    H.db.aISystem.findMany.mockResolvedValue(rows(SYSTEM_PICK_LIMIT + 1));
    const res = await caller(member()).systems({ organizationId: "org-a" });
    expect(findManyArgs().take).toBe(SYSTEM_PICK_LIMIT + 1);
    expect(res.items).toHaveLength(SYSTEM_PICK_LIMIT);
    expect(res.more).toBe(true);
    expect(SYSTEM_PICK_LIMIT).toBeLessThanOrEqual(20);
  });

  it("lists the first systems by name when nothing is typed", async () => {
    await caller(member()).systems({ organizationId: "org-a", q: "" });
    expect(findManyArgs().where).toEqual({ organizationId: "org-a" });
  });

  it("refuses an organization the caller does not belong to", async () => {
    await expect(caller(null).systems({ organizationId: "org-b", q: "crm" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(H.db.aISystem.findMany).not.toHaveBeenCalled();
  });

  it("confines a member limited to departments to their systems", async () => {
    H.db.businessUnitMember.findMany.mockResolvedValue([{ businessUnitId: "bu-1" }]);
    await caller(member()).systems({ organizationId: "org-a", q: "crm" });
    expect(findManyArgs().where.AND).toContainEqual({ businessUnitId: { in: ["bu-1"] } });
  });

  it("leaves out the systems already linked to a vendor, keeping those with none", async () => {
    await caller(member()).systems({ organizationId: "org-a", withoutVendorId: "v1" });
    expect(findManyArgs().where.AND).toContainEqual({ OR: [{ vendorId: null }, { vendorId: { not: "v1" } }] });
  });

  it("caps the query length", async () => {
    await expect(caller(member()).systems({ organizationId: "org-a", q: "x".repeat(101) })).rejects.toBeTruthy();
  });
});

describe("search.system", () => {
  it("names one system by id inside the caller's organization", async () => {
    H.db.aISystem.findFirst.mockResolvedValue({ id: "s1", name: "Credit model", status: "DRAFT" });
    const res = await caller(member()).system({ organizationId: "org-a", id: "s1" });
    expect(res).toEqual({ id: "s1", name: "Credit model", status: "DRAFT" });
    expect(findFirstArgs().where).toEqual({ id: "s1", organizationId: "org-a" });
  });

  it("folds the department scope into the lookup", async () => {
    H.db.businessUnitMember.findMany.mockResolvedValue([{ businessUnitId: "bu-1" }]);
    await caller(member()).system({ organizationId: "org-a", id: "s9" });
    expect(findFirstArgs().where).toEqual({ id: "s9", organizationId: "org-a", businessUnitId: { in: ["bu-1"] } });
  });

  it("refuses an organization the caller does not belong to", async () => {
    await expect(caller(null).system({ organizationId: "org-b", id: "s1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(H.db.aISystem.findFirst).not.toHaveBeenCalled();
  });
});
