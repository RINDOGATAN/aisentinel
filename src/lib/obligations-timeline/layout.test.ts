// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  computeTimelineLayout,
  LINEAR_WEIGHT,
  BREAK_DISTORTION_TOLERANCE,
} from "./layout";
import {
  MOCK_TIMELINE,
  MOCK_TIMELINE_NOW,
} from "./__fixtures__/mock-timeline";
import type { TimelineMilestoneInput, MilestoneBox } from "./types";

const overlaps = (a: MilestoneBox, b: MilestoneBox) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("computeTimelineLayout", () => {
  const layout = computeTimelineLayout(MOCK_TIMELINE, {
    nowIso: MOCK_TIMELINE_NOW,
  });

  it("is deterministic: identical input produces identical output", () => {
    expect(
      computeTimelineLayout(MOCK_TIMELINE, { nowIso: MOCK_TIMELINE_NOW }),
    ).toEqual(layout);
  });

  it("never reads the clock: omitting nowIso omits the today marker", () => {
    const withoutNow = computeTimelineLayout(MOCK_TIMELINE);
    expect(withoutNow.today).toBeNull();
    expect(withoutNow.pastBand).toBeNull();
    // Everything else is unchanged — proving no hidden Date.now() dependency.
    expect(withoutNow.milestones).toEqual(layout.milestones);
  });

  it("lays out every milestone exactly once", () => {
    expect(layout.milestones).toHaveLength(MOCK_TIMELINE.length);
    expect(new Set(layout.milestones.map((m) => m.id)).size).toBe(
      MOCK_TIMELINE.length,
    );
  });

  it("no two milestone cards overlap", () => {
    for (let i = 0; i < layout.milestones.length; i++) {
      for (let j = i + 1; j < layout.milestones.length; j++) {
        expect(
          overlaps(layout.milestones[i], layout.milestones[j]),
          `${layout.milestones[i].id} vs ${layout.milestones[j].id}`,
        ).toBe(false);
      }
    }
  });

  it("dot x is non-decreasing in date order", () => {
    const xs = layout.milestones.map((m) => m.dotX);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it("keeps every dot inside the axis bounds", () => {
    for (const m of layout.milestones) {
      expect(m.dotX).toBeGreaterThanOrEqual(layout.axis.x1);
      expect(m.dotX).toBeLessThanOrEqual(layout.axis.x2);
    }
  });

  it("keeps every CARD fully inside the canvas", () => {
    // Regression: cards are centred on their dots, so placing the first and
    // last dots at the axis ends clipped half a card off each edge. Only a
    // rendered screenshot caught it — this is the cheap guard.
    for (const variant of [
      computeTimelineLayout(MOCK_TIMELINE, { nowIso: MOCK_TIMELINE_NOW }),
      computeTimelineLayout(MOCK_TIMELINE, {
        nowIso: MOCK_TIMELINE_NOW,
        compact: true,
      }),
      computeTimelineLayout(MOCK_TIMELINE, {
        nowIso: MOCK_TIMELINE_NOW,
        maxWidth: 700,
      }),
      computeTimelineLayout(MOCK_TIMELINE, {
        nowIso: MOCK_TIMELINE_NOW,
        orientation: "vertical",
        maxWidth: 420,
      }),
    ]) {
      for (const m of variant.milestones) {
        expect(m.x, `${m.id} clipped left`).toBeGreaterThanOrEqual(0);
        expect(
          m.x + m.w,
          `${m.id} clipped right (${m.x + m.w} > ${variant.width})`,
        ).toBeLessThanOrEqual(variant.width);
        expect(m.y, `${m.id} clipped top`).toBeGreaterThanOrEqual(0);
        expect(m.y + m.h, `${m.id} clipped bottom`).toBeLessThanOrEqual(
          variant.height,
        );
      }
    }
  });

  it("places today inside the axis and marks clamping correctly", () => {
    expect(layout.today).not.toBeNull();
    expect(layout.today!.x).toBeGreaterThanOrEqual(layout.axis.x1);
    expect(layout.today!.x).toBeLessThanOrEqual(layout.axis.x2);
    // 2026-08-19 sits between the first and last milestone → not clamped.
    expect(layout.today!.clamped).toBe(false);

    const early = computeTimelineLayout(MOCK_TIMELINE, {
      nowIso: "2020-01-01T00:00:00.000Z",
    });
    expect(early.today!.clamped).toBe(true);
    expect(early.today!.x).toBe(early.milestones[0].dotX);

    const late = computeTimelineLayout(MOCK_TIMELINE, {
      nowIso: "2099-01-01T00:00:00.000Z",
    });
    expect(late.today!.clamped).toBe(true);
  });

  it("renders a past band only when today is past the first milestone", () => {
    expect(layout.pastBand).not.toBeNull();
    expect(layout.pastBand!.w).toBeGreaterThan(0);

    const early = computeTimelineLayout(MOCK_TIMELINE, {
      nowIso: "2020-01-01T00:00:00.000Z",
    });
    expect(early.pastBand).toBeNull();
  });

  it("compact metrics fit the same content into a smaller canvas", () => {
    const compact = computeTimelineLayout(MOCK_TIMELINE, {
      nowIso: MOCK_TIMELINE_NOW,
      compact: true,
    });
    expect(compact.height).toBeLessThanOrEqual(layout.height);
    expect(compact.milestones).toHaveLength(layout.milestones.length);
    for (const m of compact.milestones) {
      expect(m.w).toBeLessThan(layout.milestones[0].w);
    }
  });

  it("vertical orientation emits every milestone without overlaps", () => {
    const vertical = computeTimelineLayout(MOCK_TIMELINE, {
      nowIso: MOCK_TIMELINE_NOW,
      orientation: "vertical",
      maxWidth: 420,
    });
    expect(vertical.orientation).toBe("vertical");
    expect(vertical.milestones).toHaveLength(MOCK_TIMELINE.length);
    for (let i = 0; i < vertical.milestones.length; i++) {
      for (let j = i + 1; j < vertical.milestones.length; j++) {
        expect(overlaps(vertical.milestones[i], vertical.milestones[j])).toBe(
          false,
        );
      }
    }
  });

  it("sorts by date then id regardless of input order", () => {
    const shuffled = [...MOCK_TIMELINE].reverse();
    const fromShuffled = computeTimelineLayout(shuffled, {
      nowIso: MOCK_TIMELINE_NOW,
    });
    expect(fromShuffled).toEqual(layout);
  });

  it("carries pre-localized labels through untranslated, truncating to fit", () => {
    const long = layout.milestones.find(
      (m) => m.id === "eu-ai-act-annex-i-high-risk",
    )!;
    const label = long.lines.find((l) => l.role === "label")!;
    // Either the exact string or an ellipsized prefix of it — never rewritten.
    const original = MOCK_TIMELINE.find(
      (m) => m.id === "eu-ai-act-annex-i-high-risk",
    )!.label;
    expect(
      label.text === original ||
        original.startsWith(label.text.replace(/…$/, "").trimEnd()),
    ).toBe(true);
  });

  it("emits a legend covering every tone", () => {
    expect(layout.legend.map((l) => l.id).sort()).toEqual(
      [
        "imminent",
        "not-applicable",
        "overdue",
        "past-satisfied",
        "unknown",
        "upcoming",
      ].sort(),
    );
  });
});

describe("computeTimelineLayout — the blended scale", () => {
  it("uses an ordinal-dominant blend", () => {
    // The constant is load-bearing enough to assert: a change here is a
    // deliberate design decision, not an accident.
    expect(LINEAR_WEIGHT).toBeGreaterThan(0);
    expect(LINEAR_WEIGHT).toBeLessThan(0.5);
  });

  it("keeps a tightly clustered pair legible (pure linear would not)", () => {
    // 2 Dec 2026 and 1 Jan 2027 are 30 days apart inside a 3.5-year span; a
    // pure linear axis would place them ~2% of the canvas apart and overlap.
    const layout = computeTimelineLayout(MOCK_TIMELINE, {
      nowIso: MOCK_TIMELINE_NOW,
    });
    const dec = layout.milestones.find(
      (m) => m.id === "eu-ai-act-art50-marking-grace",
    )!;
    const jan = layout.milestones.find(
      (m) => m.id === "ccpa-admt-article-11-rights",
    )!;
    expect(Math.abs(jan.dotX - dec.dotX)).toBeGreaterThanOrEqual(
      layout.milestones[0].w / 2,
    );
  });

  it("still shows a long gap as visibly longer than a short one", () => {
    // The eleven-month CA→EU gap must out-measure the 30-day Dec→Jan gap.
    const layout = computeTimelineLayout(MOCK_TIMELINE, {
      nowIso: MOCK_TIMELINE_NOW,
    });
    const byId = new Map(layout.milestones.map((m) => [m.id, m]));
    const shortGap =
      byId.get("ccpa-admt-article-11-rights")!.dotX -
      byId.get("eu-ai-act-art50-marking-grace")!.dotX;
    const longGap =
      byId.get("eu-ai-act-annex-iii-high-risk")!.dotX -
      byId.get("ccpa-admt-article-11-rights")!.dotX;
    expect(longGap).toBeGreaterThan(shortGap);
  });

  it("annotates compressed intervals rather than hiding them", () => {
    expect(BREAK_DISTORTION_TOLERANCE).toBeGreaterThan(0);
    // Two milestones far apart in time, surrounded by a dense cluster, force
    // the min-gap pass to compress the long interval.
    const dense: TimelineMilestoneInput[] = [
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `cluster-${i}`,
        dateIso: `2026-01-0${i + 1}`,
        label: `Cluster ${i}`,
        dateLabel: `${i + 1} Jan 2026`,
        countLabel: null,
        tone: "upcoming" as const,
        emphasis: false,
      })),
      {
        id: "far-future",
        dateIso: "2035-01-01",
        label: "Far future",
        dateLabel: "1 Jan 2035",
        countLabel: null,
        tone: "future" as unknown as "upcoming",
        emphasis: false,
      },
    ];
    const layout = computeTimelineLayout(dense, { maxWidth: 600 });
    expect(layout.breaks.length).toBeGreaterThan(0);
    const brk = layout.breaks.find((b) => b.toId === "far-future");
    expect(brk).toBeDefined();
    expect(brk!.trueDays).toBeGreaterThan(3000);
  });
});

