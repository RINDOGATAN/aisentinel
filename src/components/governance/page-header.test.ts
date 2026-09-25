// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one page-header pattern (page-header.tsx), checked on the source: the
 * pages with actions use it, its row never wraps, and a locked download
 * explains itself once per page rather than under each button.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PAGE_HEADER_ACTIONS } from "./page-header";

const ROOT = "src/app/(dashboard)/governance";

/** Every list page whose header carries actions (surveyed 25 Sep 2026). */
const PAGES_WITH_ACTIONS = [
  ".", // the dashboard (the client switcher, Classic)
  "ai-registry",
  "assessments",
  "audit",
  "board",
  "clients",
  "compliance",
  "incidents",
  "oversight",
  "policies",
  "portfolio",
  "program",
  "shadow-ai",
  "threat-model",
  "vendors",
];

const read = (dir: string) => readFileSync(join(ROOT, dir, "page.tsx"), "utf8");

function allFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? allFiles(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

describe("the page header", () => {
  it("is used by every list page whose header has actions", () => {
    for (const dir of PAGES_WITH_ACTIONS) {
      const src = read(dir);
      expect(src, dir).toContain("<PageHeader");
      // The title is the header's, not a second h1 beside it.
      expect(src.match(/<h1\b/g) ?? [], dir).toHaveLength(dir === "shadow-ai" ? 1 : 0);
    }
  });

  it("keeps its actions on one row that never wraps", () => {
    const classes = PAGE_HEADER_ACTIONS.split(/\s+/);
    expect(classes).toContain("flex-nowrap");
    expect(classes).not.toContain("flex-wrap");
    // On a phone the row is full width and the main (last) action takes what is left.
    expect(classes).toContain("w-full");
    expect(classes).toContain("[&>*:last-child]:flex-1");
  });

  it("gives its actions no small buttons, so every action has the same height", () => {
    for (const dir of PAGES_WITH_ACTIONS) {
      const src = read(dir);
      const start = src.indexOf("<PageHeader");
      const header = src.slice(start, src.indexOf("/>\n", src.indexOf("actions=", start)));
      expect(header, dir).not.toMatch(/size="sm"/);
    }
  });
});

/** Every detail page (one record), surveyed 25 Sep 2026. */
const DETAIL_PAGES = [
  "ai-registry/[id]",
  "assessments/[id]",
  "incidents/[id]",
  "oversight/[id]",
  "policies/[id]",
  "proceedings/[id]",
  "sensitive-data/[id]",
  "shadow-ai/[id]",
  "threat-model/[id]",
  "vendor-catalog/[slug]",
  "vendors/[id]",
];

describe("the detail-page header", () => {
  it("is the same header, with the way back to its list", () => {
    for (const dir of DETAIL_PAGES) {
      const src = read(dir);
      expect(src, dir).toContain("<PageHeader");
      expect(src, dir).toMatch(/back=\{\{ href: "\/governance\//);
      expect(src.match(/<h1\b/g) ?? [], dir).toHaveLength(0);
    }
  });

  it("keeps every header action the same height, status-dependent ones included", () => {
    for (const dir of DETAIL_PAGES) {
      const src = read(dir);
      const start = src.indexOf("<PageHeader");
      const end = src.indexOf("\n      />", start);
      const actions = src.slice(src.indexOf("actions=", start), end);
      if (!src.slice(start, end).includes("actions=")) continue;
      expect(actions, dir).not.toMatch(/size="sm"/);
    }
  });
});

describe("locked downloads", () => {
  it("explain themselves in one line per page, never under each button", () => {
    const users = allFiles("src").filter((f) =>
      readFileSync(f, "utf8").includes('t("lockedHint"'),
    );
    expect(users).toEqual(["src/components/governance/premium-deliverable.tsx"]);
    const program = read("program");
    expect(program.match(/<LicenceNote\b/g) ?? []).toHaveLength(1);
    expect(program.match(/<DeliverablesMenu\b/g) ?? []).toHaveLength(1);
    expect(program).not.toContain("PremiumDeliverable");
  });

  it("puts the program page's downloads in one Download menu, after the places to go", () => {
    const program = read("program");
    const history = program.indexOf('href="/governance/program/history"');
    const menu = program.indexOf("<DeliverablesMenu");
    expect(history).toBeGreaterThan(0);
    expect(menu).toBeGreaterThan(history);
  });
});
