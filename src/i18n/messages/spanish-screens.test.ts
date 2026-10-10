// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What the Spanish demo recording found (9 October 2026), kept fixed:
 * dates in Spanish, counts with their plural, "tú" in the strings that said
 * usted, no long dashes, and no hard-coded English or raw enum values on the
 * risk classification, assessments and system pages.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { createTranslator } from "next-intl";
import es from "./es.json";
import en from "./en.json";
import { formatDateIn, formatDateTimeIn } from "@/lib/use-format-date";

const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function strings(obj: unknown, prefix = ""): Array<[string, string]> {
  if (typeof obj === "string") return [[prefix, obj]];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => strings(v, `${prefix}.${i}`));
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => strings(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

describe("dates", () => {
  const d = new Date("2026-10-10T12:00:00Z");
  it("read 10 oct 2026 in Spanish and Oct 10, 2026 in English", () => {
    expect(formatDateIn("es", d)).toBe("10 oct 2026");
    expect(formatDateIn("en", d)).toBe("Oct 10, 2026");
    expect(formatDateTimeIn("es", d)).toMatch(/^10 oct 2026/);
    expect(formatDateIn("es", null)).toBe("N/D");
  });

  it("are formatted with the screen's language on every page that showed English dates", () => {
    const pages = [
      "src/app/(dashboard)/governance/ai-registry/[id]/page.tsx",
      "src/app/(dashboard)/governance/risk-classification/page.tsx",
      "src/app/(dashboard)/governance/assessments/[id]/page.tsx",
      "src/app/(dashboard)/governance/incidents/[id]/page.tsx",
    ];
    for (const p of pages) {
      const src = read(p);
      expect(src, p).toContain("useFormatDate()");
      expect(src, p).not.toMatch(/import \{[^}]*\bformatDate\b[^}]*\} from "@\/lib\/utils"/);
    }
  });
});

describe("counts", () => {
  const tEs = createTranslator({ locale: "es", messages: es });
  const tEn = createTranslator({ locale: "en", messages: en });
  it("say 1 sistema and 2 sistemas", () => {
    expect(tEs("obligations.counts.undeterminedOnly", { count: 1 })).toBe("Alcance aún sin determinar para 1 sistema");
    expect(tEs("obligations.counts.inScope", { count: 2 })).toBe("2 sistemas");
    expect(tEs("obligations.card.daysRemaining", { days: 1 })).toBe("en 1 día");
    expect(tEn("program.map.vendorSystems", { count: 1 })).toBe("1 system");
  });

  it("spell out the effort letters", () => {
    expect(tEs("program.plan.effort", { effort: "S" })).toBe("Esfuerzo: bajo");
    expect(tEn("program.plan.effort", { effort: "L" })).toBe("Effort: large");
  });

  it("name the risk level in the classification message", () => {
    const msg = tEs("riskClassification.toastClassified", {
      name: "Asistente",
      level: tEs("riskClassification.levelPhrase.HIGH"),
      count: 0,
    });
    expect(msg).toBe("Asistente clasificado como alto riesgo");
  });
});

describe("Spanish wording", () => {
  const all = strings(es);
  it("addresses the reader as tú in the strings that said usted", () => {
    for (const [k, v] of all) {
      expect(v, k).not.toMatch(/^(Clasifique|Mapee|Seleccione|Introduzca|Indique)\b|\b(continúe|inténtelo|haga clic)\b/i);
    }
  });

  it("uses no long dashes", () => {
    for (const [k, v] of all) expect(v, k).not.toMatch(/[–—]/);
  });

  it("translates the NIST functions on the maturity chart", () => {
    expect(es.program.nist.GOVERN).toBe("Gobernar");
    expect(es.programReport.nist.MANAGE).toBe("Gestionar");
  });
});

describe("no hard-coded English or raw values on the recorded screens", () => {
  it("risk classification", () => {
    const src = read("src/app/(dashboard)/governance/risk-classification/page.tsx");
    expect(src).not.toContain("Annex III:");
    expect(src).not.toMatch(/>\s*Classified /);
    expect(src).not.toContain('"Failed to classify risk"');
    expect(src).not.toContain('technique.replace("_", " ")');
    expect(src).not.toMatch(/label: "\d\. /);
    expect(src).not.toMatch(/level: data\.riskLevel,/);
    expect(read("src/components/ai/RiskScreeningPanel.tsx")).toContain("riskLabel(screening.suggestedLevel)");
  });

  it("assessments", () => {
    expect(read("src/app/(dashboard)/governance/assessments/page.tsx")).not.toMatch(/All \(\{stats\.total\}\)|Template: \{/);
    expect(read("src/app/(dashboard)/governance/assessments/[id]/page.tsx")).not.toMatch(/\n\s*for <Link/);
  });

  it("system page framework codes", () => {
    const src = read("src/app/(dashboard)/governance/ai-registry/[id]/page.tsx");
    for (const raw of ["fw.frameworkCode", "gap.frameworkCode", "gap.title"]) {
      expect(src, raw).not.toMatch(new RegExp(`>\\s*\\{${raw.replace(".", "\\.")}\\}\\s*<`));
    }
  });
});
