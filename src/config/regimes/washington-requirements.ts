// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Washington has no single AI act. This framework gathers the domain
 * instruments that govern AI in the state, each as a parent row with its
 * duties beneath it:
 *   - My Health My Data Act, RCW 19.373 (HB 1155): consumer health data,
 *     including health inferred by algorithms. Live since 31 Mar 2024.
 *   - HB 1170 (2026): provenance data in generative-AI image, video and audio
 *     from covered providers. Signed 24 Mar 2026, effective 1 Feb 2027.
 *   - HB 2225 (2026): AI companion chatbots. Signed 24 Mar 2026, effective
 *     1 Jan 2027. Private right of action.
 *   - SB 5395 (2026), RCW 48.43.830: prior-authorisation decisions by health
 *     carriers may not rely solely on AI. The codified section states an
 *     effective date of 1 Jan 2027; some reporting gives 11 Jun 2026.
 *   - RCW 43.105 and the state AI policy (DATA-04): automated decision
 *     systems and AI in public agencies.
 * ESSB 5838 (2024) created the AI Task Force under the Attorney General; it
 * is an oversight body and adds no duty, so it is described here and not
 * seeded as a row. Legal sign-off PENDING.
 *
 * Scope tags: wa:mhmda, wa:genai-provenance, wa:companion, wa:prior-auth,
 * wa:public-agency.
 */

import type { RegimeFramework, RegimePack, RegimeRequirementSeed } from "./types";

const REVIEWED = "2026-09-08";

export const WASHINGTON_FRAMEWORK: RegimeFramework = {
  code: "WA_AI_RULES",
  idPrefix: "wa",
  name: "Washington AI rules (domain instruments)",
  version: "RCW 19.373; HB 1170 (2026); HB 2225 (2026); RCW 48.43.830; RCW 43.105",
  abbreviation: "WA",
  description:
    "Washington's AI obligations by domain: the My Health My Data Act for health data and health inferences, HB 1170 provenance duties for covered generative-AI providers, HB 2225 duties for AI companion chatbots, the prior-authorisation limits on automated denials in RCW 48.43.830, and the automated decision-system rules for public agencies under RCW 43.105. The AI Task Force created by ESSB 5838 (2024) under the Attorney General monitors generative AI and issues recommendations; it imposes no duty of its own.",
  contentVersion: "2026.09.1",
  lawReviewedAsOf: REVIEWED,
  reviewMarker: {
    en: `Law reviewed as of ${REVIEWED}; Washington legal sign-off pending. HB 1170 and HB 2225 are 2026 enactments; verify final chapter numbers.`,
    es: `Revisión jurídica a fecha de ${REVIEWED}; pendiente de validación jurídica en Washington. HB 1170 y HB 2225 son leyes de 2026; verifique los números de capítulo definitivos.`,
  },
};

const MHMDA = ["jurisdiction:US_WA", "wa:mhmda"] as const;
const PROV = ["jurisdiction:US_WA", "wa:genai-provenance"] as const;
const COMP = ["jurisdiction:US_WA", "wa:companion"] as const;
const PA = ["jurisdiction:US_WA", "wa:prior-auth"] as const;
const GOV = ["jurisdiction:US_WA", "wa:public-agency"] as const;

