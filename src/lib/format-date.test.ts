// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { formatDateIn, formatDateTimeIn, formatDayIn } from "./format-date";

describe("dates with the month as a word", () => {
  it("writes a day in both languages", () => {
    expect(formatDayIn("en", "2026-08-18")).toBe("Aug 18, 2026");
    expect(formatDayIn("es", "2026-08-18")).toBe("18 ago 2026");
  });

  it("does not move a calendar day with the time zone", () => {
    expect(formatDayIn("en", "2026-01-01")).toBe("Jan 1, 2026");
  });

  it("returns an unreadable value unchanged", () => {
    expect(formatDayIn("en", "soon")).toBe("soon");
  });

  it("never writes the date as numbers", () => {
    const at = new Date("2026-10-12T12:00:00Z");
    for (const locale of ["en", "es"]) {
      expect(formatDateIn(locale, at)).not.toMatch(/\d+\/\d+\/\d+/);
      expect(formatDateTimeIn(locale, at)).not.toMatch(/\d+\/\d+\/\d+/);
    }
  });
});

/** Screens go through the shared helper; a bare toLocale*String() follows the browser. */
describe("no screen formats a date on its own", () => {
  const roots = ["src/app", "src/components"];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".tsx") && !p.includes(".test.")) files.push(p);
    }
  };
  roots.forEach(walk);

  it("has no bare toLocaleDateString() or toLocaleString() on a date", () => {
    const hits = files.flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .map((line, i) => [f, i + 1, line] as const)
        .filter(([, , line]) => /new Date\([^)]*\)\.toLocale(Date)?String\((locale)?\)/.test(line)),
    );
    expect(hits).toEqual([]);
  });
});
