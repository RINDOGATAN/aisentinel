// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Requirement codes that were retired or re-used, and where their links go.
 *
 * The framework seeds upsert rows keyed on an id derived from the requirement
 * CODE, and some codes carry a date or an article number. When the law (or our
 * reading of it) moved, the seeds wrote a new row and left the old one behind,
 * or rewrote an existing row with a different meaning. Upserts never remove or
 * re-link anything, so a database seeded before the change keeps the old row
 * and every organisation's compliance links stay pointed at it. A fresh
 * install and an upgraded one then disagree on the same law.
 *
 * Two kinds of change:
 *
 *   superseded — the old code is no longer seeded at all. Its links move to
 *                the successor and the old row is deleted.
 *
 *   repurposed — the old code is still seeded, but it now means something
 *                else. Links made under the OLD meaning carry their work
 *                (status, notes, evidence) to the successor; the row itself
 *                stays, because under its new meaning it still applies.
 *
 * A link on a repurposed row counts as made under the old meaning only when
 * that is certain: either the row still carries one of `previousTitles` (the
 * database has never been re-seeded since the change), or nobody has touched
 * the link since `changedAt` (the moment the change was committed, before
 * which no database could have shown the new meaning). Anything else is left
 * alone and reported for a person to review.
 *
 * APPEND-ONLY. Self-hosters jump from any version to the latest, so an entry
 * must stay here for as long as an install from before its change could still
 * be upgraded. Applied by src/lib/requirement-reconciliation.ts at the end of
 * scripts/seed-frameworks.ts.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

export type SupersessionKind = "superseded" | "repurposed";

export interface RequirementSupersession {
  /** Stable name for logs and audit entries. Never change once shipped. */
  key: string;
  kind: SupersessionKind;
  fromId: string;
  fromCode: string;
  toId: string;
  toCode: string;
  /** Titles the `from` row carried before the change. Repurposed rows only. */
  previousTitles: string[];
  /** Commit time of the change (ISO 8601, UTC). */
  changedAt: string;
  commit: string;
  reason: string;
}

/**
 * The id scripts/seed-frameworks.ts gives an EU AI Act row. Kept identical to
 * the seed's formula; the seed calls this function.
 */
export function euRequirementId(code: string): string {
  return `eu-${code.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
}

function eu(
  key: string,
  kind: SupersessionKind,
  fromCode: string,
  toCode: string,
  previousTitles: string[],
  changedAt: string,
  commit: string,
  reason: string,
): RequirementSupersession {
  return {
    key,
    kind,
    fromId: euRequirementId(fromCode),
    fromCode,
    toId: euRequirementId(toCode),
    toCode,
    previousTitles,
    changedAt,
    commit,
    reason,
  };
}

// 27a5991, 2026-07-05 17:34:35 -0400: numbering pass against the final text
// of Reg. (EU) 2024/1689. The 2021-proposal numbers for post-market monitoring
// and incident reporting were replaced, and the Art. 5(1)(d)-(h) letters were
// put in the order of the final Act.
const NUMBERING_PASS = "2026-07-05T21:34:35Z";

// fff628f, 2026-07-17 15:00:38 -0400: Digital Omnibus timeline (Regulation
// (EU) 2026/1744).
const DIGITAL_OMNIBUS = "2026-07-17T19:00:38Z";

export const REQUIREMENT_SUPERSESSIONS: RequirementSupersession[] = [
  // ── Numbering pass (27a5991) ──────────────────────────────────────────
  eu("eu-art61-to-art72", "superseded", "Art. 61", "Art. 72", [], NUMBERING_PASS, "27a5991",
    "Post-market monitoring is Art. 72 in the final Act; Art. 61 was the 2021-proposal number."),
  eu("eu-art62-to-art73", "superseded", "Art. 62", "Art. 73", [], NUMBERING_PASS, "27a5991",
    "Serious-incident reporting is Art. 73 in the final Act; Art. 62 was the 2021-proposal number."),
  eu("eu-art62-1-to-art73-1", "superseded", "Art. 62(1)", "Art. 73(1)", [], NUMBERING_PASS, "27a5991",
    "Duty to report serious incidents, renumbered with its parent."),
  eu("eu-art62-2-to-art73-2-4", "superseded", "Art. 62(2)", "Art. 73(2)-(4)", [], NUMBERING_PASS, "27a5991",
    "Reporting timelines, renumbered with their parent."),
  // The four letters below were a permutation, so they are resolved together
  // from one snapshot: (d) and (h) swapped, (e) and (g) swapped.
  eu("eu-art5-1-d-rtbi", "repurposed", "Art. 5(1)(d)", "Art. 5(1)(h)",
    ["Real-time biometric identification"], NUMBERING_PASS, "27a5991",
    "Real-time remote biometric identification is Art. 5(1)(h) in the final Act; (d) is now predictive policing."),
  eu("eu-art5-1-e-biometric-categorisation", "repurposed", "Art. 5(1)(e)", "Art. 5(1)(g)",
    ["Biometric categorisation (sensitive)"], NUMBERING_PASS, "27a5991",
    "Biometric categorisation is Art. 5(1)(g) in the final Act; (e) is now untargeted facial scraping."),
  eu("eu-art5-1-g-facial-scraping", "repurposed", "Art. 5(1)(g)", "Art. 5(1)(e)",
    ["Untargeted scraping for facial recognition"], NUMBERING_PASS, "27a5991",
    "Untargeted facial scraping is Art. 5(1)(e) in the final Act; (g) is now biometric categorisation."),
  eu("eu-art5-1-h-predictive-policing", "repurposed", "Art. 5(1)(h)", "Art. 5(1)(d)",
    ["Predictive policing (individual)"], NUMBERING_PASS, "27a5991",
    "Predictive policing is Art. 5(1)(d) in the final Act; (h) is now real-time remote biometric identification."),

  // ── Digital Omnibus (fff628f) ─────────────────────────────────────────
  eu("eu-art113c-2027-to-2028", "superseded", "Art. 113(c) — 2 Aug 2027", "Art. 113(c) — 2 Aug 2028", [],
    DIGITAL_OMNIBUS, "fff628f",
    "The Digital Omnibus deferred Annex I product-embedded high-risk obligations from 2 Aug 2027 to 2 Aug 2028."),
  eu("eu-art113-2026-annex-iii-to-2027", "repurposed", "Art. 113 — 2 Aug 2026", "Art. 113 — 2 Dec 2027",
    ["General application (incl. Annex III high-risk)"], DIGITAL_OMNIBUS, "fff628f",
    "The 2 Aug 2026 entry used to mean general application including Annex III high-risk; it now means Art. 50 transparency. The Annex III date moved to 2 Dec 2027."),
];
