// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Import an existing policy: take a Word (.docx), PDF or text file and return
 * its plain text, ready to become a draft. Nothing is stored here and nothing
 * leaves the server: the text goes back to the form, where a person checks it
 * before saving.
 *
 * Word is read with mammoth (raw text, no styles); PDF with unpdf (the text
 * layer only, so a scanned PDF without one yields nothing and says so).
 */

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
/** Longest text kept from an import. A policy is never close to this. */
export const IMPORT_MAX_CHARS = 200_000;

export type ImportFormat = "docx" | "pdf" | "text";

export type ImportErrorCode = "too_large" | "unsupported" | "empty" | "unreadable";

export class PolicyImportError extends Error {
  constructor(public readonly code: ImportErrorCode) {
    super(code);
    this.name = "PolicyImportError";
  }
}

export interface ImportedPolicyText {
  format: ImportFormat;
  title: string;
  content: string;
  truncated: boolean;
}

/** Decide the format from the bytes first, the file name second. */
export function detectImportFormat(fileName: string, bytes: Uint8Array): ImportFormat | null {
  const head = String.fromCharCode(...bytes.slice(0, 5));
  if (head.startsWith("%PDF")) return "pdf";
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  // A .docx is a ZIP ("PK"); an old binary .doc is not, and is not supported.
  if (head.startsWith("PK") && (ext === "docx" || ext === "")) return "docx";
  if (["txt", "md", "markdown", "text"].includes(ext)) return "text";
  return null;
}

/** Tidy extracted text: unify line ends, trim lines, at most one blank line in a row. */
export function normalizeImportedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The first short line of the text, without Markdown heading marks; else the file name. */
export function guessImportTitle(text: string, fileName: string): string {
  const first = text
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .find((l) => l.length > 0);
  if (first && first.length <= 120) return first;
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return (base || "Imported policy").slice(0, 300);
}

async function extractRaw(format: ImportFormat, bytes: Uint8Array): Promise<string> {
  if (format === "text") {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  if (format === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return result.value;
  }
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}

export async function importPolicyText(fileName: string, bytes: Uint8Array): Promise<ImportedPolicyText> {
  if (bytes.byteLength > IMPORT_MAX_BYTES) throw new PolicyImportError("too_large");
  const format = detectImportFormat(fileName, bytes);
  if (!format) throw new PolicyImportError("unsupported");

  let raw: string;
  try {
    raw = await extractRaw(format, bytes);
  } catch {
    throw new PolicyImportError("unreadable");
  }

  const text = normalizeImportedText(raw);
  if (!text) throw new PolicyImportError("empty");

  const truncated = text.length > IMPORT_MAX_CHARS;
  const content = truncated ? text.slice(0, IMPORT_MAX_CHARS) : text;
  return { format, title: guessImportTitle(content, fileName), content, truncated };
}
