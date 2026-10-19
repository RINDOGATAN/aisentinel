// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { departmentForNewPolicy, validatePolicyAssignment } from "./assignments";

const db = {
  organizationMember: { findFirst: async () => null },
  businessUnit: {
    findFirst: async ({ where }: { where: { id: string } }) => (["hr", "it"].includes(where.id) ? { id: where.id } : null),
  },
} as never;
const limited = { all: false as const, businessUnitIds: ["it"] };

describe("a policy's department and the writer's department scope", () => {
  it("a limited writer cannot assign a policy outside their departments", async () => {
    await expect(validatePolicyAssignment(db, "org", { departmentId: "hr" }, { scope: limited })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(validatePolicyAssignment(db, "org", { departmentId: "it" }, { scope: limited })).resolves.toEqual({
      departmentId: "it",
    });
  });

  it("a limited writer's new policy is placed in their department", async () => {
    await expect(validatePolicyAssignment(db, "org", {}, { scope: limited, creating: true })).resolves.toEqual({
      departmentId: "it",
    });
    expect(departmentForNewPolicy(limited, "hr")).toBe("it");
    expect(departmentForNewPolicy(limited, null)).toBe("it");
  });

  it("changes nothing for a whole-organization writer", async () => {
    await expect(validatePolicyAssignment(db, "org", { departmentId: "hr" }, { scope: { all: true }, creating: true })).resolves.toEqual({
      departmentId: "hr",
    });
    await expect(validatePolicyAssignment(db, "org", {}, { creating: true })).resolves.toEqual({});
    expect(departmentForNewPolicy({ all: true }, "hr")).toBe("hr");
  });
});
