// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The overlay tags that select a system's questions in the unified assessment.
 *
 * Each rules layer already resolves its own scope. This module does one thing:
 * collects those answers into the single vocabulary the unified template keys
 * on, and adds the three tags no resolver owns — the EU high-risk tag from the
 * risk classification, the Art. 50 tag from the transparency profile, and the
 * agentic tag.
 *
 * The rule inherited from California holds throughout: an UNDETERMINED scope
 * contributes nothing. A question that should have been asked and was not is a
 * visible gap in the generated artifact; a question asked on a regime that does
 * not apply is noise that makes practitioners distrust the tool. Pure.
 */

import type { OverlayTag } from "@/config/unified-assessment";
import type { RegimeScope } from "@/config/regimes";

export interface OverlayInputs {
  /** Tags from the California ADMT resolver, or undefined when unresolved. */
  admtTags?: readonly string[];
  /** Every regime scope from resolveAllRegimeScopes. */
  regimeScopes?: readonly RegimeScope[];
  /** From the risk classification. */
  riskLevel?: string | null;
  annexIiiCategory?: string | null;
  /** True when the Art. 50 profile carries any obligation other than not-applicable. */
  hasArt50Obligation?: boolean;
  /** The registry technique, e.g. "AGENTIC_AI". */
  technique?: string | null;
  /** The explicit screening answer about an autonomous downstream agent. */
  handsOffToAutonomousAgent?: string | null;
}

/** California emits fine-grained tags; the template only needs the article. */
function californiaOverlays(tags: readonly string[]): OverlayTag[] {
  const out: OverlayTag[] = [];
  if (tags.some((t) => t === "admt:art10" || t.startsWith("admt:art10:"))) out.push("admt:art10");
  if (tags.some((t) => t === "admt:art11" || t.startsWith("admt:art11:"))) out.push("admt:art11");
  return out;
}

const REGIME_OVERLAYS = new Set<string>([
  "gdpr:core",
  "gdpr:adm",
  "gdpr:dpia",
  "gdpr:special",
  "co:developer",
  "co:deployer",
  "tx:core",
  "tx:government",
  "tx:healthcare",
  "wa:mhmda",
  "wa:genai-provenance",
  "wa:companion",
  "wa:prior-auth",
  "wa:public-agency",
]);

export function deriveOverlayTags(input: OverlayInputs): OverlayTag[] {
  const tags = new Set<OverlayTag>();

  if (input.admtTags) {
    for (const tag of californiaOverlays(input.admtTags)) tags.add(tag);
  }

  for (const scope of input.regimeScopes ?? []) {
    // Undetermined scopes contribute nothing; their open questions are
    // surfaced separately so the gap is visible rather than silently filled.
    if (scope.state !== "IN_SCOPE") continue;
    for (const tag of scope.tags) {
      if (REGIME_OVERLAYS.has(tag)) tags.add(tag as OverlayTag);
    }
  }

  if (input.riskLevel === "HIGH" || (input.annexIiiCategory ?? null) !== null) {
    tags.add("eu:high-risk");
  }
  if (input.hasArt50Obligation) tags.add("eu:art50");
  if (input.technique === "AGENTIC_AI" || input.handsOffToAutonomousAgent === "YES") {
    tags.add("agentic");
  }

  return [...tags];
}

/**
 * Open questions across every resolver, so the assessment can say which
 * overlays are still undecided rather than presenting the set as complete.
 */
export function undeterminedRegimes(scopes: readonly RegimeScope[] | undefined): {
  framework: string;
  openQuestions: string[];
}[] {
  return (scopes ?? [])
    .filter((s) => s.state === "UNDETERMINED")
    .map((s) => ({ framework: s.framework, openQuestions: [...s.openQuestions] }));
}
