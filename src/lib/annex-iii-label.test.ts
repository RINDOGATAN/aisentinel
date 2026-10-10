// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { ANNEX_III_FREE_TEXT_ES, annexIIILabel } from "./annex-iii-label";

const label = (k: string) => `<${k}>`;

describe("Annex III category label", () => {
  it("numbers a form key and names it in the screen's language", () => {
    expect(annexIIILabel("employment", "es", label)).toBe("4. <employment>");
    expect(annexIIILabel("biometrics", "en", label)).toBe("1. <biometrics>");
  });

  it("gives the Spanish text of a template's free-text category, and keeps English as stored", () => {
    const v = "5(b). Creditworthiness assessment / credit scoring";
    expect(annexIIILabel(v, "es", label)).toBe("5(b). Evaluación de la solvencia y calificación crediticia");
    expect(annexIIILabel(v, "en", label)).toBe(v);
    expect(annexIIILabel("something a person typed", "es", label)).toBe("something a person typed");
  });

  it("covers every free-text category the templates and vendor mappings write", () => {
    const root = path.resolve(__dirname, "../config");
    const found = new Set<string>();
    for (const f of ["ai-governance-templates.ts", "vendor-ai-mappings.ts", "worked-example.ts"]) {
      const src = readFileSync(path.join(root, f), "utf8");
      for (const m of src.matchAll(/annexIIICategory: "([^"]+)"/g)) found.add(m[1]);
    }
    expect(found.size).toBeGreaterThan(3);
    for (const v of found) expect(ANNEX_III_FREE_TEXT_ES[v], v).toBeTruthy();
    for (const es of Object.values(ANNEX_III_FREE_TEXT_ES)) expect(es).not.toMatch(/—/);
  });
});
