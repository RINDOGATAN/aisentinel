// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Help for a single assessment question, keyed by the question's stable id
 * (the ids seeded in scripts/seed-assessment-templates.ts, e.g. "fria1_1").
 *
 * For each question: what it means in plain words, an example of the kind of
 * answer that satisfies it, and, where there is one, the legal reference the
 * answer evidences. Shown under the question on the answering screen.
 *
 * The questions themselves are not changed here (a later stage restructures
 * them); this only annotates them. An id with no entry simply shows no extra
 * help, so the screen degrades gracefully.
 *
 * Coverage note: the flagship FRIA template (EU AI Act Art. 27) is annotated in
 * full. The other four seeded templates (AI Risk, Custom, Conformity, Bias &
 * Fairness) are not yet annotated; the coverage test asserts the FRIA set and
 * that every entry present is bilingual.
 */

import type { Localized } from "@/config/lawfirm-ai-toolkit";

export interface QuestionHelp {
  /** What the question is really asking, in plain words. */
  meaning: Localized;
  /** An example of the kind of answer that satisfies it. */
  example: Localized;
  /** The legal reference the answer evidences, where there is one. */
  reference?: Localized;
}

const L = (en: string, es: string): Localized => ({ en, es });

/** The template ids whose questions are annotated in full, for the coverage test. */
export const ANNOTATED_TEMPLATE_PREFIXES = ["fria"] as const;

