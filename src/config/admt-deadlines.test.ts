// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  ARTICLE_10_DUTY_LIVE_FROM,
  ARTICLE_11_COMPLIANCE_BY,
  CYBER_AUDIT_TIERS,
  FIRST_SUBMISSION_DUE,
  RISK_ASSESSMENT_BACKFILL_BY,
  addBusinessDays,
  addCalendarDays,
  computeAdmtDeadlines,
  materialChangeDeadline,
  optOutCessationDeadline,
  productionDemandDeadline,
  requestAcknowledgementDeadline,
  requestResponseDeadline,
} from "./admt-deadlines";

const NOW = new Date("2026-08-19T00:00:00.000Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("statutory dates", () => {
  it("pins the fixed dates", () => {
    expect(iso(ARTICLE_10_DUTY_LIVE_FROM)).toBe("2026-01-01");
    expect(iso(ARTICLE_11_COMPLIANCE_BY)).toBe("2027-01-01");
    expect(iso(RISK_ASSESSMENT_BACKFILL_BY)).toBe("2027-12-31");
    expect(iso(FIRST_SUBMISSION_DUE)).toBe("2028-04-01");
  });

  it("gives each cybersecurity-audit tier its OWN measured revenue year", () => {
    // The easy modelling error is "one revenue figure, three deadlines".
    const years = CYBER_AUDIT_TIERS.map((t) => t.revenueMeasuredForYear);
    expect(years).toEqual([2026, 2027, 2028]);
    expect(new Set(years).size).toBe(3);
    expect(CYBER_AUDIT_TIERS.map((t) => t.reportDueOn)).toEqual([
      "2028-04-01",
      "2029-04-01",
      "2030-04-01",
    ]);
  });
});

// ---------------------------------------------------------------------------
// The named test case: business days vs calendar days
// ---------------------------------------------------------------------------

