// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { diffSnapshots } from "./index";
import type { DiffableSnapshot } from "./types";

function snap(overrides: Partial<DiffableSnapshot> = {}): DiffableSnapshot {
  return {
    graph: {
      systems: [
        { id: "sys-a", name: "ChatGPT" },
        { id: "sys-b", name: "Harvey" },
      ],
    },
    scorecard: {
      maturity: {
        overall: 60,
        dimensions: [
          { id: "inventory", score: 70 },
          { id: "policies", score: 50 },
        ],
        nist: [
          { id: "GOVERN", score: 55 },
          { id: "MAP", score: 80 },
        ],
        gaps: [{ id: "draft-policies", count: 6 }],
      },
      snapshot: {
        classification: { classified: 2 },
        oversight: { overdue: 1 },
      },
    },
    assurance: { weightedPct: 40, confirmed: 40, total: 100 },
    rulePacks: {
      "program-guidance": "2026.08.1",
      "maturity-model": "1.0.0",
    },
    ...overrides,
  };
}

describe("diffSnapshots", () => {
  it("reports overall, dimension and NIST deltas", () => {
    const prev = snap();
    const next = snap({
      scorecard: {
        maturity: {
          overall: 68,
          dimensions: [
            { id: "inventory", score: 82 },
            { id: "policies", score: 50 },
          ],
          nist: [
            { id: "GOVERN", score: 55 },
            { id: "MAP", score: 88 },
          ],
          gaps: [{ id: "draft-policies", count: 6 }],
        },
        snapshot: {
          classification: { classified: 2 },
          oversight: { overdue: 1 },
        },
      },
    });

    const d = diffSnapshots(prev, next);
    expect(d.overall).toEqual({ from: 60, to: 68, delta: 8 });
    expect(d.dimensions.find((x) => x.id === "inventory")!.delta).toBe(12);
    expect(d.dimensions.find((x) => x.id === "policies")!.delta).toBe(0);
    expect(d.nist.find((x) => x.id === "MAP")!.delta).toBe(8);
  });

  it("detects systems added and removed, sorted by name", () => {
    const prev = snap();
    const next = snap({
      graph: {
        systems: [
          { id: "sys-a", name: "ChatGPT" },
          { id: "sys-c", name: "Lexis+ AI" },
          { id: "sys-d", name: "Copilot" },
        ],
      },
    });

    const d = diffSnapshots(prev, next);
    expect(d.systemsAdded.map((s) => s.name)).toEqual(["Copilot", "Lexis+ AI"]);
    expect(d.systemsRemoved.map((s) => s.name)).toEqual(["Harvey"]);
    expect(d.counts.systems).toEqual({ from: 2, to: 3, delta: 1 });
  });

  it("separates gaps closed from gaps opened", () => {
    const prev = snap();
    const next = snap({
      scorecard: {
        maturity: {
          overall: 60,
          dimensions: [],
          nist: [],
          gaps: [{ id: "overdue-gates", count: 2 }],
        },
        snapshot: {},
      },
    });

    const d = diffSnapshots(prev, next);
    expect(d.gapsClosed).toEqual(["draft-policies"]);
    expect(d.gapsOpened).toEqual(["overdue-gates"]);
  });

  it("reports rule-pack changes — the law moving, not the program", () => {
    const prev = snap();
    const next = snap({
      rulePacks: {
        "program-guidance": "2026.09.1", // bumped
        "maturity-model": "1.0.0", // unchanged
        "admt-rules": "2026.09.1", // newly added pack
      },
    });

    const d = diffSnapshots(prev, next);
    expect(d.rulePackChanges).toEqual([
      { pack: "admt-rules", from: null, to: "2026.09.1" },
      { pack: "program-guidance", from: "2026.08.1", to: "2026.09.1" },
    ]);
  });

  it("reports no rule-pack changes when versions are identical", () => {
    expect(diffSnapshots(snap(), snap()).rulePackChanges).toEqual([]);
  });

  it("tolerates an older payload with no assurance block", () => {
    const old: DiffableSnapshot = { ...snap(), assurance: null };
    const d = diffSnapshots(old, snap());
    // from is unknown, so the delta is unknown — not silently 0-to-40.
    expect(d.assurance).toEqual({ from: null, to: 40, delta: null });
    expect(d.counts.unconfirmed).toEqual({ from: 0, to: 60, delta: 60 });
  });

  it("tolerates entirely empty payloads without throwing", () => {
    const d = diffSnapshots({}, {});
    expect(d.overall).toEqual({ from: 0, to: 0, delta: 0 });
    expect(d.dimensions).toEqual([]);
    expect(d.systemsAdded).toEqual([]);
    expect(d.gapsClosed).toEqual([]);
    expect(d.rulePackChanges).toEqual([]);
    expect(d.assurance).toEqual({ from: null, to: null, delta: null });
  });

  it("keeps a dimension that exists on only one side, as a union", () => {
    const prev = snap();
    const next = snap({
      scorecard: {
        maturity: {
          overall: 60,
          dimensions: [
            { id: "inventory", score: 70 },
            { id: "policies", score: 50 },
            { id: "admtReadiness", score: 30 },
          ],
          nist: [],
          gaps: [],
        },
        snapshot: {},
      },
    });

    const d = diffSnapshots(prev, next);
    const admt = d.dimensions.find((x) => x.id === "admtReadiness");
    expect(admt).toEqual({ id: "admtReadiness", from: 0, to: 30, delta: 30 });
  });

  it("is deterministic and order-independent in its output", () => {
    const a = diffSnapshots(snap(), snap());
    const b = diffSnapshots(snap(), snap());
    expect(a).toEqual(b);
    expect(a.dimensions.map((d) => d.id)).toEqual(
      [...a.dimensions.map((d) => d.id)].sort(),
    );
  });
});
