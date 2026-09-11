// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Texas Responsible Artificial Intelligence Governance Act (HB 149, 89th
 * Leg.), Tex. Bus. & Com. Code ch. 552, in force 1 January 2026. Intent-based
 * prohibitions that reach anyone developing or deploying AI in Texas, plus
 * disclosure duties for government agencies and health care providers,
 * Attorney General enforcement with a 60-day cure period, a NIST-aligned safe
 * harbour and a regulatory sandbox. Section numbers follow the enrolled act;
 * legal sign-off PENDING.
 *
 * Scope tags: tx:core (any AI system with a Texas nexus), tx:government,
 * tx:healthcare.
 */

import { signoffMarker } from "@/config/legal-signoff";
import type { RegimeFramework, RegimePack, RegimeRequirementSeed } from "./types";

const REVIEWED = "2026-09-08";

export const TEXAS_FRAMEWORK: RegimeFramework = {
  code: "TX_TRAIGA",
  idPrefix: "tx",
  name: "Texas TRAIGA (HB 149)",
  version: "Tex. Bus. & Com. Code ch. 552, in force 1 Jan 2026",
  abbreviation: "TX",
  description:
    "The Texas Responsible Artificial Intelligence Governance Act: intent-based prohibitions on manipulation, constitutional-rights infringement, unlawful discrimination and unlawful explicit content; disclosure duties for government agencies and health care providers; a ban on government social scoring and non-consensual biometric identification; Attorney General enforcement with a cure period; a NIST AI RMF safe harbour and a 36-month regulatory sandbox.",
  contentVersion: "2026.09.1",
  lawReviewedAsOf: REVIEWED,
  reviewMarker: signoffMarker("TX_TRAIGA"),
};

const CORE = ["jurisdiction:US_TX", "tx:core"] as const;
const GOV = ["jurisdiction:US_TX", "tx:government"] as const;
const HEALTH = ["jurisdiction:US_TX", "tx:healthcare"] as const;

