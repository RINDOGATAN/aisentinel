// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/** When the dashboard offers "Start from DPO Central" (src/components/suite/dpo-central-link-card.tsx). */

import { describe, it, expect } from "vitest";
import { dpoCentralLinkUrl, showDashboardOffer } from "./dpo-central-link-card";

describe("the dashboard's Start from DPO Central offer", () => {
  const base = { link: null, canManage: true, dpcFound: true, offerDismissed: false };

  it("shows for an owner or administrator DPO Central knows, before any link", () => {
    expect(showDashboardOffer(base)).toBe(true);
  });

  it("does not show for a person DPO Central does not know", () => {
    expect(showDashboardOffer({ ...base, dpcFound: false })).toBe(false);
    expect(showDashboardOffer({ ...base, dpcFound: undefined })).toBe(false);
  });

  it("does not show to other members, once linked or unlinked, or once set aside", () => {
    expect(showDashboardOffer({ ...base, canManage: false })).toBe(false);
    expect(showDashboardOffer({ ...base, link: { active: true } })).toBe(false);
    expect(showDashboardOffer({ ...base, link: { active: false } })).toBe(false);
    expect(showDashboardOffer({ ...base, offerDismissed: true })).toBe(false);
    expect(showDashboardOffer(undefined)).toBe(false);
  });

  it("sends the person to DPO Central's link page with the way back", () => {
    const url = new URL(dpoCentralLinkUrl("https://dpocentral.todo.law", "o1", "https://aisentinel.todo.law/governance"));
    expect(url.pathname).toBe("/privacy/suite/ai-sentinel");
    expect(url.searchParams.get("aisOrg")).toBe("o1");
    expect(url.searchParams.get("return")).toBe("https://aisentinel.todo.law/governance");
  });
});
