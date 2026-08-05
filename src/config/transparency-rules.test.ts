// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Table-driven tests for the deterministic Art. 50 transparency rules.
 * Pure — no DB, no network, no AI. Covers the obligation suggestions
 * (including the generative-fallback-suppression regression) and the
 * Reg. (EU) 2026/1744 marking-deadline math.
 */

import { describe, it, expect } from "vitest";
import {
  ART50_APPLICABLE_FROM,
  ART50_MARKING_GRACE_DEADLINE,
  computeMarkingDeadline,
  suggestArt50Obligations,
  type Art50ObligationId,
  type TransparencyFacts,
} from "./transparency-rules";

function suggestion(facts: TransparencyFacts, obligation: Art50ObligationId) {
  const hit = suggestArt50Obligations(facts).find(
    (s) => s.obligation === obligation,
  );
  if (!hit) throw new Error(`missing suggestion ${obligation}`);
  return hit;
}

describe("suggestArt50Obligations", () => {
  it("always returns all four obligations", () => {
    const suggestions = suggestArt50Obligations({ name: "Inventory ledger" });
    expect(suggestions.map((s) => s.obligation)).toEqual([
      "art50_interaction",
      "art50_marking",
      "art50_emotion",
      "art50_deepfake",
    ]);
    expect(suggestions.every((s) => !s.suggested)).toBe(true);
  });

  interface Case {
    title: string;
    facts: TransparencyFacts;
    suggested: Partial<Record<Art50ObligationId, boolean>>;
  }

  const CASES: Case[] = [
    {
      title: "chatbot triggers the 50(1) interaction disclosure",
      facts: { name: "Support chatbot for billing questions" },
      suggested: { art50_interaction: true, art50_marking: false },
    },
    {
      title: "synthetic-content keywords trigger 50(2) marking",
      facts: { name: "AdStudio", purpose: "Marketing image generation" },
      suggested: { art50_marking: true },
    },
    {
      title:
        "generative chatbot keeps its 50(2) marking suggestion despite the screening fallback suppression",
      facts: {
        name: "Concierge chatbot",
        technique: "GENERATIVE_AI",
      },
      suggested: { art50_interaction: true, art50_marking: true },
    },
    {
      title: "deepfake tooling triggers 50(4) AND 50(2) (deepfakes are synthetic content)",
      facts: { name: "Face swap studio for film production" },
      suggested: { art50_deepfake: true, art50_marking: true },
    },
    {
      title: "emotion recognition triggers the 50(3) disclosure",
      facts: { name: "KioskMood", purpose: "Emotion detection at retail kiosks" },
      suggested: { art50_emotion: true },
    },
    {
      title: "text sentiment analysis does NOT trigger 50(3)",
      facts: { name: "ReviewSense", purpose: "Sentiment analysis of product reviews" },
      suggested: { art50_emotion: false },
    },
  ];

  for (const c of CASES) {
    it(c.title, () => {
      for (const [obligation, expected] of Object.entries(c.suggested)) {
        expect(
          suggestion(c.facts, obligation as Art50ObligationId).suggested,
          obligation,
        ).toBe(expected);
      }
    });
  }

  it("flags the Art. 5(1)(f) overlap for workplace emotion recognition", () => {
    const hit = suggestion(
      {
        name: "MoodWatch",
        purpose: "Emotion recognition in the workplace for productivity",
      },
      "art50_emotion",
    );
    expect(hit.suggested).toBe(true);
    expect(hit.prohibitedOverlap).toBe(true);
  });

  it("does not flag a prohibition overlap for permitted emotion recognition", () => {
    const hit = suggestion(
      { name: "KioskMood", purpose: "Emotion detection at retail kiosks" },
      "art50_emotion",
    );
    expect(hit.prohibitedOverlap).toBe(false);
  });
});

describe("computeMarkingDeadline", () => {
  const before = new Date(Date.UTC(2026, 8, 1)); // 1 Sep 2026
  const after = new Date(Date.UTC(2026, 11, 15)); // 15 Dec 2026

  it("returns null when the marking obligation is not applicable", () => {
    expect(
      computeMarkingDeadline({
        placedOnMarketBefore2Aug2026: true,
        markingStatus: "NOT_APPLICABLE",
      }),
    ).toBeNull();
    expect(
      computeMarkingDeadline({
        placedOnMarketBefore2Aug2026: true,
        markingStatus: null,
      }),
    ).toBeNull();
  });

  it("applies the grace deadline (2 Dec 2026) for pre-existing systems", () => {
    const d = computeMarkingDeadline({
      placedOnMarketBefore2Aug2026: true,
      markingStatus: "REQUIRED",
      now: before,
    });
    expect(d?.deadline).toEqual(ART50_MARKING_GRACE_DEADLINE);
    expect(d?.graceApplies).toBe(true);
    expect(d?.overdue).toBe(false);
    expect(d?.daysRemaining).toBeGreaterThan(0);
  });

  it("uses the Art. 50 applicable date (2 Aug 2026) without grace", () => {
    for (const placed of [false, null, undefined]) {
      const d = computeMarkingDeadline({
        placedOnMarketBefore2Aug2026: placed,
        markingStatus: "REQUIRED",
        now: before,
      });
      expect(d?.deadline).toEqual(ART50_APPLICABLE_FROM);
      expect(d?.graceApplies).toBe(false);
      expect(d?.overdue).toBe(true);
      expect(d?.daysRemaining).toBeLessThan(0);
    }
  });

  it("is overdue after the grace deadline when still REQUIRED", () => {
    const d = computeMarkingDeadline({
      placedOnMarketBefore2Aug2026: true,
      markingStatus: "REQUIRED",
      now: after,
    });
    expect(d?.overdue).toBe(true);
    expect(d?.daysRemaining).toBeLessThan(0);
  });

  it("is never overdue once IMPLEMENTED", () => {
    const d = computeMarkingDeadline({
      placedOnMarketBefore2Aug2026: false,
      markingStatus: "IMPLEMENTED",
      now: after,
    });
    expect(d?.overdue).toBe(false);
  });
});
