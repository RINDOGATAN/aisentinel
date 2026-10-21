// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { compliancePercent } from "./compliance-percent";

describe("compliancePercent", () => {
  it("counts a partial requirement as half, so 6 compliant and 1 partial is not 100%", () => {
    expect(compliancePercent({ compliant: 6, partial: 1, nonCompliant: 0, notAssessed: 0 })).toBe(93);
  });

  it("keeps unassessed requirements in the denominator", () => {
    expect(compliancePercent({ compliant: 1, partial: 0, nonCompliant: 0, notAssessed: 3 })).toBe(25);
  });

  it("reads 100% only when every applicable requirement is compliant", () => {
    expect(compliancePercent({ compliant: 4, partial: 0, nonCompliant: 0, notAssessed: 0 })).toBe(100);
  });

  it("is 0 with nothing applicable", () => {
    expect(compliancePercent({ compliant: 0, partial: 0, nonCompliant: 0, notAssessed: 0 })).toBe(0);
  });
});