export const QUESTION_HELP: Record<string, QuestionHelp> = {
  // ---- FRIA — Fundamental Rights Impact Assessment (EU AI Act Art. 27) ----
  fria1_1: {
    meaning: L(
      "Say what the system is and what it is for, so the rest of the assessment is anchored to a concrete thing.",
      "Di qué es el sistema y para qué sirve, de modo que el resto de la evaluación se ancle en algo concreto.",
    ),
    example: L(
      "\"CV-Screen v2.1 ranks job applicants against a role's requirements to produce a shortlist for recruiters.\"",
      "«CV-Screen v2.1 ordena a los candidatos según los requisitos del puesto para generar una preselección para los reclutadores.»",
    ),
    reference: L("EU AI Act Art. 27(1)(a)", "Reglamento de IA de la UE, art. 27.1.a"),
  },
  fria1_2: {
    meaning: L(
      "Explain where the system sits in your own processes: what it feeds and what depends on its output.",
      "Explica dónde encaja el sistema en tus propios procesos: qué alimenta y qué depende de su resultado.",
    ),
    example: L(
      "\"Recruiters receive the shortlist and decide who to interview; the system does not reject anyone on its own.\"",
      "«Los reclutadores reciben la preselección y deciden a quién entrevistar; el sistema no descarta a nadie por sí solo.»",
    ),
    reference: L("EU AI Act Art. 27(1)(a)", "Reglamento de IA de la UE, art. 27.1.a"),
  },
  fria1_3: {
    meaning: L(
      "State for how long and how often the system will run, which bears on how much exposure it creates.",
      "Indica durante cuánto tiempo y con qué frecuencia funcionará el sistema, lo que influye en la exposición que genera.",
    ),
    example: L(
      "\"In continuous use through each hiring campaign, roughly forty campaigns a year.\"",
      "«En uso continuo durante cada campaña de contratación, unas cuarenta campañas al año.»",
    ),
    reference: L("EU AI Act Art. 27(1)(b)", "Reglamento de IA de la UE, art. 27.1.b"),
  },
  fria1_4: {
    meaning: L(
      "Say where and in which parts of the organisation the system is deployed, so the scope of the assessment is clear.",
      "Di dónde y en qué partes de la organización se despliega el sistema, para que quede claro el alcance de la evaluación.",
    ),
    example: L(
      "\"Used by the recruitment team across our offices in Spain and France.\"",
      "«Lo utiliza el equipo de selección en nuestras oficinas de España y Francia.»",
    ),
    reference: L("EU AI Act Art. 27(1)(a)", "Reglamento de IA de la UE, art. 27.1.a"),
  },
  fria2_1: {
    meaning: L(
      "Name the people and groups the system touches, not only its direct users but everyone its outputs reach.",
      "Nombra a las personas y los grupos a los que afecta el sistema, no solo a sus usuarios directos sino a todos a quienes llegan sus resultados.",
    ),
    example: L(
      "\"Job applicants, the recruiters who use the shortlist, and the hiring managers who rely on it.\"",
      "«Los candidatos, los reclutadores que usan la preselección y los responsables de contratación que se apoyan en ella.»",
    ),
    reference: L("EU AI Act Art. 27(1)(c)", "Reglamento de IA de la UE, art. 27.1.c"),
  },
  fria2_2: {
    meaning: L(
      "Flag whether any affected group is more exposed to harm, which raises the care the system needs.",
      "Señala si algún grupo afectado está más expuesto al perjuicio, lo que eleva el cuidado que necesita el sistema.",
    ),
    example: L(
      "\"Applicants with disabilities may be disadvantaged if the model reads career gaps as a negative signal.\"",
      "«Los candidatos con discapacidad pueden verse perjudicados si el modelo interpreta las interrupciones en la carrera como una señal negativa.»",
    ),
    reference: L("EU AI Act Art. 27(1)(c)", "Reglamento de IA de la UE, art. 27.1.c"),
  },
  fria2_3: {
    meaning: L(
      "Give a rough number of people affected: the scale of harm matters as much as its likelihood.",
      "Da una cifra aproximada de personas afectadas: la escala del perjuicio importa tanto como su probabilidad.",
    ),
    example: L(
      "\"About 8,000 applicants a year across all campaigns.\"",
      "«Unos 8.000 candidatos al año en todas las campañas.»",
    ),
    reference: L("EU AI Act Art. 27(1)(c)", "Reglamento de IA de la UE, art. 27.1.c"),
  },
  fria2_4: {
    meaning: L(
      "Record whether affected people, or those who represent them, had any say in this assessment.",
      "Registra si las personas afectadas, o quienes las representan, tuvieron voz en esta evaluación.",
    ),
    example: L(
      "\"The works council reviewed the tool and its concerns are recorded in the minutes of 12 March.\"",
      "«El comité de empresa revisó la herramienta y sus observaciones constan en el acta del 12 de marzo.»",
    ),
    reference: L("EU AI Act Art. 27(1)(c)", "Reglamento de IA de la UE, art. 27.1.c"),
  },
  fria3_1: {
    meaning: L(
      "Identify how the system could treat people unfairly on a protected characteristic, whether or not that is intended.",
      "Identifica cómo el sistema podría tratar a las personas de forma injusta por una característica protegida, se pretenda o no.",
    ),
    example: L(
      "\"Trained on past hires, the model may favour men for technical roles and so entrench a historical imbalance.\"",
      "«Entrenado con contrataciones pasadas, el modelo puede favorecer a los hombres en puestos técnicos y así perpetuar un desequilibrio histórico.»",
    ),
    reference: L("Art. 21 EU Charter", "Art. 21 de la Carta de la UE"),
  },
  fria3_2: {
    meaning: L(
      "Set out how the system could intrude on privacy or personal data, including what it can infer.",
      "Expón cómo el sistema podría vulnerar la privacidad o los datos personales, incluido lo que puede inferir.",
    ),
    example: L(
      "\"The model could infer health or ethnicity from a CV and use it, even though those fields are never entered.\"",
      "«El modelo podría inferir salud u origen étnico a partir de un currículum y utilizarlo, aunque esos campos nunca se introduzcan.»",
    ),
    reference: L("Arts. 7 and 8 EU Charter", "Arts. 7 y 8 de la Carta de la UE"),
  },
  fria3_3: {
    meaning: L(
      "Consider whether the system could chill or distort what people say or the information they receive.",
      "Considera si el sistema podría coartar o distorsionar lo que las personas dicen o la información que reciben.",
    ),
    example: L(
      "\"Low risk here: the tool ranks CVs and does not moderate or shape any published content.\"",
      "«Riesgo bajo aquí: la herramienta ordena currículums y no modera ni condiciona ningún contenido publicado.»",
    ),
    reference: L("Art. 11 EU Charter", "Art. 11 de la Carta de la UE"),
  },
  fria3_4: {
    meaning: L(
      "Consider whether the system could treat people as mere data points rather than as people.",
      "Considera si el sistema podría tratar a las personas como meros datos y no como personas.",
    ),
    example: L(
      "\"A purely automated rejection with no explanation could leave applicants feeling processed by a machine; a human review answers this.\"",
      "«Un rechazo puramente automático y sin explicación podría hacer que los candidatos se sintieran procesados por una máquina; una revisión humana lo corrige.»",
    ),
    reference: L("Art. 1 EU Charter", "Art. 1 de la Carta de la UE"),
  },
  fria3_5: {
    meaning: L(
      "Consider whether affected people can understand, challenge and get redress for a decision the system shapes.",
      "Considera si las personas afectadas pueden comprender, impugnar y obtener reparación de una decisión que el sistema condiciona.",
    ),
    example: L(
      "\"Rejected applicants can ask for a human review and reasons within fourteen days.\"",
      "«Los candidatos rechazados pueden solicitar una revisión humana y los motivos en un plazo de catorce días.»",
    ),
    reference: L("Art. 47 EU Charter", "Art. 47 de la Carta de la UE"),
  },
  fria3_6: {
    meaning: L(
      "Note any other right the system could affect that the earlier questions did not cover.",
      "Anota cualquier otro derecho que el sistema pudiera afectar y que las preguntas anteriores no cubrieran.",
    ),
    example: L(
      "\"Right to work (Art. 15): an over-strict filter could shut qualified people out of the labour market.\"",
      "«Derecho a trabajar (art. 15): un filtro demasiado estricto podría dejar fuera del mercado laboral a personas cualificadas.»",
    ),
    reference: L("EU Charter of Fundamental Rights", "Carta de los Derechos Fundamentales de la UE"),
  },
  fria4_1: {
    meaning: L(
      "Describe who watches over the system in use, how competent they are, and how they can step in.",
      "Describe quién supervisa el sistema en uso, qué competencia tiene y cómo puede intervenir.",
    ),
    example: L(
      "\"A trained recruiter reviews every shortlist and can add or remove candidates before anyone is contacted.\"",
      "«Un reclutador formado revisa cada preselección y puede añadir o quitar candidatos antes de contactar con nadie.»",
    ),
    reference: L("EU AI Act Arts. 14 and 27(1)(e)", "Reglamento de IA de la UE, arts. 14 y 27.1.e"),
  },
  fria4_2: {
    meaning: L(
      "List the built-in technical measures that protect people's rights, not just the system's accuracy.",
      "Enumera las medidas técnicas integradas que protegen los derechos de las personas, no solo la exactitud del sistema.",
    ),
    example: L(
      "\"Sensitive attributes are excluded, outputs are tested for disparate impact each quarter, and each score carries its main reasons.\"",
      "«Se excluyen los atributos sensibles, los resultados se prueban trimestralmente en busca de impacto desigual y cada puntuación indica sus motivos principales.»",
    ),
    reference: L("EU AI Act Arts. 9, 10 and 15", "Reglamento de IA de la UE, arts. 9, 10 y 15"),
  },
  fria4_3: {
    meaning: L(
      "List the organisational measures, the things people and procedures do, that reduce the risks you found.",
      "Enumera las medidas organizativas, lo que hacen las personas y los procedimientos, que reducen los riesgos que has hallado.",
    ),
    example: L(
      "\"Recruiters are trained on the tool's limits, an oversight group reviews outcomes quarterly, and concerns escalate to the AI officer.\"",
      "«Los reclutadores reciben formación sobre los límites de la herramienta, un grupo de supervisión revisa los resultados cada trimestre y las incidencias se elevan al responsable de IA.»",
    ),
    reference: L("EU AI Act Art. 27(1)(e)", "Reglamento de IA de la UE, art. 27.1.e"),
  },
  fria4_4: {
    meaning: L(
      "Say how an affected person can contest a decision the system shaped and get it looked at again.",
      "Di cómo una persona afectada puede impugnar una decisión condicionada por el sistema y conseguir que se revise.",
    ),
    example: L(
      "\"A rejected applicant can request a human review through a named contact and receives a reasoned reply.\"",
      "«Un candidato rechazado puede solicitar una revisión humana a través de un contacto designado y recibe una respuesta motivada.»",
    ),
    reference: L("EU AI Act Art. 27(1)(f); Art. 47 EU Charter", "Reglamento de IA de la UE, art. 27.1.f; art. 47 de la Carta de la UE"),
  },
  fria5_1: {
    meaning: L(
      "Give your overall reading: taking the safeguards into account, are the risks to rights acceptable?",
      "Da tu valoración general: teniendo en cuenta las salvaguardas, ¿son aceptables los riesgos para los derechos?",
    ),
    example: L(
      "\"With human review and quarterly bias testing in place, the residual risks are acceptable and monitored.\"",
      "«Con la revisión humana y las pruebas de sesgo trimestrales, los riesgos residuales son aceptables y se vigilan.»",
    ),
    reference: L("EU AI Act Art. 27(1)(d)", "Reglamento de IA de la UE, art. 27.1.d"),
  },
  fria5_2: {
    meaning: L(
      "State what risk is left after the safeguards, because no set of measures removes all of it.",
      "Indica qué riesgo queda tras las salvaguardas, porque ningún conjunto de medidas lo elimina por completo.",
    ),
    example: L(
      "\"A small risk of indirect bias remains where career gaps correlate with protected groups; it is watched in the quarterly test.\"",
      "«Queda un pequeño riesgo de sesgo indirecto cuando las interrupciones de carrera se correlacionan con grupos protegidos; se vigila en la prueba trimestral.»",
    ),
    reference: L("EU AI Act Art. 9(2)", "Reglamento de IA de la UE, art. 9.2"),
  },
  fria5_3: {
    meaning: L(
      "Note any further measures worth taking to bring the residual risk down.",
      "Anota cualquier medida adicional que convenga adoptar para reducir el riesgo residual.",
    ),
    example: L(
      "\"Add an annual external audit of the model's outcomes and widen the test to intersectional groups.\"",
      "«Añadir una auditoría externa anual de los resultados del modelo y ampliar la prueba a grupos interseccionales.»",
    ),
    reference: L("EU AI Act Art. 9", "Reglamento de IA de la UE, art. 9"),
  },
  fria5_4: {
    meaning: L(
      "Record whether, and how, you told the market surveillance authority the results, where that duty applies.",
      "Registra si comunicaste los resultados a la autoridad de vigilancia del mercado, y cómo, cuando esa obligación aplica.",
    ),
    example: L(
      "\"Notified through the national authority's template on 3 April; reference number recorded in the file.\"",
      "«Notificado mediante el modelo de la autoridad nacional el 3 de abril; el número de referencia consta en el expediente.»",
    ),
    reference: L("EU AI Act Art. 27(3)", "Reglamento de IA de la UE, art. 27.3"),
  },
};

export function questionHelp(id: string): QuestionHelp | undefined {
  return QUESTION_HELP[id];
}
