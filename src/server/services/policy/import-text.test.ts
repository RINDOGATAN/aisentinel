// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { Document, Packer, Paragraph } from "docx";
import {
  IMPORT_MAX_BYTES,
  PolicyImportError,
  detectImportFormat,
  guessImportTitle,
  importPolicyText,
  normalizeImportedText,
} from "./import-text";

const enc = (s: string) => new TextEncoder().encode(s);

describe("policy import", () => {
  it("detects the format from the bytes, then the name", () => {
    expect(detectImportFormat("x.bin", enc("%PDF-1.7"))).toBe("pdf");
    expect(detectImportFormat("policy.docx", enc("PK\u0003\u0004"))).toBe("docx");
    expect(detectImportFormat("policy.doc", enc("ÐÏ\u0011"))).toBeNull();
    expect(detectImportFormat("policy.md", enc("# Title"))).toBe("text");
  });

  it("tidies text and guesses a title", () => {
    expect(normalizeImportedText("a  \r\n\r\n\r\n\r\nb")).toBe("a\n\nb");
    expect(guessImportTitle("# AI use policy\n\nBody", "f.txt")).toBe("AI use policy");
    expect(guessImportTitle("x".repeat(200), "ai_use-policy.txt")).toBe("ai use policy");
  });

  it("imports a text file", async () => {
    const res = await importPolicyText("p.txt", enc("Acceptable use\n\nStaff may use approved tools."));
    expect(res).toMatchObject({ format: "text", title: "Acceptable use", truncated: false });
    expect(res.content).toContain("approved tools");
  });

  it("imports a Word file", async () => {
    const doc = new Document({
      sections: [{ children: [new Paragraph("Vendor policy"), new Paragraph("Every vendor is reviewed.")] }],
    });
    const bytes = new Uint8Array(await Packer.toBuffer(doc));
    const res = await importPolicyText("vendor.docx", bytes);
    expect(res.format).toBe("docx");
    expect(res.title).toBe("Vendor policy");
    expect(res.content).toContain("Every vendor is reviewed.");
  });

  it("refuses files that are too large, unsupported or empty", async () => {
    await expect(importPolicyText("a.txt", new Uint8Array(IMPORT_MAX_BYTES + 1))).rejects.toMatchObject({ code: "too_large" });
    await expect(importPolicyText("a.exe", enc("MZ"))).rejects.toBeInstanceOf(PolicyImportError);
    await expect(importPolicyText("a.txt", enc("  \n "))).rejects.toMatchObject({ code: "empty" });
    await expect(importPolicyText("a.pdf", enc("%PDF-broken"))).rejects.toMatchObject({ code: "unreadable" });
  });
});
