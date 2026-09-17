// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The dates of application of the EU AI Act, each pinned to the provision
 * that sets it, as amended by the Digital Omnibus on AI: Regulation (EU)
 * 2026/1744 of 8 July 2026 (OJ L, 2026/1744, 24.7.2026; in force 27 July 2026).
 *
 * Verified 2026-09-16 against the official text on EUR-Lex. Legal sign-off
 * is still pending, as for every EU AI Act row.
 *
 * DATE OWNERSHIP:
 *   - The two Art. 50 dates stay owned by src/config/transparency-rules.ts and
 *     are imported here, never re-typed.
 *   - Every other EU AI Act date is owned HERE. regulatory-milestones.ts reads
 *     its EU dates from this table, and eu-ai-act-dates.test.ts checks that the
 *     seeded Art. 113 rows and the Frameworks data state the same dates.
 *
 * Deliberately absent: a "2 February 2027" deadline for interoperable
 * watermark detection. Secondary reporting mentioned it; the text of
 * Regulation (EU) 2026/1744 contains no such date. See UNSUPPORTED_EU_AI_ACT_DATES.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

import {
  ART50_APPLICABLE_FROM,
  ART50_MARKING_GRACE_DEADLINE,
} from "./transparency-rules";

export const EU_AI_ACT_DATES_LAW_REVIEWED_AS_OF = "2026-09-16";

export const DIGITAL_OMNIBUS_CITATION =
  "Regulation (EU) 2026/1744 (Digital Omnibus on AI), OJ L, 2026/1744, 24.7.2026";

export type EuAiActDateId =
  | "entry-into-force"
  | "chapters-i-ii"
  | "gpai-governance-penalties"
  | "omnibus-arts-102-110"
  | "general-application"
  | "new-art5-prohibitions"
  | "art50-2-legacy-generative"
  | "sandboxes-operational"
  | "annex-iii-high-risk"
  | "annex-i-high-risk"
  | "public-authority-high-risk";

export interface EuAiActDate {
  id: EuAiActDateId;
  /** ISO "YYYY-MM-DD". */
  date: string;
  /** The provision of Reg. (EU) 2024/1689 that sets the date, as amended. */
  provision: string;
  /** Whether Regulation (EU) 2026/1744 set or changed this date. */
  setByOmnibus: boolean;
  /** What applies on the date, in one sentence. */
  what: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export const EU_AI_ACT_DATES: Record<EuAiActDateId, EuAiActDate> = {
  "entry-into-force": {
    id: "entry-into-force",
    date: "2024-08-01",
    provision: "Art. 113, first paragraph",
    setByOmnibus: false,
    what: "The Regulation enters into force.",
  },
  "chapters-i-ii": {
    id: "chapters-i-ii",
    date: "2025-02-02",
    provision: "Art. 113, third paragraph, point (a)",
    setByOmnibus: false,
    what: "Chapters I and II apply (general provisions, AI literacy under Art. 4, prohibited practices under Art. 5), except the prohibitions the Digital Omnibus added.",
  },
  "gpai-governance-penalties": {
    id: "gpai-governance-penalties",
    date: "2025-08-02",
    provision: "Art. 113, third paragraph, point (b)",
    setByOmnibus: false,
    what: "Chapter III Section 4, Chapter V (general-purpose AI models), Chapter VII (governance), Chapter XII (penalties, except Art. 101) and Art. 78 apply.",
  },
  "omnibus-arts-102-110": {
    id: "omnibus-arts-102-110",
    date: "2026-07-27",
    provision: "Art. 113, third paragraph, point (d), inserted by Regulation (EU) 2026/1744",
    setByOmnibus: true,
    what: "Articles 102 to 110 (the amendments to other Union acts) apply.",
  },
  "general-application": {
    id: "general-application",
    date: iso(ART50_APPLICABLE_FROM),
    provision: "Art. 113, second paragraph",
    setByOmnibus: false,
    what: "General date of application, including the Art. 50 transparency obligations.",
  },
  "new-art5-prohibitions": {
    id: "new-art5-prohibitions",
    date: "2026-12-02",
    provision:
      "Art. 113, third paragraph, point (a), as amended by Regulation (EU) 2026/1744: Art. 5(1), first subparagraph, points (ba) and (bb), and Art. 5(1a) and (1b)",
    setByOmnibus: true,
    what: "The new prohibitions on AI generation of non-consensual intimate imagery and of child sexual abuse material apply.",
  },
  "art50-2-legacy-generative": {
    id: "art50-2-legacy-generative",
    date: iso(ART50_MARKING_GRACE_DEADLINE),
    provision: "Art. 111(4), inserted by Regulation (EU) 2026/1744",
    setByOmnibus: true,
    what: "Providers of generative AI systems placed on the market before 2 August 2026 comply with Art. 50(2) (machine-readable marking).",
  },
  "sandboxes-operational": {
    id: "sandboxes-operational",
    date: "2027-08-02",
    provision: "Art. 57(1), as amended by Regulation (EU) 2026/1744",
    setByOmnibus: true,
    what: "Each Member State has at least one AI regulatory sandbox operational.",
  },
  "annex-iii-high-risk": {
    id: "annex-iii-high-risk",
    date: "2027-12-02",
    provision:
      "Art. 113, third paragraph, point (c), as amended by Regulation (EU) 2026/1744 (Art. 6(2) and Annex III)",
    setByOmnibus: true,
    what: "Chapter III, Sections 1, 2 and 3 (except Art. 6(5)) apply to high-risk systems under Art. 6(2) and Annex III.",
  },
  "annex-i-high-risk": {
    id: "annex-i-high-risk",
    date: "2028-08-02",
    provision:
      "Art. 113, third paragraph, point (c), as amended by Regulation (EU) 2026/1744 (Art. 6(1) and Annex I)",
    setByOmnibus: true,
    what: "Chapter III, Sections 1, 2 and 3 (except Art. 6(5)) apply to high-risk systems under Art. 6(1) and Annex I.",
  },
  "public-authority-high-risk": {
    id: "public-authority-high-risk",
    date: "2030-08-02",
    provision: "Art. 111(2), as amended by Regulation (EU) 2026/1744",
    setByOmnibus: true,
    what: "Providers and deployers of high-risk systems intended for use by public authorities comply; other systems already on the market are caught only if significantly changed after the Chapter III date.",
  },
};

/**
 * Dates that have circulated but are NOT in the text. Content must never
 * state them as law; the test scans the EU content for them.
 */
export const UNSUPPORTED_EU_AI_ACT_DATES: { date: string; claim: string; finding: string }[] = [
  {
    date: "2027-02-02",
    claim: "Interoperable watermark-detection solutions required by 2 February 2027",
    finding: "Not in the text of Regulation (EU) 2026/1744 (checked 2026-09-16).",
  },
];

/** A Date (UTC midnight) for a pinned EU AI Act date. */
export function euAiActDate(id: EuAiActDateId): Date {
  return new Date(`${EU_AI_ACT_DATES[id].date}T00:00:00Z`);
}
