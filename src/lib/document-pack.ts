// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Which documents go into the program pack, and which stay out and why (the
 * clarity work carried from DPO Central, owner's decision d10, 9 October
 * 2026: one click on the dashboard's documents panel gives one ZIP of every
 * document in the "ready" state and, as an option, the drafts too, marked as
 * drafts in their file names with their gaps on their first page).
 *
 * The states come from the one register (src/config/document-register.ts),
 * so the pack holds exactly what the panel calls ready. Pure: the dashboard
 * button counts with it and the server builds the archive with it
 * (src/server/services/export/program-pack.ts). Tested in document-pack.test.ts.
 */

import type { DocumentEntry, DocumentGap, EvaluatedDocument } from "@/config/document-register";
import { documentEntry } from "@/config/document-register";

/** Why a document of the register is not in the pack. */
export type LeftOutReason =
  /** It is a draft and drafts were not asked for. */
  | "draftsNotRequested"
  /** It waits for an input (named by the register). */
  | "needsInput"
  /** AI Sentinel does not produce it yet. */
  | "notYet"
  /** It is shown on screen only. */
  | "screenOnly"
  /** It is chosen per record on its own page (a system and a framework). */
  | "perRecord"
  /** It is exported on its own page (the audit trail, by period). */
  | "separateExport";

export interface PackDocument {
  entry: DocumentEntry;
  state: "ready" | "draft";
  /** A draft's gaps, as the register names them. */
  gaps: DocumentGap[];
}

export interface PackLeftOut {
  entry: DocumentEntry;
  reason: LeftOutReason;
  doc: EvaluatedDocument;
}

export interface PackPlan {
  include: PackDocument[];
  leftOut: PackLeftOut[];
}

/** Why a register document the pack never carries stays out. */
function notPackedReason(entry: DocumentEntry): LeftOutReason {
  if (entry.formats.every((f) => f === "screen")) return "screenOnly";
  if (entry.id === "auditTrail") return "separateExport";
  return "perRecord";
}

/** The register's documents split into the pack and the rest, in register order. */
export function planPack(
  documents: readonly EvaluatedDocument[],
  options: { includeDrafts: boolean },
): PackPlan {
  const include: PackDocument[] = [];
  const leftOut: PackLeftOut[] = [];
  for (const doc of documents) {
    const entry = documentEntry(doc.id);
    if (!entry) continue;
    const status = doc.status;
    const out = (reason: LeftOutReason) => leftOut.push({ entry, reason, doc });
    if (status.state === "notYet") out("notYet");
    else if (status.state === "needsInput") out("needsInput");
    else if (!entry.packed) out(notPackedReason(entry));
    else if (status.state === "draft" && !options.includeDrafts) out("draftsNotRequested");
    else include.push({ entry, state: status.state, gaps: status.state === "draft" ? status.gaps : [] });
  }
  return { include, leftOut };
}

/** How many documents a pack would hold, for the dashboard's button. */
export function packCounts(documents: readonly EvaluatedDocument[]): { ready: number; drafts: number } {
  const plan = planPack(documents, { includeDrafts: true });
  return {
    ready: plan.include.filter((d) => d.state === "ready").length,
    drafts: plan.include.filter((d) => d.state === "draft").length,
  };
}

/**
 * A file's name in the pack with the draft mark ("DRAFT" / "BORRADOR") after
 * its number when the document is a draft: "01-ai-governance-program.pdf"
 * becomes "01-DRAFT-ai-governance-program.pdf". A name without a number gets
 * the mark in front.
 */
export function markDraft(name: string, draftMark: string): string {
  const match = /^(\d+-)(.*)$/.exec(name);
  return match ? `${match[1]}${draftMark}-${match[2]}` : `${draftMark}-${name}`;
}
