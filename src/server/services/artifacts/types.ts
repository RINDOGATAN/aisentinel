// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The shape of a generated governance artifact.
 *
 * Artifacts are assembled deterministically from registry facts, resolved
 * scope and assessment answers. No model is called: a document that cites
 * statute must be reproducible, and a practitioner has to be able to point at
 * the answer each sentence came from.
 *
 * GAPS ARE FIRST CLASS. Where a required answer is missing, the generator
 * emits a visible gap marker carrying the citation it would have satisfied,
 * rather than omitting the paragraph. A document that silently drops an
 * unanswered obligation is worse than no document, because it reads as
 * complete.
 */

export type ArtifactKind = "assessment" | "notice" | "protocol" | "agentic-addendum";

export interface ArtifactBlock {
  /** Rendered as a paragraph. */
  kind: "paragraph";
  text: string;
}

export interface ArtifactListBlock {
  kind: "list";
  items: string[];
  ordered?: boolean;
}

export interface ArtifactGapBlock {
  kind: "gap";
  /** What is missing, in the practitioner's words. */
  text: string;
  /** The obligations that answer would have evidenced. */
  citations: string[];
}

export interface ArtifactTableBlock {
  kind: "table";
  headers: string[];
  rows: string[][];
}

export type Block = ArtifactBlock | ArtifactListBlock | ArtifactGapBlock | ArtifactTableBlock;

export interface ArtifactSection {
  /** Numbered by the renderer, so reordering never leaves stale numbers. */
  heading: string;
  /** Where this section comes from, shown as a citation line under the heading. */
  citations?: string[];
  blocks: Block[];
  /** Sub-sections, used by the notice for its jurisdictional addenda. */
  subsections?: ArtifactSection[];
}

export interface Artifact {
  kind: ArtifactKind;
  title: string;
  subtitle: string;
  organizationName: string;
  systemName: string;
  generatedAt: string;
  /** Content version of the rules and template that produced it. */
  contentVersion: string;
  lawReviewedAsOf: string;
  /** Always present. This is a drafting aid, not advice. */
  disclaimer: string;
  /** The regimes this document was calibrated to. */
  regimes: string[];
  sections: ArtifactSection[];
  /** Every gap in the document, collected for the summary. */
  gaps: { section: string; text: string; citations: string[] }[];
}

export function paragraph(text: string): ArtifactBlock {
  return { kind: "paragraph", text };
}

export function list(items: string[], ordered = false): ArtifactListBlock {
  return { kind: "list", items, ordered };
}

export function gap(text: string, citations: string[]): ArtifactGapBlock {
  return { kind: "gap", text, citations };
}

export function table(headers: string[], rows: string[][]): ArtifactTableBlock {
  return { kind: "table", headers, rows };
}

/** Collect every gap block, in document order, for the artifact summary. */
export function collectGaps(sections: readonly ArtifactSection[]): Artifact["gaps"] {
  const out: Artifact["gaps"] = [];
  const walk = (section: ArtifactSection) => {
    for (const block of section.blocks) {
      if (block.kind === "gap") {
        out.push({ section: section.heading, text: block.text, citations: block.citations });
      }
    }
    for (const sub of section.subsections ?? []) walk(sub);
  };
  for (const section of sections) walk(section);
  return out;
}
