// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/** Anchor of the screening questions in Settings (California and cross-border), linked from the pages that need an answer. */
export const SCREENING_ANCHOR = "screening";

/** Anchor of the hosted pilot card, inside the Advanced section; the pilot reminder e-mails link to it. */
export const PILOT_ANCHOR = "pilot";

/** Anchors that sit inside the collapsed Advanced section of Settings: arriving on one opens it. */
export const ADVANCED_ANCHORS: readonly string[] = [PILOT_ANCHOR, "delete-organization"];

/** Whether a location hash ("#pilot") points into the Advanced section. */
export function hashOpensAdvanced(hash: string): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  return id !== "" && ADVANCED_ANCHORS.includes(id);
}
