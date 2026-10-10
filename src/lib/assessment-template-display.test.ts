// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { ASSESSMENT_TEMPLATES_V2 } from "@/config/assessment-templates-v2";
import { SYSTEM_TEMPLATE_ES, templateDescription, templateName } from "./assessment-template-display";

describe("assessment template display", () => {
  it("repeats the v2 config's Spanish names and descriptions exactly", () => {
    for (const t of ASSESSMENT_TEMPLATES_V2) {
      expect(SYSTEM_TEMPLATE_ES[t.id]).toEqual({ name: t.name.es, description: t.description.es });
      // the superseded v1 row shows its successor's Spanish name
      expect(SYSTEM_TEMPLATE_ES[t.supersedes!]?.name).toBe(t.name.es);
    }
  });

  it("shows the stored English row unchanged in English", () => {
    const row = { id: "system-fria-template-v2", name: "Fundamental Rights Impact Assessment", description: "EU AI Act Article 27 ..." };
    expect(templateName(row, "en")).toBe(row.name);
    expect(templateDescription(row, "en")).toBe(row.description);
  });

  it("shows a system template in Spanish, and a custom template as written", () => {
    expect(templateName({ id: "system-ai-risk-template-v2", name: "AI Risk Assessment" }, "es")).toBe("Evaluación de riesgos de IA");
    expect(templateName({ id: "cuid-of-a-custom-row", name: "Our own review" }, "es")).toBe("Our own review");
    expect(templateDescription({ id: "system-custom-template", name: "Custom Assessment", description: "old v1 text" }, "es")).toBe("old v1 text");
  });
});
