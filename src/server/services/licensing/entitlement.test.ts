import { describe, it, expect, vi, beforeEach } from "vitest";

// Hermetic: mock the feature flags and prisma so the entitlement gate can be
// exercised without a database or environment. `features` is a mutable object
// the tests reassign per case.
vi.mock("@/config/features", () => ({
  features: { stripeEnabled: true },
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
    features.stripeEnabled = true;
  });

  it("grants premium assessment types for free when billing is disabled", async () => {
    features.stripeEnabled = false;

    const result = await checkAssessmentEntitlement("org-123", "CONFORMITY");

    expect(result.entitled).toBe(true);
    expect(result.reason).toBe("Billing disabled; all features available");
    // The bypass must short-circuit before any DB lookup.
    expect(prisma.skillPackage.findFirst).not.toHaveBeenCalled();
  });

  it("still gates premium assessment types behind an entitlement when billing is enabled", async () => {
    features.stripeEnabled = true;
    vi.mocked(prisma.skillPackage.findFirst).mockResolvedValue(null as never);

    const result = await checkAssessmentEntitlement("org-123", "CONFORMITY");

    expect(result.entitled).toBe(false);
    expect(prisma.skillPackage.findFirst).toHaveBeenCalledOnce();
  });
});