describe("business-day vs calendar-day arithmetic", () => {
  it("skips weekends for business days and does not for calendar days", () => {
    // Monday 2026-08-17 + 5 business days = Monday 2026-08-24 (two weekend days
    // skipped); + 5 calendar days = Saturday 2026-08-22.
    const monday = new Date("2026-08-17T00:00:00.000Z");
    expect(monday.getUTCDay()).toBe(1);
    expect(iso(addBusinessDays(monday, 5))).toBe("2026-08-24");
    expect(iso(addCalendarDays(monday, 5))).toBe("2026-08-22");
  });

  it("never lands a business-day deadline on a weekend", () => {
    const start = new Date("2026-08-17T00:00:00.000Z");
    for (let days = 1; days <= 30; days++) {
      const day = addBusinessDays(start, days).getUTCDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });

  it("§7221(n)(1) opt-out cessation runs in 15 BUSINESS days", () => {
    // Monday + 15 business days = three calendar weeks later, i.e. 21 calendar
    // days — mixing the units would understate the deadline by six days.
    const monday = new Date("2026-08-17T00:00:00.000Z");
    const deadline = optOutCessationDeadline(monday);
    expect(iso(deadline)).toBe("2026-09-07");
    expect(iso(addCalendarDays(monday, 15))).toBe("2026-09-01");
    expect(deadline.getTime()).toBeGreaterThan(
      addCalendarDays(monday, 15).getTime(),
    );
  });

  it("§7021(a) acknowledgement runs in 10 BUSINESS days", () => {
    const monday = new Date("2026-08-17T00:00:00.000Z");
    expect(iso(requestAcknowledgementDeadline(monday))).toBe("2026-08-31");
  });

  it("§7021(b) response runs in 45 CALENDAR days, 90 with the one extension", () => {
    const start = new Date("2026-08-17T00:00:00.000Z");
    expect(iso(requestResponseDeadline(start))).toBe("2026-10-01");
    expect(iso(requestResponseDeadline(start, true))).toBe("2026-11-15");
  });

  it("§7157(e) production demand runs in 30 CALENDAR days", () => {
    const demanded = new Date("2026-08-17T00:00:00.000Z");
    expect(iso(productionDemandDeadline(demanded))).toBe("2026-09-16");
    // Explicitly NOT business days, which would be 2026-09-28.
    expect(iso(addBusinessDays(demanded, 30))).toBe("2026-09-28");
  });

  it("§7155(a)(3) material-change update runs in 45 CALENDAR days", () => {
    expect(iso(materialChangeDeadline(new Date("2026-08-17T00:00:00.000Z")))).toBe(
      "2026-10-01",
    );
  });
});

// ---------------------------------------------------------------------------
// Deadline set
// ---------------------------------------------------------------------------

describe("computeAdmtDeadlines", () => {
  it("reports not_assessed for every clock when nothing is known", () => {
    const set = computeAdmtDeadlines({
      processingInitiatedAt: null,
      triggers: [],
      articleElevenApplies: false,
      revenueBand: "NOT_ASSESSED",
      now: NOW,
    });
    for (const e of set.entries) {
      expect(e.status).toBe("not_assessed");
      expect(e.date).toBeNull();
      expect(e.daysRemaining).toBeNull();
    }
    expect(set.next).toBeNull();
  });

  it("surfaces the Article 10 duty as already overdue once a trigger exists", () => {
    const set = computeAdmtDeadlines({
      processingInitiatedAt: null,
      triggers: ["sell_share_pi"],
      articleElevenApplies: false,
      revenueBand: "NOT_ASSESSED",
      now: NOW,
    });
    const duty = set.entries.find((e) => e.id === "article_10_duty_live")!;
    expect(duty.status).toBe("overdue");
    expect(duty.daysRemaining).toBeLessThan(0);
    expect(set.next?.id).toBe("article_10_duty_live");
  });

  it("dates the Article 11 clock only when Article 11 actually applies", () => {
    const out = computeAdmtDeadlines({
      processingInitiatedAt: null,
      triggers: [],
      articleElevenApplies: false,
      revenueBand: "NOT_ASSESSED",
      now: NOW,
    });
    expect(out.entries.find((e) => e.id === "article_11_compliance")!.date).toBeNull();

    const inScope = computeAdmtDeadlines({
      processingInitiatedAt: null,
      triggers: [],
      articleElevenApplies: true,
      revenueBand: "NOT_ASSESSED",
      now: NOW,
    });
    const art11 = inScope.entries.find((e) => e.id === "article_11_compliance")!;
    expect(iso(art11.date!)).toBe("2027-01-01");
    expect(art11.status).toBe("due");
  });

  it("applies the backfill only to processing that began before 1 Jan 2026", () => {
    const before = computeAdmtDeadlines({
      processingInitiatedAt: new Date("2025-06-01T00:00:00.000Z"),
      triggers: ["sensitive_pi"],
      articleElevenApplies: false,
      revenueBand: "NOT_ASSESSED",
      now: NOW,
    });
    expect(
      iso(before.entries.find((e) => e.id === "risk_assessment_backfill")!.date!),
    ).toBe("2027-12-31");

    const after = computeAdmtDeadlines({
      processingInitiatedAt: new Date("2026-06-01T00:00:00.000Z"),
      triggers: ["sensitive_pi"],
      articleElevenApplies: false,
      revenueBand: "NOT_ASSESSED",
      now: NOW,
    });
    expect(
      after.entries.find((e) => e.id === "risk_assessment_backfill")!.date,
    ).toBeNull();
  });

  it("leaves the backfill unknown — not assumed — when the start date is null", () => {
    const set = computeAdmtDeadlines({
      processingInitiatedAt: null,
      triggers: ["sensitive_pi"],
      articleElevenApplies: false,
      revenueBand: "NOT_ASSESSED",
      now: NOW,
    });
    const backfill = set.entries.find((e) => e.id === "risk_assessment_backfill")!;
    expect(backfill.status).toBe("not_assessed");
    expect(backfill.date).toBeNull();
  });

  it("dates the audit report only once a revenue band is known", () => {
    expect(
      computeAdmtDeadlines({
        processingInitiatedAt: null,
        triggers: [],
        articleElevenApplies: false,
        revenueBand: "NOT_ASSESSED",
        now: NOW,
      }).entries.find((e) => e.id === "cyber_audit_report")!.date,
    ).toBeNull();

    const tiers: Array<[Parameters<typeof computeAdmtDeadlines>[0]["revenueBand"], string]> = [
      ["OVER_100M", "2028-04-01"],
      ["BETWEEN_50M_AND_100M", "2029-04-01"],
      ["UNDER_50M", "2030-04-01"],
    ];
    for (const [band, due] of tiers) {
      const set = computeAdmtDeadlines({
        processingInitiatedAt: null,
        triggers: [],
        articleElevenApplies: false,
        revenueBand: band,
        now: NOW,
      });
      expect(iso(set.entries.find((e) => e.id === "cyber_audit_report")!.date!)).toBe(due);
    }
  });

  it("computes the three-year review from the last assessment", () => {
    const set = computeAdmtDeadlines({
      processingInitiatedAt: null,
      triggers: ["sensitive_pi"],
      articleElevenApplies: false,
      lastRiskAssessmentAt: new Date("2026-03-15T00:00:00.000Z"),
      revenueBand: "NOT_ASSESSED",
      now: NOW,
    });
    expect(
      iso(set.entries.find((e) => e.id === "risk_assessment_review")!.date!),
    ).toBe("2029-03-15");
  });

  it("prefers an overdue entry over a nearer upcoming one for `next`", () => {
    const set = computeAdmtDeadlines({
      processingInitiatedAt: null,
      triggers: ["sell_share_pi"],
      articleElevenApplies: true,
      revenueBand: "OVER_100M",
      now: NOW,
    });
    expect(set.next?.status).toBe("overdue");
    expect(set.next?.id).toBe("article_10_duty_live");
  });

  it("is deterministic for a fixed `now`", () => {
    const args = {
      processingInitiatedAt: new Date("2025-01-01T00:00:00.000Z"),
      triggers: ["sell_share_pi"],
      articleElevenApplies: true,
      revenueBand: "OVER_100M" as const,
      now: NOW,
    };
    expect(computeAdmtDeadlines(args)).toEqual(computeAdmtDeadlines(args));
  });
});
