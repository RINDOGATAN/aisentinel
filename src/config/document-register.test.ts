// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The document register (src/config/document-register.ts): the four states,
 * the inputs it names, its tie to the path, and its words in both languages.
 */

import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { AI_SENTINEL_PATH, EMPTY_PATH_COUNTS } from "@/components/guided/path-config";
import {
  DOCUMENT_REGISTER,
  INPUTS,
  documentEntry,
  evaluateRegister,
  notYetEntries,
  type DocumentFacts,
  type DocumentStatus,
} from "./document-register";

const EMPTY: DocumentFacts = {
  ...EMPTY_PATH_COUNTS,
  policiesApproved: 0,
  policiesUnconfirmed: 0,
  systemsWithApprovedAssessment: 0,
  models: 0,
  sensitiveOpen: 0,
  aiAssistOn: false,
  impactAssessmentLocked: false,
  programReportLocked: false,
};

/** An organisation that has done, and confirmed, everything the documents need. */
const COMPLETE: DocumentFacts = {
  ...EMPTY,
  quickstartCompleted: true,
  jurisdictions: 2,
  regimeScreeningAnswered: true,
  policies: 6,
  policiesApproved: 6,
  systems: 3,
  systemsWithOwner: 3,
  systemsProcessingPersonalData: 1,
  models: 2,
  classified: 3,
  highRisk: 1,
  highRiskWithGate: 1,
  oversightGates: 2,
  transparencyProfiles: 3,
  assessments: 2,
  assessmentsApproved: 2,
  systemsWithApprovedAssessment: 3,
  threatModels: 1,
  threatModelsActive: 1,
  vendors: 2,
  vendorsAssessed: 2,
  agents: 1,
  agentsReadyForAudit: 1,
  mappings: 40,
  mappingsNotAssessed: 0,
  evidence: 3,
  sensitiveAssessments: 1,
  personalDataSystemsAssessed: 1,
  boardReports: 1,
  auditEntries: 10,
  aiAssistOn: true,
};

const stateOf = (facts: DocumentFacts) =>
  Object.fromEntries(evaluateRegister(facts).map((d) => [d.id, d.status])) as Record<string, DocumentStatus>;

const steps = AI_SENTINEL_PATH.stages.flatMap((s) => s.steps);

describe("the register and the path", () => {
  it("ties every document to a step of the path (or to the dashboard)", () => {
    const ids = new Set(steps.map((s) => s.id));
    for (const entry of DOCUMENT_REGISTER) {
      if (entry.stepId !== null) expect(ids.has(entry.stepId), entry.id).toBe(true);
    }
  });

  it("names every step that is coming once, as a document not in AI SENTINEL yet", () => {
    const coming = steps.filter((s) => s.coming).map((s) => s.id);
    for (const id of coming) {
      expect(notYetEntries().filter((e) => e.stepId === id), id).toHaveLength(1);
    }
  });

  it("has unique ids, a rule in words, and a page for every document it produces", () => {
    const ids = DOCUMENT_REGISTER.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of DOCUMENT_REGISTER) {
      expect(entry.rule.length, entry.id).toBeGreaterThan(10);
      expect(entry.needs.length, entry.id).toBeGreaterThan(5);
      if (entry.evaluate) expect(entry.href, entry.id).toBeTruthy();
      else expect(entry.href, entry.id).toBeNull();
    }
  });

  it("links every input to a page of the product", () => {
    for (const [input, { href }] of Object.entries(INPUTS)) {
      expect(href.startsWith("/governance/"), input).toBe(true);
    }
  });
});

