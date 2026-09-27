// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { buildNeedsAction, needsActionTotal } from "./needs-action";

describe("needs action", () => {
  it("drops empty categories and keeps a fixed order", () => {
    const items = buildNeedsAction({
      assessmentReview: 2,
      oversightGate: 0,
      overdueRetest: 1,
      incidentOpen: 0,
      reviewQueue: 4,
    });
    expect(items.map((i) => i.kind)).toEqual([
      "assessment-review",
      "overdue-retest",
      "review-queue",
    ]);
    expect(needsActionTotal(items)).toBe(7);
  });

  it("treats a null review queue as not applicable", () => {
    const items = buildNeedsAction({
      assessmentReview: 0,
      oversightGate: 0,
      overdueRetest: 0,
      incidentOpen: 0,
      reviewQueue: null,
    });
    expect(items).toEqual([]);
    expect(needsActionTotal(items)).toBe(0);
  });

  it("gives every category a link", () => {
    const items = buildNeedsAction({
      assessmentReview: 1,
      oversightGate: 1,
      overdueRetest: 1,
      incidentOpen: 1,
      reviewQueue: 1,
    });
    expect(items).toHaveLength(5);
    for (const item of items) expect(item.href).toMatch(/^\/governance\//);
  });
});
