// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Extracts every piece of regulatory content that carries a pending legal
 * sign-off marker into one JSON file, for review in the local sign-off
 * console. Read-only: it imports the config modules and writes a file.
 */

import { writeFileSync } from "fs";
import { REGIME_PACKS, flattenRegimeRequirements, regimeRequirementId } from "../../src/config/regimes";
import { allUnifiedQuestions, UNIFIED_ASSESSMENT_VERSION } from "../../src/config/unified-assessment";
import { AGENTIC_FINDINGS, AGENTIC_STRESS_TEST_VERSION } from "../../src/config/agentic-stress-test";
import { CHATBOT_CONTROLS, CHATBOT_OVERLAY_VERSION, chatbotLaw } from "../../src/config/chatbot-overlay";

interface Item {
  id: string;
  group: string;
  groupLabel: string;
  kind: "requirement" | "question" | "finding";
  /** Statutory code or question id, shown as the anchor. */
  code: string;
  titleEn: string;
  titleEs: string;
  bodyEn: string;
  bodyEs: string;
  /** Extra prose the reviewer needs, keyed by label. */
  extra?: { label: string; en: string; es: string }[];
  citations: string[];
  scope: string[];
  source: string;
}

const items: Item[] = [];

for (const pack of REGIME_PACKS) {
  const fw = pack.framework;
  for (const row of flattenRegimeRequirements(pack.requirements)) {
    items.push({
      id: regimeRequirementId(fw, row.slug),
      group: fw.code,
      groupLabel: fw.name,
      kind: "requirement",
      code: row.code,
      titleEn: row.title.en,
      titleEs: row.title.es,
      bodyEn: row.description.en,
      bodyEs: row.description.es,
      citations: [fw.version],
      scope: [...row.applicabilityTags],
      source: `src/config/regimes/${fw.idPrefix === "gdpr" ? "gdpr" : fw.idPrefix === "co" ? "colorado" : fw.idPrefix === "tx" ? "texas" : "washington"}-requirements.ts`,
    });
  }
}

for (const { section, question } of allUnifiedQuestions()) {
  items.push({
    id: `q-${question.id}`,
    group: "UNIFIED",
    groupLabel: "Unified impact assessment",
    kind: "question",
    code: `${section.id} · ${question.id}`,
    titleEn: section.title.en,
    titleEs: section.title.es,
    bodyEn: question.text.en,
    bodyEs: question.text.es,
    extra: question.helpText
      ? [{ label: "Help text", en: question.helpText.en, es: question.helpText.es }]
      : undefined,
    citations: question.satisfies.map((c) => `${c.framework.replace(/_/g, " ")} ${c.code}`),
    scope: question.overlay ? [question.overlay] : ["core"],
    source: "src/config/unified-assessment.ts",
  });
}

for (const finding of AGENTIC_FINDINGS) {
  items.push({
    id: `f-${finding.id}`,
    group: "AGENTIC",
    groupLabel: "Agentic stress test",
    kind: "finding",
    code: `${finding.severity} · ${finding.id}`,
    titleEn: finding.title.en,
    titleEs: finding.title.es,
    bodyEn: finding.assumption.en,
    bodyEs: finding.assumption.es,
    extra: [
      { label: "What the handoff breaks", en: finding.breakage.en, es: finding.breakage.es },
      { label: "Provision the agentic layer demands", en: finding.provision.en, es: finding.provision.es },
    ],
    citations: finding.citations,
    scope: finding.requires.length ? [...finding.requires] : ["all agentic systems"],
    source: "src/config/agentic-stress-test.ts",
  });
}

// The customer-facing chatbot overlay: one item per control, with every law
// entry it carries, so each control can be read and signed off on its own.
for (const control of CHATBOT_CONTROLS) {
  items.push({
    id: `cb-${control.id}`,
    group: "CHATBOT_OVERLAY",
    groupLabel: "Customer-facing chatbot rules",
    kind: "requirement",
    code: `CB-${control.number}`,
    titleEn: control.title.en,
    titleEs: control.title.es,
    bodyEn: control.duty.en,
    bodyEs: control.duty.es,
    extra: [
      {
        label: "Keep as evidence",
        en: control.keeps.map((k) => k.en).join("; "),
        es: control.keeps.map((k) => k.es).join("; "),
      },
      ...control.laws.map((l) => ({
        label: `${chatbotLaw(l.law)?.name.en ?? l.law}: ${l.citation} (${l.appliesFrom ?? "in force"})`,
        en: l.adds.en,
        es: l.adds.es,
      })),
    ],
    citations: control.laws.map((l) => l.citation),
    scope: ["chatbot:overlay"],
    source: "src/config/chatbot-overlay.ts",
  });
}

const out = {
  generatedAt: new Date().toISOString(),
  versions: {
    unifiedAssessment: UNIFIED_ASSESSMENT_VERSION,
    agenticStressTest: AGENTIC_STRESS_TEST_VERSION,
    chatbotOverlay: CHATBOT_OVERLAY_VERSION,
    regimes: Object.fromEntries(REGIME_PACKS.map((p) => [p.framework.code, p.framework.contentVersion])),
  },
  groups: [
    ...REGIME_PACKS.map((p) => ({ id: p.framework.code, label: p.framework.name, version: p.framework.version })),
    { id: "UNIFIED", label: "Unified impact assessment", version: UNIFIED_ASSESSMENT_VERSION },
    { id: "AGENTIC", label: "Agentic stress test", version: AGENTIC_STRESS_TEST_VERSION },
    { id: "CHATBOT_OVERLAY", label: "Customer-facing chatbot rules", version: CHATBOT_OVERLAY_VERSION },
  ],
  items,
};

const path = process.env.OUT ?? "signoff-items.json";
writeFileSync(path, JSON.stringify(out, null, 2));
console.log(`${items.length} items written to ${path}`);
for (const g of out.groups) {
  console.log(`  ${g.id}: ${items.filter((i) => i.group === g.id).length}`);
}
