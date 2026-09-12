// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Five-factor analysis for sensitive data, health data first.
 *
 * US state law gives no single definition of health data. Washington's My
 * Health My Data Act reaches any personal data that identifies a health status,
 * including data derived from non-health information; California treats
 * personal information "collected and analyzed concerning a consumer's health"
 * as sensitive and treats inferences as personal information; Colorado's rules
 * say browsing data becomes sensitive when it is used to infer a sensitive
 * trait. The question is therefore never "is this field health data" but "given
 * where it came from, what it reveals, what we do with it, what a person would
 * expect and what could go wrong, should we treat it as health data".
 *
 * The industry answer, and the one auditors and regulators recognise, is a
 * factor analysis: source, content, use, consumer expectations, harm. No factor
 * decides the question alone. The output is a band (low, medium, high) with the
 * reasoning recorded per factor, an owner, a decision and a review date, so the
 * same data is classified the same way twice and the reasoning can be produced
 * on demand.
 *
 * Pure leaf module: no Prisma, no Next, no React. The banding rule is
 * deterministic and versioned, so an analysis can be re-derived later exactly
 * as it was made.
 */

export const SENSITIVE_FACTORS_VERSION = "2026.09.1";
export const SENSITIVE_FACTORS_LAW_REVIEWED_AS_OF = "2026-09-11";

export const SENSITIVE_FACTORS_REVIEW_MARKER = {
  en: `Framework reviewed as of ${SENSITIVE_FACTORS_LAW_REVIEWED_AS_OF}; legal sign-off pending. A factor analysis is a structured way to reason, not a legal conclusion.`,
  es: `Marco revisado a fecha de ${SENSITIVE_FACTORS_LAW_REVIEWED_AS_OF}; pendiente de validación jurídica. Un análisis por factores es una forma estructurada de razonar, no una conclusión jurídica.`,
} as const;

export type Localized = { en: string; es: string };

export const FACTOR_IDS = ["source", "content", "use", "expectations", "harm"] as const;
export type FactorId = (typeof FACTOR_IDS)[number];

export const RATINGS = ["LOW", "MEDIUM", "HIGH"] as const;
export type Rating = (typeof RATINGS)[number];

export const BANDS = ["LOW", "MEDIUM", "HIGH"] as const;
export type Band = (typeof BANDS)[number];

export interface FactorDefinition {
  id: FactorId;
  label: Localized;
  /** What the factor asks, in one sentence. */
  question: Localized;
  /** What raises and lowers it, with the example that makes it concrete. */
  guidance: Localized;
  /** Weight in the banding rule; see bandFor(). */
  weight: "primary" | "modifier";
}

export const SENSITIVE_FACTORS: FactorDefinition[] = [
  {
    id: "source",
    weight: "modifier",
    label: { en: "Source", es: "Origen" },
    question: {
      en: "Where did the data come from?",
      es: "¿De dónde procede el dato?",
    },
    guidance: {
      en: "Data that originates in a clinical or medical context carries more risk than data collected in a general consumer context. Source is a starting point, never a safe harbour: consumer browsing or purchase data can still be health data because of what it reveals or how it is used.",
      es: "Un dato que nace en un contexto clínico o médico conlleva más riesgo que uno recogido en un contexto de consumo general. El origen es un punto de partida, nunca un puerto seguro: los datos de navegación o de compra pueden ser datos de salud por lo que revelan o por el uso que se les da.",
    },
  },
  {
    id: "content",
    weight: "primary",
    label: { en: "Content", es: "Contenido" },
    question: {
      en: "What does the data actually reveal, explicitly or by inference?",
      es: "¿Qué revela realmente el dato, de forma explícita o por inferencia?",
    },
    guidance: {
      en: "Sensitivity runs along a spectrum. A diagnosis, a treatment or a prescription points directly at health status; data that merely correlates with a health interest does not. Buying diabetes medication is not the same as buying low-sugar food. An inference can be as sensitive as an observation when it is individualised, accurate and precise.",
      es: "La sensibilidad se mueve en un espectro. Un diagnóstico, un tratamiento o una receta apuntan directamente al estado de salud; un dato que solo se correlaciona con un interés de salud, no. Comprar medicación para la diabetes no es lo mismo que comprar alimentos bajos en azúcar. Una inferencia puede ser tan sensible como una observación cuando es individualizada, exacta y precisa.",
    },
  },
  {
    id: "use",
    weight: "primary",
    label: { en: "Use", es: "Uso" },
    question: {
      en: "What is the data used for?",
      es: "¿Para qué se utiliza el dato?",
    },
    guidance: {
      en: "Ordinary data becomes sensitive when it is used to target, personalise or decide on a health basis. Common purchases, combined and modelled into a pregnancy score, became a health determination. Aggregation that cannot reach an individual can lower sensitivity. Regulators increasingly frame the question this way, and so should the record.",
      es: "Un dato corriente se vuelve sensible cuando se utiliza para segmentar, personalizar o decidir con criterios de salud. Unas compras habituales, combinadas y modelizadas en una puntuación de embarazo, se convirtieron en una determinación sobre la salud. Una agregación que no permite llegar a una persona concreta puede reducir la sensibilidad. Los reguladores plantean cada vez más la cuestión así, y el registro debe hacerlo igual.",
    },
  },
  {
    id: "expectations",
    weight: "modifier",
    label: { en: "Consumer expectations", es: "Expectativas de la persona" },
    question: {
      en: "What would a reasonable person expect, given where the data was collected and what they were told?",
      es: "¿Qué esperaría una persona razonable, según dónde se recogió el dato y qué se le dijo?",
    },
    guidance: {
      en: "Judged by the environment of collection, the disclosures made and the norms of the product. Expectations of privacy are highest around reproductive health, mental health and conditions that carry stigma. They are dynamic and highly fact-dependent, so the same data can weigh differently in another context.",
      es: "Se valora según el entorno de recogida, la información facilitada y las normas del producto o servicio. La expectativa de privacidad es máxima en salud reproductiva, salud mental y condiciones que conllevan estigma. Son expectativas dinámicas y muy dependientes de los hechos, de modo que el mismo dato puede pesar de otra forma en otro contexto.",
    },
  },
  {
    id: "harm",
    weight: "primary",
    label: { en: "Harm", es: "Perjuicio" },
    question: {
      en: "What could go wrong for a person if this data is collected, used or disclosed?",
      es: "¿Qué puede salir mal para una persona si este dato se recoge, se utiliza o se comunica?",
    },
    guidance: {
      en: "Tangible or intangible: financial loss, discrimination, stigma, distress. Even where the first four factors are low, this one is the reminder that sensitivity is ultimately about impact, and about how the practice reads when described by someone hostile.",
      es: "Material o inmaterial: pérdida económica, discriminación, estigma, sufrimiento. Aunque los cuatro factores anteriores sean bajos, este recuerda que la sensibilidad tiene que ver con el impacto y con cómo se lee la práctica cuando la describe alguien hostil.",
    },
  },
];

