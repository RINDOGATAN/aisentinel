// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Which row the dashboard card counts down to. The card is a countdown, so
 * the answer is a milestone that is still ahead; a duty already in force is
 * counted beside it and never takes the headline.
 */

import { describe, it, expect } from "vitest";
import { isInForce, pickNext } from "./obligations-data";

type Row = Parameters<typeof pickNext>[0][number] & {
  id: string;
  applicability: "applies" | "does-not-apply" | "unknown";
};

function row(overrides: Partial<Row> & { id: string }): Row {
  return {
    phase: "upcoming",
    overdue: false,
    inScope: [],
    undetermined: [],
    applicability: "does-not-apply",
    ...overrides,
  };
}

const ORG = [{ id: "org", name: "org" }];

describe("pickNext", () => {
  it("passes over a duty in force and takes the nearest milestone ahead", () => {
    const rows = [
      row({ id: "in-force-2025", phase: "past", inScope: ORG, applicability: "applies" }),
      row({ id: "ahead-dec-2026", phase: "imminent", inScope: ORG, applicability: "applies" }),
      row({ id: "ahead-jan-2027", phase: "upcoming", inScope: ORG, applicability: "applies" }),
    ];
    expect(pickNext(rows)?.id).toBe("ahead-dec-2026");
  });

  it("keeps the countdown even when something is overdue", () => {
    const rows = [
      row({ id: "overdue", phase: "past", overdue: true, inScope: ORG, applicability: "applies" }),
      row({ id: "ahead", phase: "upcoming", inScope: ORG, applicability: "applies" }),
    ];
    expect(pickNext(rows)?.id).toBe("ahead");
  });

  it("prefers a milestone that applies over a nearer one that may not", () => {
    const rows = [
      row({
        id: "unknown-first",
        phase: "imminent",
        undetermined: [{ id: "s", name: "s", reason: "no-jurisdictions" }],
        applicability: "unknown",
      }),
      row({ id: "applies-later", phase: "upcoming", inScope: ORG, applicability: "applies" }),
    ];
    expect(pickNext(rows)?.id).toBe("applies-later");
  });

  it("falls back to what is overdue only when nothing is ahead", () => {
    const rows = [
      row({ id: "in-force", phase: "past", inScope: ORG, applicability: "applies" }),
      row({ id: "overdue", phase: "past", overdue: true, inScope: ORG, applicability: "applies" }),
    ];
    expect(pickNext(rows)?.id).toBe("overdue");
  });

  it("returns nothing when every row is simply in force", () => {
    expect(
      pickNext([row({ id: "in-force", phase: "past", inScope: ORG, applicability: "applies" })]),
    ).toBeNull();
  });
});

describe("isInForce", () => {
  it("counts a past duty that reaches the organisation and was not missed", () => {
    expect(isInForce(row({ id: "a", phase: "past", applicability: "applies" }))).toBe(true);
  });

  it("does not count what is overdue, what is ahead, or what does not apply", () => {
    expect(
      isInForce(row({ id: "a", phase: "past", overdue: true, applicability: "applies" })),
    ).toBe(false);
    expect(isInForce(row({ id: "a", phase: "imminent", applicability: "applies" }))).toBe(false);
    expect(isInForce(row({ id: "a", phase: "past", applicability: "does-not-apply" }))).toBe(false);
    // An undeclared jurisdiction never becomes "applies to you".
    expect(isInForce(row({ id: "a", phase: "past", applicability: "unknown" }))).toBe(false);
  });
});
