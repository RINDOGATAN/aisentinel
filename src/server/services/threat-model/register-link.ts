// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Tested controls become evidence in the compliance register.
 *
 * This is the join between the two halves of the product. A builder writes a
 * control and tries to break it; a lawyer needs to show that Article 15 is met.
 * They are the same fact, described twice, and until now neither could see the
 * other's version.
 *
 * The rule that makes it defensible: **only a tested control counts**. A
 * control with no test, a failed test, a partial result, or a pass that has
 * gone stale evidences nothing. Writing an untested guardrail into a compliance
 * register is exactly the overclaiming this product exists to prevent.
 *
 * Idempotent by title: applying twice adds nothing the second time.
 */

import {
  SCENARIO_LIBRARY,
  controlState,
  type TestResult,
} from "@/config/threat-model";
import type { Citation } from "@/config/unified-assessment";

export interface ScenarioForLink {
  id: string;
  libraryId: string | null;
  title: string;
  status: string;
  controls: Array<{
    id: string;
    layer: string;
    description: string;
    tests: Array<{ result: string; method: string; testedAt: Date }>;
  }>;
}

export interface RequirementRow {
  id: string;
  code: string;
  frameworkCode: string;
}

export interface MappingRow {
  id: string;
  requirementId: string;
  status: string;
  evidenceTitles: string[];
}

export interface PlannedEvidence {
  mappingId: string;
  requirementId: string;
  requirementCode: string;
  frameworkCode: string;
  title: string;
  description: string;
  liftStatus: boolean;
}

export interface LinkPlan {
  evidence: PlannedEvidence[];
  /** Scenarios whose controls are not tested, and so evidence nothing yet. */
  untested: Array<{ scenarioId: string; title: string; reason: "no-test" | "not-passing" }>;
  /** Citations with no mapping for this system: classify it first. */
  unmapped: Array<{ frameworkCode: string; code: string }>;
  counts: { evidence: number; lifted: number; alreadyThere: number };
}

/** The evidence title, and the dedupe key. Stable on purpose. */
export function evidenceTitle(modelName: string, controlDescription: string): string {
  const short =
    controlDescription.length > 90 ? `${controlDescription.slice(0, 89)}…` : controlDescription;
  return `Tested control (${modelName}): ${short}`;
}

/**
 * What applying would write. Pure: the same inputs always give the same plan,
 * so the preview and the apply cannot disagree.
 */
export function planRegisterLink(
  modelName: string,
  scenarios: ScenarioForLink[],
  requirements: RequirementRow[],
  mappings: MappingRow[],
  now: Date,
): LinkPlan {
  const requirementByKey = new Map(
    requirements.map((r) => [`${r.frameworkCode}::${r.code}`, r]),
  );
  const mappingByRequirement = new Map(mappings.map((m) => [m.requirementId, m]));

  const evidence: PlannedEvidence[] = [];
  const untested: LinkPlan["untested"] = [];
  const unmapped: LinkPlan["unmapped"] = [];
  const seen = new Set<string>();
  let alreadyThere = 0;
  let lifted = 0;

  for (const scenario of scenarios) {
    if (!scenario.libraryId) continue;
    const entry = SCENARIO_LIBRARY.find((s) => s.id === scenario.libraryId);
    if (!entry || entry.satisfies.length === 0) continue;

    // The first control with a current passing test is the one quoted as
    // evidence. Where several are proven, the earliest listed wins, so the
    // output is stable rather than dependent on database ordering.
    const proven = scenario.controls.find((c) => {
      const last = c.tests[0];
      return (
        controlState((last?.result as TestResult) ?? null, last?.testedAt ?? null, now) ===
        "proven"
      );
    });

    if (!proven) {
      const anyTest = scenario.controls.some((c) => c.tests.length > 0);
      untested.push({
        scenarioId: scenario.id,
        title: scenario.title,
        reason: anyTest ? "not-passing" : "no-test",
      });
      continue;
    }

    const lastTest = proven.tests[0];
    const title = evidenceTitle(modelName, proven.description);
    const description = [
      `Scenario: ${scenario.title}`,
      `Control (${proven.layer.toLowerCase()}): ${proven.description}`,
      `Tested on ${lastTest.testedAt.toISOString().slice(0, 10)}: ${lastTest.method}`,
      `Result: ${lastTest.result}`,
    ].join("\n");

    for (const citation of entry.satisfies as Citation[]) {
      const key = `${citation.framework}::${citation.code}`;
      const requirement = requirementByKey.get(key);
      if (!requirement) {
        if (!unmapped.some((u) => u.frameworkCode === citation.framework && u.code === citation.code)) {
          unmapped.push({ frameworkCode: citation.framework, code: citation.code });
        }
        continue;
      }
      const mapping = mappingByRequirement.get(requirement.id);
      if (!mapping) {
        if (!unmapped.some((u) => u.frameworkCode === citation.framework && u.code === citation.code)) {
          unmapped.push({ frameworkCode: citation.framework, code: citation.code });
        }
        continue;
      }

      // Idempotent: the same tested control never lands twice on the same
      // requirement, however often this is run.
      if (mapping.evidenceTitles.includes(title)) {
        alreadyThere += 1;
        continue;
      }
      const dedupe = `${mapping.id}::${title}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);

      const liftStatus = mapping.status === "NOT_ASSESSED" || mapping.status === "NON_COMPLIANT";
      if (liftStatus) lifted += 1;

      evidence.push({
        mappingId: mapping.id,
        requirementId: requirement.id,
        requirementCode: requirement.code,
        frameworkCode: requirement.frameworkCode,
        title,
        description,
        liftStatus,
      });
    }
  }

  return {
    evidence,
    untested,
    unmapped,
    counts: { evidence: evidence.length, lifted, alreadyThere },
  };
}
