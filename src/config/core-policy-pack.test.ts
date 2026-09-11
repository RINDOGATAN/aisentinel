// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  CORE_POLICY_PACK,
  CORE_POLICY_PACK_VERSION,
  CORE_POLICY_LAW_REVIEWED_AS_OF,
  CORE_POLICY_REVIEW_MARKER,
  CORE_POLICY_TYPES,
  corePoliciesMissingFrom,
  localizeCorePolicy,
  type Localized,
} from "./core-policy-pack";

// Mirror the six scorecard types locally so the test stays hermetic.
const SCORECARD_TYPES = [
  "AI_USAGE",
  "AI_GOVERNANCE",
  "AI_TRANSPARENCY",
  "AI_DATA_GOVERNANCE",
  "AI_PROCUREMENT",
  "AI_INCIDENT_RESPONSE",
];

const EXPECTED_IDS = [
  "core-ai-use",
  "core-ai-governance",
  "core-ai-transparency",
  "core-ai-data-governance",
  "core-ai-procurement",
  "core-ai-incident-response",
];

/** Every Localized field of every policy, labelled for failure messages. */
function allLocalized(): Array<{ path: string; l: Localized }> {
  return CORE_POLICY_PACK.flatMap((p) => [
    { path: `${p.id}.title`, l: p.title },
    { path: `${p.id}.description`, l: p.description },
    { path: `${p.id}.content`, l: p.content },
  ]);
}

