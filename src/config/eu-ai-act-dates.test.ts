// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EU_AI_ACT_DATES,
  UNSUPPORTED_EU_AI_ACT_DATES,
  euAiActDate,
  type EuAiActDateId,
} from "./eu-ai-act-dates";
import { EU_ART113_SUBTREE } from "./eu-timeline-requirements";
import { REGULATORY_MILESTONES } from "./regulatory-milestones";
import {
  ART50_APPLICABLE_FROM,
  ART50_MARKING_GRACE_DEADLINE,
} from "./transparency-rules";
import { LEGAL_SIGNOFF } from "./legal-signoff";
import frameworks from "@/content/frameworks/frameworks.json";

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
/** "2027-12-02" -> "2 December 2027", the form the seeded prose uses. */
function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// Each date of application, pinned to the provision that sets it, as verified
// against the official text of Regulation (EU) 2026/1744 (EUR-Lex, OJ L of
// 24 July 2026, in force 27 July 2026). Changing a row here is a legal change.
const PINNED: [EuAiActDateId, string, RegExp][] = [
  ["entry-into-force", "2024-08-01", /^Art\. 113, first paragraph$/],
  ["chapters-i-ii", "2025-02-02", /^Art\. 113, third paragraph, point \(a\)$/],
  ["gpai-governance-penalties", "2025-08-02", /^Art\. 113, third paragraph, point \(b\)$/],
  ["omnibus-arts-102-110", "2026-07-27", /^Art\. 113, third paragraph, point \(d\), inserted by Regulation \(EU\) 2026\/1744$/],
  ["general-application", "2026-08-02", /^Art\. 113, second paragraph$/],
  ["new-art5-prohibitions", "2026-12-02", /point \(a\), as amended by Regulation \(EU\) 2026\/1744: Art\. 5\(1\), first subparagraph, points \(ba\) and \(bb\), and Art\. 5\(1a\) and \(1b\)$/],
  ["art50-2-legacy-generative", "2026-12-02", /^Art\. 111\(4\), inserted by Regulation \(EU\) 2026\/1744$/],
  ["sandboxes-operational", "2027-08-02", /^Art\. 57\(1\), as amended by Regulation \(EU\) 2026\/1744$/],
  ["annex-iii-high-risk", "2027-12-02", /point \(c\), as amended by Regulation \(EU\) 2026\/1744 \(Art\. 6\(2\) and Annex III\)$/],
  ["annex-i-high-risk", "2028-08-02", /point \(c\), as amended by Regulation \(EU\) 2026\/1744 \(Art\. 6\(1\) and Annex I\)$/],
  ["public-authority-high-risk", "2030-08-02", /^Art\. 111\(2\), as amended by Regulation \(EU\) 2026\/1744$/],
];

