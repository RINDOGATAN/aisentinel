// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The threat model as a document.
 *
 * Written for two readers at once: the team, who needs the list of what to do
 * next, and everyone else (a customer's security questionnaire, an auditor, a
 * regulator, an acquirer) who needs to see that the thinking happened and that
 * the controls were tested.
 *
 * It leads with what has not been tested, because that is the honest headline
 * and the one a reader will look for anyway.
 */

import {
  CAPABILITIES,
  CAPABILITY_GROUPS,
  CAPABILITY_GROUP_LABELS,
  CATEGORY_QUESTIONS,
  CONTROL_LAYER_LABELS,
  THREAT_MODEL_VERSION,
  controlState,
  type ControlLayer,
  type ScenarioCategory,
} from "@/config/threat-model";

type Locale = "en" | "es";

export interface ThreatModelDocInput {
  name: string;
  systemSummary: string | null;
  systemName: string | null;
  capabilities: string[];
  reviewedAt: Date | null;
  organizationName: string;
  scenarios: Array<{
    title: string;
    description: string | null;
    category: string;
    impact: string;
    likelihood: string;
    blastRadius: string;
    priority: string;
    status: string;
    decisionNote: string | null;
    owner: string | null;
    controls: Array<{
      layer: string;
      description: string;
      implemented: boolean;
      howToTest: string | null;
      tests: Array<{
        result: string;
        method: string;
        notes: string | null;
        evidenceRef: string | null;
        testedAt: Date;
      }>;
    }>;
  }>;
}

const L = {
  en: {
    title: "Threat model",
    for: "for",
    generated: "Generated",
    summaryTitle: "What this system is",
    mapTitle: "What it can see, retrieve, remember, call and do",
    headline: "Where this stands",
    scenariosTitle: "What could go wrong",
    priority: "Priority",
    status: "Status",
    owner: "Owner",
    controls: "Controls",
    howToTest: "How to test it",
    tests: "Tests",
    noTests: "No test recorded. A control with no test is a claim, not a control.",
    noControls: "No control recorded yet.",
    decision: "Decision",
    method: "What was done",
    evidence: "Evidence",
    counts:
      "{scenarios} scenarios, {actNow} needing action now. {controls} controls, of which {proven} have a passing test that is still current.",
    untestedWarning:
      "{untested} controls have never been tested, or their last test failed or has gone stale. Those are the lines a reader will ask about first.",
    allTested: "Every control has a passing test that is still current.",
    method_note: "Method: capabilities are mapped, scenarios follow from them, each scenario carries controls at the prevent, constrain, detect, respond and assure layers, and each control carries the test that shows whether it works. Rule pack {version}.",
    reviewed: "Last reviewed",
    neverReviewed: "Not yet marked as reviewed",
  },
  es: {
    title: "Modelo de amenazas",
    for: "de",
    generated: "Generado",
    summaryTitle: "Qué es este sistema",
    mapTitle: "Qué puede ver, recuperar, recordar, invocar y hacer",
    headline: "Situación",
    scenariosTitle: "Qué puede salir mal",
    priority: "Prioridad",
    status: "Estado",
    owner: "Responsable",
    controls: "Controles",
    howToTest: "Cómo probarlo",
    tests: "Pruebas",
    noTests: "Sin pruebas registradas. Un control sin prueba es una afirmación, no un control.",
    noControls: "Todavía no hay controles registrados.",
    decision: "Decisión",
    method: "Qué se hizo",
    evidence: "Evidencia",
    counts:
      "{scenarios} escenarios, {actNow} que requieren actuar ya. {controls} controles, de los cuales {proven} tienen una prueba superada y vigente.",
    untestedWarning:
      "{untested} controles nunca se han probado, o su última prueba falló o ha caducado. Son las líneas por las que preguntará primero quien lea esto.",
    allTested: "Todos los controles tienen una prueba superada y vigente.",
    method_note: "Método: se mapean las capacidades, de ellas se derivan los escenarios, cada escenario lleva controles en las capas de prevenir, limitar, detectar, responder y asegurar, y cada control lleva la prueba que demuestra si funciona. Paquete de reglas {version}.",
    reviewed: "Última revisión",
    neverReviewed: "Todavía sin marcar como revisado",
  },
} as const;

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""));
}

