// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The glossary: one short, plain meaning for each term the product uses that a
 * newcomer may not know. One file, English and Castilian Spanish, so the term
 * component and the help panel read the same words everywhere, and so a sister
 * app (DPO Central) can reuse the component by copying this data.
 *
 * A meaning is one sentence. Where the term comes from a law, the reference is
 * named in the sentence itself, not hidden in a link, because a reader who
 * stops at the tooltip should still leave with the citation.
 *
 * The eleven terms the product explains inline are the ones a consultant asked
 * for: stakeholder, bias, deployer, provider, high risk, conformity
 * assessment, FRIA, oversight gate, regime, depth, evidence. A few more are
 * added where a page leans on them.
 */

import type { ContentLocale, Localized } from "@/config/lawfirm-ai-toolkit";

export type { ContentLocale, Localized };

export interface GlossaryTerm {
  /** Stable id, used by the term component and the page help registry. */
  id: string;
  /** The word as it is shown, so a term can carry an acronym or capitalisation. */
  label: Localized;
  /** One sentence, plain words. Names the law where the term is a legal one. */
  meaning: Localized;
  /** Optional deeper reading inside the product docs. */
  docHref?: string;
}

const L = (en: string, es: string): Localized => ({ en, es });

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "stakeholder",
    label: L("stakeholder", "parte interesada"),
    meaning: L(
      "Anyone affected by an AI system or with a say in how it is run: the people it makes decisions about, the staff who use it, the vendor that supplies it, and the regulators who oversee it.",
      "Cualquier persona a la que afecta un sistema de IA o que tiene voz en cómo se gestiona: las personas sobre las que decide, el personal que lo usa, el proveedor que lo suministra y los organismos que lo supervisan.",
    ),
  },
  {
    id: "bias",
    label: L("bias", "sesgo"),
    meaning: L(
      "When an AI system's outputs are systematically less fair for some people than others, for example by age, sex or origin, whether or not anyone intended it.",
      "Cuando los resultados de un sistema de IA son sistemáticamente menos justos para unas personas que para otras, por ejemplo por edad, sexo u origen, se pretendiera o no.",
    ),
  },
  {
    id: "provider",
    label: L("provider", "proveedor"),
    meaning: L(
      "The party that develops an AI system, or has one developed, and places it on the market or puts it into service under its own name (EU AI Act Art. 3).",
      "La parte que desarrolla un sistema de IA, o hace que se desarrolle, y lo introduce en el mercado o lo pone en servicio con su propio nombre (Reglamento de IA de la UE, art. 3).",
    ),
    docHref: "/docs/guides/my-role",
  },
  {
    id: "deployer",
    label: L("deployer", "responsable del despliegue"),
    meaning: L(
      "The party that uses an AI system under its own authority in the course of its work, that is, the organisation running it, not the one that built it (EU AI Act Art. 3).",
      "La parte que utiliza un sistema de IA bajo su propia autoridad en el marco de su actividad, es decir, la organización que lo opera, no la que lo construyó (Reglamento de IA de la UE, art. 3).",
    ),
    docHref: "/docs/guides/my-role",
  },
  {
    id: "high-risk",
    label: L("high risk", "alto riesgo"),
    meaning: L(
      "An AI use the EU AI Act treats as high risk because it can materially affect people's safety or rights: the areas are listed in Art. 6 and Annex III (for example recruitment, credit, essential services).",
      "Un uso de la IA que el Reglamento de IA de la UE considera de alto riesgo porque puede afectar de forma significativa a la seguridad o los derechos de las personas: las áreas figuran en el art. 6 y el anexo III (por ejemplo, selección de personal, crédito o servicios esenciales).",
    ),
    docHref: "/docs/guides/high-risk",
  },
  {
    id: "conformity-assessment",
    label: L("conformity assessment", "evaluación de la conformidad"),
    meaning: L(
      "The check that a high-risk AI system meets the EU AI Act's requirements before it is put into use, kept as evidence and repeated after substantial changes (EU AI Act Arts. 43 and 47).",
      "La comprobación de que un sistema de IA de alto riesgo cumple los requisitos del Reglamento de IA de la UE antes de su puesta en uso, conservada como prueba y repetida tras cambios sustanciales (Reglamento de IA de la UE, arts. 43 y 47).",
    ),
  },
  {
    id: "fria",
    label: L("FRIA", "FRIA"),
    meaning: L(
      "A fundamental rights impact assessment: a written analysis of how a high-risk AI system could affect people's rights, required of certain deployers by EU AI Act Art. 27.",
      "Una evaluación de impacto relativa a los derechos fundamentales: un análisis escrito de cómo un sistema de IA de alto riesgo puede afectar a los derechos de las personas, exigida a determinados responsables del despliegue por el art. 27 del Reglamento de IA de la UE.",
    ),
  },
  {
    id: "oversight-gate",
    label: L("oversight gate", "punto de control"),
    meaning: L(
      "A point where a named person must review and decide before an AI system moves on, so a human stays in control of the outcome rather than the model deciding alone.",
      "Un punto en el que una persona designada debe revisar y decidir antes de que un sistema de IA avance, de modo que sea una persona quien mantenga el control del resultado y no el modelo por sí solo.",
    ),
  },
  {
    id: "regime",
    label: L("regime", "régimen"),
    meaning: L(
      "A body of AI or data law from one place, such as the EU AI Act, the GDPR, or a US state act; a system can fall under several at once, which is why the product screens each one.",
      "Un cuerpo normativo sobre IA o datos de un lugar concreto, como el Reglamento de IA de la UE, el RGPD o una ley de un estado de EE. UU.; un sistema puede estar sujeto a varios a la vez, por lo que el producto analiza cada uno.",
    ),
    docHref: "/docs/cross-border",
  },
  {
    id: "depth",
    label: L("depth", "profundidad"),
    meaning: L(
      "How far a framework goes into a given topic, from no coverage to a detailed obligation; it lets you see at a glance which framework says most about a subject.",
      "Hasta dónde llega un marco en un tema concreto, desde sin cobertura hasta una obligación detallada; permite ver de un vistazo qué marco dice más sobre una materia.",
    ),
  },
  {
    id: "evidence",
    label: L("evidence", "prueba"),
    meaning: L(
      "A document or record that shows an obligation is met, such as an assessment, a test result or an approval, kept so the position can be defended later.",
      "Un documento o registro que demuestra que una obligación se cumple, como una evaluación, el resultado de una prueba o una aprobación, conservado para poder defender la posición más adelante.",
    ),
  },
  {
    id: "importer",
    label: L("importer", "importador"),
    meaning: L(
      "A party in the EU that places on the market an AI system carrying the name of a provider established outside the EU (EU AI Act Art. 3).",
      "Una parte de la UE que introduce en el mercado un sistema de IA que lleva el nombre de un proveedor establecido fuera de la UE (Reglamento de IA de la UE, art. 3).",
    ),
    docHref: "/docs/guides/my-role",
  },
  {
    id: "distributor",
    label: L("distributor", "distribuidor"),
    meaning: L(
      "A party in the supply chain, other than the provider or importer, that makes an AI system available on the market (EU AI Act Art. 3).",
      "Una parte de la cadena de suministro, distinta del proveedor o el importador, que comercializa un sistema de IA (Reglamento de IA de la UE, art. 3).",
    ),
    docHref: "/docs/guides/my-role",
  },
  {
    id: "gpai-provider",
    label: L("GPAI provider", "proveedor de IA de uso general"),
    meaning: L(
      "The provider of a general-purpose AI model, such as a large language model that many applications build on, subject to its own duties under EU AI Act Arts. 53 to 55.",
      "El proveedor de un modelo de IA de uso general, como un gran modelo de lenguaje sobre el que se construyen muchas aplicaciones, sujeto a obligaciones propias en los arts. 53 a 55 del Reglamento de IA de la UE.",
    ),
    docHref: "/docs/guides/my-role",
  },
  {
    id: "transparency",
    label: L("transparency", "transparencia"),
    meaning: L(
      "Telling people plainly when they are dealing with an AI system or with AI-generated content, as EU AI Act Art. 50 requires for chatbots, deepfakes and similar.",
      "Informar con claridad a las personas de cuándo interactúan con un sistema de IA o con contenido generado por IA, como exige el art. 50 del Reglamento de IA de la UE para chatbots, ultrafalsificaciones y similares.",
    ),
  },
];

const BY_ID: Record<string, GlossaryTerm> = Object.fromEntries(
  GLOSSARY.map((term) => [term.id, term]),
);

/** The term for an id, or undefined when the id is unknown. */
export function glossaryTerm(id: string): GlossaryTerm | undefined {
  return BY_ID[id];
}

/** Every term id, for tests and for building an index page. */
export const GLOSSARY_IDS: string[] = GLOSSARY.map((term) => term.id);
