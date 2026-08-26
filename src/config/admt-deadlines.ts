// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * California ADMT deadlines — the statutory clocks, computed deterministically.
 *
 * Same shape and doctrine as computeMarkingDeadline in transparency-rules.ts:
 * pure, `now` injectable, and every entry able to report `not_assessed` when the
 * fact it depends on is missing. A computed date is never invented from a null.
 *
 * The distinction this module exists to get right: some clocks run in CALENDAR
 * days and some in BUSINESS days, and mixing them is the classic error here.
 *
 *   * § 7221(n)(1) — cease processing after an opt-out: 15 BUSINESS days
 *   * § 7021(a)   — acknowledge a request:              10 BUSINESS days
 *   * § 7021(b)   — substantive response:               45 CALENDAR days,
 *                                                       + one 45-day extension
 *   * § 7157(e)   — produce risk-assessment reports on
 *                   demand from the CPPA or the AG:     30 CALENDAR days
 *   * § 7155(a)(3) — update after a material change:    45 CALENDAR days
 *
 * lawReviewedAsOf: see ADMT_DEADLINES_LAW_REVIEWED_AS_OF. California legal
 * sign-off is PENDING.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import type { RevenueBand } from "./admt-rules";

export const ADMT_DEADLINES_VERSION = "2026.08.1";
export const ADMT_DEADLINES_LAW_REVIEWED_AS_OF = "2026-08-21";

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Fixed statutory dates
// ---------------------------------------------------------------------------

/** Regulations effective (OAL approved 22 Sept 2025). */
export const CCPA_REGULATIONS_EFFECTIVE = new Date("2026-01-01T00:00:00.000Z");

/**
 * § 7150(a): the duty to conduct a risk assessment BEFORE initiating a
 * triggering activity has been live since the regulations took effect. This is
 * the date most organizations do not realise has already passed.
 */
export const ARTICLE_10_DUTY_LIVE_FROM = CCPA_REGULATIONS_EFFECTIVE;

/**
 * § 7200(b): businesses already using ADMT for a significant decision must
 * comply no later than this date; those starting later must comply from the
 * moment they start — there is no grace period for new uses.
 */
export const ARTICLE_11_COMPLIANCE_BY = new Date("2027-01-01T00:00:00.000Z");

/**
 * § 7155(b): risk assessments for processing that began before 1 Jan 2026 and
 * continues after it must be conducted and documented by this date.
 */
export const RISK_ASSESSMENT_BACKFILL_BY = new Date("2027-12-31T00:00:00.000Z");

/**
 * § 7157(a)(1): first submission and executive attestation to the Agency,
 * covering every risk assessment conducted in 2026 and 2027. Counts and an
 * attestation are submitted — not the reports themselves.
 */
export const FIRST_SUBMISSION_DUE = new Date("2028-04-01T00:00:00.000Z");

/** § 7155(a)(2): review and update each risk assessment at least this often. */
export const RISK_ASSESSMENT_REVIEW_INTERVAL_YEARS = 3;

/** § 7155(a)(3): update within this many CALENDAR days of a material change. */
export const MATERIAL_CHANGE_UPDATE_DAYS = 45;

/**
 * § 7155(c): retain for as long as the processing continues, or five years
 * after it completes — whichever is LATER.
 */
export const RETENTION_YEARS_AFTER_COMPLETION = 5;

/** § 7157(e): produce the actual reports within this many CALENDAR days. */
export const PRODUCTION_DEMAND_CALENDAR_DAYS = 30;

/** § 7221(n)(1): cease processing within this many BUSINESS days. */
export const OPT_OUT_CESSATION_BUSINESS_DAYS = 15;

/** § 7021(a): acknowledge within this many BUSINESS days. */
export const REQUEST_ACKNOWLEDGEMENT_BUSINESS_DAYS = 10;

/** § 7021(b): respond within this many CALENDAR days, one extension allowed. */
export const REQUEST_RESPONSE_CALENDAR_DAYS = 45;
export const REQUEST_RESPONSE_EXTENSION_CALENDAR_DAYS = 45;

/**
 * § 7121(a): cybersecurity-audit phase-in.
 *
 * Note the asymmetry that is easy to model wrongly — each tier measures a
 * DIFFERENT revenue year. This is not "one revenue figure, three deadlines".
 */
export interface CyberAuditTier {
  band: Exclude<RevenueBand, "NOT_ASSESSED">;
  /** Calendar year whose revenue determines whether the tier applies. */
  revenueMeasuredForYear: number;
  /** Period the first audit must cover. */
  auditPeriodStart: string;
  auditPeriodEnd: string;
  /** § 7124(b): report complete and certification filed by this date. */
  reportDueOn: string;
  citation: string;
}

