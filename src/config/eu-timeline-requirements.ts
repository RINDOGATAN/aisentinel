// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * EU AI Act application-timeline requirement rows (Art. 113 subtree).
 *
 * Extracted from scripts/seed-frameworks.ts so the obligations calendar can
 * reference the seeded requirement CODES without booting Prisma, and so a
 * unit test can assert those references resolve. The seed script imports this
 * module — it remains the single owner of the rows themselves.
 *
 * Division of ownership, deliberately narrow:
 *   - THIS module owns the requirement rows (codes, titles, descriptions).
 *   - src/config/transparency-rules.ts owns the two Art. 50 DATES.
 *   - src/config/regulatory-milestones.ts owns everything else about dates,
 *     and references these rows by code. It never re-derives a date from the
 *     prose here.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 *
 * As amended by the Digital Omnibus on AI — Regulation (EU) 2026/1744 of
 * 8 July 2026 (OJ L, 2026/1744, 24.7.2026; in force 27 July 2026).
 */

export interface EuTimelineChild {
  code: string;
  title: string;
  description: string;
  sortOrder: number;
}

export interface EuTimelineSubtree {
  code: string;
  title: string;
  description: string;
  applicableTo: string[];
  sortOrder: number;
  children: EuTimelineChild[];
}

/**
 * Art. 113 and its dated sub-entries. Codes are the stable join key used by
 * `RegulatoryMilestone.requirementCodes`.
 */
export const EU_ART113_SUBTREE: EuTimelineSubtree = {
  code: "Art. 113",
  title: "Entry into force and application",
  description:
    "The AI Act entered into force on 1 August 2024 and applies in stages (see sub-entries), as amended by the Digital Omnibus on AI — Regulation (EU) 2026/1744 of 8 July 2026 (OJ L, 2026/1744, 24.7.2026), in force since 27 July 2026.",
  applicableTo: ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"],
  sortOrder: 113,
  children: [
    {
      code: "Art. 113(a) — 2 Feb 2025",
      title: "Prohibitions and AI literacy apply",
      description:
        "Chapters I and II apply from 2 February 2025: general provisions, AI literacy (Art. 4), and prohibited AI practices (Art. 5).",
      sortOrder: 1,
    },
    {
      code: "Art. 113(b) — 2 Aug 2025",
      title: "GPAI, governance and penalties apply",
      description:
        "From 2 August 2025: notified-body rules (Chapter III, Section 4), GPAI model obligations (Chapter V), governance (Chapter VII), penalties (Chapter XII except Art. 101), and confidentiality (Art. 78).",
      sortOrder: 2,
    },
    {
      code: "Art. 113 — 2 Aug 2026",
      title: "Art. 50 transparency applies; GPAI enforcement begins",
      description:
        "From 2 August 2026: Art. 50 transparency obligations (chatbot disclosure, synthetic-content marking, deepfake labelling) apply — with a grace period to 2 December 2026 for machine-readable marking, only for systems placed on the market before 2 August 2026 — and the Commission's GPAI enforcement powers (Arts. 91-93, Art. 101 fines) begin. Annex III high-risk obligations do NOT apply on this date (deferred by the Digital Omnibus — see the 2 Dec 2027 entry).",
      sortOrder: 3,
    },
    {
      code: "Art. 5 — 2 Dec 2026",
      title:
        "New prohibitions: AI-generated CSAM and non-consensual intimate imagery",
      description:
        "From 2 December 2026 (Digital Omnibus): prohibitions on AI systems for generating child sexual abuse material and non-consensual intimate imagery. Providers are in scope where such generation is intended or reasonably foreseeable absent safeguards; deployers on deliberate misuse.",
      sortOrder: 4,
    },
    {
      code: "Art. 113 — 2 Dec 2027",
      title: "Annex III standalone high-risk obligations apply",
      description:
        "From 2 December 2027 (deferred from 2 August 2026 by the Digital Omnibus): the high-risk obligations for standalone Annex III systems apply, including conformity assessment, FRIA (Art. 27), registration, and Art. 72/73 post-market monitoring and serious-incident reporting.",
      sortOrder: 5,
    },
    {
      code: "Art. 113(c) — 2 Aug 2028",
      title: "Annex I product-embedded high-risk AI",
      description:
        "From 2 August 2028 (deferred from 2 August 2027 by the Digital Omnibus): Art. 6(1) classification and corresponding obligations for high-risk AI that is a safety component of (or is itself) a product under Annex I Union harmonisation legislation (e.g. medical devices under the MDR).",
      sortOrder: 6,
    },
  ],
};

/** Every code in the subtree, parent first — the set milestones may cite. */
export const EU_TIMELINE_REQUIREMENT_CODES: string[] = [
  EU_ART113_SUBTREE.code,
  ...EU_ART113_SUBTREE.children.map((child) => child.code),
];
