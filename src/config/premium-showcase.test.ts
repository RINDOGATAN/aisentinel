// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  SHOWCASE_FEATURES,
  SHOWCASE_LABELS,
  isShowcasePremium,
  premiumShowcaseActive,
} from "./premium-showcase";

/** The three deployments this product actually has. */
const HOSTED = { NEXT_PUBLIC_STRIPE_ENABLED: "false" };
const SELF_HOST = {
  NEXT_PUBLIC_STRIPE_ENABLED: "false",
  NEXT_PUBLIC_ALL_SKILLS_FREE: "true",
};
const CLOUD_WITH_STRIPE = { NEXT_PUBLIC_STRIPE_ENABLED: "true" };

describe("which deployments keep deliverables paid", () => {
  it("is on for the hosted instance: Stripe off, the flag unset", () => {
    expect(premiumShowcaseActive(HOSTED)).toBe(true);
  });

  it("is off for a self-hosted deployment, where every module is included", () => {
    expect(premiumShowcaseActive(SELF_HOST)).toBe(false);
  });

  it("is off where Stripe is on, because the ordinary entitlement gates apply", () => {
    expect(premiumShowcaseActive(CLOUD_WITH_STRIPE)).toBe(false);
  });

  it("can be forced either way", () => {
    expect(premiumShowcaseActive({ ...SELF_HOST, NEXT_PUBLIC_PREMIUM_SHOWCASE: "true" })).toBe(
      true,
    );
    expect(premiumShowcaseActive({ ...HOSTED, NEXT_PUBLIC_PREMIUM_SHOWCASE: "false" })).toBe(
      false,
    );
  });
});

describe("what stays paid", () => {
  it("locks the impact assessment document, the report and the pack on hosted", () => {
    expect(isShowcasePremium("impact-assessment-document", HOSTED)).toBe(true);
    expect(isShowcasePremium("program-report", HOSTED)).toBe(true);
    expect(isShowcasePremium("program-pack", HOSTED)).toBe(true);
  });

  it("locks the two specialist assessments on hosted", () => {
    expect(isShowcasePremium("conformity-assessment", HOSTED)).toBe(true);
    expect(isShowcasePremium("bias-fairness-assessment", HOSTED)).toBe(true);
  });

  it("locks nothing at all when self-hosted", () => {
    for (const feature of SHOWCASE_FEATURES) {
      expect(isShowcasePremium(feature, SELF_HOST)).toBe(false);
    }
  });

  it("keeps the list short: the demo has to teach the product", () => {
    // Everything that teaches stays free. If this list grows past a handful,
    // the hosted instance has stopped being a demo.
    expect(SHOWCASE_FEATURES.length).toBeLessThanOrEqual(6);
  });

  it("names every locked deliverable in both languages", () => {
    for (const feature of SHOWCASE_FEATURES) {
      expect(SHOWCASE_LABELS[feature].en).toBeTruthy();
      expect(SHOWCASE_LABELS[feature].es).toBeTruthy();
    }
  });
});
