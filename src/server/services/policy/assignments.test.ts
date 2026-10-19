// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it, vi } from "vitest";
import { resolvePolicyAssignments, validatePolicyAssignment } from "./assignments";

function db(members: Array<{ id: string; organizationId: string; name: string }>, units: Array<{ id: string; organizationId: string; name: string }>) {
  const scoped = <T extends { id: string; organizationId: string }>(rows: T[], where: { id?: string | { in: string[] }; organizationId: string }) =>
    rows.filter(
      (r) =>
        r.organizationId === where.organizationId &&
        (typeof where.id === "string" ? r.id === where.id : !where.id || where.id.in.includes(r.id)),
    );
  return {
    organizationMember: {
      findFirst: vi.fn(async ({ where }) => {
        const m = scoped(members, where)[0];
        return m ? { id: m.id, user: { name: m.name, email: null } } : null;
      }),
      findMany: vi.fn(async ({ where }) => scoped(members, where).map((m) => ({ id: m.id, user: { name: m.name, email: null } }))),
    },
    businessUnit: {
      findFirst: vi.fn(async ({ where }) => scoped(units, where)[0] ?? null),
      findMany: vi.fn(async ({ where }) => scoped(units, where)),
    },
  } as never;
}

const members = [
  { id: "m1", organizationId: "org", name: "Ana" },
  { id: "m2", organizationId: "other", name: "Bea" },
];
const units = [
  { id: "d1", organizationId: "org", name: "Legal" },
  { id: "d2", organizationId: "other", name: "Sales" },
];

describe("policy owner and department", () => {
  it("takes a member of the organization and fills in the name", async () => {
    await expect(validatePolicyAssignment(db(members, units), "org", { ownerMemberId: "m1", departmentId: "d1" })).resolves.toEqual({
      ownerMemberId: "m1",
      ownerName: "Ana",
      departmentId: "d1",
    });
  });

  it("refuses a member or a department of another organization", async () => {
    await expect(validatePolicyAssignment(db(members, units), "org", { ownerMemberId: "m2" })).rejects.toThrow("Unknown member");
    await expect(validatePolicyAssignment(db(members, units), "org", { departmentId: "d2" })).rejects.toThrow("Unknown department");
  });

  it("keeps a typed name for someone outside the team, and clears on null", async () => {
    await expect(
      validatePolicyAssignment(db(members, units), "org", { ownerMemberId: null, ownerName: " External counsel " }),
    ).resolves.toEqual({ ownerMemberId: null, ownerName: "External counsel" });
    await expect(validatePolicyAssignment(db(members, units), "org", { departmentId: null })).resolves.toEqual({ departmentId: null });
    await expect(validatePolicyAssignment(db(members, units), "org", {})).resolves.toEqual({});
  });

  it("resolves names, and shows the stored name once a member has left", async () => {
    const map = await resolvePolicyAssignments(db(members, units), "org", [
      { id: "p1", ownerMemberId: "m1", ownerName: null, departmentId: "d1" },
      { id: "p2", ownerMemberId: "gone", ownerName: "Carla", departmentId: "deleted" },
    ]);
    expect(map.get("p1")).toEqual({ ownerName: "Ana", ownerIsMember: true, departmentName: "Legal" });
    expect(map.get("p2")).toEqual({ ownerName: "Carla", ownerIsMember: false, departmentName: null });
  });
});
