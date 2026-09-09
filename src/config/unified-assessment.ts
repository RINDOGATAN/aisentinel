// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The unified AI impact assessment.
 *
 * One question set that answers the EU AI Act fundamental rights impact
 * assessment (Art. 27), the GDPR data protection impact assessment (Art. 35)
 * and Art. 22 analysis, the California ADMT risk assessment, Colorado
 * SB 26-189, Texas TRAIGA and the Washington domain instruments — built as a
 * highest-common-denominator core with jurisdictional overlays.
 *
 * ARCHITECTURE
 *   - Core questions (`overlay: null`) are always asked. They are drafted to
 *     the strictest formulation among the regimes, so answering once satisfies
 *     every regime that asks a weaker version of the same question.
 *   - Overlay questions carry a scope tag and appear only when that regime's
 *     rules layer has put this system in scope. The tag vocabulary is the one
 *     the resolvers already emit: California ADMT tags from
 *     `src/config/admt-rules.ts`, regime tags from
 *     `src/config/regimes/regime-rules.ts`, plus two EU tags derived from the
 *     risk classification (`eu:high-risk`) and the Art. 50 profile
 *     (`eu:art50`), and `agentic` for systems that hand off to an autonomous
 *     downstream agent.
 *   - Every question declares what it `satisfies`: the framework code and
 *     requirement code its answer evidences. That is what lets one answer
 *     stand as evidence in several compliance registers at once, and what the
 *     generated artifacts cite.
 *
 * Pure data and pure selection. Legal sign-off PENDING for every citation.
 */

import { signoffMarker } from "@/config/legal-signoff";
import type { Localized } from "@/config/lawfirm-ai-toolkit";

export const UNIFIED_ASSESSMENT_VERSION = "2026.09.1";
export const UNIFIED_ASSESSMENT_LAW_REVIEWED_AS_OF = "2026-09-08";
export const UNIFIED_ASSESSMENT_REVIEW_MARKER: Localized = signoffMarker("UNIFIED_ASSESSMENT");

/** Always stated alongside the marker: this is a drafting aid, not advice. */
export const UNIFIED_ASSESSMENT_NOT_ADVICE: Localized = {
  en: "This template is a drafting aid, not legal advice.",
  es: "Esta plantilla es una ayuda a la redacción, no asesoramiento jurídico.",
};

/** The scope tag that gates an overlay question. `null` means always asked. */
export type OverlayTag =
  // EU AI Act, derived from the risk classification and Art. 50 profile
  | "eu:high-risk"
  | "eu:art50"
  // GDPR, from the regime resolver
  | "gdpr:core"
  | "gdpr:adm"
  | "gdpr:dpia"
  | "gdpr:special"
  // California, from the ADMT resolver
  | "admt:art10"
  | "admt:art11"
  // Colorado, Texas, Washington from the regime resolver
  | "co:developer"
  | "co:deployer"
  | "tx:core"
  | "tx:government"
  | "tx:healthcare"
  | "wa:mhmda"
  | "wa:genai-provenance"
  | "wa:companion"
  | "wa:prior-auth"
  | "wa:public-agency"
  // The agentic layer
  | "agentic";

/** A requirement this answer evidences. */
export interface Citation {
  framework:
    | "EU_AI_ACT"
    | "EU_GDPR"
    | "CA_CCPA_ADMT"
    | "CO_SB_26_189"
    | "TX_TRAIGA"
    | "WA_AI_RULES"
    | "NIST_AI_RMF"
    | "ISO_42001";
  /** The requirement `code` as seeded, e.g. "Art. 27(1)" or "§ 7150". */
  code: string;
}

/** Which generated artifact an answer feeds. */
export type ArtifactTarget = "assessment" | "notice" | "protocol";

export interface UnifiedQuestion {
  id: string;
  text: Localized;
  helpText?: Localized;
  type: "textarea" | "select";
  options?: string[];
  required: boolean;
  overlay: OverlayTag | null;
  satisfies: Citation[];
  /** Artifacts this answer is carried into. Default: the assessment only. */
  feeds?: ArtifactTarget[];
}

export interface UnifiedSection {
  id: string;
  title: Localized;
  /** Shown above the questions; explains why the section exists. */
  intro?: Localized;
  questions: UnifiedQuestion[];
}

const t = (en: string, es: string): Localized => ({ en, es });

