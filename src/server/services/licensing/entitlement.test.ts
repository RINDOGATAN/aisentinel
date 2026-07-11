// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect, vi, beforeEach } from "vitest";

// Hermetic: mock the feature flags and prisma so the entitlement gate can be
// exercised without a database or environment. `features` is a mutable object
// the tests reassign per case.
vi.mock("@/config/features", () => ({
  features: { allSkillsFree: false },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    skillPackage: { findFirst: vi.fn() },
    customerOrganization: { findFirst: vi.fn() },
  },
}));

import { features } from "@/config/features";
import prisma from "@/lib/prisma";
import { checkAssessmentEntitlement } from "./entitlement";

describe("checkAssessmentEntitlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    features.allSkillsFree = false;
  });

  it("grants premium assessment types for free on all-skills-free deployments", async () => {
    features.allSkillsFree = true;

    const result = await checkAssessmentEntitlement("org-123", "CONFORMITY");

    expect(result.entitled).toBe(true);
    expect(result.reason).toBe("All skills free on this deployment");
    // The bypass must short-circuit before any DB lookup.
    expect(prisma.skillPackage.findFirst).not.toHaveBeenCalled();
  });

  it("still gates premium assessment types behind an entitlement when skills are not free", async () => {
    features.allSkillsFree = false;
    vi.mocked(prisma.skillPackage.findFirst).mockResolvedValue(null as never);

    const result = await checkAssessmentEntitlement("org-123", "CONFORMITY");

    expect(result.entitled).toBe(false);
    expect(prisma.skillPackage.findFirst).toHaveBeenCalledOnce();
  });
});
