// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Each page is titled with its menu label; the technical term (registry,
 * classification, compliance, ...) stays in the subtitle.
 */

import { describe, it, expect } from "vitest";
import en from "./en.json";
import es from "./es.json";

type Msgs = typeof en;

const PAIRS: Array<[string, (m: Msgs) => string, (m: Msgs) => string]> = [
  ["quickstart", (m) => m.guided.steps.quickstart.label, (m) => m.quickstart.title],
  ["obligations", (m) => m.guided.steps.obligations.label, (m) => m.obligations.title],
  ["policies", (m) => m.guided.steps.policies.label, (m) => m.policies.title],
  ["systems", (m) => m.guided.steps.systems.label, (m) => m.aiRegistry.title],
  ["shadowAi", (m) => m.guided.steps.shadowAi.label, (m) => m.shadowAi.title],
  ["vendors", (m) => m.guided.steps.vendors.label, (m) => m.vendors.title],
  ["classification", (m) => m.guided.steps.classification.label, (m) => m.riskClassification.title],
  ["assessments", (m) => m.guided.steps.assessments.label, (m) => m.assessments.title],
  ["threatModel", (m) => m.guided.steps.threatModel.label, (m) => m.threatModel.title],
  ["vendorDueDiligence", (m) => m.guided.steps.vendorDueDiligence.label, (m) => m.guided.views.dueDiligence],
  ["agentTesting", (m) => m.guided.steps.agentTesting.label, (m) => m.agentTesting.title],
  ["oversight", (m) => m.guided.steps.oversight.label, (m) => m.oversight.title],
  ["transparency", (m) => m.guided.steps.transparency.label, (m) => m.guided.views.transparency],
  ["evidence", (m) => m.guided.steps.evidence.label, (m) => m.compliance.title],
  ["sensitiveData", (m) => m.guided.steps.sensitiveData.label, (m) => m.sensitiveData.title],
  ["incidents", (m) => m.guided.steps.incidents.label, (m) => m.incidents.title],
  ["proceedings", (m) => m.guided.steps.proceedings.label, (m) => m.proceedings.title],
  ["review", (m) => m.guided.steps.review.label, (m) => m.provenance.queue.title],
  ["board", (m) => m.guided.steps.board.label, (m) => m.boardReports.title],
  ["audit", (m) => m.guided.steps.audit.label, (m) => m.audit.title],
  ["needsAction", (m) => m.guided.library.needsAction, (m) => m.views.needsAction.title],
  ["incomplete", (m) => m.guided.library.incomplete, (m) => m.views.incomplete.title],
  ["program", (m) => m.guided.library.program, (m) => m.program.page.title],
  ["vendorCatalog", (m) => m.guided.library.vendorCatalog, (m) => m.vendorCatalog.title],
  ["skills", (m) => m.guided.library.skills, (m) => m.skills.title],
  ["settings", (m) => m.guided.library.settings, (m) => m.settings.title],
];

describe("the page title is the menu label", () => {
  for (const [lang, m] of [["en", en], ["es", es]] as const) {
    for (const [id, menu, title] of PAIRS) {
      it(`${lang} ${id}`, () => {
        expect(title(m as Msgs)).toBe(menu(m as Msgs));
      });
    }
  }

  it("keeps the technical term in the subtitle", () => {
    expect(en.aiRegistry.subtitle).toMatch(/^The AI registry/);
    expect(es.aiRegistry.subtitle).toMatch(/^El registro de IA/);
    expect(en.compliance.description).toMatch(/^Compliance/);
    expect(es.compliance.description).toMatch(/^Cumplimiento/);
    expect(en.riskClassification.subtitle).toMatch(/^Risk classification/);
    expect(en.program.page.subtitle).toMatch(/^The AI governance program/);
  });
});
