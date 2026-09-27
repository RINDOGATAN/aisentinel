// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Version 2 of the five SYSTEM assessment templates.
 *
 * A regulator reading a registration looks for keywords: the Annex III area,
 * the Art. 27 elements, the affected groups, the kind of bias, the oversight
 * measure. Free text hides all of that. v2 turns every question a regulator
 * reads into a structured one — single choice, checklist, scale, yes/no with a
 * conditional follow-up, or a date — while keeping an optional free-text note so
 * nothing that mattered in v1 is lost. Genuinely narrative prompts ("describe
 * the system") stay as text, because you cannot enumerate a description; those
 * still carry the legal vocabulary in their help.
 *
 * The stage-2 help (what it means, an example, the legal reference) is carried
 * INSIDE the question JSON, resolved from src/config/help/question-help.ts where
 * an entry exists and authored here otherwise, so a cloned or exported template
 * keeps its help.
 *
 * Question ids are stable across v1 → v2 where the concept is unchanged; a
 * genuinely new question gets a new id. Answers are stored under these ids in
 * AIAssessment.responses. See src/lib/assessment-answers.ts for the answer
 * shapes and the shared "is this answered?" rule used by both the fill screen
 * and the server completeness gate.
 */

import type { AIAssessmentType } from "@prisma/client";
import { QUESTION_HELP, type QuestionHelp } from "@/config/help/question-help";

export type ContentLocale = "en" | "es";
export type Localized = Record<ContentLocale, string>;

/** The v2 answer input types. `text` is the free-text fallback (a textarea). */
export type V2QuestionType =
  | "single_choice"
  | "multi_choice"
  | "scale"
  | "yes_no"
  | "date"
  | "text";

export interface V2Option {
  /** Stable slug stored as the answer; never shown. */
  value: string;
  /** Shown to the user and used to render the recorded answer. */
  label: Localized;
}

export interface V2Scale {
  min: number;
  max: number;
  minLabel: Localized;
  maxLabel: Localized;
}

export interface V2Question {
  id: string;
  text: Localized;
  type: V2QuestionType;
  /** Defaults to true. */
  required?: boolean;
  /** single_choice / multi_choice. */
  options?: V2Option[];
  /** scale. */
  scale?: V2Scale;
  /** A yes/no question may reveal ONE follow-up when answered a given way. */
  followUp?: { when: "yes" | "no"; question: V2Question };
  /** Every structured question may carry a free-text note for detail. */
  allowNote?: boolean;
  noteLabel?: Localized;
  /** Carried into the JSON; falls back to QUESTION_HELP[id] at build time. */
  help?: QuestionHelp;
}

export interface V2Section {
  id: string;
  title: Localized;
  questions: V2Question[];
}

export interface V2Template {
  /** New row id, e.g. "system-fria-template-v2". */
  id: string;
  /** The v1 row this supersedes, e.g. "system-fria-template". */
  supersedes: string;
  type: AIAssessmentType;
  name: Localized;
  description: Localized;
  frameworkRef?: string;
  version: 2;
  sections: V2Section[];
}

// --- tiny constructors, to keep the content below readable -------------------

const L = (en: string, es: string): Localized => ({ en, es });
const opt = (value: string, en: string, es: string): V2Option => ({ value, label: L(en, es) });
const H = (meaning: Localized, example: Localized, reference?: Localized): QuestionHelp =>
  reference ? { meaning, example, reference } : { meaning, example };

// Reusable option sets in the vocabulary of the law.

/** EU AI Act Annex III high-risk areas. */
const ANNEX_III: V2Option[] = [
  opt("biometrics", "Biometrics", "Biometría"),
  opt("critical_infrastructure", "Critical infrastructure", "Infraestructuras críticas"),
  opt("education", "Education and vocational training", "Educación y formación profesional"),
  opt("employment", "Employment and worker management", "Empleo y gestión de trabajadores"),
  opt("essential_services", "Access to essential services", "Acceso a servicios esenciales"),
  opt("law_enforcement", "Law enforcement", "Aplicación de la ley"),
  opt("migration", "Migration, asylum and border control", "Migración, asilo y control fronterizo"),
  opt("justice", "Administration of justice", "Administración de justicia"),
  opt("none", "None of these", "Ninguna de estas"),
];

/** Groups the EU AI Act and the Charter treat as more exposed to harm. */
const VULNERABLE_GROUPS: V2Option[] = [
  opt("children", "Children", "Menores"),
  opt("elderly", "Older people", "Personas mayores"),
  opt("disability", "People with disabilities", "Personas con discapacidad"),
  opt("ethnic_minorities", "Ethnic or racial minorities", "Minorías étnicas o raciales"),
  opt("low_income", "People on low incomes", "Personas con bajos ingresos"),
  opt("migrants", "Migrants or asylum seekers", "Migrantes o solicitantes de asilo"),
  opt("none", "None identified", "Ninguno identificado"),
];

/** Human-oversight arrangements (EU AI Act Art. 14). */
const OVERSIGHT_MEASURES: V2Option[] = [
  opt("human_in_the_loop", "Human in the loop (a person acts on each output)", "Humano en el bucle (una persona actúa sobre cada resultado)"),
  opt("human_on_the_loop", "Human on the loop (a person monitors and can step in)", "Humano sobre el bucle (una persona supervisa y puede intervenir)"),
  opt("human_in_command", "Human in command (a person sets and can suspend the system)", "Humano al mando (una persona fija y puede suspender el sistema)"),
  opt("override", "Ability to override an output", "Posibilidad de anular un resultado"),
  opt("stop", "Ability to halt the system", "Posibilidad de detener el sistema"),
  opt("training", "Trained overseers", "Supervisores formados"),
];

/** Types of bias in the standard taxonomy (named in the directive). */
const BIAS_TYPES: V2Option[] = [
  opt("historical", "Historical bias", "Sesgo histórico"),
  opt("representation", "Representation bias", "Sesgo de representación"),
  opt("measurement", "Measurement bias", "Sesgo de medición"),
  opt("aggregation", "Aggregation bias", "Sesgo de agregación"),
  opt("evaluation", "Evaluation bias", "Sesgo de evaluación"),
  opt("none", "None identified", "Ninguno identificado"),
];

const RISK_SCALE: V2Scale = {
  min: 1,
  max: 5,
  minLabel: L("No real risk", "Sin riesgo real"),
  maxLabel: L("Severe risk", "Riesgo grave"),
};

// ============================================================================
// FRIA v2 — Fundamental Rights Impact Assessment (EU AI Act Art. 27)
// ============================================================================

const friaV2: V2Template = {
  id: "system-fria-template-v2",
  supersedes: "system-fria-template",
  type: "FRIA",
  name: L("Fundamental Rights Impact Assessment", "Evaluación de impacto sobre los derechos fundamentales"),
  description: L(
    "EU AI Act Article 27 assessment of a high-risk system's impact on fundamental rights, with structured answers a regulator can read.",
    "Evaluación conforme al artículo 27 del Reglamento de IA de la UE del impacto de un sistema de alto riesgo sobre los derechos fundamentales, con respuestas estructuradas que un regulador puede leer.",
  ),
  frameworkRef: "EU AI Act Art. 27",
  version: 2,
  sections: [
    {
      id: "fria1",
      title: L("AI system description", "Descripción del sistema de IA"),
      questions: [
        {
          id: "fria1_1",
          type: "text",
          required: true,
          text: L(
            "Describe the AI system, including its name, version and intended purpose.",
            "Describe el sistema de IA, incluidos su nombre, versión y finalidad prevista.",
          ),
        },
        {
          id: "fria1_2",
          type: "text",
          required: true,
          text: L(
            "Describe the deployer's processes in which the high-risk AI system will be used.",
            "Describe los procesos del responsable del despliegue en los que se usará el sistema de IA de alto riesgo.",
          ),
        },
        {
          id: "fria1_3",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L(
            "What is the frequency of use?",
            "¿Con qué frecuencia se usa?",
          ),
          options: [
            opt("continuous", "Continuous", "Continua"),
            opt("periodic", "Periodic", "Periódica"),
            opt("on_demand", "On demand", "Bajo demanda"),
            opt("one_off", "One-off", "Puntual"),
          ],
        },
        {
          id: "fria1_4",
          type: "text",
          required: true,
          text: L(
            "What is the geographic and institutional scope of deployment?",
            "¿Cuál es el alcance geográfico e institucional del despliegue?",
          ),
        },
        {
          id: "fria1_5",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L(
            "Which EU AI Act Annex III high-risk area(s) does the system fall under?",
            "¿En qué ámbito(s) de alto riesgo del anexo III del Reglamento de IA de la UE se enmarca el sistema?",
          ),
          options: ANNEX_III,
          help: H(
            L(
              "Annex III lists the areas that make a system high-risk. Pick every area the system touches; this is the first keyword a regulator looks for.",
              "El anexo III enumera los ámbitos que hacen que un sistema sea de alto riesgo. Marca cada ámbito al que afecte el sistema; es la primera palabra clave que busca un regulador.",
            ),
            L(
              "\"Employment and worker management\" for a CV-screening tool.",
              "«Empleo y gestión de trabajadores» para una herramienta de cribado de currículums.",
            ),
            L("EU AI Act Annex III", "Reglamento de IA de la UE, anexo III"),
          ),
        },
      ],
    },
    {
      id: "fria2",
      title: L("Categories of affected persons", "Categorías de personas afectadas"),
      questions: [
        {
          id: "fria2_1",
          type: "text",
          required: true,
          text: L(
            "Identify the categories of natural persons and groups likely to be affected.",
            "Identifica las categorías de personas físicas y grupos que probablemente se vean afectados.",
          ),
        },
        {
          id: "fria2_2",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L(
            "Which affected groups are particularly vulnerable?",
            "¿Qué grupos afectados son especialmente vulnerables?",
          ),
          options: VULNERABLE_GROUPS,
        },
        {
          id: "fria2_3",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L(
            "Estimate the number of natural persons likely to be affected.",
            "Estima el número de personas físicas que probablemente se vean afectadas.",
          ),
          options: [
            opt("lt_100", "Fewer than 100", "Menos de 100"),
            opt("100_1000", "100 to 1,000", "De 100 a 1.000"),
            opt("1000_10000", "1,000 to 10,000", "De 1.000 a 10.000"),
            opt("gt_10000", "More than 10,000", "Más de 10.000"),
          ],
        },
        {
          id: "fria2_4",
          type: "yes_no",
          required: true,
          text: L(
            "Were affected persons or their representatives consulted?",
            "¿Se consultó a las personas afectadas o a sus representantes?",
          ),
          followUp: {
            when: "yes",
            question: {
              id: "fria2_4_detail",
              type: "text",
              required: true,
              text: L(
                "Describe how they were consulted.",
                "Describe cómo se les consultó.",
              ),
            },
          },
        },
      ],
    },
    {
      id: "fria3",
      title: L("Risks to fundamental rights", "Riesgos para los derechos fundamentales"),
      questions: [
        {
          id: "fria3_1",
          type: "scale",
          required: true,
          allowNote: true,
          scale: RISK_SCALE,
          text: L(
            "Risk to the right to non-discrimination (Art. 21 EU Charter).",
            "Riesgo para el derecho a la no discriminación (art. 21 de la Carta de la UE).",
          ),
        },
        {
          id: "fria3_2",
          type: "scale",
          required: true,
          allowNote: true,
          scale: RISK_SCALE,
          text: L(
            "Risk to privacy and data protection (Arts. 7-8 EU Charter).",
            "Riesgo para la privacidad y la protección de datos (arts. 7 y 8 de la Carta de la UE).",
          ),
        },
        {
          id: "fria3_3",
          type: "scale",
          required: true,
          allowNote: true,
          scale: RISK_SCALE,
          text: L(
            "Risk to freedom of expression and information (Art. 11 EU Charter).",
            "Riesgo para la libertad de expresión e información (art. 11 de la Carta de la UE).",
          ),
        },
        {
          id: "fria3_4",
          type: "scale",
          required: true,
          allowNote: true,
          scale: RISK_SCALE,
          text: L(
            "Risk to human dignity (Art. 1 EU Charter).",
            "Riesgo para la dignidad humana (art. 1 de la Carta de la UE).",
          ),
        },
        {
          id: "fria3_5",
          type: "scale",
          required: true,
          allowNote: true,
          scale: RISK_SCALE,
          text: L(
            "Risk to an effective remedy and fair trial (Art. 47 EU Charter).",
            "Riesgo para la tutela judicial efectiva y a un juicio justo (art. 47 de la Carta de la UE).",
          ),
        },
        {
          id: "fria3_6",
          type: "multi_choice",
          required: false,
          allowNote: true,
          text: L(
            "Which other fundamental rights are at risk?",
            "¿Qué otros derechos fundamentales están en riesgo?",
          ),
          options: [
            opt("education", "Right to education (Art. 14)", "Derecho a la educación (art. 14)"),
            opt("work", "Right to work (Art. 15)", "Derecho a trabajar (art. 15)"),
            opt("child", "Rights of the child (Art. 24)", "Derechos del menor (art. 24)"),
            opt("consumer", "Consumer protection (Art. 38)", "Protección de los consumidores (art. 38)"),
            opt("none", "None", "Ninguno"),
          ],
        },
      ],
    },
    {
      id: "fria4",
      title: L("Human oversight and safeguards", "Supervisión humana y salvaguardas"),
      questions: [
        {
          id: "fria4_1",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L(
            "Which human oversight measures are in place?",
            "¿Qué medidas de supervisión humana existen?",
          ),
          options: OVERSIGHT_MEASURES,
        },
        {
          id: "fria4_2",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L(
            "Which technical safeguards protect fundamental rights?",
            "¿Qué salvaguardas técnicas protegen los derechos fundamentales?",
          ),
          options: [
            opt("bias_detection", "Bias detection", "Detección de sesgos"),
            opt("fairness_constraints", "Fairness constraints", "Restricciones de equidad"),
            opt("explainability", "Explainability of outputs", "Explicabilidad de los resultados"),
            opt("accuracy_monitoring", "Accuracy monitoring", "Vigilancia de la exactitud"),
            opt("logging", "Logging and traceability", "Registro y trazabilidad"),
            opt("access_control", "Access control", "Control de acceso"),
          ],
        },
        {
          id: "fria4_3",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L(
            "Which organisational measures mitigate the identified risks?",
            "¿Qué medidas organizativas mitigan los riesgos identificados?",
          ),
          options: [
            opt("training", "Staff training", "Formación del personal"),
            opt("oversight_committee", "Oversight committee", "Comité de supervisión"),
            opt("audits", "Regular audits", "Auditorías periódicas"),
            opt("escalation", "Escalation procedure", "Procedimiento de escalado"),
            opt("incident_response", "Incident response plan", "Plan de respuesta a incidentes"),
          ],
        },
        {
          id: "fria4_4",
          type: "yes_no",
          required: true,
          text: L(
            "Can affected persons contest decisions or seek redress?",
            "¿Pueden las personas afectadas impugnar las decisiones o solicitar reparación?",
          ),
          followUp: {
            when: "yes",
            question: {
              id: "fria4_4_detail",
              type: "text",
              required: true,
              text: L(
                "Describe the complaint, appeal or human-review mechanism.",
                "Describe el mecanismo de reclamación, recurso o revisión humana.",
              ),
            },
          },
        },
      ],
    },
    {
      id: "fria5",
      title: L("Assessment outcome and notification", "Resultado de la evaluación y notificación"),
      questions: [
        {
          id: "fria5_1",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L(
            "What is the overall assessment of impact on fundamental rights?",
            "¿Cuál es la valoración general del impacto sobre los derechos fundamentales?",
          ),
          options: [
            opt("acceptable", "Acceptable", "Aceptable"),
            opt("acceptable_conditions", "Acceptable with conditions", "Aceptable con condiciones"),
            opt("not_acceptable", "Not acceptable", "No aceptable"),
          ],
        },
        {
          id: "fria5_2",
          type: "text",
          required: true,
          text: L(
            "What residual risks remain after mitigation measures?",
            "¿Qué riesgos residuales quedan tras las medidas de mitigación?",
          ),
        },
        {
          id: "fria5_3",
          type: "text",
          required: false,
          text: L(
            "What additional measures are recommended?",
            "¿Qué medidas adicionales se recomiendan?",
          ),
        },
        {
          id: "fria5_4",
          type: "yes_no",
          required: true,
          text: L(
            "Has the market surveillance authority been notified (Art. 27(3))?",
            "¿Se ha notificado a la autoridad de vigilancia del mercado (art. 27.3)?",
          ),
          followUp: {
            when: "yes",
            question: {
              id: "fria5_4_date",
              type: "date",
              required: true,
              text: L("Date of notification.", "Fecha de la notificación."),
            },
          },
        },
      ],
    },
  ],
};

// ============================================================================
// AI RISK v2 — NIST AI RMF / ISO 42001
// ============================================================================

const aiRiskV2: V2Template = {
  id: "system-ai-risk-template-v2",
  supersedes: "system-ai-risk-template",
  type: "AI_RISK",
  name: L("AI Risk Assessment", "Evaluación de riesgos de IA"),
  description: L(
    "Structured AI risk assessment covering technical, ethical and operational risks and their mitigations, aligned with NIST AI RMF and ISO 42001.",
    "Evaluación estructurada de riesgos de IA que cubre riesgos técnicos, éticos y operativos y sus mitigaciones, alineada con el NIST AI RMF y la norma ISO 42001.",
  ),
  frameworkRef: "NIST AI RMF / ISO 42001",
  version: 2,
  sections: [
    {
      id: "air1",
      title: L("System overview and context", "Descripción y contexto del sistema"),
      questions: [
        {
          id: "air1_1",
          type: "text",
          required: true,
          text: L(
            "Describe the AI system, its purpose and key capabilities.",
            "Describe el sistema de IA, su finalidad y sus capacidades principales.",
          ),
        },
        {
          id: "air1_2",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("What is the risk classification of this system?", "¿Cuál es la clasificación de riesgo de este sistema?"),
          options: [
            opt("minimal", "Minimal", "Mínimo"),
            opt("limited", "Limited", "Limitado"),
            opt("high", "High", "Alto"),
            opt("unacceptable", "Unacceptable", "Inaceptable"),
          ],
        },
        {
          id: "air1_3",
          type: "text",
          required: true,
          text: L("Who are the intended users and affected stakeholders?", "¿Quiénes son los usuarios previstos y las partes afectadas?"),
        },
      ],
    },
    {
      id: "air2",
      title: L("Technical risks", "Riesgos técnicos"),
      questions: [
        {
          id: "air2_1",
          type: "scale",
          required: true,
          allowNote: true,
          scale: RISK_SCALE,
          text: L("Risk from model accuracy limitations or errors.", "Riesgo por limitaciones o errores en la exactitud del modelo."),
        },
        {
          id: "air2_2",
          type: "scale",
          required: true,
          allowNote: true,
          scale: RISK_SCALE,
          text: L("Risk from model drift or performance degradation over time.", "Riesgo por deriva del modelo o degradación del rendimiento con el tiempo."),
        },
        {
          id: "air2_3",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which cybersecurity risks apply?", "¿Qué riesgos de ciberseguridad aplican?"),
          options: [
            opt("adversarial", "Adversarial attacks", "Ataques adversarios"),
            opt("prompt_injection", "Prompt injection", "Inyección de instrucciones"),
            opt("data_poisoning", "Data poisoning", "Envenenamiento de datos"),
            opt("model_theft", "Model theft", "Robo del modelo"),
            opt("inference", "Inference attacks", "Ataques de inferencia"),
            opt("none", "None identified", "Ninguno identificado"),
          ],
        },
      ],
    },
    {
      id: "air3",
      title: L("Ethical and fairness risks", "Riesgos éticos y de equidad"),
      questions: [
        {
          id: "air3_1",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which bias or discrimination risks have been identified?", "¿Qué riesgos de sesgo o discriminación se han identificado?"),
          options: BIAS_TYPES,
          help: H(
            L(
              "Name the kinds of bias present, not just \"there is bias\". The taxonomy tells a reviewer where to look.",
              "Nombra los tipos de sesgo presentes, no solo «hay sesgo». La taxonomía indica al revisor dónde mirar.",
            ),
            L(
              "\"Historical bias: the training data reflects past hiring that favoured men.\"",
              "«Sesgo histórico: los datos de entrenamiento reflejan contrataciones pasadas que favorecían a los hombres.»",
            ),
          ),
        },
        {
          id: "air3_2",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("How explainable are the system's decisions?", "¿Cómo de explicables son las decisiones del sistema?"),
          options: [
            opt("fully", "Fully explainable", "Totalmente explicables"),
            opt("partially", "Partially explainable", "Parcialmente explicables"),
            opt("limited", "Limited explainability", "Explicabilidad limitada"),
            opt("black_box", "Black box", "Caja negra"),
          ],
        },
        {
          id: "air3_3",
          type: "scale",
          required: true,
          allowNote: true,
          scale: RISK_SCALE,
          text: L("Risk to individual autonomy or human agency.", "Riesgo para la autonomía individual o la agencia humana."),
        },
      ],
    },
    {
      id: "air4",
      title: L("Operational risks", "Riesgos operativos"),
      questions: [
        {
          id: "air4_1",
          type: "text",
          required: true,
          text: L("What happens if the system becomes unavailable or fails?", "¿Qué ocurre si el sistema deja de estar disponible o falla?"),
        },
        {
          id: "air4_2",
          type: "scale",
          required: true,
          allowNote: true,
          scale: RISK_SCALE,
          text: L("Data quality and data governance risk.", "Riesgo de calidad y gobernanza de los datos."),
        },
        {
          id: "air4_3",
          type: "multi_choice",
          required: false,
          allowNote: true,
          text: L("Which third-party dependency risks apply?", "¿Qué riesgos de dependencia de terceros aplican?"),
          options: [
            opt("vendor_lock_in", "Vendor lock-in", "Dependencia de un proveedor"),
            opt("api_changes", "API changes", "Cambios en la API"),
            opt("model_deprecation", "Model deprecation", "Retirada del modelo"),
            opt("supply_chain", "Supply chain risk", "Riesgo de la cadena de suministro"),
            opt("none", "None identified", "Ninguno identificado"),
          ],
        },
      ],
    },
    {
      id: "air5",
      title: L("Mitigation measures", "Medidas de mitigación"),
      questions: [
        {
          id: "air5_1",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which technical safeguards are in place or planned?", "¿Qué salvaguardas técnicas existen o están previstas?"),
          options: [
            opt("monitoring", "Monitoring and alerting", "Vigilancia y alertas"),
            opt("testing", "Testing pipelines", "Cadenas de pruebas"),
            opt("bias_detection", "Bias detection", "Detección de sesgos"),
            opt("adversarial_testing", "Adversarial testing", "Pruebas adversarias"),
            opt("access_control", "Access control", "Control de acceso"),
          ],
        },
        {
          id: "air5_2",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which organisational safeguards are in place or planned?", "¿Qué salvaguardas organizativas existen o están previstas?"),
          options: [
            opt("training", "Training", "Formación"),
            opt("oversight_committee", "Oversight committee", "Comité de supervisión"),
            opt("incident_response", "Incident response plan", "Plan de respuesta a incidentes"),
            opt("audits", "Regular audits", "Auditorías periódicas"),
          ],
        },
        {
          id: "air5_3",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("What human oversight arrangement is in place?", "¿Qué mecanismo de supervisión humana existe?"),
          options: [
            opt("human_in_the_loop", "Human in the loop", "Humano en el bucle"),
            opt("human_on_the_loop", "Human on the loop", "Humano sobre el bucle"),
            opt("human_in_command", "Human in command", "Humano al mando"),
            opt("none", "None", "Ninguno"),
          ],
        },
      ],
    },
    {
      id: "air6",
      title: L("Risk summary and recommendations", "Resumen de riesgos y recomendaciones"),
      questions: [
        {
          id: "air6_1",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("What is the overall residual risk after mitigation?", "¿Cuál es el riesgo residual global tras la mitigación?"),
          options: [
            opt("low", "Low", "Bajo"),
            opt("medium", "Medium", "Medio"),
            opt("high", "High", "Alto"),
            opt("critical", "Critical", "Crítico"),
          ],
        },
        {
          id: "air6_2",
          type: "yes_no",
          required: true,
          text: L("Is the residual risk acceptable?", "¿Es aceptable el riesgo residual?"),
          followUp: {
            when: "no",
            question: {
              id: "air6_2_detail",
              type: "text",
              required: true,
              text: L("What must change for it to be acceptable?", "¿Qué debe cambiar para que sea aceptable?"),
            },
          },
        },
        {
          id: "air6_3",
          type: "text",
          required: false,
          text: L("What additional actions or follow-up reviews are recommended?", "¿Qué acciones adicionales o revisiones de seguimiento se recomiendan?"),
        },
      ],
    },
  ],
};

// ============================================================================
// CUSTOM v2 — flexible review
// ============================================================================

const customV2: V2Template = {
  id: "system-custom-template-v2",
  supersedes: "system-custom-template",
  type: "CUSTOM",
  name: L("Custom Assessment", "Evaluación personalizada"),
  description: L(
    "A flexible assessment for custom AI governance reviews, with structured risk answers and room for a written rationale.",
    "Una evaluación flexible para revisiones personalizadas de gobernanza de IA, con respuestas de riesgo estructuradas y espacio para una justificación escrita.",
  ),
  version: 2,
  sections: [
    {
      id: "custom1",
      title: L("Overview", "Descripción"),
      questions: [
        {
          id: "custom1_1",
          type: "text",
          required: true,
          text: L("What is the purpose of this assessment?", "¿Cuál es el propósito de esta evaluación?"),
        },
        {
          id: "custom1_2",
          type: "text",
          required: true,
          text: L("What is the scope of this assessment?", "¿Cuál es el alcance de esta evaluación?"),
        },
      ],
    },
    {
      id: "custom2",
      title: L("Risk evaluation", "Evaluación del riesgo"),
      questions: [
        {
          id: "custom2_1",
          type: "text",
          required: true,
          text: L("What are the key risks identified?", "¿Cuáles son los principales riesgos identificados?"),
        },
        {
          id: "custom2_2",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("What is the overall risk level?", "¿Cuál es el nivel de riesgo global?"),
          options: [
            opt("low", "Low", "Bajo"),
            opt("medium", "Medium", "Medio"),
            opt("high", "High", "Alto"),
            opt("critical", "Critical", "Crítico"),
          ],
        },
      ],
    },
    {
      id: "custom3",
      title: L("Mitigations and recommendations", "Mitigaciones y recomendaciones"),
      questions: [
        {
          id: "custom3_1",
          type: "text",
          required: true,
          text: L("What mitigations are in place or recommended?", "¿Qué mitigaciones existen o se recomiendan?"),
        },
        {
          id: "custom3_2",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("Is the residual risk acceptable?", "¿Es aceptable el riesgo residual?"),
          options: [
            opt("fully", "Yes, fully acceptable", "Sí, plenamente aceptable"),
            opt("conditions", "Acceptable with conditions", "Aceptable con condiciones"),
            opt("review", "Needs further review", "Necesita más revisión"),
            opt("not_acceptable", "Not acceptable", "No aceptable"),
          ],
        },
      ],
    },
  ],
};

// ============================================================================
// CONFORMITY v2 — EU AI Act Art. 43, Annex VI / Annex VII
// ============================================================================

const conformityV2: V2Template = {
  id: "system-conformity-template-v2",
  supersedes: "system-conformity-template",
  type: "CONFORMITY",
  name: L("Conformity Assessment", "Evaluación de la conformidad"),
  description: L(
    "EU AI Act Article 43 conformity assessment for high-risk systems: quality management, technical documentation, risk management, transparency and the declaration, with structured answers.",
    "Evaluación de la conformidad conforme al artículo 43 del Reglamento de IA de la UE para sistemas de alto riesgo: gestión de la calidad, documentación técnica, gestión de riesgos, transparencia y la declaración, con respuestas estructuradas.",
  ),
  frameworkRef: "EU AI Act Art. 43, Annex VI, Annex VII",
  version: 2,
  sections: [
    {
      id: "conf1",
      title: L("System identification", "Identificación del sistema"),
      questions: [
        {
          id: "conf1_1",
          type: "text",
          required: true,
          text: L("What is the name, version and unique identifier of the system?", "¿Cuál es el nombre, la versión y el identificador único del sistema?"),
        },
        {
          id: "conf1_2",
          type: "text",
          required: true,
          text: L("Who is the provider and what are their contact details?", "¿Quién es el proveedor y cuáles son sus datos de contacto?"),
        },
        {
          id: "conf1_3",
          type: "text",
          required: true,
          text: L("What is the intended purpose of the system?", "¿Cuál es la finalidad prevista del sistema?"),
        },
        {
          id: "conf1_4",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("What is the risk classification under the EU AI Act?", "¿Cuál es la clasificación de riesgo conforme al Reglamento de IA de la UE?"),
          options: [
            opt("annex_iii", "High-risk (Annex III)", "Alto riesgo (anexo III)"),
            opt("union_harmonisation", "High-risk (Union harmonisation legislation)", "Alto riesgo (legislación de armonización de la Unión)"),
            opt("limited", "Limited risk", "Riesgo limitado"),
            opt("minimal", "Minimal risk", "Riesgo mínimo"),
          ],
        },
        {
          id: "conf1_5",
          type: "single_choice",
          required: false,
          allowNote: true,
          text: L("Which Annex III category does the system fall under?", "¿En qué categoría del anexo III se enmarca el sistema?"),
          options: ANNEX_III,
        },
      ],
    },
    {
      id: "conf2",
      title: L("Quality management system", "Sistema de gestión de la calidad"),
      questions: [
        {
          id: "conf2_1",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("Is there a documented Quality Management System covering the system?", "¿Existe un sistema de gestión de la calidad documentado que cubra el sistema?"),
          options: [
            opt("full", "Yes, fully documented", "Sí, plenamente documentado"),
            opt("partial", "Partially documented", "Parcialmente documentado"),
            opt("in_progress", "Under development", "En desarrollo"),
            opt("none", "No", "No"),
          ],
        },
        {
          id: "conf2_2",
          type: "text",
          required: true,
          text: L("Describe the design and development procedures within the QMS.", "Describe los procedimientos de diseño y desarrollo dentro del SGC."),
        },
        {
          id: "conf2_3",
          type: "text",
          required: true,
          text: L("Describe the testing and validation methodology.", "Describe la metodología de pruebas y validación."),
        },
        {
          id: "conf2_4",
          type: "text",
          required: true,
          text: L("Describe the post-market monitoring plan.", "Describe el plan de seguimiento poscomercialización."),
        },
      ],
    },
    {
      id: "conf3",
      title: L("Technical documentation", "Documentación técnica"),
      questions: [
        {
          id: "conf3_1",
          type: "text",
          required: true,
          text: L("Describe the system architecture and key components.", "Describe la arquitectura del sistema y sus componentes principales."),
        },
        {
          id: "conf3_2",
          type: "text",
          required: true,
          text: L("Describe the training data: source, scope and characteristics.", "Describe los datos de entrenamiento: origen, alcance y características."),
        },
        {
          id: "conf3_3",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which data governance measures are in place (Art. 10)?", "¿Qué medidas de gobernanza de datos existen (art. 10)?"),
          options: [
            opt("quality_controls", "Data quality controls", "Controles de calidad de los datos"),
            opt("bias_examination", "Bias examination", "Examen de sesgos"),
            opt("relevance", "Relevance assessment", "Evaluación de la pertinencia"),
            opt("gdpr", "GDPR compliance measures", "Medidas de cumplimiento del RGPD"),
            opt("none", "None yet", "Todavía ninguna"),
          ],
        },
        {
          id: "conf3_4",
          type: "text",
          required: true,
          text: L("What are the documented performance metrics and benchmarks?", "¿Cuáles son las métricas de rendimiento y los valores de referencia documentados?"),
        },
      ],
    },
    {
      id: "conf4",
      title: L("Risk management", "Gestión de riesgos"),
      questions: [
        {
          id: "conf4_1",
          type: "text",
          required: true,
          text: L("Describe the risk identification and analysis methodology (Art. 9).", "Describe la metodología de identificación y análisis de riesgos (art. 9)."),
        },
        {
          id: "conf4_2",
          type: "text",
          required: true,
          text: L("List the known and foreseeable risks and their mitigations.", "Enumera los riesgos conocidos y previsibles y sus mitigaciones."),
        },
        {
          id: "conf4_3",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("Is the residual risk acceptable after all mitigations?", "¿Es aceptable el riesgo residual tras todas las mitigaciones?"),
          options: [
            opt("fully", "Yes, fully acceptable", "Sí, plenamente aceptable"),
            opt("conditions", "Acceptable with conditions", "Aceptable con condiciones"),
            opt("further", "Requires further mitigation", "Requiere más mitigación"),
            opt("not_acceptable", "Not acceptable", "No aceptable"),
          ],
        },
        {
          id: "conf4_4",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("Has the system been tested against relevant harmonised standards?", "¿Se ha probado el sistema frente a las normas armonizadas pertinentes?"),
          options: [
            opt("full", "Yes, fully tested", "Sí, probado por completo"),
            opt("partial", "Partially tested", "Probado parcialmente"),
            opt("planned", "Planned", "Previsto"),
            opt("none", "No applicable standards identified", "No se han identificado normas aplicables"),
          ],
        },
      ],
    },
    {
      id: "conf5",
      title: L("Transparency and human oversight", "Transparencia y supervisión humana"),
      questions: [
        {
          id: "conf5_1",
          type: "text",
          required: true,
          text: L("Describe the instructions for use provided to deployers (Art. 13).", "Describe las instrucciones de uso facilitadas a los responsables del despliegue (art. 13)."),
        },
        {
          id: "conf5_2",
          type: "yes_no",
          required: true,
          text: L("Are users informed they are interacting with an AI system?", "¿Se informa a los usuarios de que interactúan con un sistema de IA?"),
          followUp: {
            when: "yes",
            question: {
              id: "conf5_2_detail",
              type: "text",
              required: true,
              text: L("How are they informed, and how are outputs made interpretable?", "¿Cómo se les informa y cómo se hacen interpretables los resultados?"),
            },
          },
        },
        {
          id: "conf5_3",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("Which human oversight mechanism is implemented?", "¿Qué mecanismo de supervisión humana se ha implantado?"),
          options: [
            opt("human_in_the_loop", "Human in the loop", "Humano en el bucle"),
            opt("human_on_the_loop", "Human on the loop", "Humano sobre el bucle"),
            opt("human_in_command", "Human in command", "Humano al mando"),
            opt("multiple", "Multiple mechanisms", "Varios mecanismos"),
            opt("none", "None", "Ninguno"),
          ],
        },
        {
          id: "conf5_4",
          type: "text",
          required: true,
          text: L("Describe the logging capabilities of the system (Art. 12).", "Describe las capacidades de registro del sistema (art. 12)."),
        },
      ],
    },
    {
      id: "conf6",
      title: L("Conformity declaration", "Declaración de conformidad"),
      questions: [
        {
          id: "conf6_1",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("What is the overall conformity conclusion?", "¿Cuál es la conclusión general de conformidad?"),
          options: [
            opt("conforms", "Conforms to all applicable requirements", "Conforme con todos los requisitos aplicables"),
            opt("minor", "Conforms with minor observations", "Conforme con observaciones menores"),
            opt("not_conform", "Does not conform — corrective actions required", "No conforme: se requieren acciones correctivas"),
          ],
        },
        {
          id: "conf6_2",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("Which conformity assessment pathway is being followed?", "¿Qué vía de evaluación de la conformidad se sigue?"),
          options: [
            opt("annex_vi", "Annex VI — internal control (self-assessment)", "Anexo VI: control interno (autoevaluación)"),
            opt("annex_vii", "Annex VII — assessment by notified body", "Anexo VII: evaluación por organismo notificado"),
          ],
          help: H(
            L(
              "Annex VI is self-assessment; Annex VII involves a notified body. Which one applies depends on the system and the harmonised standards used.",
              "El anexo VI es autoevaluación; el anexo VII implica a un organismo notificado. Cuál aplica depende del sistema y de las normas armonizadas utilizadas.",
            ),
            L(
              "\"Annex VI — internal control, since harmonised standards are applied in full.\"",
              "«Anexo VI: control interno, ya que se aplican íntegramente las normas armonizadas.»",
            ),
            L("EU AI Act Art. 43", "Reglamento de IA de la UE, art. 43"),
          ),
        },
        {
          id: "conf6_3",
          type: "text",
          required: false,
          text: L("If Annex VII applies, give the notified body details.", "Si aplica el anexo VII, indica los datos del organismo notificado."),
        },
        {
          id: "conf6_4",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("Is the EU Declaration of Conformity drafted and CE marking ready?", "¿Está redactada la declaración UE de conformidad y lista el marcado CE?"),
          options: [
            opt("ready", "Yes, declaration drafted and CE marking ready", "Sí, declaración redactada y marcado CE listo"),
            opt("in_progress", "Declaration in progress", "Declaración en curso"),
            opt("not_started", "Not yet started", "Todavía no iniciada"),
          ],
        },
      ],
    },
  ],
};

// ============================================================================
// BIAS & FAIRNESS v2 — EU AI Act Art. 10 / NIST AI RMF
// ============================================================================

const biasFairnessV2: V2Template = {
  id: "system-bias-fairness-template-v2",
  supersedes: "system-bias-fairness-template",
  type: "BIAS_FAIRNESS",
  name: L("Bias & Fairness Assessment", "Evaluación de sesgo y equidad"),
  description: L(
    "Structured bias and fairness assessment covering data composition, fairness metrics, disaggregated testing and mitigation, aligned with EU AI Act Article 10 and NIST AI RMF.",
    "Evaluación estructurada de sesgo y equidad que cubre la composición de los datos, las métricas de equidad, las pruebas desagregadas y la mitigación, alineada con el artículo 10 del Reglamento de IA de la UE y el NIST AI RMF.",
  ),
  frameworkRef: "EU AI Act Art. 10 / NIST AI RMF",
  version: 2,
  sections: [
    {
      id: "bf1",
      title: L("Assessment scope", "Alcance de la evaluación"),
      questions: [
        {
          id: "bf1_1",
          type: "text",
          required: true,
          text: L("What system is being assessed, and which version?", "¿Qué sistema se evalúa y en qué versión?"),
        },
        {
          id: "bf1_2",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("What is the decision domain of this system?", "¿Cuál es el ámbito de decisión de este sistema?"),
          options: [
            opt("hiring", "Hiring and recruitment", "Contratación y selección"),
            opt("credit", "Credit and lending", "Crédito y préstamos"),
            opt("healthcare", "Healthcare", "Sanidad"),
            opt("criminal_justice", "Criminal justice", "Justicia penal"),
            opt("education", "Education", "Educación"),
            opt("insurance", "Insurance", "Seguros"),
            opt("social_services", "Social services", "Servicios sociales"),
            opt("content_moderation", "Content moderation", "Moderación de contenidos"),
            opt("other", "Other", "Otro"),
          ],
        },
        {
          id: "bf1_3",
          type: "text",
          required: true,
          text: L("Describe the affected populations and stakeholders.", "Describe las poblaciones afectadas y las partes interesadas."),
        },
        {
          id: "bf1_4",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which protected characteristics are considered?", "¿Qué características protegidas se consideran?"),
          options: [
            opt("race", "Race or ethnicity", "Raza u origen étnico"),
            opt("gender", "Gender", "Género"),
            opt("age", "Age", "Edad"),
            opt("disability", "Disability", "Discapacidad"),
            opt("religion", "Religion", "Religión"),
            opt("sexual_orientation", "Sexual orientation", "Orientación sexual"),
            opt("nationality", "Nationality", "Nacionalidad"),
            opt("socioeconomic", "Socioeconomic status", "Situación socioeconómica"),
          ],
        },
      ],
    },
    {
      id: "bf2",
      title: L("Data analysis", "Análisis de los datos"),
      questions: [
        {
          id: "bf2_1",
          type: "text",
          required: true,
          text: L("Describe the composition of the training data.", "Describe la composición de los datos de entrenamiento."),
        },
        {
          id: "bf2_2",
          type: "text",
          required: true,
          text: L("What is the demographic representation in the training data?", "¿Cuál es la representación demográfica en los datos de entrenamiento?"),
        },
        {
          id: "bf2_3",
          type: "text",
          required: true,
          text: L("Describe the data labelling methodology and quality controls.", "Describe la metodología de etiquetado de datos y los controles de calidad."),
        },
        {
          id: "bf2_4",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which types of bias have you identified in the source data?", "¿Qué tipos de sesgo has identificado en los datos de origen?"),
          options: BIAS_TYPES,
          help: H(
            L(
              "Use the standard taxonomy so the finding is precise: historical, representation, measurement, aggregation or evaluation bias.",
              "Usa la taxonomía estándar para que el hallazgo sea preciso: sesgo histórico, de representación, de medición, de agregación o de evaluación.",
            ),
            L(
              "\"Representation bias: older applicants are under-represented in the data.\"",
              "«Sesgo de representación: los candidatos de mayor edad están infrarrepresentados en los datos.»",
            ),
            L("EU AI Act Art. 10", "Reglamento de IA de la UE, art. 10"),
          ),
        },
      ],
    },
    {
      id: "bf3",
      title: L("Fairness metrics", "Métricas de equidad"),
      questions: [
        {
          id: "bf3_1",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which fairness metrics have been selected?", "¿Qué métricas de equidad se han seleccionado?"),
          options: [
            opt("demographic_parity", "Demographic parity", "Paridad demográfica"),
            opt("equalized_odds", "Equalized odds", "Igualdad de probabilidades"),
            opt("predictive_parity", "Predictive parity", "Paridad predictiva"),
            opt("calibration", "Calibration", "Calibración"),
            opt("individual_fairness", "Individual fairness", "Equidad individual"),
          ],
          help: H(
            L(
              "Fairness has several competing definitions; naming the metrics makes the trade-off explicit.",
              "La equidad tiene varias definiciones que compiten entre sí; nombrar las métricas hace explícito el equilibrio.",
            ),
            L(
              "\"Equalized odds and calibration, because both error types matter here.\"",
              "«Igualdad de probabilidades y calibración, porque aquí importan ambos tipos de error.»",
            ),
          ),
        },
        {
          id: "bf3_2",
          type: "text",
          required: true,
          text: L("Why are these metrics appropriate for the use case?", "¿Por qué son adecuadas estas métricas para este caso de uso?"),
        },
        {
          id: "bf3_3",
          type: "text",
          required: true,
          text: L("What is the disparate impact ratio across key groups?", "¿Cuál es el ratio de impacto desigual entre los grupos principales?"),
          help: H(
            L(
              "The ratio of positive-outcome rates between a protected group and the reference group. Below 0.8 typically signals disparate impact.",
              "El cociente entre las tasas de resultado positivo de un grupo protegido y el grupo de referencia. Por debajo de 0,8 suele indicar impacto desigual.",
            ),
            L(
              "\"0.72 for women vs men, below the 0.8 threshold.\"",
              "«0,72 para mujeres frente a hombres, por debajo del umbral de 0,8.»",
            ),
          ),
        },
        {
          id: "bf3_4",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("Are fairness metric thresholds meeting acceptable standards?", "¿Cumplen los umbrales de las métricas de equidad los estándares aceptables?"),
          options: [
            opt("all", "All metrics within acceptable range", "Todas las métricas dentro del rango aceptable"),
            opt("most", "Most acceptable, minor gaps", "La mayoría aceptables, con brechas menores"),
            opt("significant", "Significant gaps identified", "Se han identificado brechas significativas"),
            opt("not_computed", "Metrics not yet computed", "Métricas aún no calculadas"),
          ],
        },
      ],
    },
    {
      id: "bf4",
      title: L("Bias testing results", "Resultados de las pruebas de sesgo"),
      questions: [
        {
          id: "bf4_1",
          type: "text",
          required: true,
          text: L("Describe the bias testing methodology used.", "Describe la metodología de pruebas de sesgo utilizada."),
        },
        {
          id: "bf4_2",
          type: "text",
          required: true,
          text: L("Report the disaggregated performance metrics across groups.", "Indica las métricas de rendimiento desagregadas por grupos."),
        },
        {
          id: "bf4_3",
          type: "text",
          required: true,
          text: L("What disparities were identified between groups?", "¿Qué disparidades se identificaron entre los grupos?"),
        },
        {
          id: "bf4_4",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("Has intersectional analysis been performed?", "¿Se ha realizado un análisis interseccional?"),
          options: [
            opt("full", "Yes, full intersectional analysis", "Sí, análisis interseccional completo"),
            opt("partial", "Partial intersectional analysis", "Análisis interseccional parcial"),
            opt("planned", "Planned but not yet done", "Previsto pero aún no realizado"),
            opt("none", "No", "No"),
          ],
          help: H(
            L(
              "Intersectional analysis examines combinations of characteristics (e.g. race and gender together), where harm often concentrates.",
              "El análisis interseccional examina combinaciones de características (por ejemplo, raza y género juntas), donde suele concentrarse el perjuicio.",
            ),
            L(
              "\"Full: tested race, gender and their combination.\"",
              "«Completo: se probaron raza, género y su combinación.»",
            ),
          ),
        },
      ],
    },
    {
      id: "bf5",
      title: L("Mitigation measures", "Medidas de mitigación"),
      questions: [
        {
          id: "bf5_1",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which pre-processing mitigations have been applied to the data?", "¿Qué mitigaciones de preprocesamiento se han aplicado a los datos?"),
          options: [
            opt("resampling", "Resampling", "Remuestreo"),
            opt("reweighting", "Reweighting", "Reponderación"),
            opt("augmentation", "Data augmentation", "Aumento de datos"),
            opt("proxy_removal", "Removal of proxy variables", "Eliminación de variables indirectas"),
            opt("synthetic", "Synthetic data generation", "Generación de datos sintéticos"),
            opt("none", "None", "Ninguna"),
          ],
        },
        {
          id: "bf5_2",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which in-processing fairness techniques are used?", "¿Qué técnicas de equidad durante el procesamiento se utilizan?"),
          options: [
            opt("adversarial_debiasing", "Adversarial debiasing", "Eliminación de sesgo adversaria"),
            opt("regularisation", "Fairness-aware regularisation", "Regularización sensible a la equidad"),
            opt("constrained_optimisation", "Constrained optimisation", "Optimización con restricciones"),
            opt("none", "None", "Ninguna"),
          ],
        },
        {
          id: "bf5_3",
          type: "multi_choice",
          required: true,
          allowNote: true,
          text: L("Which post-processing adjustments have been applied?", "¿Qué ajustes de posprocesamiento se han aplicado?"),
          options: [
            opt("threshold_per_group", "Threshold adjustment per group", "Ajuste de umbral por grupo"),
            opt("calibration", "Calibration", "Calibración"),
            opt("reject_option", "Reject option classification", "Clasificación con opción de rechazo"),
            opt("none", "None", "Ninguna"),
          ],
        },
        {
          id: "bf5_4",
          type: "text",
          required: true,
          text: L("Describe the ongoing monitoring plan for bias detection.", "Describe el plan de vigilancia continua para la detección de sesgos."),
        },
      ],
    },
    {
      id: "bf6",
      title: L("Assessment outcome", "Resultado de la evaluación"),
      questions: [
        {
          id: "bf6_1",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("What is the overall fairness determination?", "¿Cuál es la determinación general de equidad?"),
          options: [
            opt("fair", "Fair — meets all fairness criteria", "Equitativo: cumple todos los criterios de equidad"),
            opt("conditionally_fair", "Conditionally fair — acceptable with monitoring", "Equitativo con condiciones: aceptable con vigilancia"),
            opt("unfair", "Unfair — significant bias requiring remediation", "No equitativo: sesgo significativo que exige corrección"),
            opt("inconclusive", "Inconclusive — insufficient data", "No concluyente: datos insuficientes"),
          ],
        },
        {
          id: "bf6_2",
          type: "text",
          required: true,
          text: L("What residual bias risks remain after mitigation?", "¿Qué riesgos de sesgo residual quedan tras la mitigación?"),
        },
        {
          id: "bf6_3",
          type: "text",
          required: true,
          text: L("What specific actions are recommended to reduce bias further?", "¿Qué acciones concretas se recomiendan para reducir más el sesgo?"),
        },
        {
          id: "bf6_4",
          type: "single_choice",
          required: true,
          allowNote: true,
          text: L("When is the next re-assessment scheduled?", "¿Cuándo está prevista la próxima reevaluación?"),
          options: [
            opt("3m", "Within 3 months", "En un plazo de 3 meses"),
            opt("6m", "Within 6 months", "En un plazo de 6 meses"),
            opt("12m", "Within 12 months", "En un plazo de 12 meses"),
            opt("material_change", "Upon material change only", "Solo ante un cambio sustancial"),
          ],
        },
      ],
    },
  ],
};

export const ASSESSMENT_TEMPLATES_V2: readonly V2Template[] = [
  friaV2,
  aiRiskV2,
  customV2,
  conformityV2,
  biasFairnessV2,
];

// --- serialisation to the DB `sections` JSON --------------------------------

/**
 * Resolve a question's help: an inline `help` wins; otherwise fall back to the
 * stage-2 QUESTION_HELP entry keyed by the stable id (this is how the FRIA help
 * gets carried into the JSON without being duplicated here).
 */
function resolveHelp(q: V2Question): QuestionHelp | undefined {
  return q.help ?? QUESTION_HELP[q.id];
}

function serializeQuestion(q: V2Question): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: q.id,
    text: q.text,
    type: q.type,
    required: q.required !== false,
  };
  if (q.options) out.options = q.options;
  if (q.scale) out.scale = q.scale;
  if (q.allowNote) out.allowNote = true;
  if (q.noteLabel) out.noteLabel = q.noteLabel;
  if (q.followUp) {
    out.followUp = { when: q.followUp.when, question: serializeQuestion(q.followUp.question) };
  }
  const help = resolveHelp(q);
  if (help) out.help = help;
  return out;
}

/** The JSON stored in AIAssessmentTemplate.sections for a v2 template. */
export function serializeSections(template: V2Template): Record<string, unknown>[] {
  return template.sections.map((s) => ({
    id: s.id,
    title: s.title,
    questions: s.questions.map(serializeQuestion),
  }));
}