describe("EU AI Act dates after the Digital Omnibus", () => {
  it("pins every date to its provision", () => {
    expect(Object.keys(EU_AI_ACT_DATES).sort()).toEqual(PINNED.map(([id]) => id).sort());
    for (const [id, date, provision] of PINNED) {
      expect(EU_AI_ACT_DATES[id].date, id).toBe(date);
      expect(EU_AI_ACT_DATES[id].provision, id).toMatch(provision);
      expect(euAiActDate(id).toISOString().slice(0, 10)).toBe(date);
      // A date the amendment set must say so in its citation.
      expect(EU_AI_ACT_DATES[id].provision.includes("2026/1744"), id).toBe(
        EU_AI_ACT_DATES[id].setByOmnibus,
      );
    }
  });

  it("agrees with the two Art. 50 dates owned by transparency-rules", () => {
    expect(euAiActDate("general-application")).toEqual(ART50_APPLICABLE_FROM);
    expect(euAiActDate("art50-2-legacy-generative")).toEqual(ART50_MARKING_GRACE_DEADLINE);
  });

  it("drives the EU milestones on the obligations calendar", () => {
    const byId = new Map(REGULATORY_MILESTONES.map((m) => [m.id, m]));
    const expected: [string, EuAiActDateId, string][] = [
      ["eu-ai-act-prohibitions-literacy", "chapters-i-ii", "point (a)"],
      ["eu-ai-act-gpai-governance", "gpai-governance-penalties", "point (b)"],
      ["eu-ai-act-art50-transparency", "general-application", "second paragraph"],
      ["eu-ai-act-art50-marking-grace", "art50-2-legacy-generative", "Art. 111(4)"],
      ["eu-ai-act-art5-new-prohibitions", "new-art5-prohibitions", "points (ba) and (bb)"],
      ["eu-ai-act-annex-iii-high-risk", "annex-iii-high-risk", "Annex III"],
      ["eu-ai-act-annex-i-high-risk", "annex-i-high-risk", "Annex I"],
      ["eu-ai-act-public-authority-high-risk", "public-authority-high-risk", "Art. 111(2)"],
    ];
    for (const [milestoneId, dateId, cites] of expected) {
      const m = byId.get(milestoneId);
      expect(m, milestoneId).toBeDefined();
      expect(m!.date, milestoneId).toBe(EU_AI_ACT_DATES[dateId].date);
      expect(m!.citation, milestoneId).toContain(cites);
      expect(m!.lawReviewedAsOf, milestoneId).toBe(LEGAL_SIGNOFF.EU_AI_ACT.lawReviewedAsOf);
    }
    // Every EU milestone is accounted for above.
    const eu = REGULATORY_MILESTONES.filter((m) => m.instrument === "eu-ai-act").map((m) => m.id);
    expect(eu.sort()).toEqual(expected.map(([id]) => id).sort());
  });

  it("is stated, with its provision, in the seeded Art. 113 rows", () => {
    const child = (code: string) => {
      const row = EU_ART113_SUBTREE.children.find((c) => c.code === code);
      expect(row, code).toBeDefined();
      return row!.description;
    };
    const d = (id: EuAiActDateId) => longDate(EU_AI_ACT_DATES[id].date);

    expect(EU_ART113_SUBTREE.description).toContain(d("entry-into-force"));
    expect(EU_ART113_SUBTREE.description).toContain(`${d("omnibus-arts-102-110")} (Art. 113, third paragraph, point (d))`);
    expect(EU_ART113_SUBTREE.description).toContain(`${d("sandboxes-operational")} (Art. 57(1))`);
    expect(EU_ART113_SUBTREE.description).toContain(`${d("public-authority-high-risk")} (Art. 111(2))`);

    const a = child("Art. 113(a) — 2 Feb 2025");
    expect(a).toContain(`${d("chapters-i-ii")} (Art. 113, third paragraph, point (a))`);
    expect(a).toContain("points (ba) and (bb), and Art. 5(1a) and (1b), which apply from " + d("new-art5-prohibitions"));

    expect(child("Art. 113(b) — 2 Aug 2025")).toContain(`${d("gpai-governance-penalties")} (Art. 113, third paragraph, point (b))`);

    const general = child("Art. 113 — 2 Aug 2026");
    expect(general).toContain(`${d("general-application")}, the general date of application (Art. 113, second paragraph)`);
    expect(general).toContain(`by ${d("art50-2-legacy-generative")} (Art. 111(4)`);

    expect(child("Art. 5 — 2 Dec 2026")).toContain(`${d("new-art5-prohibitions")} (Art. 113, third paragraph, point (a), as amended`);

    const annexIii = child("Art. 113 — 2 Dec 2027");
    expect(annexIii).toContain(`${d("annex-iii-high-risk")} (Art. 113, third paragraph, point (c), as amended`);
    expect(annexIii).toContain("except Art. 6(5), apply to high-risk systems under Art. 6(2) and Annex III");

    const annexI = child("Art. 113(c) — 2 Aug 2028");
    expect(annexI).toContain(`${d("annex-i-high-risk")} (Art. 113, third paragraph, point (c), as amended`);
    expect(annexI).toContain("except Art. 6(5), apply to high-risk systems under Art. 6(1) and Annex I");
  });

  it("is stated in the Frameworks data, sourced to Regulation (EU) 2026/1744", () => {
    const eu = frameworks.frameworks.find((f) => f.id === "eu-ai-act");
    expect(eu).toBeDefined();
    const cell = (eu!.cells as Record<string, { summary: string; note?: string; source: { ref: string; url: string } }>).dates;
    const text = `${cell.summary} ${cell.note ?? ""}`;
    for (const { date } of Object.values(EU_AI_ACT_DATES)) {
      expect(text, date).toContain(date);
    }
    expect(cell.source.url).toBe("https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng");
    expect(cell.source.ref).toContain("Art. 113");
    expect(cell.source.ref).toContain("Art. 111");
    expect(cell.source.ref).toContain("2026/1744");
    for (const cites of ["Art. 113(a)", "Art. 113(c)", "Art. 113(d)", "Art. 111(4)", "Art. 111(2)", "Art. 57(1)"]) {
      expect(cell.note, cites).toContain(cites);
    }
  });

  it("never states a date the text does not contain", () => {
    const sources = {
      "seeded Art. 113 rows": JSON.stringify(EU_ART113_SUBTREE),
      "EU milestones": JSON.stringify(
        REGULATORY_MILESTONES.filter((m) => m.instrument === "eu-ai-act"),
      ),
      "scripts/seed-frameworks.ts": read("../../scripts/seed-frameworks.ts"),
      "scripts/seed-cross-framework-mappings.ts": read("../../scripts/seed-cross-framework-mappings.ts"),
      "frameworks.json": JSON.stringify(frameworks),
      "core-policy-pack.ts": read("./core-policy-pack.ts"),
      "transparency-rules.ts": read("./transparency-rules.ts"),
      "en.json": read("../i18n/messages/en.json"),
      "es.json": read("../i18n/messages/es.json"),
      "public/llms-full.txt": read("../../public/llms-full.txt"),
    };
    for (const { date } of UNSUPPORTED_EU_AI_ACT_DATES) {
      const [y, m, d] = date.split("-").map(Number);
      const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      const forms = [
        date,
        longDate(date),
        `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`,
        `${d} de ${MESES[m - 1]} de ${y}`,
      ];
      for (const [name, text] of Object.entries(sources)) {
        for (const form of forms) {
          expect(text.includes(form), `${name} states "${form}"`).toBe(false);
        }
      }
    }
  });
});
