// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The policy template library: every policy text the product ships, kept apart
 * from the organization's own policies. A template becomes a policy only when a
 * person chooses "Use this template", which creates a draft.
 *
 * Three groups: the sector-neutral core pack, the law-firm pack and the policies
 * of the industry templates. Pure: no database, no network.
 *
 * suggestPolicies() answers "which policies should we have?" from three answers
 * (sector, provider or deployer, uses agents). It only points at templates that
 * exist, or at a blank policy of a type when no template of that type fits.
 */

import type { PolicyType } from "@prisma/client";
import { CORE_POLICY_PACK, localizeCorePolicy } from "./core-policy-pack";
import { LAWFIRM_POLICY_PACK } from "./lawfirm-ai-toolkit";
import { AI_GOVERNANCE_TEMPLATES } from "./ai-governance-templates";
import { localizeTemplate } from "./ai-governance-templates.es";

export type LibraryLocale = "en" | "es";
export type LibraryGroup = "core" | "lawfirm" | "industry";

export interface PolicyTemplate {
  /** Stable id: the core or law-firm pack id, or "<industry id>-<index>". */
  id: string;
  group: LibraryGroup;
  /** The industry template id, for group "industry". */
  industryId?: string;
  /** The industry's display name, for group "industry". */
  industryName?: string;
  title: string;
  type: PolicyType;
  description: string;
  content: string;
}

/** Every template in the library, in the reader's language. */
export function policyLibrary(locale: LibraryLocale): PolicyTemplate[] {
  return [
    ...CORE_POLICY_PACK.map((p) => ({
      id: p.id,
      group: "core" as const,
      ...localizeCorePolicy(p, locale),
    })),
    ...LAWFIRM_POLICY_PACK.map((p) => ({
      id: p.id,
      group: "lawfirm" as const,
      title: p.title[locale],
      type: p.type,
      description: p.description[locale],
      content: p.content[locale],
    })),
    ...AI_GOVERNANCE_TEMPLATES.map((source) => localizeTemplate(source, locale)).flatMap((tpl) =>
      tpl.policies.map((p, i) => ({
        id: `${tpl.id}-${i}`,
        group: "industry" as const,
        industryId: tpl.id,
        industryName: tpl.name,
        title: p.title,
        type: p.type,
        description: p.description,
        content: p.content,
      })),
    ),
  ];
}

export function findPolicyTemplate(id: string, locale: LibraryLocale): PolicyTemplate | undefined {
  return policyLibrary(locale).find((t) => t.id === id);
}

/** The sectors the chooser offers: the industry templates, law firms, and "other". */
export function policySectors(locale: LibraryLocale): Array<{ id: string; name: string }> {
  return [
    ...AI_GOVERNANCE_TEMPLATES.map((source) => {
      const tpl = localizeTemplate(source, locale);
      return { id: tpl.id, name: tpl.name };
    }),
    { id: "legal", name: locale === "es" ? "Despacho de abogados" : "Law firm" },
    { id: "other", name: locale === "es" ? "Otro sector" : "Another sector" },
  ];
}

export type PolicyRole = "deployer" | "provider" | "both";

export interface PolicySuggestionAnswers {
  sector: string;
  role: PolicyRole;
  agents: boolean;
}

/** Why a policy is suggested. The UI shows one short line per reason. */
export type SuggestionReason = "baseline" | "sector" | "provider" | "deployer" | "agents";

export type PolicySuggestion =
  | { kind: "template"; template: PolicyTemplate; reasons: SuggestionReason[] }
  | { kind: "blank"; type: PolicyType; reasons: SuggestionReason[] };

/** Policy types that matter most when the organization uses AI agents. */
const AGENT_TYPES: readonly PolicyType[] = ["AI_GOVERNANCE", "AI_INCIDENT_RESPONSE", "AI_DATA_GOVERNANCE"];
/** Policy types that matter most to an organization that buys and uses AI. */
const DEPLOYER_TYPES: readonly PolicyType[] = ["AI_USAGE", "AI_PROCUREMENT"];

/**
 * The policies to have, from three answers. One template per policy type: the
 * sector's own text where the sector has one, the core pack otherwise (the law
 * firm pack for law firms). A provider also gets a risk-management policy,
 * from the sector when it has one, otherwise a blank policy of that type.
 */
export function suggestPolicies(answers: PolicySuggestionAnswers, locale: LibraryLocale): PolicySuggestion[] {
  const library = policyLibrary(locale);
  const sectorTemplates =
    answers.sector === "legal"
      ? library.filter((t) => t.group === "lawfirm")
      : library.filter((t) => t.group === "industry" && t.industryId === answers.sector);

  const byType = new Map<PolicyType, PolicySuggestion>();
  for (const t of sectorTemplates) {
    if (!byType.has(t.type)) byType.set(t.type, { kind: "template", template: t, reasons: ["sector"] });
  }
  for (const t of library.filter((x) => x.group === "core")) {
    if (!byType.has(t.type)) byType.set(t.type, { kind: "template", template: t, reasons: ["baseline"] });
  }

  if (answers.role === "provider" || answers.role === "both") {
    const existing = byType.get("AI_RISK_MANAGEMENT");
    if (existing) existing.reasons.push("provider");
    else byType.set("AI_RISK_MANAGEMENT", { kind: "blank", type: "AI_RISK_MANAGEMENT", reasons: ["provider"] });
  }
  if (answers.role === "deployer" || answers.role === "both") {
    for (const type of DEPLOYER_TYPES) byType.get(type)?.reasons.push("deployer");
  }
  if (answers.agents) {
    for (const type of AGENT_TYPES) byType.get(type)?.reasons.push("agents");
  }

  // Stable order: the types most often adopted first.
  const ORDER: PolicyType[] = [
    "AI_USAGE",
    "AI_GOVERNANCE",
    "AI_RISK_MANAGEMENT",
    "AI_DATA_GOVERNANCE",
    "AI_TRANSPARENCY",
    "AI_PROCUREMENT",
    "AI_INCIDENT_RESPONSE",
    "AI_ETHICS",
    "CUSTOM",
  ];
  return ORDER.flatMap((type) => {
    const s = byType.get(type);
    return s ? [s] : [];
  });
}
