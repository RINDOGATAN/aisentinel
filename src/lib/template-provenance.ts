// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// Reads the provenance the quick start already records on an AI system's
// metadata, so a screen can mark a record that a template (or the quick start
// itself) created rather than a person. The industry template stamps
// `metadata.template = <templateId>` and every quick-start record carries
// `metadata.source = "quickstart"` (see quickstart.ts). Nothing is guessed:
// a record with neither returns null and is treated as entered by a person.

import { AI_GOVERNANCE_TEMPLATES } from "@/config/ai-governance-templates";

const TEMPLATE_NAME_BY_ID = new Map(AI_GOVERNANCE_TEMPLATES.map((t) => [t.id, t.name] as const));

export type TemplateOrigin =
  | { kind: "template"; templateName: string }
  | { kind: "quickstart" };

export function templateOrigin(metadata: unknown): TemplateOrigin | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  const templateId = typeof m.template === "string" ? m.template : undefined;
  if (templateId && TEMPLATE_NAME_BY_ID.has(templateId)) {
    return { kind: "template", templateName: TEMPLATE_NAME_BY_ID.get(templateId)! };
  }
  if (m.source === "quickstart") return { kind: "quickstart" };
  return null;
}
