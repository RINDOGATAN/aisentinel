// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Spanish counts use real plurals ("Falta 1 pregunta", "Faltan 27
 * preguntas"), never the "pregunta(s)" shorthand; software and agents never
 * "ejecutan"; article references read "art. 50" in lower case.
 */

import { describe, it, expect } from "vitest";
import { createTranslator } from "next-intl";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import es from "./es.json";

function strings(obj: unknown, prefix = ""): Array<[string, string]> {
  if (typeof obj === "string") return [[prefix, obj]];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => strings(v, `${prefix}.${i}`));
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => strings(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

describe("Spanish plurals", () => {
  const t = createTranslator({ locale: "es", messages: es });

  it("never use the (s) or (es) shorthand", () => {
    for (const [key, value] of strings(es)) {
      expect(value, key).not.toMatch(/[a-záéíóúñ]\((s|es|as|os)\)/i);
    }
  });

  it("agree with the count", () => {
    expect(t("assessmentDetail.completeBeforeSubmit", { count: 1 })).toBe(
      "Falta 1 pregunta obligatoria por responder antes de poder enviarla a revisión.",
    );
    expect(t("assessmentDetail.completeBeforeSubmit", { count: 27 })).toBe(
      "Faltan 27 preguntas obligatorias por responder antes de poder enviarla a revisión.",
    );
    expect(t("common.requirementsAcrossFrameworks", { total: 1, count: 1 })).toBe("1 requisito en 1 marco");
    expect(t("common.requirementsAcrossFrameworks", { total: 42, count: 3 })).toBe("42 requisitos en 3 marcos");
    expect(t("dataFlow.gaps", { contracts: 1, retention: 2 })).toBe(
      "1 destinatario sin contrato registrado y 2 sin plazo de conservación.",
    );
    expect(t("dataFlow.gaps", { contracts: 3, retention: 0 })).toBe(
      "3 destinatarios sin contrato registrado y 0 sin plazo de conservación.",
    );
    expect(t("boardReports.cadence", { count: 1, last: "10 oct 2026" })).toBe(
      "1 informe registrado. El último fue el 10 oct 2026.",
    );
    expect(t("boardReports.cadence", { count: 4, last: "10 oct 2026" })).toBe(
      "4 informes registrados. El último fue el 10 oct 2026.",
    );
  });
});

/** Every Spanish string the config modules carry in an es field. */
function configSpanish(): Array<[string, string]> {
  const root = path.resolve(__dirname, "../../config");
  const out: Array<[string, string]> = [];
  const files = (readdirSync(root, { recursive: true }) as string[]).filter((f) => f.endsWith(".ts"));
  for (const rel of files) {
    if (rel.endsWith(".test.ts")) continue;
    const src = readFileSync(path.join(root, rel), "utf8");
    for (const m of src.matchAll(/es:\s*"((?:[^"\\]|\\.)*)"/g)) out.push([rel, m[1]]);
  }
  return out;
}

// Kept on purpose: "ejecutivo", the GDPR "ejecutar un contrato" and the
// financial "ejecución de las inversiones".
const EJECUTAR = /\bejecu(?!tiv)(?!tar (un|el) contrato)(?!ción de (un|el) contrato)(?!ción de las inversiones)[a-záéíóúñ]*/i;

describe("Spanish wording", () => {
  it("never says ejecutar for software or agents", () => {
    expect(configSpanish().length).toBeGreaterThan(500);
    for (const [key, value] of [...strings(es), ...configSpanish()]) expect(value, key).not.toMatch(EJECUTAR);
  });

  it("writes article references in lower case inside a sentence", () => {
    for (const [key, value] of [...strings(es), ...configSpanish()]) {
      expect(value, key).not.toMatch(/[^\s.¿¡«]\s+Arts?\.\s*\d|\(Arts?\.\s*\d/);
    }
  });
});