export const CYBER_AUDIT_TIERS: readonly CyberAuditTier[] = [
  {
    band: "OVER_100M",
    revenueMeasuredForYear: 2026,
    auditPeriodStart: "2027-01-01",
    auditPeriodEnd: "2028-01-01",
    reportDueOn: "2028-04-01",
    citation: "Cal. Code Regs. tit. 11, § 7121(a)(1)",
  },
  {
    band: "BETWEEN_50M_AND_100M",
    revenueMeasuredForYear: 2027,
    auditPeriodStart: "2028-01-01",
    auditPeriodEnd: "2029-01-01",
    reportDueOn: "2029-04-01",
    citation: "Cal. Code Regs. tit. 11, § 7121(a)(2)",
  },
  {
    band: "UNDER_50M",
    revenueMeasuredForYear: 2028,
    auditPeriodStart: "2029-01-01",
    auditPeriodEnd: "2030-01-01",
    reportDueOn: "2030-04-01",
    citation: "Cal. Code Regs. tit. 11, § 7121(a)(3)",
  },
] as const;

// ---------------------------------------------------------------------------
// Day arithmetic
// ---------------------------------------------------------------------------

/**
 * Add N business days (Mon-Fri) to a date.
 *
 * Deliberately does NOT account for public holidays: the regulations say
 * "business days" without defining a holiday calendar, and silently inventing
 * one would produce a date the text does not support. Callers presenting this
 * should treat it as the earliest possible deadline.
 */
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return result;
}

