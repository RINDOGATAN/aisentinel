// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Form controls must be visible before anything is typed or ticked.
 *
 * Unlike `theme-contrast.test.ts`, which lists fixed pairs, this test reads the
 * tokens straight from `globals.css`, in both the `:root` and `.dark` blocks,
 * so lowering `--input` or `--input-fill` there fails here at once.
 *
 * - The edge of a field, select, tick box or outline button (`--input`) is a
 *   non-text mark that tells the reader where to act: 3:1 against every
 *   surface a control sits on, and against the control's own fill.
 * - Typed text and placeholder text inside a field: 4.5:1 on the fill.
 * - The UI primitives use the tokens rather than a transparent fill.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AA_NON_TEXT, AA_TEXT, contrastRatio } from "@/lib/contrast";

const ROOT = path.resolve(__dirname, "../..");
const CSS = readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");

/** The custom properties declared in the first block that opens with `selector {`. */
function tokens(selector: string): Record<string, string> {
  const start = CSS.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block in globals.css`);
  const end = CSS.indexOf("\n}", start);
  const body = CSS.slice(start, end);
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

function primitive(file: string): string {
  return readFileSync(path.join(ROOT, "src/components/ui", file), "utf8");
}

for (const selector of [":root", ".dark"]) {
  const t = tokens(selector);

  describe(`form controls are visible (${selector})`, () => {
    it("declares the control tokens", () => {
      for (const name of ["input", "input-fill", "background", "card", "muted", "foreground", "muted-foreground"]) {
        expect(t[name], `--${name} in ${selector}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    });

    const edgeOn: [string, string][] = [
      ["the page", "background"],
      ["a card", "card"],
      ["a popover", "popover"],
      ["the muted surface", "muted"],
      ["the field's own fill", "input-fill"],
    ];
    for (const [where, token] of edgeOn) {
      it(`the control edge reaches ${AA_NON_TEXT}:1 on ${where}`, () => {
        const ratio = contrastRatio(t.input, t[token]);
        expect(ratio, `--input ${t.input} on --${token} ${t[token]}`).toBeGreaterThanOrEqual(AA_NON_TEXT);
      });
    }

    it(`typed text reaches ${AA_TEXT}:1 on the field fill`, () => {
      expect(contrastRatio(t.foreground, t["input-fill"])).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it(`placeholder text reaches ${AA_TEXT}:1 on the field fill`, () => {
      expect(contrastRatio(t["muted-foreground"], t["input-fill"])).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it(`placeholder text reaches ${AA_TEXT}:1 on a hovered select (the muted surface)`, () => {
      expect(contrastRatio(t["muted-foreground"], t.muted)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it("the empty field is not the same colour as the card it sits on", () => {
      expect(t["input-fill"]).not.toBe(t.card);
      expect(t["input-fill"]).not.toBe(t.background);
    });

    it(`a ticked box (the brand amber) reaches ${AA_NON_TEXT}:1 on a card`, () => {
      expect(contrastRatio(t.primary, t.card)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });
  });
}

describe("the primitives use the control tokens", () => {
  const cases: [string, RegExp[]][] = [
    ["input.tsx", [/\bborder-input\b/, /\bbg-input-fill\b/]],
    ["textarea.tsx", [/\bborder-input\b/, /\bbg-input-fill\b/]],
    ["select.tsx", [/\bborder-input\b/, /\bbg-input-fill\b/]],
    ["checkbox.tsx", [/\bborder-input\b/, /\bbg-input-fill\b/]],
  ];
  for (const [file, patterns] of cases) {
    it(`${file} draws its edge and fill from the tokens`, () => {
      const src = primitive(file);
      for (const p of patterns) expect(src, `${file} lacks ${p}`).toMatch(p);
      // A transparent fill is what made empty fields invisible on a card
      // (a variant such as `file:bg-transparent` styles something else).
      expect(src, `${file} still has a transparent fill`).not.toMatch(/(?<![:\w-])bg-transparent\b/);
    });
  }

  it("the Tailwind theme exposes --input-fill as a colour", () => {
    expect(CSS).toMatch(/--color-input-fill:\s*var\(--input-fill\)/);
  });
});
