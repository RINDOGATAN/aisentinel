// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  computeIncidentDeadlines,
  deadlineState,
  suggestsPersonalDataBreach,
  type IncidentFacts,
} from "./incident-deadlines";

const AWARE = new Date("2026-09-01T09:00:00.000Z");

const base: IncidentFacts = {
  awareAt: AWARE,
  role: "PROVIDER",
  euHighRisk: true,
  jurisdictions: ["EU"],
};

const days = (from: Date, n: number) => new Date(from.getTime() + n * 86_400_000);

describe("EU AI Act Article 73", () => {
  it("gives fifteen days in the ordinary case", () => {
    const [d] = computeIncidentDeadlines(base);
    expect(d.id).toBe("eu-ai-act-73-15day");
    expect(d.dueAt).toEqual(days(AWARE, 15));
    expect(d.citation).toContain("Art. 73(2)");
  });

  it("gives ten days where a person has died", () => {
    const [d] = computeIncidentDeadlines({ ...base, death: true });
    expect(d.dueAt).toEqual(days(AWARE, 10));
    expect(d.citation).toContain("Art. 73(4)");
  });

  it("gives two days for a widespread infringement or critical infrastructure", () => {
    const [d] = computeIncidentDeadlines({
      ...base,
      widespreadOrCriticalInfrastructure: true,
    });
    expect(d.dueAt).toEqual(days(AWARE, 2));
    expect(d.citation).toContain("Art. 73(3)");
  });

  it("prefers the shortest clock when both a death and critical infrastructure apply", () => {
    const [d] = computeIncidentDeadlines({
      ...base,
      death: true,
      widespreadOrCriticalInfrastructure: true,
    });
    expect(d.dueAt).toEqual(days(AWARE, 2));
  });

  it("sends the report to the AI Office where it is exclusively competent", () => {
    const [d] = computeIncidentDeadlines({ ...base, aiOfficeCompetent: true });
    expect(d.recipient.en).toContain("AI Office");
    expect(d.recipient.es).toContain("Oficina de IA");
  });

  it("says nothing for a system that is not high-risk", () => {
    expect(computeIncidentDeadlines({ ...base, euHighRisk: false })).toEqual([]);
  });

  it("says nothing where the organization does not operate in the EU", () => {
    expect(computeIncidentDeadlines({ ...base, jurisdictions: ["US_CA"] })).toEqual([]);
  });
});

describe("the deployer's duty", () => {
  it("is immediate, with no invented period", () => {
    const [d] = computeIncidentDeadlines({ ...base, role: "DEPLOYER" });
    expect(d.id).toBe("eu-ai-act-26-5");
    expect(d.dueAt).toBeNull();
    expect(d.kind).toBe("immediate");
  });
});

describe("GDPR", () => {
  it("computes 72 hours from awareness", () => {
    const list = computeIncidentDeadlines({ ...base, personalDataBreach: true });
    const gdpr = list.find((d) => d.id === "gdpr-33");
    expect(gdpr?.dueAt).toEqual(new Date(AWARE.getTime() + 72 * 3_600_000));
  });

  it("adds telling the people affected only where the risk is high", () => {
    const without = computeIncidentDeadlines({ ...base, personalDataBreach: true });
    expect(without.some((d) => d.id === "gdpr-34")).toBe(false);

    const withHigh = computeIncidentDeadlines({
      ...base,
      personalDataBreach: true,
      highRiskToIndividuals: true,
    });
    expect(withHigh.some((d) => d.id === "gdpr-34")).toBe(true);
  });

  it("applies even when the AI Act clocks do not", () => {
    const list = computeIncidentDeadlines({
      ...base,
      euHighRisk: false,
      personalDataBreach: true,
    });
    expect(list.map((d) => d.id)).toEqual(["gdpr-33"]);
  });
});

describe("how a deadline stands", () => {
  const deadline = computeIncidentDeadlines(base)[0];

  it("is open when there is time", () => {
    expect(deadlineState(deadline, days(AWARE, 1))).toBe("open");
  });

  it("is due soon within a day of the limit", () => {
    expect(deadlineState(deadline, days(AWARE, 14.5))).toBe("due-soon");
  });

  it("is overdue past the limit", () => {
    expect(deadlineState(deadline, days(AWARE, 16))).toBe("overdue");
  });

  it("reports an immediate duty as immediate, never as overdue", () => {
    const [dep] = computeIncidentDeadlines({ ...base, role: "DEPLOYER" });
    expect(deadlineState(dep, days(AWARE, 90))).toBe("immediate");
  });
});

describe("the breach hint", () => {
  it("suggests a breach for the types that ordinarily involve personal data", () => {
    expect(suggestsPersonalDataBreach("UNAUTHORIZED_ACCESS")).toBe(true);
    expect(suggestsPersonalDataBreach("PRIVACY_VIOLATION")).toBe(true);
  });

  it("does not suggest one for a hallucination", () => {
    expect(suggestsPersonalDataBreach("HALLUCINATION")).toBe(false);
  });
});
