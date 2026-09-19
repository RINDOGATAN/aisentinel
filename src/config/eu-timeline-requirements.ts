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
 * 8 July 2026 (OJ L, 2026/1744, 24.7.2026; in force 27 July 2026). The dates
 * stated in the prose below must match src/config/eu-ai-act-dates.ts; the
 * test there checks it. Codes never change: a new code, or a code that
 * changes meaning, needs an entry in requirement-supersessions.ts.
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
    "The AI Act entered into force on 1 August 2024 and applies in stages (see sub-entries), as amended by the Digital Omnibus on AI: Regulation (EU) 2026/1744 of 8 July 2026 (OJ L, 2026/1744, 24.7.2026), in force since 27 July 2026. Other dates set by the amendment: Articles 102 to 110 apply from 27 July 2026 (Art. 113, third paragraph, point (d)); each Member State's AI regulatory sandbox is operational by 2 August 2027 (Art. 57(1)); high-risk systems intended for use by public authorities comply by 2 August 2030 (Art. 111(2)).",
  applicableTo: ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"],
  sortOrder: 113,
  children: [
    {
      code: "Art. 113(a) — 2 Feb 2025",
      title: "Prohibitions and AI literacy apply",
      description:
        "Chapters I and II apply from 2 February 2025 (Art. 113, third paragraph, point (a)): general provisions, AI literacy (Art. 4, in the wording given by Regulation (EU) 2026/1744), and prohibited AI practices (Art. 5). Excepted: Art. 5(1), first subparagraph, points (ba) and (bb), and Art. 5(1a) and (1b), which apply from 2 December 2026.",
      sortOrder: 1,
    },
    {
      code: "Art. 113(b) — 2 Aug 2025",
      title: "GPAI, governance and penalties apply",
      description:
        "From 2 August 2025 (Art. 113, third paragraph, point (b)): notified-body rules (Chapter III, Section 4), GPAI model obligations (Chapter V), governance (Chapter VII), penalties (Chapter XII except Art. 101), and confidentiality (Art. 78).",
      sortOrder: 2,
    },
    {
      code: "Art. 113 — 2 Aug 2026",
      title: "Art. 50 transparency applies; GPAI enforcement begins",
      description:
        "From 2 August 2026, the general date of application (Art. 113, second paragraph): Art. 50 transparency obligations (chatbot disclosure, synthetic-content marking, deepfake labelling) apply, and the Commission's GPAI enforcement powers (Arts. 91-93, Art. 101 fines) begin. Providers of generative AI systems placed on the market before 2 August 2026 comply with Art. 50(2) by 2 December 2026 (Art. 111(4), inserted by Regulation (EU) 2026/1744). Annex III high-risk obligations do NOT apply on this date (deferred by the Digital Omnibus; see the 2 Dec 2027 entry).",
      sortOrder: 3,
    },
    {
      code: "Art. 5 — 2 Dec 2026",
      title:
        "New prohibitions: AI-generated CSAM and non-consensual intimate imagery",
      description:
        "From 2 December 2026 (Art. 113, third paragraph, point (a), as amended by Regulation (EU) 2026/1744): the new prohibitions in Art. 5(1), first subparagraph, points (ba) and (bb), on AI systems for generating non-consensual intimate imagery and child sexual abuse material, together with Art. 5(1a) and (1b). Providers are in scope where such generation is intended or reasonably foreseeable absent safeguards; deployers on deliberate misuse.",
      sortOrder: 4,
    },
    {
      code: "Art. 113 — 2 Dec 2027",
      title: "Annex III standalone high-risk obligations apply",
      description:
        "From 2 December 2027 (Art. 113, third paragraph, point (c), as amended by Regulation (EU) 2026/1744; deferred from 2 August 2026): Chapter III, Sections 1, 2 and 3, except Art. 6(5), apply to high-risk systems under Art. 6(2) and Annex III. Those sections cover classification (Arts. 6-7), the requirements for high-risk systems (Arts. 8-15) and the obligations of providers, deployers and other parties (Arts. 16-27, including the Art. 27 fundamental rights impact assessment). High-risk systems intended for use by public authorities have until 2 August 2030 (Art. 111(2)).",
      sortOrder: 5,
    },
    {
      code: "Art. 113(c) — 2 Aug 2028",
      title: "Annex I product-embedded high-risk AI",
      description:
        "From 2 August 2028 (Art. 113, third paragraph, point (c), as amended by Regulation (EU) 2026/1744; deferred from 2 August 2027): Chapter III, Sections 1, 2 and 3, except Art. 6(5), apply to high-risk systems under Art. 6(1) and Annex I, that is AI that is a safety component of (or is itself) a product under Annex I Union harmonisation legislation (e.g. medical devices under the MDR).",
      sortOrder: 6,
    },
  ],
};

/** Every code in the subtree, parent first — the set milestones may cite. */
export const EU_TIMELINE_REQUIREMENT_CODES: string[] = [
  EU_ART113_SUBTREE.code,
  ...EU_ART113_SUBTREE.children.map((child) => child.code),
];
