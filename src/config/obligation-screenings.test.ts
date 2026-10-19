// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Step 1.2's rule: done when the places are declared and every screening
 * shown to the organisation is answered. Before this rule, the step counted
 * only the Texas and Washington screening, so an organisation in California
 * only, or in the EU only, could never finish it.
 */

import { describe, expect, it } from "vitest";
import { obligationScreenings, regimeQuestionsFor } from "./obligation-screenings";
import { AI_SENTINEL_PATH, EMPTY_PATH_COUNTS, type PathCounts } from "@/components/guided/path-config";
import { evaluateChecks, evaluatePath } from "@/components/guided/path";
import { EMPTY_APPLICABILITY_ANSWERS } from "./applicability";

const APPLICABILITY_SAVED = {
  answeredAt: "2026-10-01T00:00:00.000Z",
  answers: { ...EMPTY_APPLICABILITY_ANSWERS, usesAi: "YES" },
};

/** Step 1.2's status for an organisation with these places and settings. */
function stepFor(jurisdictions: string[], settings: unknown, copied = false) {
  const s = obligationScreenings(jurisdictions, settings);
  const counts: PathCounts = {
    ...EMPTY_PATH_COUNTS,
    jurisdictions: jurisdictions.length,
    screeningsShown: s.shown,
    screeningsOpen: s.open,
    screeningQuestionsOpen: s.openQuestions,
    copiedObligationsPending: copied,
  };
  return {
    status: evaluatePath(AI_SENTINEL_PATH, counts).obligations,
    checks: evaluateChecks(AI_SENTINEL_PATH, counts).obligations,
    state: s,
  };
}

describe("which screenings an organisation is shown", () => {
  it("shows the applicability check to everyone", () => {
    expect(obligationScreenings([], {}).shown).toEqual(["applicability"]);
    expect(obligationScreenings(["EU"], {}).shown).toEqual(["applicability"]);
  });

  it("adds the California screening only where California is declared", () => {
    expect(obligationScreenings(["US_CA"], {}).shown).toEqual(["applicability", "california"]);
    expect(obligationScreenings(["EU", "UK"], {}).shown).not.toContain("california");
  });

  it("adds the state questions only for Texas or Washington, and only the ones that turn on them", () => {
    expect(obligationScreenings(["US_CA", "EU"], {}).shown).not.toContain("regimes");
    expect(regimeQuestionsFor(["US_TX"])).toEqual(["isPublicAgency", "isHealthcareProvider"]);
    expect(regimeQuestionsFor(["US_WA"])).toEqual([
      "isPublicAgency",
      "isHealthCarrier",
      "isCoveredGenAiProvider",
      "processesConsumerHealthData",
    ]);
    expect(regimeQuestionsFor(["EU", "US_CA"])).toEqual([]);
  });
});

describe("step 1.2 for a California-only organisation", () => {
  it("is started until the applicability check and the California question are answered", () => {
    const before = stepFor(["US_CA"], {});
    expect(before.status).toBe("started");
    expect(before.state.open).toEqual(["applicability", "california"]);

    const onlyApplicability = stepFor(["US_CA"], { applicability: APPLICABILITY_SAVED });
    expect(onlyApplicability.status).toBe("started");
    expect(onlyApplicability.state.open).toEqual(["california"]);
    expect(onlyApplicability.state.openQuestions).toBe(1);
  });

  it("is done once the California covered-business question has a yes or a no", () => {
    for (const answer of ["YES", "NO"]) {
      const done = stepFor(["US_CA"], {
        applicability: APPLICABILITY_SAVED,
        admt: { coveredBusiness: answer, revenueBand: "NOT_ASSESSED" },
      });
      expect(done.status, answer).toBe("done");
      expect(done.checks.every((c) => c.met)).toBe(true);
    }
  });

  it("is not done on 'not sure': an unanswered question never decides scope", () => {
    const unsure = stepFor(["US_CA"], {
      applicability: APPLICABILITY_SAVED,
      admt: { coveredBusiness: "NOT_ASSESSED" },
    });
    expect(unsure.status).toBe("started");
  });

  it("never needs the Texas and Washington screening, which is not shown to it", () => {
    const done = stepFor(["US_CA"], {
      applicability: APPLICABILITY_SAVED,
      admt: { coveredBusiness: "YES" },
      regimes: {},
    });
    expect(done.status).toBe("done");
    expect(done.checks.map((c) => c.id)).toEqual([
      "placesDeclared",
      "screeningApplicability",
      "screeningCalifornia",
    ]);
  });
});

describe("step 1.2 for an EU-only organisation", () => {
  it("is done once the applicability check is saved: no state screening applies", () => {
    expect(stepFor(["EU"], {}).status).toBe("started");
    const done = stepFor(["EU"], { applicability: APPLICABILITY_SAVED });
    expect(done.status).toBe("done");
    expect(done.checks.map((c) => c.id)).toEqual(["placesDeclared", "screeningApplicability"]);
  });

  it("does not count an applicability check left all 'not sure yet'", () => {
    const blank = stepFor(["EU"], {
      applicability: { answeredAt: "2026-10-01T00:00:00.000Z", answers: EMPTY_APPLICABILITY_ANSWERS },
    });
    expect(blank.status).toBe("started");
    expect(blank.state.openQuestions).toBe(7);
  });
});

describe("step 1.2 with Texas or Washington", () => {
  it("needs every state question shown to have a yes or a no", () => {
    const partly = stepFor(["US_TX"], {
      applicability: APPLICABILITY_SAVED,
      regimes: { isPublicAgency: "NO", isHealthcareProvider: "NOT_ASSESSED" },
    });
    expect(partly.status).toBe("started");
    expect(partly.state.openRegimeQuestions).toBe(1);

    const all = stepFor(["US_TX"], {
      applicability: APPLICABILITY_SAVED,
      regimes: { isPublicAgency: "NO", isHealthcareProvider: "YES" },
    });
    expect(all.status).toBe("done");
  });
});

describe("step 1.2 in every case", () => {
  it("is not started without places, whatever is answered", () => {
    expect(stepFor([], { applicability: APPLICABILITY_SAVED }).status).toBe("todo");
  });

  it("stays started while answers copied from another client wait to be saved again", () => {
    const copied = stepFor(["EU"], { applicability: APPLICABILITY_SAVED }, true);
    expect(copied.status).toBe("started");
    expect(copied.checks.find((c) => c.id === "copiedObligations")?.met).toBe(false);
  });

  it("reads stored settings defensively", () => {
    expect(obligationScreenings(["US_CA"], null).open).toEqual(["applicability", "california"]);
    expect(obligationScreenings(["US_CA"], "junk").open).toEqual(["applicability", "california"]);
  });
});
