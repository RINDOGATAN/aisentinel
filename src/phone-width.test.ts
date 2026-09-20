// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The signed-in product must not scroll sideways on a phone.
 *
 * The rule, in full: at 390 pixels wide the page body never scrolls
 * horizontally. A table, a wide diagram or a tab strip may scroll inside its
 * own container, and that container must be visibly scrollable rather than
 * simply clipped. Everything else stacks.
 *
 * This repository has no browser in its test command, so this check reads the
 * signed-in source instead of measuring a rendered page. It looks for the four
 * layout patterns that are known to widen the body, and it fails on any new
 * one. Every exception is named below with the reason it is safe. A source
 * check is weaker than a measurement: it is here so that a fix stays fixed,
 * not as evidence that a given screen renders correctly.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/app/(dashboard)", "src/components"] as const;

/** Public marketing and documentation screens are covered by their own checks. */
const SKIPPED_DIRECTORIES = ["src/components/docs"];

/**
 * Each entry says which rule is waived for which file, and why it is safe at
 * 390 pixels. Nothing is waived without a reason a reader can check.
 */
const ALLOWED: { file: string; rule: RuleId; because: string }[] = [
  {
    file: "src/components/governance/program/ProgramMap.tsx",
    rule: "wide-box",
    because:
      "The governance map is a diagram with a 720 pixel minimum, and it may keep it. " +
      "The element that wraps it carries overflow-x-auto, ten lines above the minimum " +
      "itself, which is further than this check reads, so the waiver stands in for what " +
      "a reader can see at ProgramMap.tsx line 260.",
  },
  {
    file: "src/components/skeletons/list-page-skeleton.tsx",
    rule: "fixed-width",
    because:
      "The loading placeholders are grey bars with no text in them, each one narrower " +
      "than the content column of a 390 pixel phone, so none of them can widen the page.",
  },
];

/**
 * Menus, dialogs, sheets and select lists are drawn in a layer of their own,
 * above the page and away from its flow, so a width set on one of them says
 * nothing about how wide the page is.
 */
const OVERLAY_SURFACE =
  /<(DropdownMenu|Select|Popover|Dialog|Sheet|Command|Tooltip|HoverCard)[A-Za-z]*Content\b/;

type RuleId = "bare-multi-column" | "fixed-width" | "tab-strip" | "wide-box";

interface Violation {
  file: string;
  line: number;
  rule: RuleId;
  text: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (SKIPPED_DIRECTORIES.some((d) => path.startsWith(d))) continue;
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith(".tsx") && !path.endsWith(".test.tsx")) out.push(path);
  }
  return out;
}

const FILES = ROOTS.flatMap((r) => walk(r)).sort();

/** Tailwind width steps from w-40 (160 px) up: too wide to pin on a phone. */
const WIDE_STEP = /(?<![-:\w])w-(40|44|48|52|56|60|64|72|80|96)(?![\w.[/-])/;
/** An arbitrary pixel width of 120 px or more, pinned with no breakpoint. */
const WIDE_PIXELS = /(?<![-:\w])w-\[(\d{3,})px\]/;
/** A column count of three or more with no breakpoint in front of it. */
const BARE_MULTI_COLUMN = /(?<![-:\w])grid-cols-([3-9]|1[0-2])(?![\d])/;
/** A minimum width of 200 px or more, from a class or from an inline style. */
const WIDE_MINIMUM = /(?<![-:\w])min-w-\[(\d{3,})px\]|minWidth:\s*(\d{3,})/;

const SCROLLS = /overflow-x-auto|overflow-auto|overflow-x-scroll/;

function widthOf(match: RegExpMatchArray): number {
  return Number(match[1] ?? match[2] ?? 0);
}

function scan(): Violation[] {
  const found: Violation[] = [];

  for (const file of FILES) {
    const lines = readFileSync(file, "utf8").split("\n");

    lines.forEach((line, index) => {
      if (OVERLAY_SURFACE.test(line)) return;
      const at = (rule: RuleId) =>
        found.push({ file, line: index + 1, rule, text: line.trim().slice(0, 120) });

      // A counter or statistic grid must start at one or two columns and only
      // widen at a breakpoint.
      if (BARE_MULTI_COLUMN.test(line)) at("bare-multi-column");

      // A control pinned to a width wider than a phone's content column. The
      // responsive form the tree uses elsewhere is w-full sm:w-[...].
      const pixels = line.match(WIDE_PIXELS);
      if ((WIDE_STEP.test(line) || (pixels && widthOf(pixels) >= 120)) && !/w-full/.test(line)) {
        at("fixed-width");
      }

      // A tab strip may scroll inside itself; it may not widen the page.
      if (/<TabsList\b/.test(line)) {
        const tag = lines.slice(index, index + 4).join(" ");
        const open = tag.slice(0, tag.indexOf(">") + 1);
        if (!SCROLLS.test(open)) at("tab-strip");
      }

      // A table or a diagram may keep its minimum width, inside a box that
      // scrolls on its own. The box is the element that opens just above it.
      const minimum = line.match(WIDE_MINIMUM);
      if (minimum && widthOf(minimum) >= 200) {
        const context = lines.slice(Math.max(0, index - 6), index + 1).join(" ");
        if (!SCROLLS.test(context)) at("wide-box");
      }
    });
  }

  return found.filter(
    (v) => !ALLOWED.some((a) => a.file === v.file && a.rule === v.rule)
  );
}

describe("no sideways scrolling on a phone, signed in", () => {
  it("reads every signed-in component", () => {
    expect(FILES.length).toBeGreaterThan(60);
    expect(FILES).toContain("src/components/dashboard-shell.tsx");
    expect(FILES).toContain("src/app/(dashboard)/governance/page.tsx");
  });

  it("finds no layout that widens the page body at 390 px", () => {
    const violations = scan();
    const report = violations
      .map((v) => `  ${v.rule}  ${v.file}:${v.line}\n    ${v.text}`)
      .join("\n");
    expect(report, `Layouts that can widen the page on a phone:\n${report}`).toBe("");
  });

  it("states a reason for every exception, and keeps each one real", () => {
    for (const a of ALLOWED) {
      expect(a.because.length).toBeGreaterThan(40);
      expect(FILES).toContain(a.file);
    }
  });

  it("leaves the overlay layer alone", () => {
    expect(OVERLAY_SURFACE.test('<DropdownMenuContent className="min-w-[200px]">')).toBe(true);
    expect(OVERLAY_SURFACE.test('<SheetContent side="left" className="w-[300px] sm:w-[320px]">')).toBe(true);
    expect(OVERLAY_SURFACE.test('<div className="grid grid-cols-4">')).toBe(false);
  });

  it("would catch a counter grid, a pinned control, a bare tab strip and an unboxed table", () => {
    expect(BARE_MULTI_COLUMN.test('className="grid grid-cols-4 gap-2"')).toBe(true);
    expect(BARE_MULTI_COLUMN.test('className="grid grid-cols-2 sm:grid-cols-4"')).toBe(false);
    expect(WIDE_STEP.test('<SelectTrigger className="w-56">')).toBe(true);
    expect(WIDE_STEP.test('<SelectTrigger className="w-full sm:w-56">')).toBe(false);
    expect(WIDE_PIXELS.test('className="w-[160px] h-7"')).toBe(true);
    expect(WIDE_MINIMUM.test('<table className="w-full min-w-[600px]">')).toBe(true);
    expect(SCROLLS.test('className="w-full justify-start overflow-x-auto"')).toBe(true);
  });
});
