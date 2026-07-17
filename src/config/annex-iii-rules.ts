// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Deterministic EU AI Act screening rules — Annex III high-risk categories,
 * Art. 5 prohibited practices, Art. 50 transparency triggers.
 *
 * Pure functions over the registered AI-system facts (name/purpose/
 * description text, technique, data sources). No network, no DB, no AI:
 * this layer works with the AI posture OFF and is the ground truth the
 * optional AI-drafted rationale must cite (the same rules-first doctrine as
 * DPO Central's dpia-auto-fill-rules).
 *
 * Legal basis: Regulation (EU) 2024/1689 final text (the corrected article
 * numbering this repo's seed data uses — 72/73-article count, Annex III
 * point 5(b) financial-fraud carve-out). Keyword screening is a triage aid
 * for the human classifier, never a legal determination — the user always
 * picks the level.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

// ---------------------------------------------------------------------------
// Types (plain data so callers can build facts from Prisma or from tests)
// ---------------------------------------------------------------------------

export interface AnnexIiiFacts {
  name: string;
  description?: string | null;
  purpose?: string | null;
  /** Prisma AITechnique value (e.g. "COMPUTER_VISION", "GENERATIVE_AI"). */
  technique?: string | null;
  processesPersonalData?: boolean;
  /** Union of the system's data-source category tags, if any. */
  dataCategories?: string[];
}

export interface ProhibitedHit {
  /** Stable rule id, e.g. "art5_social_scoring". */
  ruleId: string;
  /** Legal reference, e.g. "Art. 5(1)(c)". */
  article: string;
  /** The text fragment that triggered the rule (lowercased). */
  matched: string;
}

export interface HighRiskHit {
  ruleId: string;
  /** Annex III category value as used by the classification wizard. */
  category:
    | "biometrics"
    | "critical_infrastructure"
    | "education"
    | "employment"
    | "essential_services"
    | "law_enforcement"
    | "migration"
    | "justice";
  /** Legal reference, e.g. "Annex III, point 4". */
  article: string;
  matched: string;
}

export interface CarveOutHit {
  ruleId: string;
  article: string;
  matched: string;
}

export interface AnnexIiiScreening {
  prohibited: ProhibitedHit[];
  highRisk: HighRiskHit[];
  /** Art. 50 transparency-obligation triggers (chatbots, synthetic content). */
  transparency: { ruleId: string; article: string; matched: string }[];
  /** Carve-outs that DOWNGRADE an apparent hit (e.g. financial-fraud detection). */
  carveOuts: CarveOutHit[];
  /**
   * The level the rules suggest. Triage only — the classifier decides:
   * prohibited -> UNACCEPTABLE; any Annex III hit -> HIGH;
   * transparency-only -> LIMITED; nothing -> MINIMAL.
   */
  suggestedLevel: "UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL";
  /** First high-risk category, convenient for pre-filling the wizard. */
  suggestedCategory: HighRiskHit["category"] | null;
}

// ---------------------------------------------------------------------------
// Rule tables (keyword screening over the system's own registered text)
// ---------------------------------------------------------------------------

interface KeywordRule {
  ruleId: string;
  article: string;
  keywords: string[];
}

/** Art. 5(1) prohibited practices — the corrected (a)–(h) list. */
const PROHIBITED_RULES: KeywordRule[] = [
  { ruleId: "art5_subliminal", article: "Art. 5(1)(a)", keywords: ["subliminal", "manipulative technique"] },
  { ruleId: "art5_vulnerabilities", article: "Art. 5(1)(b)", keywords: ["exploit vulnerabilit", "exploiting vulnerabilit"] },
  { ruleId: "art5_social_scoring", article: "Art. 5(1)(c)", keywords: ["social scoring", "social score", "social credit"] },
  { ruleId: "art5_predictive_policing", article: "Art. 5(1)(d)", keywords: ["predictive policing", "predict criminal", "predicting criminal"] },
  { ruleId: "art5_facial_scraping", article: "Art. 5(1)(e)", keywords: ["untargeted scraping", "facial recognition database", "scraping of facial"] },
  { ruleId: "art5_emotion_work_edu", article: "Art. 5(1)(f)", keywords: ["emotion recognition in the workplace", "employee emotion", "student emotion", "emotion recognition at work", "emotion recognition in education"] },
  { ruleId: "art5_biometric_categorisation", article: "Art. 5(1)(g)", keywords: ["biometric categorisation", "biometric categorization"] },
  { ruleId: "art5_rbi_public", article: "Art. 5(1)(h)", keywords: ["real-time biometric identification", "real-time remote biometric", "live facial recognition in public"] },
];

/** Annex III points 1–8 mapped to the classification wizard's category values. */
const HIGH_RISK_RULES: (KeywordRule & { category: HighRiskHit["category"] })[] = [
  {
    ruleId: "annex3_biometrics",
    category: "biometrics",
    article: "Annex III, point 1",
    keywords: ["biometric", "face recognition", "facial recognition", "fingerprint", "iris scan", "voice identification"],
  },
  {
    ruleId: "annex3_critical_infrastructure",
    category: "critical_infrastructure",
    article: "Annex III, point 2",
    keywords: ["critical infrastructure", "electricity grid", "power grid", "water supply", "gas supply", "road traffic management", "critical digital infrastructure"],
  },
  {
    ruleId: "annex3_education",
    category: "education",
    article: "Annex III, point 3",
    keywords: ["student admission", "admission decision", "exam scoring", "grading", "proctoring", "educational assessment", "vocational training access"],
  },
  {
    ruleId: "annex3_employment",
    category: "employment",
    article: "Annex III, point 4",
    keywords: ["recruit", "hiring", "cv screening", "resume screening", "candidate ranking", "job applicant", "promotion decision", "termination decision", "employee monitoring", "task allocation"],
  },
  {
    ruleId: "annex3_essential_services",
    category: "essential_services",
    article: "Annex III, point 5",
    keywords: ["credit scoring", "creditworthiness", "credit score", "insurance pricing", "insurance risk assessment", "public assistance", "social benefits", "emergency call", "emergency dispatch"],
  },
  {
    ruleId: "annex3_law_enforcement",
    category: "law_enforcement",
    article: "Annex III, point 6",
    keywords: ["law enforcement", "police", "criminal offence", "criminal offense", "evidence reliability", "recidivism"],
  },
  {
    ruleId: "annex3_migration",
    category: "migration",
    article: "Annex III, point 7",
    keywords: ["asylum", "visa application", "border control", "migration", "residence permit"],
  },
  {
    ruleId: "annex3_justice",
    category: "justice",
    article: "Annex III, point 8",
    keywords: ["judicial", "court decision", "sentencing", "administration of justice", "dispute resolution", "election", "voting behaviour", "voting behavior"],
  },
];

/**
 * Annex III point 5(b) carve-out: AI used to DETECT financial fraud is not
 * high-risk under the essential-services point (the pre-correction seed data
 * got this wrong; the rules layer must not reintroduce it).
 */
const FRAUD_CARVE_OUT: KeywordRule = {
  ruleId: "annex3_5b_fraud_carveout",
  article: "Annex III, point 5(b)",
  keywords: ["fraud detection", "detect fraud", "detecting fraud", "fraud prevention", "anti-fraud"],
};

/** Art. 50 transparency triggers (interaction, synthetic content, deepfakes). */
const TRANSPARENCY_RULES: KeywordRule[] = [
  { ruleId: "art50_interaction", article: "Art. 50(1)", keywords: ["chatbot", "conversational", "virtual assistant", "customer service bot"] },
  { ruleId: "art50_synthetic", article: "Art. 50(2)", keywords: ["synthetic content", "content generation", "generated content", "image generation", "text generation"] },
  { ruleId: "art50_deepfake", article: "Art. 50(4)", keywords: ["deepfake", "deep fake", "face swap"] },
];

/** Techniques that alone imply an Art. 50 transparency conversation. */
const TRANSPARENCY_TECHNIQUES = new Set(["GENERATIVE_AI"]);

// ---------------------------------------------------------------------------
// Screening
// ---------------------------------------------------------------------------

function factText(facts: AnnexIiiFacts): string {
  return [facts.name, facts.description ?? "", facts.purpose ?? "", (facts.dataCategories ?? []).join(" ")]
    .join(" \n ")
    .toLowerCase();
}

function firstMatch(text: string, rule: KeywordRule): string | null {
  for (const keyword of rule.keywords) {
    if (text.includes(keyword)) return keyword;
  }
  return null;
}

/**
 * Screen a registered AI system against the prohibited / high-risk /
 * transparency rule tables. Deterministic and side-effect free.
 */
export function screenAnnexIii(facts: AnnexIiiFacts): AnnexIiiScreening {
  const text = factText(facts);

  const prohibited: ProhibitedHit[] = [];
  for (const rule of PROHIBITED_RULES) {
    const matched = firstMatch(text, rule);
    if (matched) prohibited.push({ ruleId: rule.ruleId, article: rule.article, matched });
  }

  const carveOuts: CarveOutHit[] = [];
  const fraudMatch = firstMatch(text, FRAUD_CARVE_OUT);
  if (fraudMatch) {
    carveOuts.push({ ruleId: FRAUD_CARVE_OUT.ruleId, article: FRAUD_CARVE_OUT.article, matched: fraudMatch });
  }

  const highRisk: HighRiskHit[] = [];
  for (const rule of HIGH_RISK_RULES) {
    const matched = firstMatch(text, rule);
    if (matched) {
      // The point 5(b) carve-out: a credit/fraud hit that is explained by
      // fraud DETECTION does not make the system high-risk on its own.
      if (rule.category === "essential_services" && fraudMatch && !prohibited.length) {
        const nonFraudMatch = rule.keywords
          .filter((k) => !k.includes("fraud"))
          .some((k) => text.includes(k));
        if (!nonFraudMatch) continue;
      }
      highRisk.push({ ruleId: rule.ruleId, category: rule.category, article: rule.article, matched });
    }
  }

  const transparency: AnnexIiiScreening["transparency"] = [];
  for (const rule of TRANSPARENCY_RULES) {
    const matched = firstMatch(text, rule);
    if (matched) transparency.push({ ruleId: rule.ruleId, article: rule.article, matched });
  }
  if (
    facts.technique &&
    TRANSPARENCY_TECHNIQUES.has(facts.technique) &&
    transparency.length === 0
  ) {
    transparency.push({
      ruleId: "art50_generative_technique",
      article: "Art. 50(2)",
      matched: "generative_ai",
    });
  }

  const suggestedLevel: AnnexIiiScreening["suggestedLevel"] = prohibited.length
    ? "UNACCEPTABLE"
    : highRisk.length
      ? "HIGH"
      : transparency.length
        ? "LIMITED"
        : "MINIMAL";

  return {
    prohibited,
    highRisk,
    transparency,
    carveOuts,
    suggestedLevel,
    suggestedCategory: highRisk[0]?.category ?? null,
  };
}
