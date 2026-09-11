// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  inventoryTemplateCsv,
  mapHeaders,
  parseCsv,
  parseInventory,
  toRiskLevel,
  toTechnique,
  toYesNo,
  MAX_IMPORT_ROWS,
} from "./inventory-import";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded separators and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
  });

  it("detects the semicolon that Spanish Excel exports use, and strips a BOM", () => {
    expect(parseCsv("﻿Nombre;Proveedor\nChat;OpenAI, Inc.\n")).toEqual([
      ["Nombre", "Proveedor"],
      ["Chat", "OpenAI, Inc."],
    ]);
  });

  it("keeps line breaks inside quoted cells and drops blank lines", () => {
    expect(parseCsv('n,d\n"A","line 1\nline 2"\n\n')).toEqual([
      ["n", "d"],
      ["A", "line 1\nline 2"],
    ]);
  });
});

describe("mapHeaders", () => {
  it("recognises English and Spanish headers, accents and case aside", () => {
    expect(mapHeaders(["System Name", "Proveedor", "NIVEL DE RIESGO", "Técnica", "whatever"])).toEqual({
      name: 0,
      vendor: 1,
      riskLevel: 2,
      technique: 3,
    });
  });
});

describe("value mapping", () => {
  it("never guesses a risk tier", () => {
    expect(toRiskLevel("High")).toBe("HIGH");
    expect(toRiskLevel("riesgo alto")).toBe("HIGH");
    expect(toRiskLevel("Mínimo")).toBe("MINIMAL");
    expect(toRiskLevel("")).toBeNull();
    expect(toRiskLevel("TBD")).toBeNull();
    expect(toRiskLevel("medium")).toBeNull();
  });

  it("maps common technique wording", () => {
    expect(toTechnique("LLM chatbot")).toBe("GENERATIVE_AI");
    expect(toTechnique("IA generativa")).toBe("GENERATIVE_AI");
    expect(toTechnique("Credit scoring model")).toBe("MACHINE_LEARNING");
    expect(toTechnique("")).toBe("OTHER");
  });

  it("keeps an empty personal-data cell unknown", () => {
    expect(toYesNo("Sí")).toBe(true);
    expect(toYesNo("no")).toBe(false);
    expect(toYesNo("")).toBeNull();
    expect(toYesNo("maybe")).toBeNull();
  });
});

describe("parseInventory", () => {
  it("parses the downloadable templates in both languages", () => {
    for (const locale of ["en", "es"] as const) {
      const parsed = parseInventory(inventoryTemplateCsv(locale));
      expect(parsed.error).toBeUndefined();
      expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0]).toMatchObject({
        vendor: "OpenAI",
        technique: "GENERATIVE_AI",
        role: "DEPLOYER",
        status: "DEPLOYED",
        processesPersonalData: true,
        riskLevel: "LIMITED",
      });
    }
  });

  it("reports rows without a name and a missing name column", () => {
    const parsed = parseInventory("Name,Vendor\nA,X\n,Y\nB,\n");
    expect(parsed.rows.map((r) => r.name)).toEqual(["A", "B"]);
    expect(parsed.skippedNoName).toEqual([2]);
    expect(parsed.rows[1].vendor).toBeUndefined();
    expect(parseInventory("Vendor\nX\n").error).toBe("no-name-column");
    expect(parseInventory("Name\n").error).toBe("no-rows");
  });

  it("caps the number of rows", () => {
    const csv = ["Name", ...Array.from({ length: MAX_IMPORT_ROWS + 3 }, (_, i) => `S${i}`)].join("\n");
    const parsed = parseInventory(csv);
    expect(parsed.rows).toHaveLength(MAX_IMPORT_ROWS);
    expect(parsed.truncated).toBe(3);
  });
});
