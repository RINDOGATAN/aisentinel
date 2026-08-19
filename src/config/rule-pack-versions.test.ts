// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  RULE_PACKS,
  rulePackVersions,
  rulePackList,
  type RulePackId,
} from "./rule-pack-versions";

const CALENDAR_VERSION = /^\d{4}\.\d{2}\.\d+$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("rule-pack version registry", () => {
  it("every pack declares a well-formed version", () => {
    for (const [id, pack] of Object.entries(RULE_PACKS)) {
      const ok = CALENDAR_VERSION.test(pack.version) || SEMVER.test(pack.version);
      expect(ok, `${id} version "${pack.version}"`).toBe(true);
    }
  });

  it("every pack declares an ISO lawReviewedAsOf that is a real date", () => {
    for (const [id, pack] of Object.entries(RULE_PACKS)) {
      expect(pack.lawReviewedAsOf, id).toMatch(ISO_DATE);
      const parsed = new Date(`${pack.lawReviewedAsOf}T00:00:00Z`);
      expect(Number.isNaN(parsed.getTime()), `${id} parses`).toBe(false);
    }
  });

  it("every pack declares its sign-off state explicitly", () => {
    for (const [id, pack] of Object.entries(RULE_PACKS)) {
      expect(["signed-off", "pending"], id).toContain(pack.signOff);
    }
  });

  it("the packs that carry unreviewed legal prose are marked pending", () => {
    // These two ship content that has not been through a sign-off round.
    // If a review lands, flip the flag here in the same commit.
    expect(RULE_PACKS["quickstart-compliance-baseline"].signOff).toBe("pending");
    expect(RULE_PACKS["program-guidance"].signOff).toBe("pending");
  });

  it("rulePackVersions() is a flat id → version map covering every pack", () => {
    const versions = rulePackVersions();
    const ids = Object.keys(RULE_PACKS) as RulePackId[];
    expect(Object.keys(versions).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      expect(versions[id]).toBe(RULE_PACKS[id].version);
    }
  });

  it("rulePackList() is sorted and carries the full descriptor", () => {
    const list = rulePackList();
    expect(list.map((p) => p.id)).toEqual([...list.map((p) => p.id)].sort());
    for (const entry of list) {
      expect(entry.version).toBe(RULE_PACKS[entry.id].version);
      expect(entry.lawReviewedAsOf).toBe(RULE_PACKS[entry.id].lawReviewedAsOf);
    }
  });

  it("covers the packs that feed generated artifacts", () => {
    // A pack that contributes to an exported artifact but is missing here
    // would make the methodology annex silently incomplete.
    const required: RulePackId[] = [
      "annex-iii-rules",
      "transparency-rules",
      "quickstart-compliance-baseline",
      "program-guidance",
      "lawfirm-ai-toolkit",
      "maturity-model",
    ];
    for (const id of required) {
      expect(Object.keys(RULE_PACKS)).toContain(id);
    }
  });
});
