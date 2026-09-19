// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { afterEach, describe, expect, it, vi } from "vitest";
import { CROSS_MAPPINGS, HIGH_RISK_AUTO_MAPPED, SEEDED_TIER_FRAMEWORKS, docsCounts } from "./docs-counts";

// A client that accepts every call. Upserts of requirements are recorded so the
// seed scripts can be counted without a database.
const recorded: { frameworkId?: string; applicableTo?: string[] }[] = [];
const mappings: string[] = [];
function fakeClient(path: string[] = []): unknown {
  const fn = (...args: { create?: { applicableTo?: string[]; relationship?: string } }[]) => {
    const key = path.join(".");
    if (key === "complianceRequirement.upsert") recorded.push({ applicableTo: args[0].create?.applicableTo });
    if (key === "crossFrameworkMapping.upsert") mappings.push(String(args[0].create?.relationship));
    if (key.endsWith("count")) return Promise.resolve(0);
    if (key.endsWith("$transaction")) {
      const work = args[0] as unknown;
      return typeof work === "function" ? Promise.resolve(work(fakeClient())) : Promise.resolve([]);
    }
    if (key.endsWith("findUnique") || key.endsWith("findFirst")) return Promise.resolve({ id: "x" });
    return Promise.resolve(Object.assign([], { id: "x" }));
  };
  return new Proxy(fn, { get: (_t, p) => (p === "then" ? undefined : fakeClient([...path, String(p)])) });
}

vi.mock("@prisma/client", () => ({
  PrismaClient: function PrismaClient() {
    return fakeClient();
  },
  AIRiskLevel: {},
}));

async function runSeed(importer: () => Promise<unknown>, doneLine: RegExp) {
  const lines: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void lines.push(a.join(" ")));
  const errors: string[] = [];
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void errors.push(a.join(" ")));
  await importer();
  for (let i = 0; i < 200 && !lines.some((l) => doneLine.test(l)) && !errors.length; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
  log.mockRestore();
  expect(errors).toEqual([]);
  return lines;
}

afterEach(() => vi.restoreAllMocks());

describe("docs counts", () => {
  it("match the risk-tier seed script", async () => {
    recorded.length = 0;
    const lines = await runSeed(() => import("../../scripts/seed-frameworks"), /superseded requirement codes/);
    expect(lines).toContain(`  Created EU AI Act: ${SEEDED_TIER_FRAMEWORKS.EU_AI_ACT} requirements`);
    expect(lines).toContain(`  Created NIST AI RMF: ${SEEDED_TIER_FRAMEWORKS.NIST_AI_RMF} requirements`);
    expect(lines).toContain(`  Created ISO 42001: ${SEEDED_TIER_FRAMEWORKS.ISO_42001} requirements`);
    expect(recorded.filter((r) => r.applicableTo?.includes("HIGH"))).toHaveLength(HIGH_RISK_AUTO_MAPPED);
  });

  it("match the cross-framework mapping seed script", async () => {
    mappings.length = 0;
    await runSeed(() => import("../../scripts/seed-cross-framework-mappings"), /- Related:/);
    const by = (r: string) => mappings.filter((m) => m === r).length;
    expect({ equivalent: by("equivalent"), partial: by("partial"), related: by("related") }).toEqual(CROSS_MAPPINGS);
  });

  it("state the totals the docs quote", () => {
    const c = docsCounts();
    expect(c.frameworks).toBe(8);
    expect(c.requirements).toBe(294);
    expect(c.crossMappings).toBe(115);
    expect(c.unifiedQuestions).toBe(53);
    expect(c.unifiedSections).toBe(10);
    expect(c.agenticFindings).toBe(11);
    expect(c.industries).toBe(9);
  });
});
