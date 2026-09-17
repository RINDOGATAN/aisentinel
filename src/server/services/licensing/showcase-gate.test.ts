// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: the gate must answer from the environment alone when the showcase
// is off, so the entitlement lookup (and with it the database) is mocked and
// asserted untouched.
vi.mock("@/server/services/licensing/entitlement", () => ({
  checkSkillEntitlement: vi.fn(async () => ({ entitled: false, reason: "none" })),
}));

import { checkSkillEntitlement } from "@/server/services/licensing/entitlement";
import { SHOWCASE_FEATURES } from "@/config/premium-showcase";
import { checkShowcaseAccess, lockedResponse } from "./showcase-gate";

/** The hosted instance as configured for the workshop: Vercel, Stripe off, showcase off. */
function stubHostedShowcaseOff() {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_ENABLED", "false");
  vi.stubEnv("NEXT_PUBLIC_ALL_SKILLS_FREE", "");
  vi.stubEnv("NEXT_PUBLIC_PREMIUM_SHOWCASE", "false");
}

describe("checkShowcaseAccess on the hosted instance", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it("opens every showcase deliverable when the override is false, with no lookup", async () => {
    stubHostedShowcaseOff();
    for (const feature of SHOWCASE_FEATURES) {
      expect(await checkShowcaseAccess("org-1", feature)).toEqual({ allowed: true });
    }
    expect(checkSkillEntitlement).not.toHaveBeenCalled();
  });

  it("locks them on Vercel without the override, and says what unlocks them", async () => {
    stubHostedShowcaseOff();
    vi.stubEnv("NEXT_PUBLIC_PREMIUM_SHOWCASE", "");
    const access = await checkShowcaseAccess("org-1", "program-report");
    expect(access.allowed).toBe(false);
    expect(access.locked?.skillId).toBe("com.todolaw.aisentinel.program-report");

    const res = lockedResponse(access);
    expect(res.status).toBe(402);
  });
});
