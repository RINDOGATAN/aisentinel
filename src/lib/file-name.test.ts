// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { EXPORT_FILE_PREFIX, stripAccents } from "./file-name";

describe("export file names", () => {
  it("keep accented letters as plain letters instead of hyphens", () => {
    const name = "Sistema de calificación crediticia con IA";
    expect(stripAccents(name).replace(/[^a-zA-Z0-9]/g, "-")).toBe("Sistema-de-calificacion-crediticia-con-IA");
    expect(stripAccents("Agente de gestión de reclamaciones, S.L.")).toBe("Agente de gestion de reclamaciones, S.L.");
  });

  it("have a Spanish prefix for every export that used to be English only", () => {
    expect(EXPORT_FILE_PREFIX.program.es).toBe("Programa-de-gobernanza-de-IA");
    expect(EXPORT_FILE_PREFIX.aiuc1.es).toBe("Evidencias-AIUC-1");
    expect(EXPORT_FILE_PREFIX.threatModel.es).toBe("Modelo-de-amenazas");
    for (const k of ["assessment", "notice", "protocol", "agentic-addendum"] as const) {
      expect(EXPORT_FILE_PREFIX.unified[k].es).toMatch(/^[a-z0-9-]+$/);
      expect(EXPORT_FILE_PREFIX.unified[k].es).not.toBe(EXPORT_FILE_PREFIX.unified[k].en);
    }
    // English names are the ones the routes always used.
    expect(EXPORT_FILE_PREFIX.unified.assessment.en).toBe("unified-impact-assessment");
  });

  it("are used by the export routes (no hard-coded English prefix left)", () => {
    const root = path.resolve(__dirname, "../app/api/export");
    for (const route of ["governance-program", "aiuc1-evidence", "threat-model", "unified-artifact"]) {
      const src = readFileSync(path.join(root, route, "route.ts"), "utf8");
      expect(src, route).toContain("EXPORT_FILE_PREFIX");
      expect(src, route).not.toMatch(/`(AI-Governance-Program|AIUC-1-evidence|Threat-model)-/);
    }
  });
});