describe("the four states", () => {
  it("for a new organisation: nothing ready, each document names what it needs", () => {
    const s = stateOf(EMPTY);
    expect(s.plan).toEqual({ state: "needsInput", input: "quickstart" });
    expect(s.obligationsCalendar).toEqual({ state: "needsInput", input: "jurisdiction" });
    expect(s.policies).toEqual({ state: "needsInput", input: "policy" });
    expect(s.systemRegister).toEqual({ state: "needsInput", input: "system" });
    expect(s.impactAssessment).toEqual({ state: "needsInput", input: "jurisdiction" });
    expect(s.annexIv).toEqual({ state: "needsInput", input: "aiAssist" });
    expect(s.vendorDueDiligence).toEqual({ state: "needsInput", input: "vendor" });
    expect(s.complianceSummary).toEqual({ state: "needsInput", input: "mapping" });
    expect(Object.values(s).some((x) => x.state === "ready")).toBe(false);
    expect(s.prohibitedScreen).toEqual({ state: "notYet" });
  });

  it("leaves the AIUC-1 evidence out until the inventory holds an agent", () => {
    expect(evaluateRegister(EMPTY).some((d) => d.id === "aiuc1Evidence")).toBe(false);
    expect(evaluateRegister({ ...EMPTY, agents: 1 }).some((d) => d.id === "aiuc1Evidence")).toBe(true);
  });

  it("for a complete, confirmed programme: every document ready, AI drafts excepted", () => {
    const s = stateOf(COMPLETE);
    for (const [id, status] of Object.entries(s)) {
      const entry = documentEntry(id)!;
      if (!entry.evaluate) expect(status.state, id).toBe("notYet");
      else if (id === "annexIv" || id === "transparencyStatement") expect(status.state, id).toBe("draft");
      else expect(status.state, id).toBe("ready");
    }
  });

  it("counts drafts once confirmed: a drafted item is a gap, never content", () => {
    const s = stateOf({
      ...COMPLETE,
      unconfirmed: 5,
      classificationsUnconfirmed: 2,
      gatesUnconfirmed: 1,
      transparencyUnconfirmed: 2,
      policiesUnconfirmed: 3,
    });
    expect(s.riskClassification).toEqual({ state: "draft", gaps: [{ key: "toConfirm", count: 2 }] });
    expect(s.humanReviewProtocol).toEqual({ state: "draft", gaps: [{ key: "toConfirm", count: 1 }] });
    expect(s.notice).toEqual({ state: "draft", gaps: [{ key: "toConfirm", count: 2 }] });
    expect(s.policies).toEqual({ state: "draft", gaps: [{ key: "toConfirm", count: 3 }] });
    expect(s.programReport).toEqual({ state: "draft", gaps: [{ key: "toConfirm", count: 5 }] });
    expect(s.boardReport).toEqual({ state: "draft", gaps: [{ key: "toConfirm", count: 5 }] });
  });

  it("names each gap with its count", () => {
    const s = stateOf({ ...COMPLETE, systemsWithOwner: 1, assessmentsApproved: 1, vendorsAssessed: 0 });
    expect(s.systemRegister).toEqual({ state: "draft", gaps: [{ key: "noOwner", count: 2 }] });
    expect(s.assessmentPortfolio).toEqual({ state: "draft", gaps: [{ key: "notApproved", count: 1 }] });
    expect(s.vendorDueDiligence).toEqual({ state: "draft", gaps: [{ key: "notReviewed", count: 2 }] });
  });

  it("asks for the licence where a finished deliverable is kept behind it", () => {
    const s = stateOf({ ...COMPLETE, impactAssessmentLocked: true, programReportLocked: true });
    expect(s.impactAssessment).toEqual({ state: "needsInput", input: "licence" });
    expect(s.programReport).toEqual({ state: "needsInput", input: "licence" });
  });
});

describe("the register's words", () => {
  for (const [lang, messages] of [["en", en], ["es", es]] as const) {
    it(`has every name, input, gap and state in ${lang}`, () => {
      const d = (messages as unknown as { documentRegister: Record<string, Record<string, string>> })
        .documentRegister;
      for (const entry of DOCUMENT_REGISTER) expect(d.items[entry.id], entry.id).toBeTruthy();
      for (const input of Object.keys(INPUTS)) expect(d.inputs[input], input).toBeTruthy();
      for (const state of ["ready", "draft", "needsInput", "notYet"]) expect(d.state[state], state).toBeTruthy();
      const gapKeys = new Set<string>();
      for (const facts of [EMPTY, COMPLETE, { ...COMPLETE, unconfirmed: 1, systemsWithOwner: 0 }]) {
        for (const doc of evaluateRegister(facts)) {
          if (doc.status.state === "draft") for (const g of doc.status.gaps) gapKeys.add(g.key);
        }
      }
      for (const key of gapKeys) expect(d.gaps[key], key).toBeTruthy();
    });
  }

  it("uses no long dash, and Spanish says tú", () => {
    const text = JSON.stringify([en.documentRegister, es.documentRegister, en.guided, es.guided]);
    expect(text).not.toMatch(/[–—]/);
    expect(JSON.stringify(es.documentRegister)).not.toMatch(/\busted\b/i);
  });
});