/** Add N calendar days. */
export function addCalendarDays(start: Date, days: number): Date {
  const result = new Date(start.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Signed whole days until `deadline` (negative when past). */
export function daysUntil(deadline: Date, now: Date): number {
  return Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS);
}

// ---------------------------------------------------------------------------
// Deadline set
// ---------------------------------------------------------------------------

export type AdmtDeadlineId =
  | "article_10_duty_live"
  | "article_11_compliance"
  | "risk_assessment_backfill"
  | "risk_assessment_review"
  | "first_submission"
  | "cyber_audit_report";

export type AdmtDeadlineStatus = "due" | "overdue" | "not_assessed";

export interface AdmtDeadline {
  id: AdmtDeadlineId;
  /** Null whenever the fact it depends on is unknown. */
  date: Date | null;
  status: AdmtDeadlineStatus;
  /** Signed whole days; null when the date is null. */
  daysRemaining: number | null;
  /** Statutory basis, for display next to the date. */
  citation: string;
  /** Which unit the underlying clock runs in, where one is involved. */
  unit?: "calendar_days" | "business_days";
}

export interface AdmtDeadlineSet {
  entries: AdmtDeadline[];
  /** The nearest entry that is due or overdue, or null when all are unknown. */
  next: AdmtDeadline | null;
}

function entry(
  id: AdmtDeadlineId,
  date: Date | null,
  citation: string,
  now: Date,
  unit?: AdmtDeadline["unit"],
): AdmtDeadline {
  if (!date) {
    return {
      id,
      date: null,
      status: "not_assessed",
      daysRemaining: null,
      citation,
      unit,
    };
  }
  const daysRemaining = daysUntil(date, now);
  return {
    id,
    date,
    status: daysRemaining < 0 ? "overdue" : "due",
    daysRemaining,
    citation,
    unit,
  };
}

/**
 * Compute the deadline set for one system's ADMT posture.
 *
 * Every input may be null, and each null produces a `not_assessed` entry rather
 * than a guessed date:
 *
 *   * `processingInitiatedAt` null ⇒ we cannot say whether the § 7155(b)
 *     backfill applies (it reaches processing that began BEFORE 1 Jan 2026), so
 *     that entry is not_assessed rather than assumed either way.
 *   * `revenueBand` NOT_ASSESSED ⇒ no cybersecurity-audit tier, because each
 *     tier measures a different revenue year and picking one would be a guess.
 *   * `lastRiskAssessmentAt` null ⇒ no three-year review date; the review clock
 *     starts from an assessment that has not happened.
 */
export function computeAdmtDeadlines(input: {
  /** When the triggering processing began; null when unknown. */
  processingInitiatedAt: Date | null;
  /** § 7150(b) triggers recorded for this system. */
  triggers: readonly string[];
  /** True when the system is in Article 11 scope. */
  articleElevenApplies: boolean;
  /** Most recent completed risk assessment, if any. */
  lastRiskAssessmentAt?: Date | null;
  revenueBand: RevenueBand;
  now?: Date;
}): AdmtDeadlineSet {
  const now = input.now ?? new Date();
  const entries: AdmtDeadline[] = [];

  // Article 10 duty — live since 1 Jan 2026, but only meaningful once at least
  // one trigger is recorded.
  entries.push(
    entry(
      "article_10_duty_live",
      input.triggers.length > 0 ? ARTICLE_10_DUTY_LIVE_FROM : null,
      "Cal. Code Regs. tit. 11, § 7150(a)",
      now,
    ),
  );

  entries.push(
    entry(
      "article_11_compliance",
      input.articleElevenApplies ? ARTICLE_11_COMPLIANCE_BY : null,
      "Cal. Code Regs. tit. 11, § 7200(b)",
      now,
    ),
  );

  // § 7155(b) backfill reaches processing that began before the regulations
  // took effect and continues after. Unknown start date ⇒ unknown answer.
  const backfillApplies =
    input.processingInitiatedAt === null
      ? null
      : input.processingInitiatedAt.getTime() <
        CCPA_REGULATIONS_EFFECTIVE.getTime();
  entries.push(
    entry(
      "risk_assessment_backfill",
      backfillApplies === true ? RISK_ASSESSMENT_BACKFILL_BY : null,
      "Cal. Code Regs. tit. 11, § 7155(b)",
      now,
    ),
  );

  // § 7155(a)(2): three years from the last assessment.
  let reviewDue: Date | null = null;
  if (input.lastRiskAssessmentAt) {
    reviewDue = new Date(input.lastRiskAssessmentAt.getTime());
    reviewDue.setUTCFullYear(
      reviewDue.getUTCFullYear() + RISK_ASSESSMENT_REVIEW_INTERVAL_YEARS,
    );
  }
  entries.push(
    entry(
      "risk_assessment_review",
      reviewDue,
      "Cal. Code Regs. tit. 11, § 7155(a)(2)",
      now,
    ),
  );

  entries.push(
    entry(
      "first_submission",
      input.triggers.length > 0 ? FIRST_SUBMISSION_DUE : null,
      "Cal. Code Regs. tit. 11, § 7157(a)(1)",
      now,
    ),
  );

  const tier =
    input.revenueBand === "NOT_ASSESSED"
      ? null
      : (CYBER_AUDIT_TIERS.find((t) => t.band === input.revenueBand) ?? null);
  entries.push(
    entry(
      "cyber_audit_report",
      tier ? new Date(`${tier.reportDueOn}T00:00:00.000Z`) : null,
      tier?.citation ?? "Cal. Code Regs. tit. 11, § 7121(a)",
      now,
    ),
  );

  const dated = entries
    .filter((e) => e.date !== null)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());
  const overdue = dated.find((e) => e.status === "overdue") ?? null;
  const upcoming = dated.find((e) => e.status === "due") ?? null;

  return { entries, next: overdue ?? upcoming };
}

/** § 7221(n)(1): cease processing within 15 BUSINESS days of an opt-out. */
export function optOutCessationDeadline(receivedAt: Date): Date {
  return addBusinessDays(receivedAt, OPT_OUT_CESSATION_BUSINESS_DAYS);
}

/** § 7021(a): acknowledge within 10 BUSINESS days. */
export function requestAcknowledgementDeadline(receivedAt: Date): Date {
  return addBusinessDays(receivedAt, REQUEST_ACKNOWLEDGEMENT_BUSINESS_DAYS);
}

/** § 7021(b): respond within 45 CALENDAR days, or 90 with the one extension. */
export function requestResponseDeadline(
  receivedAt: Date,
  extended = false,
): Date {
  return addCalendarDays(
    receivedAt,
    REQUEST_RESPONSE_CALENDAR_DAYS +
      (extended ? REQUEST_RESPONSE_EXTENSION_CALENDAR_DAYS : 0),
  );
}

/** § 7157(e): produce the reports within 30 CALENDAR days of the demand. */
export function productionDemandDeadline(demandedAt: Date): Date {
  return addCalendarDays(demandedAt, PRODUCTION_DEMAND_CALENDAR_DAYS);
}

/** § 7155(a)(3): update the assessment within 45 CALENDAR days. */
export function materialChangeDeadline(changedAt: Date): Date {
  return addCalendarDays(changedAt, MATERIAL_CHANGE_UPDATE_DAYS);
}
