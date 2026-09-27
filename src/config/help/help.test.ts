// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { PAGE_HELP, helpForPath } from "./pages";
import { GLOSSARY, glossaryTerm } from "./glossary";
import { GUIDES } from "./guides";
import { OFFICIAL_LINKS } from "./official-links";

/**
 * Pages under the dashboard that are not product areas a person "does work" on,
 * so they do not need a help entry of their own.
 */
const ROUTE_EXCLUDES = new Set(["test-failure"]);

function governanceRoutes(): string[] {
  const base = join(process.cwd(), "src", "app", "(dashboard)", "governance");
  const routes = ["/governance"]; // the dashboard root (page.tsx at the top)
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("[")) continue; // dynamic segment, not a landing route
    if (ROUTE_EXCLUDES.has(entry.name)) continue;
    if (existsSync(join(base, entry.name, "page.tsx"))) {
      routes.push(`/governance/${entry.name}`);
    }
  }
  return routes;
}

describe("page help registry", () => {
  it("every dashboard route has help content", () => {
    const missing = governanceRoutes().filter((route) => !helpForPath(route));
    expect(missing).toEqual([]);
  });

  it("every help entry is bilingual and complete", () => {
    for (const help of PAGE_HELP) {
      for (const field of [help.title, help.purpose, help.firstStep]) {
        expect(field.en.trim().length).toBeGreaterThan(0);
        expect(field.es.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every term a page names exists in the glossary", () => {
    for (const help of PAGE_HELP) {
      for (const id of help.terms) {
        expect(glossaryTerm(id), `${help.route} names unknown term "${id}"`).toBeTruthy();
      }
    }
  });

  it("a detail or new page falls back to its section's help", () => {
    expect(helpForPath("/governance/ai-registry/abc123")?.route).toBe("/governance/ai-registry");
    expect(helpForPath("/governance/assessments/new")?.route).toBe("/governance/assessments");
    // The root never swallows a child that has no entry of its own.
    expect(helpForPath("/governance")?.route).toBe("/governance");
    expect(helpForPath("/somewhere-else")).toBeNull();
  });

  it("routes are unique", () => {
    const routes = PAGE_HELP.map((h) => h.route);
    expect(new Set(routes).size).toBe(routes.length);
  });
});

describe("glossary", () => {
  it("has the eleven terms the product explains inline", () => {
    const required = [
      "stakeholder",
      "bias",
      "deployer",
      "provider",
      "high-risk",
      "conformity-assessment",
      "fria",
      "oversight-gate",
      "regime",
      "depth",
      "evidence",
    ];
    for (const id of required) {
      expect(glossaryTerm(id), `missing required term "${id}"`).toBeTruthy();
    }
  });

  it("every term has a label and a meaning in both languages", () => {
    for (const term of GLOSSARY) {
      for (const field of [term.label, term.meaning]) {
        expect(field.en.trim().length).toBeGreaterThan(0);
        expect(field.es.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("term ids are unique", () => {
    const ids = GLOSSARY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("guides", () => {
  it("the three guides exist with bilingual content", () => {
    expect(GUIDES.map((g) => g.slug).sort()).toEqual(["high-risk", "my-role", "which-rules"]);
    for (const guide of GUIDES) {
      expect(guide.title.en.trim().length).toBeGreaterThan(0);
      expect(guide.title.es.trim().length).toBeGreaterThan(0);
      expect(guide.lead.en.trim().length).toBeGreaterThan(0);
      expect(guide.lead.es.trim().length).toBeGreaterThan(0);
      expect(guide.sections.length).toBeGreaterThan(0);
      expect(guide.official.length).toBeGreaterThan(0);
    }
  });
});

describe("official links", () => {
  it("every link has an https href and a bilingual label", () => {
    for (const link of Object.values(OFFICIAL_LINKS)) {
      expect(link.href.startsWith("https://")).toBe(true);
      expect(link.label.en.trim().length).toBeGreaterThan(0);
      expect(link.label.es.trim().length).toBeGreaterThan(0);
    }
  });
});
