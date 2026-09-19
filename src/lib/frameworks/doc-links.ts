// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * From a frameworks cell to the docs page that explains the AI Sentinel module
 * supporting it. Modules without a docs page of their own are left out, so no
 * cell links to a page that does not exist.
 */
const MODULE_DOCS: Record<string, string> = {
  registry: "/docs/ai-registry",
  classification: "/docs/risk-classification",
  assessments: "/docs/assessments",
  regimes: "/docs/cross-border",
  transparency: "/docs/transparency",
  oversight: "/docs/oversight",
  incidents: "/docs/incidents",
  compliance: "/docs/compliance",
  obligations: "/docs/cross-border",
  policies: "/docs/policies",
  vendors: "/docs/vendors",
  threat: "/docs/threat-model",
  audit: "/docs/security",
  program: "/docs/how-it-fits",
};

export function docsPageForModule(moduleId: string): string | null {
  return MODULE_DOCS[moduleId] ?? null;
}

/** The distinct docs pages for a cell's modules, in module order. */
export function docsPagesForModules(moduleIds: readonly string[] = []): { module: string; href: string }[] {
  const seen = new Set<string>();
  const out: { module: string; href: string }[] = [];
  for (const m of moduleIds) {
    const href = docsPageForModule(m);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    out.push({ module: m, href });
  }
  return out;
}