describe("core policy pack: shape", () => {
  it("has exactly six policies with unique, expected ids", () => {
    expect(CORE_POLICY_PACK).toHaveLength(6);
    const ids = CORE_POLICY_PACK.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("covers exactly the six scorecard policy types, one each", () => {
    const types = CORE_POLICY_PACK.map((p) => p.type);
    expect(new Set(types).size).toBe(6);
    expect([...types].sort()).toEqual([...SCORECARD_TYPES].sort());
    expect([...CORE_POLICY_TYPES].sort()).toEqual([...SCORECARD_TYPES].sort());
  });

  it("has unique titles in each language (titles are the dedupe key)", () => {
    for (const locale of ["en", "es"] as const) {
      const titles = CORE_POLICY_PACK.map((p) => p.title[locale]);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });

  it("carries a version and the review date", () => {
    expect(CORE_POLICY_PACK_VERSION).toMatch(/^\d{4}\.\d{2}\.\d+$/);
    expect(CORE_POLICY_LAW_REVIEWED_AS_OF).toBe("2026-09-11");
  });
});

describe("core policy pack: localisation", () => {
  it("every title, description and content is non-empty in both languages and Spanish differs from English", () => {
    for (const { path, l } of allLocalized()) {
      expect(l.en.trim().length, `${path}.en empty`).toBeGreaterThan(0);
      expect(l.es.trim().length, `${path}.es empty`).toBeGreaterThan(0);
      expect(l.es, `${path} Spanish identical to English`).not.toBe(l.en);
    }
  });

  it("every content ends with the review marker in its own language", () => {
    for (const p of CORE_POLICY_PACK) {
      expect(p.content.en.endsWith(CORE_POLICY_REVIEW_MARKER.en), p.id).toBe(true);
      expect(p.content.es.endsWith(CORE_POLICY_REVIEW_MARKER.es), p.id).toBe(true);
    }
  });

  it("the marker states the review date and that legal sign-off is pending", () => {
    expect(CORE_POLICY_REVIEW_MARKER.en).toBe(
      "Law reviewed as of 2026-09-11; legal sign-off pending.",
    );
    expect(CORE_POLICY_REVIEW_MARKER.es).toBe(
      "Revisión jurídica a fecha de 2026-09-11; pendiente de validación jurídica.",
    );
  });

  it("Spanish never uses 'usted' (Castilian register, tú where the reader is addressed)", () => {
    for (const { path, l } of allLocalized()) {
      expect(/usted/i.test(l.es), path).toBe(false);
    }
  });

  it("Spanish avoids Latin American vocabulary", () => {
    const banned = [/computadora/i, /\bcelular\b/i, /\bingresar\b/i, /\bplanilla\b/i];
    for (const { path, l } of allLocalized()) {
      for (const re of banned) {
        expect(re.test(l.es), `${path} matches ${re}`).toBe(false);
      }
    }
  });

  it("localizeCorePolicy resolves plain strings in the requested locale", () => {
    const p = CORE_POLICY_PACK[0];
    expect(localizeCorePolicy(p, "en")).toEqual({
      title: p.title.en,
      type: p.type,
      description: p.description.en,
      content: p.content.en,
    });
    expect(localizeCorePolicy(p, "es")).toEqual({
      title: p.title.es,
      type: p.type,
      description: p.description.es,
      content: p.content.es,
    });
  });
});

describe("core policy pack: style and substance", () => {
  it("contains no long dashes anywhere", () => {
    for (const { path, l } of allLocalized()) {
      for (const text of [l.en, l.es]) {
        expect(text.includes("—"), `${path} has an em dash`).toBe(false);
        expect(text.includes("–"), `${path} has an en dash`).toBe(false);
      }
    }
  });

  it("is plain text with no markdown symbols", () => {
    for (const { path, l } of allLocalized()) {
      for (const text of [l.en, l.es]) {
        expect(/(^|\n)\s*#/.test(text), `${path} has a markdown heading`).toBe(false);
        expect(text.includes("**"), `${path} has markdown bold`).toBe(false);
      }
    }
  });

  it("each English policy is a usable draft of at least 1500 characters", () => {
    for (const p of CORE_POLICY_PACK) {
      expect(p.content.en.length, p.id).toBeGreaterThanOrEqual(1500);
    }
  });

  it("each content uses paragraph breaks and names the organisation neutrally", () => {
    for (const p of CORE_POLICY_PACK) {
      expect(p.content.en.split("\n\n").length, p.id).toBeGreaterThan(6);
      expect(p.content.en).toContain("the organisation");
      expect(p.content.es).toContain("la organización");
    }
  });

  it("cites the final AI Act numbering, not the draft numbering", () => {
    // Draft-era numbers: Art. 52 (transparency), Art. 62 (incident reporting),
    // Art. 29 (deployer duties). The final text uses 50, 73 and 26.
    for (const p of CORE_POLICY_PACK) {
      expect(/Article (29|52|62)\b/.test(p.content.en), p.id).toBe(false);
      expect(/artículo (29|52|62)\b/.test(p.content.es), p.id).toBe(false);
    }
  });

  it("never presents Annex III high-risk obligations as already applying", () => {
    for (const p of CORE_POLICY_PACK) {
      if (!p.content.en.includes("Annex III")) continue;
      expect(/Annex III[^.]*applied since/i.test(p.content.en), p.id).toBe(false);
    }
    const governance = CORE_POLICY_PACK.find((p) => p.type === "AI_GOVERNANCE")!;
    expect(governance.content.en).toContain("from 2 December 2027");
    expect(governance.content.es).toContain("a partir del 2 de diciembre de 2027");
  });
});

describe("corePoliciesMissingFrom", () => {
  it("returns the other four when governance and transparency are present", () => {
    const missing = corePoliciesMissingFrom(["AI_GOVERNANCE", "AI_TRANSPARENCY"]);
    expect(missing).toHaveLength(4);
    expect(missing.map((p) => p.type).sort()).toEqual(
      ["AI_DATA_GOVERNANCE", "AI_INCIDENT_RESPONSE", "AI_PROCUREMENT", "AI_USAGE"],
    );
  });

  it("returns all six for an empty set and none when every type is present", () => {
    expect(corePoliciesMissingFrom([])).toHaveLength(6);
    expect(corePoliciesMissingFrom(SCORECARD_TYPES)).toHaveLength(0);
  });

  it("ignores types outside the core six and accepts any iterable", () => {
    const missing = corePoliciesMissingFrom(new Set(["AI_ETHICS", "CUSTOM", "AI_USAGE"]));
    expect(missing).toHaveLength(5);
    expect(missing.some((p) => p.type === "AI_USAGE")).toBe(false);
  });
});
