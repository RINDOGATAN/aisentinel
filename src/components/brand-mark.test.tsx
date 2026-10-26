// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The TODO.LAW wordmark sits next to the product name in the dashboard's top
 * bar and side sheet, as on the sign-in screen and the landing header. On a
 * phone the top bar keeps the wordmark and drops the name.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandMark } from "./brand-mark";

describe("BrandMark", () => {
  it("renders the wordmark at 28 px with the product name next to it", () => {
    const html = renderToStaticMarkup(<BrandMark />);
    expect(html).toContain('<img src="/logo-negative.svg" alt="TODO.LAW" style="height:28px;width:auto"/>');
    expect(html).toContain("AI SENTINEL</span>");
  });

  it("passes the name's class through, so the top bar can hide it below sm", () => {
    const html = renderToStaticMarkup(<BrandMark nameClassName="hidden sm:inline" />);
    expect(html).toMatch(/<span class="[^"]*hidden sm:inline[^"]*"[^>]*>AI SENTINEL<\/span>/);
  });

  it("is used by the dashboard's top bar and side sheet", () => {
    const source = readFileSync(join(__dirname, "guided", "guided-layout.tsx"), "utf8");
    expect(source).toContain('<BrandMark nameClassName="hidden sm:inline" />');
    expect(source).toMatch(/<SheetTitle[^>]*>\s*<BrandMark \/>/);
    expect(source).not.toMatch(/>AI SENTINEL</);
  });
});
