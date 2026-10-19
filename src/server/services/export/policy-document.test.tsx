// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import mammoth from "mammoth";
import { buildPolicyDocument, parsePolicyBlocks, type PolicyDocLabels } from "./policy-document";
import { renderPolicyDocx } from "./policy-docx";
import { PolicyPdf } from "./policy-pdf";

const labels: PolicyDocLabels = {
  reference: "Reference",
  version: "Version",
  status: "Status",
  type: "Type",
  effectiveDate: "Effective date",
  reviewDate: "Review date",
  approvedAt: "Approved on",
  owner: "Owner",
  department: "Department",
  systems: "AI systems covered",
  notSet: "Not set",
  noContent: "No text yet.",
  draftNotice: "Draft: not approved and not in force.",
};

const input = {
  orgName: "Example Org",
  reference: "POL-003",
  title: "AI Acceptable Use Policy",
  version: 2,
  status: "PUBLISHED",
  statusLabel: "Published",
  typeLabel: "AI usage",
  description: "Which tools staff may use.",
  content: "# Scope\n\nThis policy applies to all staff.\n\n- Use approved tools\n- Review output\n\n1. Report incidents",
  effectiveDate: new Date("2026-10-01T00:00:00Z"),
  reviewDate: new Date("2027-10-01T00:00:00Z"),
  approvedAt: null,
  ownerName: "Head of Legal",
  departmentName: "Legal",
  systems: ["Support assistant"],
};

describe("the policy document", () => {
  it("reads headings, bullets, numbered lines and paragraphs", () => {
    expect(parsePolicyBlocks(input.content)).toEqual([
      { kind: "heading", level: 1, text: "Scope" },
      { kind: "paragraph", text: "This policy applies to all staff." },
      { kind: "bullet", text: "Use approved tools" },
      { kind: "bullet", text: "Review output" },
      { kind: "numbered", marker: "1.", text: "Report incidents" },
    ]);
  });

  it("is headed with the organization, reference, version, status and dates", () => {
    const doc = buildPolicyDocument(input, labels, "en");
    expect(doc.orgName).toBe("Example Org");
    expect(doc.meta.slice(0, 3)).toEqual([
      { label: "Reference", value: "POL-003" },
      { label: "Version", value: "v2" },
      { label: "Status", value: "Published" },
    ]);
    expect(doc.meta.find((m) => m.label === "Approved on")?.value).toBe("Not set");
    expect(doc.meta.find((m) => m.label === "Review date")?.value).toBe("1 October 2027");
    expect(doc.draftNotice).toBeNull();
    expect(buildPolicyDocument({ ...input, status: "DRAFT" }, labels, "en").draftNotice).toBe(labels.draftNotice);
    expect(buildPolicyDocument({ ...input, content: null }, labels, "en").blocks).toEqual([
      { kind: "paragraph", text: "No text yet." },
    ]);
  });

  it("downloads as a Word file that carries the heading and the text", async () => {
    const doc = buildPolicyDocument(input, labels, "en", ["Generated at 2026-10-19"]);
    const buffer = await renderPolicyDocx(doc);
    const { value } = await mammoth.extractRawText({ buffer });
    expect(value).toContain("EXAMPLE ORG");
    expect(value).toContain("POL-003");
    expect(value).toContain("This policy applies to all staff.");
    expect(value).toContain("Support assistant");
  });

  it("downloads as a PDF", async () => {
    const doc = buildPolicyDocument(input, labels, "es");
    const buffer = await renderToBuffer(PolicyPdf({ doc, date: "2026-10-19" }));
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});
