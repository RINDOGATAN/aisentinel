// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Standard reasons a person can pick when recording a system's risk level.
 * Each one cites the provision of Reg. (EU) 2024/1689 it rests on. Picking a
 * reason only adds its sentence to the rationale, which stays editable: the
 * person still states the facts of the system and chooses the level.
 */

export type ReasonLevel = "UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL";

export interface ClassificationReason {
  id: string;
  /** The levels the reason is offered under. */
  levels: readonly ReasonLevel[];
  en: string;
  es: string;
}

export const CLASSIFICATION_REASONS: readonly ClassificationReason[] = [
  {
    id: "art5-practice",
    levels: ["UNACCEPTABLE"],
    en: "The system carries out a practice listed in Art. 5(1) of the AI Act, so it may not be placed on the market, put into service or used in the EU.",
    es: "El sistema realiza una práctica de las enumeradas en el art. 5, apartado 1, del RIA, por lo que no puede introducirse en el mercado, ponerse en servicio ni utilizarse en la UE.",
  },
  {
    id: "annex-iii-use",
    levels: ["HIGH"],
    en: "The system is intended to be used in an area listed in Annex III, and the exception in Art. 6(3) does not apply (Art. 6(2)).",
    es: "El sistema está destinado a utilizarse en un ámbito del anexo III y no se aplica la excepción del art. 6, apartado 3 (art. 6, apartado 2).",
  },
  {
    id: "annex-iii-profiling",
    levels: ["HIGH"],
    en: "The system is used in an Annex III area and profiles natural persons, so it is always high-risk (Art. 6(3), last subparagraph).",
    es: "El sistema se utiliza en un ámbito del anexo III y elabora perfiles de personas físicas, por lo que siempre se considera de alto riesgo (art. 6, apartado 3, último párrafo).",
  },
  {
    id: "annex-i-product",
    levels: ["HIGH"],
    en: "The system is a safety component of a product, or is itself a product, covered by the Union harmonisation legislation in Annex I and subject to a third-party conformity assessment (Art. 6(1)).",
    es: "El sistema es un componente de seguridad de un producto, o es en sí mismo un producto, regulado por la legislación de armonización de la Unión del anexo I y sujeto a una evaluación de la conformidad por terceros (art. 6, apartado 1).",
  },
  {
    id: "art50-interaction",
    levels: ["LIMITED"],
    en: "The system interacts directly with natural persons, who must be told they are dealing with an AI system unless that is obvious (Art. 50(1)).",
    es: "El sistema interactúa directamente con personas físicas, a las que debe informarse de que tratan con un sistema de IA salvo que resulte evidente (art. 50, apartado 1).",
  },
  {
    id: "art50-synthetic",
    levels: ["LIMITED"],
    en: "The system generates synthetic audio, image, video or text, whose outputs must be marked as artificially generated or manipulated (Art. 50(2)).",
    es: "El sistema genera audio, imagen, vídeo o texto sintéticos, cuyos resultados deben marcarse como generados o manipulados artificialmente (art. 50, apartado 2).",
  },
  {
    id: "art50-deepfake",
    levels: ["LIMITED"],
    en: "The system is used to generate or manipulate deep fakes, which must be disclosed as such (Art. 50(4)).",
    es: "El sistema se utiliza para generar o manipular ultrasuplantaciones, que deben identificarse como tales (art. 50, apartado 4).",
  },
  {
    id: "art6-3-exception",
    // Not high-risk under Art. 6(3); the system may still owe an Art. 50 duty.
    levels: ["LIMITED", "MINIMAL"],
    en: "The system falls in an Annex III area but does not pose a significant risk of harm, because it only performs a task described in Art. 6(3) and does not profile natural persons. This assessment is documented (Art. 6(4)).",
    es: "El sistema entra en un ámbito del anexo III, pero no plantea un riesgo importante de daño porque solo realiza una tarea de las descritas en el art. 6, apartado 3, y no elabora perfiles de personas físicas. Esta evaluación está documentada (art. 6, apartado 4).",
  },
  {
    id: "none-applies",
    levels: ["MINIMAL"],
    en: "The system carries out no practice listed in Art. 5, is not high-risk under Art. 6, and triggers none of the transparency duties in Art. 50.",
    es: "El sistema no realiza ninguna práctica del art. 5, no es de alto riesgo según el art. 6 y no activa ninguna de las obligaciones de transparencia del art. 50.",
  },
];

export function reasonsFor(level: string): ClassificationReason[] {
  return CLASSIFICATION_REASONS.filter((r) => (r.levels as readonly string[]).includes(level));
}

/** The rationale with the reason's sentence added once, on its own line. */
export function addReason(rationale: string, sentence: string): string {
  if (rationale.includes(sentence)) return rationale;
  const base = rationale.trim();
  return base ? `${base}\n${sentence}` : sentence;
}
