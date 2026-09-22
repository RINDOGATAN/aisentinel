// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AIUC1_CROSSWALK,
  AIUC1_DOMAINS,
  AIUC1_FRAMEWORK,
  AIUC1_RETIRED,
  aiuc1CrossMappings,
  aiuc1RequirementDescription,
  allAiuc1Requirements,
  resolveEuArticle,
  resolveIsoClause,
  resolveNistSubcategory,
} from "./aiuc1-requirements";
import { euRequirementId } from "./requirement-supersessions";

const seedSource = readFileSync(join(process.cwd(), "scripts/seed-frameworks.ts"), "utf8");
const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

/** Every requirement id the three tier frameworks seed, read from the seed script itself. */
function seededTierIds(): Set<string> {
  const ids = new Set<string>();
  const codes = [...seedSource.matchAll(/\{ code: "([^"]+)"/g)].map((m) => m[1]);
  for (const code of codes) {
    if (code.startsWith("Art. ")) ids.add(euRequirementId(code));
    else if (/^(GOVERN|MAP|MEASURE|MANAGE)( \d+)?$/.test(code)) ids.add(`nist-${code.toLowerCase().replace(/\s+/g, "-")}`);
    else if (/^\d+(\.\d+)*$/.test(code)) ids.add(`iso-${code.toLowerCase().replace(/[^a-z0-9]/g, "-")}`);
  }
  return ids;
}

describe("AIUC-1 requirements", () => {
  const reqs = allAiuc1Requirements();

  it("seeds the six domains A to F with the standard's titles", () => {
    expect(AIUC1_DOMAINS.map((d) => `${d.code} ${d.title}`)).toEqual([
      "A Data & Privacy",
      "B Security",
      "C Safety",
      "D Reliability",
      "E Accountability",
      "F Society",
    ]);
  });

  it("carries the 51 requirements in force in the Q3 2026 release, and not the two retired ones", () => {
    expect(reqs).toHaveLength(51);
    expect(AIUC1_DOMAINS.map((d) => d.requirements.length)).toEqual([8, 10, 12, 4, 15, 2]);
    expect(reqs.filter((r) => r.application === "mandatory")).toHaveLength(43);
    expect(reqs.filter((r) => r.application === "supplemental").map((r) => r.code)).toEqual([
      "B002", "B003", "B005", "C007", "C008", "C009", "E013", "E017",
    ]);
    const codes = reqs.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const retired of Object.keys(AIUC1_RETIRED)) expect(codes).not.toContain(retired);
    for (const d of AIUC1_DOMAINS) for (const r of d.requirements) expect(r.code.startsWith(d.code)).toBe(true);
    expect(AIUC1_FRAMEWORK.version).toBe("2026-Q3");
  });

  it("keeps each paraphrase to one line and points at the standard's page", () => {
    for (const r of reqs) {
      expect(r.paraphrase.length, r.code).toBeLessThanOrEqual(160);
      expect(r.paraphrase, r.code).not.toMatch(/\n/);
      expect(aiuc1RequirementDescription(r)).toContain(`https://standard.aiuc-1.com/${r.path}`);
    }
  });

  it("is a framework code the database accepts, added in its own migration", () => {
    expect(schema).toMatch(/enum FrameworkCode \{[^}]*\bAIUC_1\b[^}]*\}/);
    const sql = readFileSync(
      join(process.cwd(), "prisma/migrations/20260922000100_framework_code_aiuc_1/migration.sql"),
      "utf8",
    );
    const statements = sql.split("\n").filter((l) => l.trim() && !l.startsWith("--"));
    expect(statements).toEqual([`ALTER TYPE "FrameworkCode" ADD VALUE 'AIUC_1';`]);
  });
});

describe("AIUC-1 crosswalks", () => {
  const codes = new Set(allAiuc1Requirements().map((r) => r.code));

  it("cites only requirements in force", () => {
    for (const code of Object.keys(AIUC1_CROSSWALK)) expect(codes.has(code), code).toBe(true);
  });

  it("resolves a cited clause to the seeded clause that contains it, and nothing else", () => {
    expect(resolveIsoClause("9.2.1")).toBe("iso-9-2");
    expect(resolveIsoClause("6.1.1")).toBe("iso-6-1");
    expect(resolveIsoClause("6.1.2")).toBe("iso-6-1-2");
    expect(resolveIsoClause("6.3")).toBeNull(); // not seeded; never widened to clause 6
    expect(resolveIsoClause("A.6.2.4")).toBeNull(); // Annex A is not seeded
    expect(resolveNistSubcategory("MEASURE 2.10")).toBe("nist-measure-2");
    expect(resolveEuArticle("Art. 9")).toBe("eu-art--9");
    expect(resolveEuArticle("Art. 20")).toBeNull();
  });

  it("maps every row to requirements that the seeds create", () => {
    const tier = seededTierIds();
    const mappings = aiuc1CrossMappings();
    expect(mappings).toHaveLength(186);
    const pairs = new Set<string>();
    for (const m of mappings) {
      expect(m.a).toMatch(/^aiuc1-[a-f]\d{3}$/);
      expect(tier.has(m.b), m.b).toBe(true);
      expect(m.relationship).toBe("related");
      expect(m.notes).toMatch(/https:\/\/standard\.aiuc-1\.com\/crosswalks\//);
      expect(pairs.has(`${m.a}|${m.b}`)).toBe(false);
      pairs.add(`${m.a}|${m.b}`);
    }
  });
});
