// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The words for a document of the register (src/config/document-register.ts),
 * in one place for the dashboard panel and the menu lines: the same name and
 * the same state word wherever a document is shown. Keys under
 * `documentRegister`.
 */

import type { DocumentGap, DocumentStatus } from "@/config/document-register";
import type { RegisterRow } from "@/lib/programme-overview";

type Translate = (key: string, values?: Record<string, string | number>) => string;

export function documentName(t: Translate, id: string): string {
  return t(`items.${id}`);
}

/** "ready", "draft", "needs: AI assistance switched on", "not in AI Sentinel yet". */
export function documentStateText(t: Translate, status: DocumentStatus): string {
  if (status.state === "needsInput") return t("needs", { input: t(`inputs.${status.input}`) });
  return t(`state.${status.state}`);
}

/** The gaps of a draft, in words: "2 drafts to confirm; 1 system without a business owner". */
export function gapsText(t: Translate, gaps: readonly DocumentGap[]): string {
  return gaps.map((g) => t(`gaps.${g.key}`, { count: g.count })).join("; ");
}

/** The quiet line under a menu step: "AI system register · draft; Model inventory · needs: ...". */
export function stepNoteText(t: Translate, rows: readonly RegisterRow[]): string {
  return rows
    .map((row) => `${documentName(t, row.entry.id)} · ${documentStateText(t, row.doc.status)}`)
    .join("; ");
}
