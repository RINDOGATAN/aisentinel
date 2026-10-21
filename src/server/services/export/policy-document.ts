// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One policy as a document, shared by the PDF and the Word download and by the
 * heading on the policy page: the organization's name at the top, then the
 * policy's reference, version, status and dates, its owner and department,
 * and its text. Labels arrive already translated, so this module stays pure
 * (no database, no network, no i18n runtime).
 */

export type PolicyDocLocale = "en" | "es";

export type PolicyBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "numbered"; text: string; marker: string };

export interface PolicyDocLabels {
  reference: string;
  version: string;
  status: string;
  type: string;
  effectiveDate: string;
  reviewDate: string;
  approvedAt: string;
  owner: string;
  department: string;
  systems: string;
  notSet: string;
  noContent: string;
  draftNotice: string;
}

export interface PolicyDocInput {
  orgName: string;
  reference: string | null;
  title: string;
  version: number;
  status: string;
  statusLabel: string;
  typeLabel: string;
  description: string | null;
  content: string | null;
  effectiveDate: Date | null;
  reviewDate: Date | null;
  approvedAt: Date | null;
  ownerName: string | null;
  departmentName: string | null;
  systems: string[];
}

export interface PolicyDocument {
  locale: PolicyDocLocale;
  orgName: string;
  title: string;
  /** Shown above the text when the policy is not approved or published. */
  draftNotice: string | null;
  meta: Array<{ label: string; value: string }>;
  description: string | null;
  blocks: PolicyBlock[];
  systemsTitle: string;
  systems: string[];
  /** Generation stamp lines, printed at the end. */
  stamp: string[];
}

const IN_FORCE = new Set(["APPROVED", "PUBLISHED"]);

export function formatDocDate(d: Date | null, locale: PolicyDocLocale): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Read the stored text as simple blocks: Markdown-style "#" headings, "-" or
 * "*" bullets, "1." numbered lines, and paragraphs separated by blank lines.
 * Anything else is a paragraph; the text itself is never altered.
 */
export function parsePolicyBlocks(content: string | null | undefined): PolicyBlock[] {
  if (!content) return [];
  const blocks: PolicyBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };
  for (const raw of content.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flush();
      blocks.push({ kind: "bullet", text: bullet[1].trim() });
      continue;
    }
    const numbered = /^(\d{1,3}[.)])\s+(.*)$/.exec(line);
    if (numbered) {
      flush();
      blocks.push({ kind: "numbered", marker: numbered[1], text: numbered[2].trim() });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

export function buildPolicyDocument(
  input: PolicyDocInput,
  labels: PolicyDocLabels,
  locale: PolicyDocLocale,
  stamp: string[] = [],
): PolicyDocument {
  const value = (v: string | null) => v ?? labels.notSet;
  const meta = [
    ...(input.reference ? [{ label: labels.reference, value: input.reference }] : []),
    { label: labels.version, value: `v${input.version}` },
    { label: labels.status, value: input.statusLabel },
    { label: labels.type, value: input.typeLabel },
    { label: labels.effectiveDate, value: value(formatDocDate(input.effectiveDate, locale)) },
    { label: labels.reviewDate, value: value(formatDocDate(input.reviewDate, locale)) },
    { label: labels.approvedAt, value: value(formatDocDate(input.approvedAt, locale)) },
    { label: labels.owner, value: value(input.ownerName) },
    { label: labels.department, value: value(input.departmentName) },
  ];
  const blocks = parsePolicyBlocks(input.content);
  return {
    locale,
    orgName: input.orgName,
    title: input.title,
    draftNotice: IN_FORCE.has(input.status) ? null : labels.draftNotice,
    meta,
    description: input.description?.trim() || null,
    blocks: blocks.length ? blocks : [{ kind: "paragraph", text: labels.noContent }],
    systemsTitle: labels.systems,
    systems: input.systems,
    stamp,
  };
}
