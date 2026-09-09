// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Tests for the obligations calendar grouping. Pure.
 *
 * The behaviour being protected: a milestone that does not reach the
 * organisation, or whose date has passed, must not sit in the body of the
 * calendar or on the timeline, and must not be deleted either.
 */

import { describe, it, expect } from "vitest";
import {
  groupObligations,
  aheadCount,
  timelineRows,
  jurisdictionsIn,
  filterByJurisdiction,
  type GroupableRow,
} from "./obligations-grouping";

const row = (over: Partial<GroupableRow> & { id: string }): GroupableRow => ({
  phase: "future",
  overdue: false,
  applicability: "applies",
  jurisdictions: [],
  ...over,
});

describe("groupObligations", () => {
  it("puts what is ahead in order and folds the archival groups", () => {
    const groups = groupObligations([
      row({ id: "f", phase: "future" }),
      row({ id: "p", phase: "past" }),
      row({ id: "o", phase: "imminent", overdue: true }),
      row({ id: "n", applicability: "does-not-apply" }),
      row({ id: "i", phase: "imminent" }),
      row({ id: "u", phase: "upcoming" }),
    ]);
    expect(groups.map((g) => g.id)).toEqual([
      "overdue",
      "imminent",
      "upcoming",
      "future",
      "past",
      "notApplicable",
    ]);
    const collapsed = groups.filter((g) => g.collapsedByDefault).map((g) => g.id);
    expect(collapsed).toEqual(["past", "notApplicable"]);
  });

  it("drops empty groups rather than showing a heading with nothing under it", () => {
    const groups = groupObligations([row({ id: "a", phase: "future" })]);
    expect(groups.map((g) => g.id)).toEqual(["future"]);
  });

  it("treats not-applicable as archival whatever its date", () => {
    // An out-of-scope deadline next month is not imminent for anyone here.
    const groups = groupObligations([
      row({ id: "x", phase: "imminent", applicability: "does-not-apply" }),
    ]);
    expect(groups.map((g) => g.id)).toEqual(["notApplicable"]);
  });

  it("keeps an overdue row in the body even though its date has passed", () => {
    const groups = groupObligations([row({ id: "x", phase: "past", overdue: true })]);
    expect(groups[0].id).toBe("overdue");
    expect(groups[0].collapsedByDefault).toBe(false);
  });

  it("keeps an undetermined row in the body: unanswered is not the same as inapplicable", () => {
    const groups = groupObligations([
      row({ id: "x", phase: "upcoming", applicability: "unknown" }),
    ]);
    expect(groups[0].id).toBe("upcoming");
  });

  it("loses nothing: every row lands in exactly one group", () => {
    const rows = [
      row({ id: "a", phase: "future" }),
      row({ id: "b", phase: "past" }),
      row({ id: "c", applicability: "does-not-apply" }),
      row({ id: "d", phase: "imminent", overdue: true }),
    ];
    const grouped = groupObligations(rows).flatMap((g) => g.rows.map((r) => r.id));
    expect(grouped.sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("what reaches the timeline", () => {
  it("plots only what is ahead and applies", () => {
    const rows = [
      row({ id: "future" }),
      row({ id: "imminent", phase: "imminent" }),
      row({ id: "overdue", phase: "past", overdue: true }),
      row({ id: "past", phase: "past" }),
      row({ id: "na", applicability: "does-not-apply" }),
    ];
    expect(timelineRows(rows).map((r) => r.id).sort()).toEqual([
      "future",
      "imminent",
      "overdue",
    ]);
    expect(aheadCount(rows)).toBe(3);
  });

  it("returns nothing when everything is archival, so the caller can hide the plot", () => {
    const rows = [row({ id: "a", phase: "past" }), row({ id: "b", applicability: "does-not-apply" })];
    expect(timelineRows(rows)).toEqual([]);
    expect(aheadCount(rows)).toBe(0);
  });
});

describe("jurisdiction filter", () => {
  const rows = [
    row({ id: "eu", jurisdictions: ["EU", "EEA"] }),
    row({ id: "tx", jurisdictions: ["US_TX"] }),
    row({ id: "ca", jurisdictions: ["US_CA"] }),
    row({ id: "none", jurisdictions: [] }),
  ];

  it("lists the jurisdictions present, sorted and deduplicated", () => {
    expect(jurisdictionsIn(rows)).toEqual(["EEA", "EU", "US_CA", "US_TX"]);
  });

  it("offers only jurisdictions the organisation declared", () => {
    expect(jurisdictionsIn(rows, ["EU", "EEA", "US_FEDERAL"])).toEqual(["EEA", "EU"]);
  });

  it("never offers a jurisdiction whose only milestone does not apply", () => {
    const mixed = [
      row({ id: "eu", jurisdictions: ["EU"] }),
      row({ id: "tx", jurisdictions: ["US_TX"], applicability: "does-not-apply" }),
    ];
    expect(jurisdictionsIn(mixed)).toEqual(["EU"]);
  });

  it("narrows to one jurisdiction, and returns everything when unset", () => {
    expect(filterByJurisdiction(rows, "US_TX").map((r) => r.id)).toEqual(["tx"]);
    expect(filterByJurisdiction(rows, null)).toHaveLength(4);
  });

  it("drops rows with no jurisdiction when a filter is active", () => {
    expect(filterByJurisdiction(rows, "EU").map((r) => r.id)).toEqual(["eu"]);
  });
});