const RANK: Record<Rating, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const BY_RANK: Band[] = ["LOW", "MEDIUM", "HIGH"];

export type FactorRatings = Partial<Record<FactorId, Rating>>;

export interface BandResult {
  band: Band;
  /** Why the rule produced this band, in one sentence per language. */
  because: Localized;
  /** True when at least one factor is still unrated. */
  incomplete: boolean;
}

/**
 * The banding rule, stated so it can be argued with.
 *
 * 1. Content, use and harm are primary: the band starts at the highest of them.
 * 2. Expectations and source are modifiers: if either is rated HIGH, the band
 *    rises one step; two modifiers at LOW lower it one step, but never below
 *    the highest primary factor minus one, and never below LOW.
 * 3. A HIGH on any primary factor cannot be lowered by modifiers. Health data
 *    that is directly revealing stays high even where a person might expect the
 *    processing.
 *
 * The rule is deliberately blunt. Its value is that two analysts reach the same
 * band from the same ratings, and that the reasoning is recorded either way.
 */
export function bandFor(ratings: FactorRatings): BandResult {
  const primaries = SENSITIVE_FACTORS.filter((f) => f.weight === "primary").map(
    (f) => ratings[f.id],
  );
  const modifiers = SENSITIVE_FACTORS.filter((f) => f.weight === "modifier").map(
    (f) => ratings[f.id],
  );
  const incomplete = [...primaries, ...modifiers].some((r) => !r);

  const ratedPrimaries = primaries.filter(Boolean) as Rating[];
  const base = ratedPrimaries.length
    ? Math.max(...ratedPrimaries.map((r) => RANK[r]))
    : 0;

  const ratedModifiers = modifiers.filter(Boolean) as Rating[];
  const anyModifierHigh = ratedModifiers.some((r) => r === "HIGH");
  const allModifiersLow =
    ratedModifiers.length === modifiers.length && ratedModifiers.every((r) => r === "LOW");

  let rank = base;
  let reasonEn: string;
  let reasonEs: string;

  if (base === RANK.HIGH) {
    reasonEn =
      "A primary factor (content, use or harm) is high, which the modifiers cannot lower.";
    reasonEs =
      "Un factor principal (contenido, uso o perjuicio) es alto, y los modificadores no pueden rebajarlo.";
  } else if (anyModifierHigh) {
    rank = Math.min(RANK.HIGH, base + 1);
    reasonEn =
      "Source or consumer expectations are high, which raises the band a step above the primary factors.";
    reasonEs =
      "El origen o las expectativas de la persona son altos, lo que eleva un escalón sobre los factores principales.";
  } else if (allModifiersLow && base > 0) {
    rank = base - 1;
    reasonEn =
      "Both modifiers are low, which lowers the band one step below the highest primary factor.";
    reasonEs =
      "Ambos modificadores son bajos, lo que rebaja un escalón respecto del factor principal más alto.";
  } else {
    reasonEn = "The band follows the highest of content, use and harm.";
    reasonEs = "La banda sigue al más alto entre contenido, uso y perjuicio.";
  }

  return {
    band: BY_RANK[Math.max(0, Math.min(2, rank))],
    because: { en: reasonEn, es: reasonEs },
    incomplete,
  };
}

/** What each band is normally taken to mean. Guidance, not a rule. */
export const BAND_GUIDANCE: Record<Band, Localized> = {
  LOW: {
    en: "Treat as ordinary personal data, record the reasoning, and re-check when the use or the audience changes.",
    es: "Trátalo como dato personal ordinario, deja constancia del razonamiento y revísalo cuando cambien el uso o el público.",
  },
  MEDIUM: {
    en: "Treat as sensitive for the strict states, or restrict the use so that it cannot become an individual health determination. Whichever is chosen, write down which and why.",
    es: "Trátalo como sensible en los estados más estrictos, o limita el uso para que no pueda convertirse en una determinación individual sobre la salud. Sea cual sea la opción, deja constancia de cuál y por qué.",
  },
  HIGH: {
    en: "Treat as sensitive health data everywhere: opt-in consent where it can be obtained, suppression where it cannot, no sale, and a contract that binds every recipient.",
    es: "Trátalo como dato de salud sensible en todas partes: consentimiento expreso donde pueda obtenerse, supresión donde no, sin venta, y un contrato que vincule a cada destinatario.",
  },
};
