// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Word breaking for every PDF export.
 *
 * Left alone, @react-pdf hyphenates with its built-in US English patterns,
 * whatever the language of the document. On Spanish text that produces breaks
 * no Spanish reader expects ("au-tomático", "cumplim-iento", "INACEPT-ABLE"),
 * and in the narrow table columns of the register and the portfolio it does so
 * on almost every row. So no word is split: a line breaks only at a space.
 *
 * The callback is process-wide in @react-pdf (Font.registerHyphenationCallback
 * replaces a single global), so every report registers it before it renders.
 * Registering it from only one report made the outcome depend on which export
 * a server instance happened to render first.
 *
 * One exception keeps an unbroken token from running out of its column: a
 * token longer than LONG_TOKEN (an address, an identifier, a path; no Spanish
 * or English word comes near it) may break after a separator such as "/" or
 * ".", and a stretch still longer than LONG_TOKEN into fixed pieces. A hyphen
 * is not used as a break point: @react-pdf adds its own at every break, which
 * would print two.
 */
import { Font } from "@react-pdf/renderer";

/** Longer than any dictionary word in either language. */
export const LONG_TOKEN = 28;
const PIECE = 16;

/** The pieces a word may break into; joined, they are always the word. */
export function pdfWordParts(word: string): string[] {
  if (word.length <= LONG_TOKEN) return [word];
  // Break after separators first, so the pieces stay readable.
  const bySeparator = word.split(/(?<=[/._@?&=:,;])/).filter(Boolean);
  const parts: string[] = [];
  for (const piece of bySeparator) {
    if (piece.length <= LONG_TOKEN) {
      parts.push(piece);
      continue;
    }
    for (let i = 0; i < piece.length; i += PIECE) parts.push(piece.slice(i, i + PIECE));
  }
  return parts;
}

/** Cheap and idempotent: it only sets the one global callback. */
export function registerPdfHyphenation(): void {
  Font.registerHyphenationCallback(pdfWordParts);
}
