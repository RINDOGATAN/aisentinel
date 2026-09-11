// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { EU_ART113_SUBTREE } from "./eu-timeline-requirements";
import { REQUIREMENT_SUPERSESSIONS, euRequirementId } from "./requirement-supersessions";

// What scripts/seed-frameworks.ts seeds today, read from its source: code →
// title. The seed is a script with side effects, so it cannot be imported.
const seedSource = readFileSync(
  fileURLToPath(new URL("../../scripts/seed-frameworks.ts", import.meta.url)),
  "utf8",
);
const seeded = new Map<string, string>();
for (const m of seedSource.matchAll(/code: "([^"]+)", title: "([^"]+)"/g)) seeded.set(m[1], m[2]);
seeded.set(EU_ART113_SUBTREE.code, EU_ART113_SUBTREE.title);
for (const c of EU_ART113_SUBTREE.children) seeded.set(c.code, c.title);

describe("requirement supersessions", () => {
  it("reads a plausible picture of the current seed", () => {
    expect(seeded.get("Art. 72")).toBe("Post-market monitoring by providers");
    expect(seeded.size).toBeGreaterThan(80);
  });

  it("has unique keys and one entry per retired or re-used row", () => {
    const keys = REQUIREMENT_SUPERSESSIONS.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    const froms = REQUIREMENT_SUPERSESSIONS.map((e) => e.fromId);
    expect(new Set(froms).size).toBe(froms.length);
  });

  it("derives ids with the seed's own formula", () => {
    expect(seedSource).toContain("euRequirementId(req.code)");
    expect(seedSource).toContain("euRequirementId(child.code)");
    expect(euRequirementId("Art. 113(c) — 2 Aug 2027")).toBe("eu-art--113-c----2-aug-2027");
    for (const e of REQUIREMENT_SUPERSESSIONS) {
      expect(e.fromId).toBe(euRequirementId(e.fromCode));
      expect(e.toId).toBe(euRequirementId(e.toCode));
    }
  });

  it("points every entry at a successor the seed still creates", () => {
    for (const e of REQUIREMENT_SUPERSESSIONS) {
      expect(seeded.has(e.toCode), `${e.key}: successor ${e.toCode}`).toBe(true);
    }
  });

  it("never retires a code the seed still creates", () => {
    // Deleting a row the seed re-creates on the next line would destroy every
    // organisation's links to it on every boot.
    for (const e of REQUIREMENT_SUPERSESSIONS.filter((x) => x.kind === "superseded")) {
      expect(seeded.has(e.fromCode), `${e.key}: ${e.fromCode} is still seeded`).toBe(false);
    }
  });

  it("marks a re-used code with titles it no longer carries", () => {
    for (const e of REQUIREMENT_SUPERSESSIONS.filter((x) => x.kind === "repurposed")) {
      expect(seeded.has(e.fromCode), `${e.key}: ${e.fromCode} must still be seeded`).toBe(true);
      expect(e.previousTitles.length, e.key).toBeGreaterThan(0);
      expect(e.previousTitles, e.key).not.toContain(seeded.get(e.fromCode));
    }
  });

  it("never chains a move into a retired row", () => {
    const retired = new Set(
      REQUIREMENT_SUPERSESSIONS.filter((e) => e.kind === "superseded").map((e) => e.fromId),
    );
    for (const e of REQUIREMENT_SUPERSESSIONS) expect(retired.has(e.toId), e.key).toBe(false);
  });

  it("dates every change to a real commit", () => {
    for (const e of REQUIREMENT_SUPERSESSIONS) {
      expect(Number.isNaN(Date.parse(e.changedAt)), e.key).toBe(false);
      expect(e.changedAt.endsWith("Z"), e.key).toBe(true);
      expect(e.commit).toMatch(/^[0-9a-f]{7,40}$/);
    }
  });

  it("covers the two rows the Digital Omnibus left behind", () => {
    const omnibus = REQUIREMENT_SUPERSESSIONS.filter((e) => e.commit === "fff628f");
    expect(omnibus.map((e) => [e.kind, e.fromCode, e.toCode])).toEqual([
      ["superseded", "Art. 113(c) — 2 Aug 2027", "Art. 113(c) — 2 Aug 2028"],
      ["repurposed", "Art. 113 — 2 Aug 2026", "Art. 113 — 2 Dec 2027"],
    ]);
  });
});