export const WASHINGTON_REQUIREMENTS: RegimeRequirementSeed[] = [
  {
    slug: "mhmda",
    code: "RCW 19.373",
    title: { en: "My Health My Data Act: consumer health data and inferences", es: "Ley My Health My Data: datos de salud del consumidor e inferencias" },
    description: {
      en: "Consumer health data includes information a regulated entity processes to associate a consumer with health data derived or extrapolated from non-health information, including by algorithms or machine learning (RCW 19.373.010). An AI system that infers health status, conditions, reproductive or gender-affirming care, or biometric data is within the act even when no health record is an input.",
      es: "Los datos de salud del consumidor incluyen la información que una entidad regulada trata para asociar a un consumidor con datos de salud derivados o extrapolados de información no sanitaria, incluso mediante algoritmos o aprendizaje automático (RCW 19.373.010). Un sistema de IA que infiera el estado de salud, dolencias, atención reproductiva o de afirmación de género, o datos biométricos, está dentro de la ley aunque ningún historial sanitario sea una entrada.",
    },
    applicabilityTags: MHMDA,
    sortOrder: 100,
    children: [
      {
        slug: "mhmda-policy",
        code: "RCW 19.373.020",
        title: { en: "Consumer health data privacy policy", es: "Política de privacidad de datos de salud del consumidor" },
        description: {
          en: "Maintain and prominently link a consumer health data privacy policy that discloses the categories collected, the purposes including how the data are used, the categories of sources and of third parties and affiliates with whom data are shared, and how consumers exercise their rights.",
          es: "Mantenga y enlace de forma destacada una política de privacidad de datos de salud del consumidor que indique las categorías recogidas, las finalidades y el modo de uso, las categorías de fuentes y de terceros y entidades vinculadas con quienes se comparten, y cómo ejercen los consumidores sus derechos.",
        },
        applicabilityTags: MHMDA,
        sortOrder: 102,
      },
      {
        slug: "mhmda-consent",
        code: "RCW 19.373.030",
        title: { en: "Opt-in consent for collection and sharing", es: "Consentimiento previo para la recogida y la puesta a disposición" },
        description: {
          en: "Collect or share consumer health data only with the consumer's consent for a specified purpose, or to the extent necessary to provide a product or service the consumer requested. Consent is a clear affirmative act, freely given, specific, informed, opt-in and unambiguous; inferring health data to train or run a model is collection.",
          es: "Recoja o comparta datos de salud del consumidor solo con su consentimiento para una finalidad determinada, o en la medida necesaria para prestar un producto o servicio que haya solicitado. El consentimiento es un acto afirmativo claro, libre, específico, informado, previo e inequívoco; inferir datos de salud para entrenar o ejecutar un modelo es recogida.",
        },
        applicabilityTags: MHMDA,
        sortOrder: 103,
      },
      {
        slug: "mhmda-rights",
        code: "RCW 19.373.040",
        title: { en: "Consumer rights: confirm, access, withdraw, delete", es: "Derechos del consumidor: confirmar, acceder, retirar, suprimir" },
        description: {
          en: "Consumers may confirm whether their health data are collected, shared or sold, access them with a list of recipients, withdraw consent, and have the data deleted, including from the entity's affiliates, processors and third parties. Deletion must reach inferred data and any model artefacts that retain it.",
          es: "El consumidor puede confirmar si sus datos de salud se recogen, comparten o venden, acceder a ellos con la lista de destinatarios, retirar el consentimiento y obtener su supresión, incluso ante entidades vinculadas, encargados y terceros. La supresión debe alcanzar a los datos inferidos y a cualquier artefacto del modelo que los conserve.",
        },
        applicabilityTags: MHMDA,
        sortOrder: 104,
      },
      {
        slug: "mhmda-sale",
        code: "RCW 19.373.060",
        title: { en: "Sale only with valid authorisation", es: "Venta solo con autorización válida" },
        description: {
          en: "Selling consumer health data requires a separate, signed authorisation that names the buyer and the purpose and is valid for one year. Sharing inferred health data with an AI vendor for its own purposes may be a sale.",
          es: "La venta de datos de salud del consumidor exige una autorización separada y firmada que identifique al comprador y la finalidad, válida durante un año. Compartir datos de salud inferidos con un proveedor de IA para sus propias finalidades puede constituir una venta.",
        },
        applicabilityTags: MHMDA,
        sortOrder: 106,
      },
      {
        slug: "mhmda-geofence",
        code: "RCW 19.373.080",
        title: { en: "No geofencing around health care facilities", es: "Sin geovallado en torno a centros sanitarios" },
        description: {
          en: "It is unlawful to implement a geofence around a facility that provides in-person health care services to identify or track consumers, collect their health data, or send them notifications or advertising related to that data. Location-driven AI features must exclude these perimeters.",
          es: "Es ilícito implantar un geovallado en torno a un centro que preste servicios sanitarios presenciales para identificar o rastrear a consumidores, recoger sus datos de salud o enviarles notificaciones o publicidad relacionadas con esos datos. Las funciones de IA basadas en la ubicación deben excluir estos perímetros.",
        },
        applicabilityTags: MHMDA,
        sortOrder: 108,
      },
    ],
  },
  {
    slug: "hb1170",
    code: "HB 1170 (2026)",
    title: { en: "Provenance data in generative-AI content", es: "Datos de procedencia en el contenido generado por IA" },
    description: {
      en: "From 1 February 2027 a covered provider, one that creates a generative AI system with more than one million monthly users that is publicly accessible in Washington for personal use, must include provenance data in image, video or audio content its system creates or materially alters, so users can determine the content's origin. Enforced by the Attorney General under the Consumer Protection Act; no private right of action.",
      es: "Desde el 1 de febrero de 2027, el proveedor cubierto, el que crea un sistema de IA generativa con más de un millón de usuarios mensuales accesible al público en Washington para uso personal, debe incluir datos de procedencia en el contenido de imagen, vídeo o audio que su sistema cree o altere de forma sustancial, para que los usuarios puedan determinar su origen. Aplica la Fiscalía General conforme a la Ley de Protección del Consumidor; sin acción privada.",
    },
    applicabilityTags: PROV,
    sortOrder: 200,
    children: [
      {
        slug: "hb1170-durable",
        code: "HB 1170 § 2",
        title: { en: "Provenance must be difficult to remove or tamper with", es: "La procedencia debe ser difícil de eliminar o manipular" },
        description: {
          en: "The provenance data may be a watermark or metadata and must be difficult to remove or alter without degrading the content. Align the method with the EU AI Act Art. 50(2) marking measures so one implementation serves both.",
          es: "Los datos de procedencia pueden ser una marca de agua o metadatos y deben ser difíciles de eliminar o alterar sin degradar el contenido. Alinee el método con las medidas de marcado del art. 50.2 del Reglamento de IA de la UE para que una sola implementación sirva para ambos.",
        },
        applicabilityTags: PROV,
        sortOrder: 202,
      },
    ],
  },
  {
    slug: "hb2225",
    code: "HB 2225 (2026)",
    title: { en: "AI companion chatbots", es: "Chatbots de compañía basados en IA" },
    description: {
      en: "From 1 January 2027 an operator of an AI companion chatbot, one that provides adaptive, human-like responses and is capable of sustaining a relationship across sessions, owes disclosure, minor-protection and crisis-response duties, enforceable by the Attorney General and through a private right of action.",
      es: "Desde el 1 de enero de 2027, el operador de un chatbot de compañía basado en IA, el que ofrece respuestas adaptativas de apariencia humana y puede mantener una relación a lo largo de sesiones, tiene deberes de información, de protección de menores y de respuesta ante crisis, exigibles por la Fiscalía General y mediante acción privada.",
    },
    applicabilityTags: COMP,
    sortOrder: 300,
    children: [
      {
        slug: "hb2225-disclosure",
        code: "HB 2225 § 3",
        title: { en: "Disclose that the chatbot is not human, with periodic reminders", es: "Informar de que el chatbot no es humano, con recordatorios periódicos" },
        description: {
          en: "Clearly and conspicuously disclose that the companion is artificial and not human, and repeat the reminder during continuing interactions: at least every three hours for adults and every hour for users known to be minors.",
          es: "Informe de forma clara y visible de que el acompañante es artificial y no humano, y repita el recordatorio durante las interacciones continuadas: al menos cada tres horas para adultos y cada hora para usuarios que se sepa que son menores.",
        },
        applicabilityTags: COMP,
        sortOrder: 302,
      },
      {
        slug: "hb2225-crisis",
        code: "HB 2225 § 4",
        title: { en: "Published protocol for suicidal ideation and self-harm", es: "Protocolo publicado ante ideación suicida y autolesiones" },
        description: {
          en: "Maintain, and publish on the operator's website, a protocol to detect and respond to expressions of suicidal ideation, self-harm or a mental-health crisis, including referral to crisis services. When the protocol triggers, the system must respond with crisis resources rather than continue the ordinary conversation.",
          es: "Mantenga, y publique en el sitio web del operador, un protocolo para detectar y responder a expresiones de ideación suicida, autolesión o crisis de salud mental, incluida la derivación a servicios de crisis. Cuando el protocolo se active, el sistema debe responder con recursos de crisis en lugar de continuar la conversación ordinaria.",
        },
        applicabilityTags: COMP,
        sortOrder: 304,
      },
      {
        slug: "hb2225-minors",
        code: "HB 2225 § 5",
        title: { en: "Protections for minors", es: "Protección de menores" },
        description: {
          en: "For companions directed at minors, or where the operator knows the user is a minor, implement reasonable measures to prevent sexually explicit content or suggestive dialogue, and apply the hourly reminder. Document the age-signal logic and the content safeguards.",
          es: "En los acompañantes dirigidos a menores, o cuando el operador sepa que el usuario es menor, adopte medidas razonables para impedir contenido sexual explícito o diálogo sugerente, y aplique el recordatorio cada hora. Documente la lógica de detección de edad y las salvaguardas de contenido.",
        },
        applicabilityTags: COMP,
        sortOrder: 306,
      },
    ],
  },
  {
    slug: "prior-auth",
    code: "RCW 48.43.830",
    title: { en: "Prior authorisation: no denial by AI alone", es: "Autorización previa: sin denegación solo por IA" },
    description: {
      en: "A health carrier may not rely solely on an AI or automated decision tool to deny, delay or modify health care services. A denial based on medical necessity must be made by a licensed physician or licensed health professional acting within their scope. Tools must consider the individual patient's information, not only group data. The codified section states 1 January 2027; some reporting on SB 5395 gives 11 June 2026. Confirm with counsel.",
      es: "Una aseguradora sanitaria no puede basarse únicamente en una herramienta de IA o de decisión automatizada para denegar, retrasar o modificar servicios sanitarios. La denegación por necesidad médica debe adoptarla un médico o profesional sanitario colegiado dentro de su ámbito. Las herramientas deben considerar la información individual del paciente, no solo datos de grupo. La sección codificada indica el 1 de enero de 2027; alguna información sobre la SB 5395 indica el 11 de junio de 2026. Confírmelo con asesoría jurídica.",
    },
    applicabilityTags: PA,
    sortOrder: 400,
    children: [
      {
        slug: "prior-auth-reporting",
        code: "RCW 48.43.830 (reporting)",
        title: { en: "Annual AI transparency reporting", es: "Informe anual de transparencia sobre la IA" },
        description: {
          en: "Report annually, from 2027, on the use of AI in prior-authorisation determinations as the Office of the Insurance Commissioner prescribes. Keep per-system logs of automated recommendations and the human determinations that followed.",
          es: "Informe anualmente, desde 2027, sobre el uso de la IA en las determinaciones de autorización previa según prescriba la Oficina del Comisionado de Seguros. Conserve registros por sistema de las recomendaciones automatizadas y de las determinaciones humanas posteriores.",
        },
        applicabilityTags: PA,
        sortOrder: 402,
      },
    ],
  },
  {
    slug: "public-agency",
    code: "RCW 43.105 / DATA-04",
    title: { en: "Public agencies: automated decision systems and AI", es: "Entidades públicas: sistemas de decisión automatizada e IA" },
    description: {
      en: "State agencies developing, procuring or using automated decision systems follow the rules and minimum standards set under RCW 43.105 by the state chief privacy officer and the state AI policy issued by WaTech (DATA-04). No agency may use a system that discriminates on a basis listed in RCW 49.60.010. Confirm which provisions are statute and which are policy before citing them externally.",
      es: "Las entidades estatales que desarrollen, adquieran o utilicen sistemas de decisión automatizada siguen las normas y estándares mínimos fijados conforme al RCW 43.105 por el responsable estatal de privacidad y la política estatal de IA emitida por WaTech (DATA-04). Ninguna entidad puede usar un sistema que discrimine por alguno de los motivos del RCW 49.60.010. Confirme qué disposiciones son ley y cuáles son política antes de citarlas externamente.",
    },
    applicabilityTags: GOV,
    sortOrder: 500,
    children: [
      {
        slug: "public-agency-risk-assessment",
        code: "DATA-04 (risk assessment)",
        title: { en: "AI risk assessment before high-risk use", es: "Evaluación de riesgos de IA antes de un uso de alto riesgo" },
        description: {
          en: "Before implementing a high-risk AI system, an agency conducts an AI risk assessment that identifies the specific risks and documents the controls used to measure and manage them, and keeps the system in the agency's AI inventory.",
          es: "Antes de implantar un sistema de IA de alto riesgo, la entidad realiza una evaluación de riesgos de IA que identifica los riesgos concretos y documenta los controles empleados para medirlos y gestionarlos, y mantiene el sistema en su inventario de IA.",
        },
        applicabilityTags: GOV,
        sortOrder: 502,
      },
    ],
  },
];

export const WASHINGTON_PACK: RegimePack = { framework: WASHINGTON_FRAMEWORK, requirements: WASHINGTON_REQUIREMENTS };