export const UNIFIED_ASSESSMENT_SECTIONS: UnifiedSection[] = [
  // ══════════════════════════════════════════════════════════════════════
  {
    id: "system",
    title: t("1. System, purpose and role", "1. Sistema, finalidad y papel"),
    intro: t(
      "The description every regime opens with. Answer once, to the level of detail the EU AI Act Annex IV expects, and it serves the GDPR record, the California risk assessment and the Colorado notice.",
      "La descripción con la que empieza cada régimen. Respóndela una vez, con el detalle que espera el anexo IV del Reglamento de IA de la UE, y sirve para el registro del RGPD, la evaluación de riesgos de California y el aviso de Colorado.",
    ),
    questions: [
      {
        id: "sys_description",
        text: t(
          "Describe the AI system: name, version, provider, what it does and how it is integrated into your processes.",
          "Describe el sistema de IA: nombre, versión, proveedor, qué hace y cómo se integra en tus procesos.",
        ),
        helpText: t(
          "Include the model or technique, whether it was built in-house or procured, and the business process it sits in.",
          "Incluye el modelo o la técnica, si es propio o adquirido, y el proceso de negocio en el que se inserta.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 27(1)" },
          { framework: "EU_GDPR", code: "Art. 30" },
          { framework: "CA_CCPA_ADMT", code: "§ 7152(a)(1)" },
          { framework: "CO_SB_26_189", code: "CO-SCOPE" },
        ],
        feeds: ["assessment", "notice"],
      },
      {
        id: "sys_purpose",
        text: t(
          "State the intended purpose and the specific decision or output the system produces.",
          "Indica la finalidad prevista y la decisión o el resultado concreto que produce el sistema.",
        ),
        helpText: t(
          "Be specific about the decision: 'ranks applicants for interview' rather than 'supports recruitment'.",
          "Sé concreto respecto de la decisión: «ordena a los candidatos para la entrevista», no «apoya la selección».",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 27(1)" },
          { framework: "EU_GDPR", code: "Art. 5(1)(b)" },
          { framework: "CA_CCPA_ADMT", code: "§ 7152(a)(2)" },
        ],
        feeds: ["assessment", "notice"],
      },
      {
        id: "sys_role",
        text: t(
          "State your role for this system and the period and frequency of use.",
          "Indica tu papel respecto de este sistema y el período y la frecuencia de uso.",
        ),
        helpText: t(
          "Provider or deployer under the EU AI Act; developer or deployer under Colorado; controller or processor under the GDPR. The duties differ by role.",
          "Proveedor o responsable del despliegue conforme al Reglamento de IA; desarrollador o responsable del despliegue conforme a Colorado; responsable o encargado conforme al RGPD. Los deberes cambian según el papel.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 27(1)" },
          { framework: "CO_SB_26_189", code: "CO-SCOPE" },
        ],
      },
      {
        id: "sys_necessity",
        text: t(
          "Why is an AI system necessary and proportionate here, and what less intrusive alternative did you consider?",
          "¿Por qué es necesario y proporcionado un sistema de IA en este caso y qué alternativa menos intrusiva se valoró?",
        ),
        helpText: t(
          "The GDPR requires an assessment of necessity and proportionality. Recording the alternative you rejected, and why, is the strongest form of that answer.",
          "El RGPD exige evaluar la necesidad y la proporcionalidad. Dejar constancia de la alternativa descartada, y del motivo, es la forma más sólida de responder.",
        ),
        type: "textarea",
        required: true,
        overlay: "gdpr:dpia",
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 35(7)" },
          { framework: "CA_CCPA_ADMT", code: "§ 7152(a)(4)" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  {
    id: "people",
    title: t("2. People affected", "2. Personas afectadas"),
    intro: t(
      "Every regime asks who is on the receiving end. The strictest formulation, from the EU AI Act Art. 27, also covers the GDPR and the California risk assessment.",
      "Todos los regímenes preguntan quién está al otro lado. La formulación más estricta, la del art. 27 del Reglamento de IA, cubre también el RGPD y la evaluación de riesgos de California.",
    ),
    questions: [
      {
        id: "ppl_categories",
        text: t(
          "Identify the categories of natural persons and groups likely to be affected, and the expected number.",
          "Identifica las categorías de personas físicas y los grupos que probablemente resulten afectados, y el número previsto.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 27(1)" },
          { framework: "EU_GDPR", code: "Art. 35(7)" },
          { framework: "CA_CCPA_ADMT", code: "§ 7152(a)(3)" },
        ],
      },
      {
        id: "ppl_vulnerable",
        text: t(
          "Are children, employees, patients, benefit claimants or other people in a position of dependence or vulnerability affected? Explain the imbalance of power.",
          "¿Resultan afectados menores, personas trabajadoras, pacientes, solicitantes de prestaciones u otras personas en situación de dependencia o vulnerabilidad? Explica el desequilibrio de poder.",
        ),
        helpText: t(
          "This drives the Art. 5 prohibitions, the Annex III categories, the GDPR fairness analysis and the Washington minor protections.",
          "Esto determina las prohibiciones del art. 5, las categorías del anexo III, el análisis de lealtad del RGPD y la protección de menores de Washington.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 27(1)" },
          { framework: "EU_GDPR", code: "Art. 5(1)(a)" },
        ],
      },
      {
        id: "ppl_consultation",
        text: t(
          "Whose views did you seek on this processing, or why was consultation not appropriate?",
          "¿A quién consultaste sobre este tratamiento, o por qué no procedía la consulta?",
        ),
        helpText: t(
          "GDPR Art. 35(9). Works councils, unions, patient representatives and affected communities are the usual answers.",
          "Art. 35.9 del RGPD. Comités de empresa, sindicatos, representantes de pacientes y comunidades afectadas son las respuestas habituales.",
        ),
        type: "textarea",
        required: false,
        overlay: "gdpr:dpia",
        satisfies: [{ framework: "EU_GDPR", code: "Art. 35(9)" }],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  {
    id: "data",
    title: t("3. Data", "3. Datos"),
    questions: [
      {
        id: "data_categories",
        text: t(
          "List the categories of personal data used as input, for training and for evaluation, and their sources.",
          "Enumera las categorías de datos personales utilizadas como entrada, para entrenamiento y para evaluación, y sus fuentes.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 30" },
          { framework: "EU_AI_ACT", code: "Art. 10(2)" },
          { framework: "CA_CCPA_ADMT", code: "§ 7152(a)(2)" },
          { framework: "CO_SB_26_189", code: "CO-DEP-2" },
        ],
        feeds: ["assessment", "notice"],
      },
      {
        id: "data_lawful_basis",
        text: t(
          "State the lawful basis for each processing operation, and for any re-use of existing data as training data, the compatibility assessment.",
          "Indica la base jurídica de cada operación de tratamiento y, para cualquier reutilización de datos existentes como datos de entrenamiento, el análisis de compatibilidad.",
        ),
        type: "textarea",
        required: true,
        overlay: "gdpr:core",
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 6" },
          { framework: "EU_GDPR", code: "Art. 5(1)(b)" },
        ],
      },
      {
        id: "data_special_category",
        text: t(
          "Which special categories of data are processed or inferred, and under which Art. 9(2) condition?",
          "¿Qué categorías especiales de datos se tratan o se infieren, y al amparo de qué condición del art. 9.2?",
        ),
        helpText: t(
          "Inferences count. A model that predicts pregnancy, health status, ethnicity or sexual orientation from ordinary data processes special-category data even if none was collected.",
          "Las inferencias cuentan. Un modelo que predice embarazo, estado de salud, origen étnico u orientación sexual a partir de datos ordinarios trata categorías especiales aunque no se hayan recogido.",
        ),
        type: "textarea",
        required: true,
        overlay: "gdpr:special",
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 9" },
          { framework: "EU_GDPR", code: "Art. 22(4)" },
        ],
      },
      {
        id: "data_health_inference",
        text: t(
          "Does the system derive or extrapolate health data from non-health information, and how was consent obtained?",
          "¿El sistema deriva o extrapola datos de salud a partir de información no sanitaria, y cómo se obtuvo el consentimiento?",
        ),
        helpText: t(
          "Washington's My Health My Data Act catches algorithmic health inference expressly, and requires opt-in consent for a specified purpose.",
          "La ley My Health My Data de Washington comprende expresamente la inferencia algorítmica de salud y exige consentimiento previo para una finalidad determinada.",
        ),
        type: "textarea",
        required: true,
        overlay: "wa:mhmda",
        satisfies: [
          { framework: "WA_AI_RULES", code: "RCW 19.373" },
          { framework: "WA_AI_RULES", code: "RCW 19.373.030" },
        ],
      },
      {
        id: "data_retention_transfers",
        text: t(
          "State the retention period for inputs, outputs and logs, and any transfer outside the EEA with its safeguard.",
          "Indica el plazo de conservación de entradas, resultados y registros, y cualquier transferencia fuera del EEE con su garantía.",
        ),
        type: "textarea",
        required: true,
        overlay: "gdpr:core",
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 5" },
          { framework: "EU_GDPR", code: "Art. 44" },
        ],
      },
      {
        id: "data_quality",
        text: t(
          "How are training, validation and testing data governed for relevance, representativeness and errors, and what bias examination was carried out?",
          "¿Cómo se gobiernan los datos de entrenamiento, validación y prueba en cuanto a pertinencia, representatividad y errores, y qué examen de sesgos se realizó?",
        ),
        type: "textarea",
        required: true,
        overlay: "eu:high-risk",
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 10(2)" },
          { framework: "EU_AI_ACT", code: "Art. 10(3)" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  {
    id: "decision",
    title: t("4. The decision and its effect", "4. La decisión y sus efectos"),
    intro: t(
      "This section decides which overlays apply. GDPR Art. 22, the California ADMT test and the Colorado covered-ADMT test all turn on the same two facts: how automated the decision is, and how much it matters to the person.",
      "Esta sección determina qué capas se aplican. El art. 22 del RGPD, la prueba ADMT de California y la prueba de ADMT cubierta de Colorado giran sobre los mismos dos hechos: cuán automatizada es la decisión y cuánto importa a la persona.",
    ),
    questions: [
      {
        id: "dec_description",
        text: t(
          "Describe the decision the system informs and the consequence for the person if it goes against them.",
          "Describe la decisión en la que interviene el sistema y la consecuencia para la persona si le resulta desfavorable.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 22" },
          { framework: "CA_CCPA_ADMT", code: "§ 7200" },
          { framework: "CO_SB_26_189", code: "CO-SCOPE" },
        ],
        feeds: ["assessment", "notice", "protocol"],
      },
      {
        id: "dec_human_role",
        text: t(
          "Describe exactly what the human in the loop does: what they see, what else they consider, and whether they can change the outcome.",
          "Describe exactamente qué hace la persona que interviene: qué ve, qué más valora y si puede cambiar el resultado.",
        ),
        helpText: t(
          "The California three-prong test and the CJEU reading of GDPR Art. 22 both fail a reviewer who only rubber-stamps. Name the role and the authority it carries.",
          "La prueba de tres elementos de California y la interpretación del art. 22 del RGPD por el TJUE rechazan a quien se limita a ratificar. Nombra el puesto y la autoridad que tiene.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 22" },
          { framework: "CA_CCPA_ADMT", code: "§ 7001(e)(1)" },
          { framework: "EU_AI_ACT", code: "Art. 14(1)" },
        ],
        feeds: ["assessment", "protocol"],
      },
      {
        id: "dec_art22_ground",
        text: t(
          "On which Art. 22(2) ground does the solely automated decision rest: contract, authorising law, or explicit consent?",
          "¿En qué supuesto del art. 22.2 se apoya la decisión únicamente automatizada: contrato, norma habilitante o consentimiento explícito?",
        ),
        type: "textarea",
        required: true,
        overlay: "gdpr:adm",
        satisfies: [{ framework: "EU_GDPR", code: "Art. 22(2)" }],
      },
      {
        id: "dec_logic",
        text: t(
          "In plain language, what is the logic of the system, and what are the significance and envisaged consequences for the person?",
          "En lenguaje sencillo, ¿cuál es la lógica del sistema y cuáles son la importancia y las consecuencias previstas para la persona?",
        ),
        helpText: t(
          "This single answer serves GDPR Arts. 13(2)(f) and 15(1)(h), the California post-decision explanation and the Colorado adverse-decision disclosure. Describe the procedure and the principles applied, not the source code.",
          "Esta única respuesta sirve para los arts. 13.2.f y 15.1.h del RGPD, la explicación posterior a la decisión de California y la información de decisión desfavorable de Colorado. Describe el procedimiento y los principios aplicados, no el código fuente.",
        ),
        type: "textarea",
        required: true,
        overlay: "gdpr:adm",
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 13(2)(f) / 14(2)(g)" },
          { framework: "EU_GDPR", code: "Art. 15(1)(h)" },
          { framework: "CA_CCPA_ADMT", code: "§ 7222" },
          { framework: "CO_SB_26_189", code: "CO-DEP-3" },
        ],
        feeds: ["assessment", "notice", "protocol"],
      },
      {
        id: "dec_ca_domain",
        text: t(
          "Which significant-decision domain does this fall in, and is the technology the sole factor or one of several?",
          "¿En qué ámbito de decisión significativa encaja y la tecnología es el factor único o uno entre varios?",
        ),
        type: "textarea",
        required: true,
        overlay: "admt:art11",
        satisfies: [
          { framework: "CA_CCPA_ADMT", code: "§ 7200" },
          { framework: "CA_CCPA_ADMT", code: "§ 7001(e)(1)" },
        ],
      },
      {
        id: "dec_prior_auth",
        text: t(
          "Confirm that no coverage denial, delay or modification is made by the tool alone, and name the licensed professional who decides.",
          "Confirma que ninguna denegación, retraso o modificación de cobertura la adopta la herramienta por sí sola, e identifica al profesional colegiado que decide.",
        ),
        helpText: t(
          "Washington RCW 48.43.830. The tool may approve; it may not deny. The determination must use the individual patient's information, not only group data.",
          "RCW 48.43.830 de Washington. La herramienta puede aprobar; no puede denegar. La determinación debe usar la información individual del paciente, no solo datos de grupo.",
        ),
        type: "textarea",
        required: true,
        overlay: "wa:prior-auth",
        satisfies: [{ framework: "WA_AI_RULES", code: "RCW 48.43.830" }],
        feeds: ["assessment", "protocol"],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  {
    id: "risks",
    title: t("5. Risks to rights and freedoms", "5. Riesgos para los derechos y libertades"),
    intro: t(
      "The EU AI Act asks for risks to fundamental rights; the GDPR for risks to rights and freedoms; California for negative impacts. One risk register, written to the widest of those, answers all three.",
      "El Reglamento de IA pregunta por los riesgos para los derechos fundamentales; el RGPD, por los riesgos para los derechos y libertades; California, por los impactos negativos. Un único registro de riesgos, redactado conforme al más amplio, responde a los tres.",
    ),
    questions: [
      {
        id: "risk_rights",
        text: t(
          "Identify the specific risks of harm to the people affected, including to their rights and freedoms, and rate likelihood and severity.",
          "Identifica los riesgos concretos de daño para las personas afectadas, incluidos sus derechos y libertades, y valora la probabilidad y la gravedad.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 27(1)" },
          { framework: "EU_GDPR", code: "Art. 35(7)" },
          { framework: "CA_CCPA_ADMT", code: "§ 7152(a)(5)" },
          { framework: "NIST_AI_RMF", code: "MAP 4" },
        ],
      },
      {
        id: "risk_discrimination",
        text: t(
          "What is the risk of discriminatory outcome, which protected characteristics are at stake, and what testing evidences the position?",
          "¿Cuál es el riesgo de resultado discriminatorio, qué características protegidas están en juego y qué pruebas acreditan la situación?",
        ),
        helpText: t(
          "Texas requires the absence of discriminatory intent and treats disparate impact alone as insufficient; Illinois and the EU look at effect. Record both the intent evidence and the impact testing.",
          "Texas exige la ausencia de intención discriminatoria y considera insuficiente el mero impacto dispar; Illinois y la UE atienden al efecto. Documenta tanto la prueba de intención como el análisis de impacto.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 27(1)" },
          { framework: "EU_AI_ACT", code: "Art. 10(2)" },
          { framework: "TX_TRAIGA", code: "§ 552.056" },
        ],
      },
      {
        id: "risk_accuracy",
        text: t(
          "What are the accuracy, robustness and known failure modes, and what happens to a person when the system is wrong?",
          "¿Cuáles son la exactitud, la solidez y los modos de fallo conocidos, y qué le ocurre a una persona cuando el sistema se equivoca?",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 15" },
          { framework: "EU_GDPR", code: "Art. 5(1)(d)" },
          { framework: "NIST_AI_RMF", code: "MEASURE 2" },
        ],
      },
      {
        id: "risk_security",
        text: t(
          "What security measures address model-specific threats: prompt injection, training-data extraction, membership inference and adversarial input?",
          "¿Qué medidas de seguridad abordan las amenazas propias del modelo: inyección de instrucciones, extracción de datos de entrenamiento, inferencia de pertenencia y entradas adversarias?",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 32" },
          { framework: "EU_AI_ACT", code: "Art. 15(5)" },
        ],
      },
      {
        id: "risk_prohibited",
        text: t(
          "Confirm the system is not used to manipulate behaviour to cause harm, to score people socially, or to infringe constitutional rights, and describe the controls that prevent it.",
          "Confirma que el sistema no se usa para manipular el comportamiento causando daño, para puntuar socialmente a las personas ni para vulnerar derechos constitucionales, y describe los controles que lo impiden.",
        ),
        helpText: t(
          "Texas prohibitions are intent-based; the EU Art. 5 prohibitions are effect-based. The same control description answers both.",
          "Las prohibiciones de Texas se basan en la intención; las del art. 5 de la UE, en el efecto. La misma descripción de controles responde a ambas.",
        ),
        type: "textarea",
        required: true,
        overlay: "tx:core",
        satisfies: [
          { framework: "TX_TRAIGA", code: "§ 552.052" },
          { framework: "TX_TRAIGA", code: "§ 552.055" },
          { framework: "TX_TRAIGA", code: "§ 552.056" },
          { framework: "EU_AI_ACT", code: "Art. 5" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  {
    id: "measures",
    title: t("6. Measures and human oversight", "6. Medidas y supervisión humana"),
    questions: [
      {
        id: "meas_mitigations",
        text: t(
          "For each risk identified, state the measure that addresses it and the residual risk that remains.",
          "Para cada riesgo identificado, indica la medida que lo aborda y el riesgo residual que permanece.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 27(1)" },
          { framework: "EU_GDPR", code: "Art. 35(7)" },
          { framework: "CA_CCPA_ADMT", code: "§ 7152(a)(6)" },
        ],
      },
      {
        id: "meas_oversight",
        text: t(
          "Describe the human oversight arrangement: who oversees, what they can do, their training, and how automation bias is countered.",
          "Describe el mecanismo de supervisión humana: quién supervisa, qué puede hacer, su formación y cómo se contrarresta el sesgo de automatización.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 14(1)" },
          { framework: "EU_AI_ACT", code: "Art. 14(4)" },
          { framework: "EU_AI_ACT", code: "Art. 27(1)" },
        ],
        feeds: ["assessment", "protocol"],
      },
      {
        id: "meas_prior_consultation",
        text: t(
          "If a high residual risk remains that you cannot mitigate, record the prior consultation of the supervisory authority.",
          "Si permanece un riesgo residual alto que no puedes mitigar, deja constancia de la consulta previa a la autoridad de control.",
        ),
        type: "textarea",
        required: false,
        overlay: "gdpr:dpia",
        satisfies: [{ framework: "EU_GDPR", code: "Art. 36" }],
      },
      {
        id: "meas_nist_mapping",
        text: t(
          "Which recognised risk-management framework does this programme follow, and where is the mapping recorded?",
          "¿Qué marco reconocido de gestión de riesgos sigue este programa y dónde está documentada la correspondencia?",
        ),
        helpText: t(
          "Substantial compliance with the NIST AI Risk Management Framework is an affirmative defence under Texas TRAIGA. The compliance matrix in this product is the record.",
          "El cumplimiento sustancial del Marco de Gestión de Riesgos de IA del NIST es una eximente conforme a la TRAIGA de Texas. La matriz de cumplimiento de este producto es el registro.",
        ),
        type: "textarea",
        required: false,
        overlay: "tx:core",
        satisfies: [
          { framework: "TX_TRAIGA", code: "§ 552.101-.104" },
          { framework: "NIST_AI_RMF", code: "GOVERN 1" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  {
    id: "review",
    title: t("7. Human review and appeal", "7. Revisión humana y recurso"),
    intro: t(
      "The material for the human-review and appeal protocol. GDPR Art. 22(3), the California § 7221 human-appeal exception, Colorado's review right and the EU AI Act right to an explanation converge on one workflow with different labels.",
      "El material del protocolo de revisión humana y recurso. El art. 22.3 del RGPD, la excepción de recurso humano del § 7221 de California, el derecho de revisión de Colorado y el derecho a una explicación del Reglamento de IA convergen en un único flujo con etiquetas distintas.",
    ),
    questions: [
      {
        id: "rev_route",
        text: t(
          "How does a person ask for human review, and how is that route communicated to them?",
          "¿Cómo solicita una persona la revisión humana y cómo se le comunica esa vía?",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 22(3)" },
          { framework: "CA_CCPA_ADMT", code: "§ 7221(b)(1)" },
          { framework: "CO_SB_26_189", code: "CO-DEP-4" },
        ],
        feeds: ["assessment", "notice", "protocol"],
      },
      {
        id: "rev_reviewer",
        text: t(
          "Name the reviewer role, and confirm it has the authority and the information to change the decision.",
          "Identifica el puesto de la persona revisora y confirma que tiene la autoridad y la información necesarias para cambiar la decisión.",
        ),
        helpText: t(
          "California § 7221(b)(1)(A) requires a designated reviewer with authority to change the decision; GDPR Art. 22(3) requires the intervention to be meaningful. A reviewer without authority satisfies neither.",
          "El § 7221.b.1.A de California exige una persona revisora designada con autoridad para cambiar la decisión; el art. 22.3 del RGPD exige que la intervención sea real. Una persona revisora sin autoridad no cumple ninguno de los dos.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 22(3)" },
          { framework: "CA_CCPA_ADMT", code: "§ 7221(b)(1)" },
        ],
        feeds: ["assessment", "protocol"],
      },
      {
        id: "rev_timing",
        text: t(
          "State the service levels: acknowledgement, decision and communication of the outcome, with the deadlines you commit to.",
          "Indica los niveles de servicio: acuse de recibo, decisión y comunicación del resultado, con los plazos que asumes.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "CA_CCPA_ADMT", code: "§ 7221" },
          { framework: "CO_SB_26_189", code: "CO-DEP-4" },
        ],
        feeds: ["assessment", "protocol"],
      },
      {
        id: "rev_correction",
        text: t(
          "How can a person correct inaccurate personal data used by the system, and how does a correction re-open the decision?",
          "¿Cómo puede una persona corregir los datos personales inexactos que utiliza el sistema y cómo reabre una corrección la decisión?",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 5(1)(d)" },
          { framework: "CO_SB_26_189", code: "CO-DEP-4" },
        ],
        feeds: ["assessment", "protocol"],
      },
      {
        id: "rev_optout",
        text: t(
          "Describe the opt-out from the automated process, or the exception relied on instead.",
          "Describe la exclusión voluntaria del proceso automatizado, o la excepción en la que se ampara.",
        ),
        helpText: t(
          "California requires an opt-out unless an exception applies; the human-appeal exception itself requires the designated reviewer above.",
          "California exige una exclusión voluntaria salvo que concurra una excepción; la propia excepción de recurso humano exige la persona revisora designada indicada arriba.",
        ),
        type: "textarea",
        required: true,
        overlay: "admt:art11",
        satisfies: [
          { framework: "CA_CCPA_ADMT", code: "§ 7221(a)" },
          { framework: "CA_CCPA_ADMT", code: "§ 7221(b)(1)" },
        ],
        feeds: ["assessment", "notice", "protocol"],
      },
      {
        id: "rev_explanation",
        text: t(
          "How is the explanation of an individual decision provided on request, and by whom?",
          "¿Cómo se facilita, a solicitud, la explicación de una decisión individual, y quién la facilita?",
        ),
        type: "textarea",
        required: true,
        overlay: "eu:high-risk",
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 86" },
          { framework: "EU_GDPR", code: "Art. 15(1)(h)" },
        ],
        feeds: ["assessment", "protocol"],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  {
    id: "notice",
    title: t("8. Notice and transparency", "8. Información y transparencia"),
    intro: t(
      "The material for the multi-jurisdictional notice: one universal core plus the addenda each state or regime adds.",
      "El material del aviso multijurisdiccional: un núcleo universal más los anexos que añade cada estado o régimen.",
    ),
    questions: [
      {
        id: "not_core",
        text: t(
          "What are people told about this system, when, and where does that notice live?",
          "¿Qué se informa a las personas sobre este sistema, cuándo y dónde se encuentra ese aviso?",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 12" },
          { framework: "EU_AI_ACT", code: "Art. 26" },
          { framework: "CA_CCPA_ADMT", code: "§ 7220" },
          { framework: "CO_SB_26_189", code: "CO-DEP-1" },
        ],
        feeds: ["assessment", "notice"],
      },
      {
        id: "not_ca_preuse",
        text: t(
          "Record the pre-use notice: how it is delivered before the decision and how it presents the opt-out and access rights.",
          "Documenta el aviso previo al uso: cómo se entrega antes de la decisión y cómo presenta los derechos de exclusión y de acceso.",
        ),
        type: "textarea",
        required: true,
        overlay: "admt:art11",
        satisfies: [
          { framework: "CA_CCPA_ADMT", code: "§ 7220" },
          { framework: "CA_CCPA_ADMT", code: "§ 7220(c)(1)" },
        ],
        feeds: ["assessment", "notice"],
      },
      {
        id: "not_co_public",
        text: t(
          "Record the public statement on ADMT use and where it is published.",
          "Documenta la declaración pública sobre el uso de ADMT y dónde se publica.",
        ),
        type: "textarea",
        required: true,
        overlay: "co:deployer",
        satisfies: [{ framework: "CO_SB_26_189", code: "CO-DEP-5" }],
        feeds: ["assessment", "notice"],
      },
      {
        id: "not_ai_interaction",
        text: t(
          "How is a person told they are interacting with an AI rather than a human?",
          "¿Cómo se informa a una persona de que está interactuando con una IA y no con un ser humano?",
        ),
        type: "textarea",
        required: true,
        overlay: "eu:art50",
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 50(1)" },
          { framework: "TX_TRAIGA", code: "§ 552.051(a)" },
        ],
        feeds: ["assessment", "notice"],
      },
      {
        id: "not_provenance",
        text: t(
          "Which marking or provenance method is applied to generated media, and how resistant is it to removal?",
          "¿Qué método de marcado o de procedencia se aplica al contenido generado y qué resistencia tiene frente a su eliminación?",
        ),
        helpText: t(
          "One implementation, typically C2PA plus an invisible watermark, can satisfy both the EU AI Act Art. 50(2) and Washington HB 1170.",
          "Una única implementación, normalmente C2PA más una marca de agua invisible, puede cumplir a la vez el art. 50.2 del Reglamento de IA de la UE y la HB 1170 de Washington.",
        ),
        type: "textarea",
        required: true,
        overlay: "wa:genai-provenance",
        satisfies: [
          { framework: "WA_AI_RULES", code: "HB 1170 (2026 c 167)" },
          { framework: "EU_AI_ACT", code: "Art. 50(2)" },
        ],
        feeds: ["assessment", "notice"],
      },
      {
        id: "not_companion",
        text: t(
          "Record the companion-chatbot disclosures: the artificial-nature statement, the reminder cadence, and the crisis protocol you publish.",
          "Documenta la información del chatbot de compañía: la declaración de naturaleza artificial, la periodicidad del recordatorio y el protocolo de crisis que publicas.",
        ),
        helpText: t(
          "Washington HB 2225 requires a reminder at least every three hours for adults and every hour for minors, and a published protocol for suicidal ideation and self-harm.",
          "La HB 2225 de Washington exige un recordatorio al menos cada tres horas para adultos y cada hora para menores, y un protocolo publicado ante la ideación suicida y la autolesión.",
        ),
        type: "textarea",
        required: true,
        overlay: "wa:companion",
        satisfies: [
          { framework: "WA_AI_RULES", code: "HB 2225 § 3" },
          { framework: "WA_AI_RULES", code: "HB 2225 § 4" },
          { framework: "WA_AI_RULES", code: "HB 2225 § 5" },
        ],
        feeds: ["assessment", "notice", "protocol"],
      },
      {
        id: "not_health_treatment",
        text: t(
          "How is the patient told that AI is used in their care, and when?",
          "¿Cómo se informa al paciente de que se utiliza IA en su atención, y cuándo?",
        ),
        type: "textarea",
        required: true,
        overlay: "tx:healthcare",
        satisfies: [{ framework: "TX_TRAIGA", code: "§ 552.051(b)" }],
        feeds: ["assessment", "notice"],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  {
    id: "governance",
    title: t("9. Governance, records and review", "9. Gobernanza, registros y revisión"),
    questions: [
      {
        id: "gov_owners",
        text: t(
          "Name the business owner, the technical owner and the person accountable for this assessment.",
          "Identifica al responsable de negocio, al responsable técnico y a la persona responsable de esta evaluación.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 26" },
          { framework: "ISO_42001", code: "5.3" },
        ],
      },
      {
        id: "gov_records",
        text: t(
          "What records are kept to demonstrate compliance, where, and for how long?",
          "¿Qué registros se conservan para acreditar el cumplimiento, dónde y durante cuánto tiempo?",
        ),
        helpText: t(
          "Colorado requires at least three years. Logs of automated recommendations and the human determinations that followed are the evidence that the review protocol was real.",
          "Colorado exige al menos tres años. Los registros de recomendaciones automatizadas y de las determinaciones humanas posteriores son la prueba de que el protocolo de revisión fue real.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "CO_SB_26_189", code: "CO-REC-1" },
          { framework: "EU_AI_ACT", code: "Art. 12" },
        ],
      },
      {
        id: "gov_review",
        text: t(
          "When will this assessment be reviewed, and which changes trigger an earlier review?",
          "¿Cuándo se revisará esta evaluación y qué cambios activan una revisión anticipada?",
        ),
        helpText: t(
          "A new model version, a new data source, a new use case, or a handoff to an autonomous agent each change the risk and require a review.",
          "Una nueva versión del modelo, una nueva fuente de datos, un nuevo caso de uso o la delegación en un agente autónomo cambian el riesgo y exigen una revisión.",
        ),
        type: "textarea",
        required: true,
        overlay: null,
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 35(11)" },
          { framework: "EU_AI_ACT", code: "Art. 9(2)" },
        ],
      },
      {
        id: "gov_registration",
        text: t(
          "Record any registration, filing or submission this system requires and its status.",
          "Documenta cualquier registro, presentación o comunicación que exija este sistema y su situación.",
        ),
        type: "textarea",
        required: false,
        overlay: "eu:high-risk",
        satisfies: [{ framework: "EU_AI_ACT", code: "Art. 49" }],
      },
      {
        id: "gov_agency_inventory",
        text: t(
          "Confirm the system is in the agency's AI inventory and record the risk assessment carried out before implementation.",
          "Confirma que el sistema figura en el inventario de IA de la entidad y documenta la evaluación de riesgos realizada antes de su implantación.",
        ),
        type: "textarea",
        required: true,
        overlay: "wa:public-agency",
        satisfies: [
          { framework: "WA_AI_RULES", code: "RCW 43.105 / DATA-04" },
          { framework: "WA_AI_RULES", code: "DATA-04 (risk assessment)" },
        ],
      },
      {
        id: "gov_developer_docs",
        text: t(
          "Record the documentation supplied to deployers: intended uses, training-data categories, known limitations and human-review instructions.",
          "Documenta la información facilitada a los responsables del despliegue: usos previstos, categorías de datos de entrenamiento, limitaciones conocidas e instrucciones de revisión humana.",
        ),
        type: "textarea",
        required: true,
        overlay: "co:developer",
        satisfies: [
          { framework: "CO_SB_26_189", code: "CO-DEV-1" },
          { framework: "EU_AI_ACT", code: "Art. 13" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  {
    id: "agentic",
    title: t("10. Agentic layer", "10. Capa agéntica"),
    intro: t(
      "Asked when the system hands off to an autonomous downstream agent. Every regime above was written for a system that produces an output a person then uses. An agent that acts on the output breaks that assumption, and each artifact needs an addendum.",
      "Se pregunta cuando el sistema delega en un agente autónomo posterior. Todos los regímenes anteriores se escribieron pensando en un sistema que produce un resultado que después usa una persona. Un agente que actúa sobre ese resultado rompe esa premisa, y cada documento necesita un anexo.",
    ),
    questions: [
      {
        id: "agt_handoff",
        text: t(
          "Describe the handoff: which agent receives the output, what actions it can take without a person, and where its authority ends.",
          "Describe la delegación: qué agente recibe el resultado, qué acciones puede realizar sin intervención humana y dónde termina su autoridad.",
        ),
        type: "textarea",
        required: true,
        overlay: "agentic",
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 14(1)" },
          { framework: "EU_GDPR", code: "Art. 22" },
        ],
        feeds: ["assessment", "protocol"],
      },
      {
        id: "agt_still_human",
        text: t(
          "With the agent in the chain, is any decision still meaningfully reviewed by a person before it takes effect? Identify the point at which that stops being true.",
          "Con el agente en la cadena, ¿sigue habiendo una decisión revisada de forma real por una persona antes de que produzca efectos? Identifica el punto en el que eso deja de ser cierto.",
        ),
        helpText: t(
          "This is the question that decides whether the decision has become solely automated for GDPR Art. 22 and whether the California human-involvement prongs still hold.",
          "Esta es la pregunta que determina si la decisión ha pasado a ser únicamente automatizada a efectos del art. 22 del RGPD y si siguen cumpliéndose los elementos de intervención humana de California.",
        ),
        type: "textarea",
        required: true,
        overlay: "agentic",
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 22" },
          { framework: "CA_CCPA_ADMT", code: "§ 7001(e)(1)" },
        ],
        feeds: ["assessment", "protocol"],
      },
      {
        id: "agt_notice_coverage",
        text: t(
          "Does the notice given to people cover decisions the agent initiates on its own, and how is a person told when an agent acted?",
          "¿El aviso facilitado a las personas cubre las decisiones que el agente inicia por su cuenta, y cómo se informa a una persona de que ha actuado un agente?",
        ),
        type: "textarea",
        required: true,
        overlay: "agentic",
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 13(2)(f) / 14(2)(g)" },
          { framework: "CO_SB_26_189", code: "CO-DEP-1" },
          { framework: "EU_AI_ACT", code: "Art. 50(1)" },
        ],
        feeds: ["assessment", "notice"],
      },
      {
        id: "agt_traceability",
        text: t(
          "How is an agent-initiated action traced back to the decision, the model version and the data that produced it?",
          "¿Cómo se rastrea una acción iniciada por el agente hasta la decisión, la versión del modelo y los datos que la produjeron?",
        ),
        type: "textarea",
        required: true,
        overlay: "agentic",
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 12(1)" },
          { framework: "CO_SB_26_189", code: "CO-REC-1" },
        ],
      },
      {
        id: "agt_killswitch",
        text: t(
          "Who can stop the agent, how quickly, and what happens to actions already in flight?",
          "¿Quién puede detener al agente, con qué rapidez y qué ocurre con las acciones ya en curso?",
        ),
        type: "textarea",
        required: true,
        overlay: "agentic",
        satisfies: [
          { framework: "EU_AI_ACT", code: "Art. 14(4)" },
          { framework: "NIST_AI_RMF", code: "MANAGE 4" },
        ],
        feeds: ["assessment", "protocol"],
      },
      {
        id: "agt_downstream_vendors",
        text: t(
          "Which third-party tools, models or services can the agent call, and what governs them?",
          "¿A qué herramientas, modelos o servicios de terceros puede llamar el agente y qué los gobierna?",
        ),
        helpText: t(
          "The vendor supply chain in this product shows the subprocessors behind each vendor; an agent can reach further than the system's own contract does.",
          "La cadena de suministro del proveedor en este producto muestra los subencargados de cada proveedor; un agente puede llegar más lejos que el propio contrato del sistema.",
        ),
        type: "textarea",
        required: true,
        overlay: "agentic",
        satisfies: [
          { framework: "EU_GDPR", code: "Art. 28" },
          { framework: "EU_AI_ACT", code: "Art. 26(1)" },
        ],
      },
    ],
  },
];

/** Flat list of every question, in section order. */
export function allUnifiedQuestions(): { section: UnifiedSection; question: UnifiedQuestion }[] {
  return UNIFIED_ASSESSMENT_SECTIONS.flatMap((section) =>
    section.questions.map((question) => ({ section, question })),
  );
}

export interface SelectedSection {
  id: string;
  title: Localized;
  intro?: Localized;
  questions: (UnifiedQuestion & { reason: "core" | OverlayTag })[];
}

/**
 * The question set for one system: every core question, plus the overlay
 * questions whose tag is in `activeTags`. Sections with no applicable question
 * are dropped, so an EU-only system never sees a Washington section header.
 */
export function selectUnifiedQuestions(activeTags: readonly string[]): SelectedSection[] {
  const active = new Set(activeTags);
  const out: SelectedSection[] = [];
  for (const section of UNIFIED_ASSESSMENT_SECTIONS) {
    const questions = section.questions
      .filter((q) => q.overlay === null || active.has(q.overlay))
      .map((q) => ({ ...q, reason: (q.overlay ?? "core") as "core" | OverlayTag }));
    if (questions.length === 0) continue;
    out.push({ id: section.id, title: section.title, intro: section.intro, questions });
  }
  return out;
}

/** Every distinct overlay tag the template can react to. */
export function unifiedOverlayTags(): OverlayTag[] {
  const tags = new Set<OverlayTag>();
  for (const { question } of allUnifiedQuestions()) {
    if (question.overlay) tags.add(question.overlay);
  }
  return [...tags];
}

/**
 * Requirement codes evidenced by a selected question set, grouped by
 * framework. This is what turns one answered assessment into evidence across
 * several compliance registers.
 */
export function citationsFor(sections: readonly SelectedSection[]): Record<string, string[]> {
  const byFramework: Record<string, Set<string>> = {};
  for (const section of sections) {
    for (const question of section.questions) {
      for (const citation of question.satisfies) {
        (byFramework[citation.framework] ??= new Set()).add(citation.code);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(byFramework).map(([framework, codes]) => [framework, [...codes].sort()]),
  );
}
