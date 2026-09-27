// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

// Enum fields must reach the screen as localized labels, never as the raw
// SCREAMING_SNAKE value. A 27 September test run found "BIAS_FAIRNESS" and
// "DRAFT" rendered as badges on the assessment page; this guards against the
// class of defect returning to the assessment and AI-registry components.
//
// A verbatim render is a JSX text expression whose whole content is an enum
// field access — `{x.type}`, `{x.status}`, `{x.technique}` — optionally with a
// partial de-snake `.replace(...)`. It excludes attribute bindings (`value={…}`,
// the `=` before the brace), label calls (a `(` inside), and map/ternary
// fallbacks (`[`, `?`, `:`, `||`), which already resolve to a label.
const VERBATIM_ENUM_RENDER =
  /(?<!=)\{\s*[A-Za-z_$][\w$]*\.(?:type|status|technique|severity|risk)(?:\.replace\([^)]*\))?\s*\}/g;

const COMPONENTS = [
  "src/app/(dashboard)/governance/assessments/[id]/page.tsx",
  "src/app/(dashboard)/governance/assessments/new/page.tsx",
  "src/app/(dashboard)/governance/assessments/templates/page.tsx",
  "src/app/(dashboard)/governance/ai-registry/[id]/page.tsx",
  "src/app/(dashboard)/governance/ai-registry/page.tsx",
];

describe("dashboard components never render an enum value verbatim", () => {
  for (const rel of COMPONENTS) {
    it(`${rel} routes enum fields through a label`, () => {
      const src = readFileSync(path.join(process.cwd(), rel), "utf8");
      const offenders = src.match(VERBATIM_ENUM_RENDER) ?? [];
      expect(offenders).toEqual([]);
    });
  }
});

// The two enums that were leaking are keyed in `common` so the shared
// `useEnumLabels()` hook (and the registry detail's inline map) can localize
// every member in both locales. Missing keys would degrade to a de-snaked code.
const AI_TECHNIQUE = [
  "MACHINE_LEARNING", "DEEP_LEARNING", "GENERATIVE_AI", "AGENTIC_AI", "NLP",
  "COMPUTER_VISION", "SPEECH_RECOGNITION", "ROBOTICS", "RULE_BASED",
  "EXPERT_SYSTEM", "STATISTICAL", "OTHER",
] as const;
const ASSESSMENT_TYPE = ["FRIA", "CONFORMITY", "AI_RISK", "BIAS_FAIRNESS", "CUSTOM"] as const;

const toKey = (prefix: string, value: string) =>
  prefix +
  value
    .toLowerCase()
    .replace(/_(\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());

describe("every technique and assessment-type value has a localized label", () => {
  for (const [name, messages] of [["en", en], ["es", es]] as const) {
    const common = messages.common as Record<string, string>;
    it(`common carries every AITechnique label in ${name}`, () => {
      for (const value of AI_TECHNIQUE) {
        const key = toKey("technique", value);
        expect(common[key], `missing common.${key}`).toBeTruthy();
      }
    });
    it(`common carries every AIAssessmentType label in ${name}`, () => {
      for (const value of ASSESSMENT_TYPE) {
        const key = toKey("assessmentType", value);
        expect(common[key], `missing common.${key}`).toBeTruthy();
      }
    });
  }
});
