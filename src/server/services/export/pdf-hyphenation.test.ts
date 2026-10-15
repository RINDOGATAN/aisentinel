// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Word breaking in the PDF exports. The built-in @react-pdf hyphenator uses
 * US English patterns and split Spanish words in the register and the
 * portfolio ("au-tomático", "cumplim-iento"). Every report must break lines
 * only between words, whichever report the server renders first.
 */

import { describe, expect, it, vi } from "vitest";
import { Font } from "@react-pdf/renderer";
import { LONG_TOKEN, pdfWordParts, registerPdfHyphenation } from "./pdf-hyphenation";

describe("pdfWordParts", () => {
  it.each([
    "automático",
    "cumplimiento",
    "INACEPTABLE",
    "responsabilidades",
    "desproporcionadamente",
    "Interoperabilidad",
    "EIDF",
    "fundamental",
  ])("keeps %s whole", (word) => {
    expect(pdfWordParts(word)).toEqual([word]);
  });

  it("breaks an over-long token only after a separator when it can", () => {
    const url = "https://proveedor.example/documentacion/fichas-tecnicas/asistente";
    const parts = pdfWordParts(url);
    expect(parts.join("")).toBe(url);
    expect(parts.length).toBeGreaterThan(1);
    // Never after a hyphen: the renderer adds its own, which would print two.
    for (const part of parts.slice(0, -1)) expect(part).toMatch(/[/._@?&=:,;]$/);
  });

  it("cuts a long run with no separator into pieces that rejoin exactly", () => {
    const token = "a".repeat(LONG_TOKEN * 2 + 3);
    const parts = pdfWordParts(token);
    expect(parts.join("")).toBe(token);
    expect(parts.length).toBeGreaterThan(1);
  });
});

describe("registration", () => {
  it("installs the callback for every report", () => {
    Font.registerHyphenationCallback((w: string) => w.split(""));
    registerPdfHyphenation();
    expect(Font.getHyphenationCallback()).toBe(pdfWordParts);
  });

  it("is in place once the shared report styles are imported", async () => {
    // A fresh module graph, as on a server that has rendered nothing yet.
    vi.resetModules();
    const { Font: freshFont } = await import("@react-pdf/renderer");
    freshFont.registerHyphenationCallback((w: string) => w.split(""));
    await import("./pdf-styles");
    const { pdfWordParts: fresh } = await import("./pdf-hyphenation");
    expect(freshFont.getHyphenationCallback()).toBe(fresh);
  });
});
