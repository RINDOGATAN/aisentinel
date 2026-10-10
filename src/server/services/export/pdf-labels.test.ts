// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The register PDFs and the audit-trail CSV in Spanish, with English held
 * exactly as it printed before the files had a language.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  assessmentTypeLabel,
  exportLocale,
  pdfLabels,
  riskLabel,
  roleLabel,
  statusLabel,
  techniqueLabel,
} from "./pdf-labels";

function strings(obj: unknown, prefix = ""): Array<[string, string]> {
  if (typeof obj === "string") return [[prefix, obj]];
  if (typeof obj === "function") return strings((obj as (x: never) => unknown)(7 as never), prefix);
  if (Array.isArray(obj)) return obj.flatMap((v, i) => strings(v, `${prefix}.${i}`));
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => strings(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

describe("export labels", () => {
  const en = pdfLabels("en");
  const es = pdfLabels("es");

  it("have the same keys in both languages", () => {
    expect(strings(es).map(([k]) => k)).toEqual(strings(en).map(([k]) => k));
  });

  it("keep the English wording the files printed before", () => {
    expect(en.register.title).toBe("AI System Register");
    expect(en.portfolio.coverTitle).toBe("AI Risk Assessment Portfolio");
    expect(en.inventory.title).toBe("AI Model Inventory");
    expect(en.compliance.coverTitle("EU AI Act")).toBe("EU AI Act Compliance Summary");
    expect(en.compliance.progress(40)).toBe("Compliance Progress (40% of assessed)");
    expect(en.audit.header[0]).toBe("Timestamp (UTC)");
    expect(statusLabel("PARTIALLY_COMPLIANT", "en")).toBe("PARTIALLY COMPLIANT");
    expect(riskLabel("HIGH", "en")).toBe("HIGH");
    expect(roleLabel("DEPLOYER", "en")).toBe("DEPLOYER");
    expect(techniqueLabel("GENERATIVE_AI", "en")).toBe("GENERATIVE AI");
    expect(assessmentTypeLabel("AI_RISK", "en")).toBe("AI RISK");
  });

  it("are Spanish, with the terms of the AI Act, and no English left over", () => {
    expect(es.register.title).toBe("Registro de sistemas de IA");
    expect(es.compliance.coverTitle("RGPD")).toBe("Resumen de cumplimiento: RGPD");
    expect(es.audit.header[0]).toBe("Fecha y hora (UTC)");
    expect(roleLabel("DEPLOYER", "es")).toBe("Responsable del despliegue");
    expect(statusLabel("NOT_ASSESSED", "es")).toBe("Sin evaluar");
    expect(riskLabel("UNCLASSIFIED", "es")).toBe("Sin clasificar");
    expect(assessmentTypeLabel("FRIA", "es")).toBe("Evaluación de impacto relativa a los derechos fundamentales");
    for (const [key, value] of strings(es)) {
      expect(value, key).not.toMatch(/[–—]|--/);
      expect(value, key).not.toMatch(/\busted\b|\bejecut(ar|a|an|ando|ado)\b/i);
      if (!["generatedBy"].includes(key)) expect(value, key).not.toMatch(/\b(Generated|Summary|Register|Status|Count)\b/);
    }
  });

  it("take the language from ?locale=, then the locale cookie, then English", () => {
    expect(exportLocale("es", null)).toBe("es");
    expect(exportLocale("en", "locale=es")).toBe("en");
    expect(exportLocale(null, "foo=1; locale=es")).toBe("es");
    expect(exportLocale(null, "locale=en; locale=es")).toBe("es");
    expect(exportLocale("fr", null)).toBe("en");
    expect(exportLocale(null, null)).toBe("en");
  });

  it("leave no hard-coded English heading in the four reports", () => {
    for (const file of ["ai-system-register.tsx", "assessment-portfolio.tsx", "model-inventory.tsx", "compliance-summary.tsx"]) {
      const src = readFileSync(path.join(__dirname, file), "utf8");
      expect(src, file).not.toMatch(/(title|label|subtitle)="[A-Z]/);
      expect(src, file).not.toMatch(/headers=\{\["/);
      expect(src, file).not.toMatch(/sectionTitle\}>[A-Z]/);
      expect(src, file).toContain("locale={locale}");
    }
  });
});
