// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The laws on telling people they are dealing with AI, per declared place,
 * for the "Telling people it is AI" step (src/components/guided/path-config.ts).
 *
 * The step is the same for everyone: each system records whether people must
 * be told. What changes with the places is which laws the step names. Only
 * laws already modelled elsewhere in this repository are listed, each with
 * the source it is taken from:
 *
 * - EU AI Act Art. 50: src/config/transparency-rules.ts (EU or EEA declared,
 *   and the EU AI Act not ruled out by the organisation's answers);
 * - Texas TRAIGA § 552.051 (government agencies and health care providers):
 *   src/config/regimes/texas-requirements.ts;
 * - Utah AI Policy Act (generative AI disclosure):
 *   src/config/regulatory-milestones.ts, "ut-aipa-disclosure";
 * - Washington HB 2225 § 3 (AI companion chatbots):
 *   src/config/regimes/washington-requirements.ts.
 *
 * With no place declared, or none of these, no law is named and the step
 * reads in neutral words. Pure module. Display strings live under
 * `guided.disclosureLaws.<id>`.
 */

import type { RuledOutFramework } from "@/config/framework-scope";

export const DISCLOSURE_LAWS = ["euAiActArt50", "texasTraiga", "utahAipa", "washingtonCompanion"] as const;

export type DisclosureLawId = (typeof DISCLOSURE_LAWS)[number];

/** The disclosure laws to name for these declared places, in a fixed order. */
export function disclosureLawsFor(
  jurisdictions: readonly string[],
  ruledOut: readonly RuledOutFramework[] = [],
): DisclosureLawId[] {
  const has = (j: string) => jurisdictions.includes(j);
  const out: DisclosureLawId[] = [];
  if ((has("EU") || has("EEA")) && !ruledOut.includes("EU_AI_ACT")) out.push("euAiActArt50");
  if (has("US_TX")) out.push("texasTraiga");
  if (has("US_UT")) out.push("utahAipa");
  if (has("US_WA")) out.push("washingtonCompanion");
  return out;
}
