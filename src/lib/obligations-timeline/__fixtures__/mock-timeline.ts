// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Mock timeline inputs — shared by unit tests, the dev preview route
 * (/preview/obligations-timeline) and PDF visual QA, so all three exercise
 * exactly the same geometry.
 *
 * Deliberately includes: an overdue milestone, the tight Dec-2026/Jan-2027
 * cluster (the case a pure linear scale destroys), the eleven-month
 * California→EU gap (the case a pure ordinal scale hides), a
 * not-applicable entry, and an unknown-scope entry.
 */

import type { TimelineMilestoneInput } from "../types";

/** A fixed "today" so fixture-driven output is reproducible. */
export const MOCK_TIMELINE_NOW = "2026-08-19T00:00:00.000Z";

export const MOCK_TIMELINE: TimelineMilestoneInput[] = [
  {
    id: "eu-ai-act-prohibitions-literacy",
    dateIso: "2025-02-02",
    label: "EU prohibited practices and AI literacy are live",
    dateLabel: "2 Feb 2025",
    countLabel: "Applies to your organization",
    tone: "overdue",
    emphasis: false,
  },
  {
    id: "ccpa-risk-assessment-duty-live",
    dateIso: "2026-01-01",
    label: "California risk assessments are already required",
    dateLabel: "1 Jan 2026",
    countLabel: "Scope not yet determined",
    tone: "unknown",
    emphasis: false,
  },
  {
    id: "eu-ai-act-art50-transparency",
    dateIso: "2026-08-02",
    label: "EU AI Act transparency obligations apply",
    dateLabel: "2 Aug 2026",
    countLabel: "3 systems · 2 undetermined",
    tone: "overdue",
    emphasis: false,
  },
  {
    id: "eu-ai-act-art50-marking-grace",
    dateIso: "2026-12-02",
    label: "Machine-readable marking grace period expires",
    dateLabel: "2 Dec 2026",
    countLabel: "2 systems",
    tone: "imminent",
    emphasis: true,
  },
  {
    id: "eu-ai-act-art5-new-prohibitions",
    dateIso: "2026-12-02",
    label: "New EU prohibitions: AI-generated CSAM and intimate imagery",
    dateLabel: "2 Dec 2026",
    countLabel: "Does not apply to your inventory",
    tone: "not-applicable",
    emphasis: false,
  },
  {
    id: "ccpa-admt-article-11-rights",
    dateIso: "2027-01-01",
    label: "California ADMT rights: pre-use notice, opt-out, access",
    dateLabel: "1 Jan 2027",
    countLabel: "4 systems · 2 undetermined",
    tone: "upcoming",
    emphasis: false,
  },
  {
    id: "eu-ai-act-annex-iii-high-risk",
    dateIso: "2027-12-02",
    label: "EU high-risk obligations apply (Annex III)",
    dateLabel: "2 Dec 2027",
    countLabel: "1 system",
    tone: "upcoming",
    emphasis: false,
  },
  {
    id: "ccpa-risk-assessment-backfill",
    dateIso: "2027-12-31",
    label: "Risk assessments for 2026–2027 activities must be complete",
    dateLabel: "31 Dec 2027",
    countLabel: "Applies to your organization",
    tone: "upcoming",
    emphasis: false,
  },
  {
    id: "ccpa-cyber-audit-tier-1",
    dateIso: "2028-04-01",
    label: "Cybersecurity audit due — businesses over $100M revenue",
    dateLabel: "1 Apr 2028",
    countLabel: "Scope not yet determined",
    tone: "unknown",
    emphasis: false,
  },
  {
    id: "eu-ai-act-annex-i-high-risk",
    dateIso: "2028-08-02",
    label: "EU high-risk obligations apply to product-embedded AI (Annex I)",
    dateLabel: "2 Aug 2028",
    countLabel: "Scope not yet determined",
    tone: "unknown",
    emphasis: false,
  },
];