export function renderThreatModelDoc(
  input: ThreatModelDocInput,
  locale: Locale,
  now: Date,
): string {
  const l = L[locale];
  const out: string[] = [];

  const controls = input.scenarios.flatMap((s) => s.controls);
  const proven = controls.filter((c) => {
    const last = c.tests[0];
    return controlState(
      (last?.result as "PASS" | "PARTIAL" | "FAIL") ?? null,
      last?.testedAt ?? null,
      now,
    ) === "proven";
  }).length;
  const actNow = input.scenarios.filter(
    (s) => s.priority === "ACT_NOW" && s.status === "OPEN",
  ).length;

  out.push(`# ${l.title}: ${input.name}`, "");
  out.push(`${input.organizationName}${input.systemName ? ` · ${input.systemName}` : ""}`, "");
  out.push(`${l.generated}: ${now.toISOString().slice(0, 10)}`, "");
  out.push(
    input.reviewedAt
      ? `${l.reviewed}: ${input.reviewedAt.toISOString().slice(0, 10)}`
      : l.neverReviewed,
    "",
  );

  if (input.systemSummary) {
    out.push(`## ${l.summaryTitle}`, "", input.systemSummary, "");
  }

  // The headline is the state of the evidence, not the number of scenarios.
  out.push(`## ${l.headline}`, "");
  out.push(
    fill(l.counts, {
      scenarios: input.scenarios.length,
      actNow,
      controls: controls.length,
      proven,
    }),
    "",
  );
  const untested = controls.length - proven;
  out.push(untested > 0 ? fill(l.untestedWarning, { untested }) : l.allTested, "");

  // The map
  out.push(`## ${l.mapTitle}`, "");
  for (const group of CAPABILITY_GROUPS) {
    const items = input.capabilities
      .map((id) => CAPABILITIES.find((c) => c.id === id))
      .filter((c) => c && c.group === group)
      .map((c) => c!.label[locale]);
    if (items.length === 0) continue;
    out.push(`- **${CAPABILITY_GROUP_LABELS[group][locale]}**: ${items.join(", ")}`);
  }
  out.push("");

  // The scenarios
  out.push(`## ${l.scenariosTitle}`, "");
  for (const s of input.scenarios) {
    out.push(`### ${s.title}`, "");
    out.push(
      `${l.priority}: ${s.priority} · ${l.status}: ${s.status}${s.owner ? ` · ${l.owner}: ${s.owner}` : ""}`,
      "",
    );
    const question = CATEGORY_QUESTIONS[s.category.toLowerCase() as ScenarioCategory];
    if (question) out.push(`*${question[locale]}*`, "");
    if (s.description) out.push(s.description, "");
    if (s.decisionNote) out.push(`**${l.decision}:** ${s.decisionNote}`, "");

    out.push(`**${l.controls}**`, "");
    if (s.controls.length === 0) {
      out.push(l.noControls, "");
    }
    for (const c of s.controls) {
      const label = CONTROL_LAYER_LABELS[c.layer.toLowerCase() as ControlLayer][locale];
      out.push(`- **${label}.** ${c.description}`);
      if (c.howToTest) out.push(`  - *${l.howToTest}:* ${c.howToTest}`);
      if (c.tests.length === 0) {
        out.push(`  - ${l.noTests}`);
      } else {
        for (const test of c.tests.slice(0, 5)) {
          out.push(
            `  - ${test.testedAt.toISOString().slice(0, 10)} · ${test.result} · ${l.method}: ${test.method}${
              test.evidenceRef ? ` · ${l.evidence}: ${test.evidenceRef}` : ""
            }${test.notes ? ` · ${test.notes}` : ""}`,
          );
        }
      }
    }
    out.push("");
  }

  out.push("---", "");
  out.push(fill(l.method_note, { version: THREAT_MODEL_VERSION }), "");

  return out.join("\n");
}