describe("computeTimelineLayout — edge cases", () => {
  it("handles an empty milestone list", () => {
    const empty = computeTimelineLayout([], { nowIso: MOCK_TIMELINE_NOW });
    expect(empty.milestones).toHaveLength(0);
    expect(empty.breaks).toHaveLength(0);
    expect(empty.today).toBeNull();
    expect(empty.height).toBeGreaterThan(0);
    expect(empty.legend.length).toBeGreaterThan(0);
  });

  it("handles a single milestone", () => {
    const one = computeTimelineLayout([MOCK_TIMELINE[0]], {
      nowIso: MOCK_TIMELINE_NOW,
    });
    expect(one.milestones).toHaveLength(1);
    expect(one.milestones[0].dotX).toBeGreaterThanOrEqual(one.axis.x1);
    expect(one.milestones[0].dotX).toBeLessThanOrEqual(one.axis.x2);
    expect(one.ticks).toHaveLength(0);
  });

  it("handles milestones that all share one date", () => {
    const sameDay: TimelineMilestoneInput[] = ["a", "b", "c"].map((id) => ({
      id,
      dateIso: "2027-01-01",
      label: `Milestone ${id}`,
      dateLabel: "1 Jan 2027",
      countLabel: null,
      tone: "upcoming",
      emphasis: false,
    }));
    const layout = computeTimelineLayout(sameDay, {
      nowIso: MOCK_TIMELINE_NOW,
    });
    expect(layout.milestones).toHaveLength(3);
    for (let i = 0; i < layout.milestones.length; i++) {
      for (let j = i + 1; j < layout.milestones.length; j++) {
        expect(overlaps(layout.milestones[i], layout.milestones[j])).toBe(false);
      }
    }
    // Ties break by id, so order is stable.
    expect(layout.milestones.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });
});