export const TEXAS_REQUIREMENTS: RegimeRequirementSeed[] = [
  {
    slug: "552-051-gov-disclosure",
    code: "§ 552.051(a)",
    title: { en: "Government: disclose that the consumer is interacting with AI", es: "Administración: informar de que el consumidor interactúa con una IA" },
    description: {
      en: "A governmental agency that makes an AI system available to interact with consumers must disclose, clearly and conspicuously in plain language, that the consumer is interacting with an artificial intelligence system, regardless of whether it would be obvious to a reasonable person.",
      es: "La entidad pública que ponga a disposición de los consumidores un sistema de IA para interactuar con ellos debe informar, de forma clara y visible y en lenguaje sencillo, de que el consumidor está interactuando con un sistema de inteligencia artificial, con independencia de que resulte evidente para una persona razonable.",
    },
    applicabilityTags: GOV,
    sortOrder: 510,
  },
  {
    slug: "552-051-health-disclosure",
    code: "§ 552.051(b)",
    title: { en: "Health care: disclose AI use in treatment", es: "Sanidad: informar del uso de IA en el tratamiento" },
    description: {
      en: "A health care service provider that uses an AI system in relation to health care service or treatment must disclose the use to the patient, or to the patient's representative, no later than the date the service is first provided, except in an emergency, where the disclosure follows as soon as reasonably possible.",
      es: "El prestador de servicios sanitarios que utilice un sistema de IA en relación con un servicio o tratamiento sanitario debe informar de ello al paciente, o a su representante, a más tardar en la fecha en que se preste el servicio por primera vez, salvo en caso de urgencia, en que la información se facilita tan pronto como sea razonablemente posible.",
    },
    applicabilityTags: HEALTH,
    sortOrder: 511,
  },
  {
    slug: "552-052-manipulation",
    code: "§ 552.052",
    title: { en: "Prohibition: manipulation of human behaviour to cause harm", es: "Prohibición: manipulación del comportamiento humano para causar daño" },
    description: {
      en: "No person may develop or deploy an AI system in a manner that intentionally aims to incite or encourage a person to commit physical self-harm, including suicide, to harm another person, or to engage in criminal activity. Document the safety measures that prevent these outputs.",
      es: "Nadie puede desarrollar ni desplegar un sistema de IA de un modo que pretenda intencionadamente incitar o animar a una persona a autolesionarse, incluido el suicidio, a dañar a otra persona o a cometer actividades delictivas. Documenta las medidas de seguridad que impiden estos resultados.",
    },
    applicabilityTags: CORE,
    sortOrder: 520,
  },
  {
    slug: "552-053-social-scoring",
    code: "§ 552.053",
    title: { en: "Government: prohibition of social scoring", es: "Administración: prohibición de la puntuación social" },
    description: {
      en: "A governmental entity may not develop or deploy an AI system that evaluates or classifies natural persons based on social behaviour or personal characteristics with the intent to assign a social score that leads to detrimental or unfavourable treatment unrelated to the context or disproportionate to the behaviour.",
      es: "Una entidad pública no puede desarrollar ni desplegar un sistema de IA que evalúe o clasifique a personas físicas según su comportamiento social o sus características personales con la intención de asignar una puntuación social que conduzca a un trato perjudicial o desfavorable ajeno al contexto o desproporcionado respecto del comportamiento.",
    },
    applicabilityTags: GOV,
    sortOrder: 530,
  },
  {
    slug: "552-054-biometric",
    code: "§ 552.054",
    title: { en: "Government: no biometric identification without consent", es: "Administración: sin identificación biométrica sin consentimiento" },
    description: {
      en: "A governmental entity may not develop or deploy an AI system that uniquely identifies an individual using biometric data or images gathered from public sources without the individual's consent, where that would infringe a constitutional right.",
      es: "Una entidad pública no puede desarrollar ni desplegar un sistema de IA que identifique de manera unívoca a una persona mediante datos biométricos o imágenes obtenidas de fuentes públicas sin su consentimiento, cuando ello vulnere un derecho constitucional.",
    },
    applicabilityTags: GOV,
    sortOrder: 540,
  },
  {
    slug: "552-055-constitutional",
    code: "§ 552.055",
    title: { en: "Prohibition: infringement of constitutional rights", es: "Prohibición: vulneración de derechos constitucionales" },
    description: {
      en: "No person may develop or deploy an AI system with the sole intent of infringing, restricting or otherwise impairing a person's rights under the United States Constitution.",
      es: "Nadie puede desarrollar ni desplegar un sistema de IA con la única intención de vulnerar, restringir o menoscabar de otro modo los derechos de una persona reconocidos en la Constitución de los Estados Unidos.",
    },
    applicabilityTags: CORE,
    sortOrder: 550,
  },
  {
    slug: "552-056-discrimination",
    code: "§ 552.056",
    title: { en: "Prohibition: intentional unlawful discrimination", es: "Prohibición: discriminación ilícita intencionada" },
    description: {
      en: "No person may develop or deploy an AI system with the intent to unlawfully discriminate against a protected class in violation of state or federal law. Disparate impact alone is expressly insufficient to show intent. Keep the design rationale and testing records that evidence the absence of discriminatory intent.",
      es: "Nadie puede desarrollar ni desplegar un sistema de IA con la intención de discriminar ilícitamente a una clase protegida en contra del Derecho estatal o federal. El impacto dispar por sí solo es expresamente insuficiente para acreditar la intención. Conserva la justificación del diseño y los registros de pruebas que evidencien la ausencia de intención discriminatoria.",
    },
    applicabilityTags: CORE,
    sortOrder: 560,
  },
  {
    slug: "552-057-explicit-content",
    code: "§ 552.057",
    title: { en: "Prohibition: unlawful sexually explicit content and deepfakes", es: "Prohibición: contenido sexual explícito ilícito y ultrasuplantaciones" },
    description: {
      en: "No person may develop or distribute an AI system with the sole intent of producing or distributing sexually explicit content depicting minors, or intimate deepfake content, in violation of Texas criminal law. Generative systems need output filters and abuse monitoring that document compliance.",
      es: "Nadie puede desarrollar ni distribuir un sistema de IA con la única intención de producir o distribuir contenido sexual explícito con menores, o ultrasuplantaciones de carácter íntimo, en contra del Derecho penal de Texas. Los sistemas generativos necesitan filtros de salida y supervisión de abusos que documenten el cumplimiento.",
    },
    applicabilityTags: CORE,
    sortOrder: 570,
  },
  {
    slug: "enforcement-cure",
    code: "§ 552.101-.104",
    title: { en: "Enforcement, 60-day cure period and safe harbours", es: "Aplicación, plazo de subsanación de 60 días y puertos seguros" },
    description: {
      en: "The Attorney General enforces the act; there is no private right of action. Before suit, the AG must give written notice and a 60-day cure period. Substantial compliance with the NIST AI Risk Management Framework or a comparable recognised framework, and discovery of a violation through internal testing or red-teaming followed by a cure, are affirmative defences. Map this system to the NIST AI RMF framework in this product to evidence the safe harbour.",
      es: "La Fiscalía General aplica la ley; no existe acción privada. Antes de demandar, debe notificar por escrito y conceder un plazo de subsanación de 60 días. El cumplimiento sustancial del Marco de Gestión de Riesgos de IA del NIST o de un marco reconocido comparable, y el descubrimiento de una infracción mediante pruebas internas o ejercicios de equipo rojo seguido de su subsanación, son eximentes. Vincula este sistema al marco NIST AI RMF en este producto para acreditar el puerto seguro.",
    },
    applicabilityTags: CORE,
    sortOrder: 600,
  },
  {
    slug: "sandbox",
    code: "Subch. D",
    title: { en: "Regulatory sandbox programme", es: "Programa de espacio controlado de pruebas" },
    description: {
      en: "The act creates a regulatory sandbox administered by the Department of Information Resources under which a participant may test an AI system for up to 36 months with relief from certain licensing and regulatory requirements, subject to quarterly reporting. Record whether this system is, or should be, enrolled.",
      es: "La ley crea un espacio controlado de pruebas administrado por el Departamento de Recursos de Información en el que un participante puede probar un sistema de IA durante un máximo de 36 meses con exención de determinados requisitos de licencia y regulatorios, sujeto a informes trimestrales. Deja constancia de si este sistema está, o debería estar, inscrito.",
    },
    applicabilityTags: CORE,
    sortOrder: 700,
  },
  {
    slug: "preemption",
    code: "§ 552.002",
    title: { en: "State pre-emption of local AI rules", es: "Prevalencia estatal sobre las normas locales de IA" },
    description: {
      en: "The act pre-empts municipal and county regulation of AI systems. A Texas overlay therefore needs only the state rules; local ordinances do not add obligations.",
      es: "La ley prevalece sobre la regulación municipal y de condado de los sistemas de IA. Por tanto, la capa de Texas solo necesita las normas estatales; las ordenanzas locales no añaden obligaciones.",
    },
    applicabilityTags: CORE,
    sortOrder: 710,
  },
];

export const TEXAS_PACK: RegimePack = { framework: TEXAS_FRAMEWORK, requirements: TEXAS_REQUIREMENTS };
