// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What stays paid on the hosted instance.
 *
 * The hosted instance is a shop window as well as a demo. Everything that
 * teaches the product is free, and a small number of finished deliverables
 * stay behind the licence, so a visitor can see exactly what they would be
 * buying: the impact assessment document, the program report and the program
 * pack, and the two specialist assessments.
 *
 * **Self-hosted deployments are unaffected.** The sovereign images bake
 * `NEXT_PUBLIC_ALL_SKILLS_FREE=true` explicitly, and this module treats that
 * explicit flag as "everything included", which is the self-host posture in
 * `deploy/sovereign`. The hosted instance leaves the variable unset and gets
 * `allSkillsFree` from the Stripe-off rule instead, which is how the two are
 * told apart without a second environment variable.
 *
 * `NEXT_PUBLIC_PREMIUM_SHOWCASE=false` turns it off anywhere; `=true` turns it
 * on anywhere, for a deployment that wants the shop-window posture deliberately.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

export const SHOWCASE_FEATURES = [
  /** The unified impact assessment document: the DPIA deliverable. */
  "impact-assessment-document",
  /** The program report PDF. */
  "program-report",
  /** The whole program pack, as a ZIP. */
  "program-pack",
  /** The two specialist assessment types, which are premium by design. */
  "conformity-assessment",
  "bias-fairness-assessment",
] as const;

export type ShowcaseFeature = (typeof SHOWCASE_FEATURES)[number];

/**
 * Is the shop-window posture active on this deployment?
 *
 * Deliberately a function rather than a constant so tests can vary the
 * environment; the client wrapper below reads it once, as the other flags do.
 */
export type ShowcaseEnv = Partial<Record<string, string | undefined>>;

export function premiumShowcaseActive(env: ShowcaseEnv = process.env): boolean {
  if (env.NEXT_PUBLIC_PREMIUM_SHOWCASE === "false") return false;
  if (env.NEXT_PUBLIC_PREMIUM_SHOWCASE === "true") return true;

  // Self-host: the flag is baked explicitly, and everything is included.
  if (env.NEXT_PUBLIC_ALL_SKILLS_FREE === "true") return false;

  // Hosted: Stripe off, the flag unset. Everything that teaches is free; the
  // finished deliverables are the shop window.
  return env.NEXT_PUBLIC_STRIPE_ENABLED === "false";
}

export function isShowcasePremium(
  feature: ShowcaseFeature,
  env: ShowcaseEnv = process.env,
): boolean {
  return premiumShowcaseActive(env) && SHOWCASE_FEATURES.includes(feature);
}

/** Where a visitor goes to buy the licence that unlocks these. */
export const SHOWCASE_PURCHASE_URL = "https://todo.law/skills";

/** What each showcase feature is called, for the lock and the message. */
export const SHOWCASE_LABELS: Record<ShowcaseFeature, { en: string; es: string }> = {
  "impact-assessment-document": {
    en: "Impact assessment document",
    es: "Documento de evaluación de impacto",
  },
  "program-report": { en: "Program report", es: "Informe del programa" },
  "program-pack": { en: "Program pack", es: "Paquete del programa" },
  "conformity-assessment": { en: "Conformity assessment", es: "Evaluación de la conformidad" },
  "bias-fairness-assessment": {
    en: "Bias and fairness assessment",
    es: "Evaluación de sesgo y equidad",
  },
};
