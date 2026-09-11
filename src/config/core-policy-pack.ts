// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Core AI Policy Pack
 *
 * Six sector-neutral first-draft policies, one for each policy type the
 * program scorecard measures (AI_USAGE, AI_GOVERNANCE, AI_TRANSPARENCY,
 * AI_DATA_GOVERNANCE, AI_PROCUREMENT, AI_INCIDENT_RESPONSE). Any organisation
 * (provider or deployer, EU and/or US) can adopt them as a starting point.
 * Industry templates ship their own policies; the Quick Start wizard uses
 * corePoliciesMissingFrom() to fill only the types a template leaves empty,
 * so a template's own policy of the same type is never duplicated.
 *
 * All prose is Localized (en/es, Castilian Spanish) because it becomes a
 * permanent org record in the requester's locale, like the law-firm pack
 * (src/config/lawfirm-ai-toolkit.ts).
 *
 * Legal anchors: final Regulation (EU) 2024/1689 numbering, as amended by
 * Regulation (EU) 2026/1744 (Digital Omnibus on AI): Art. 4 and Art. 5 apply
 * since 2 Feb 2025; Art. 53 since 2 Aug 2025; Art. 50 since 2 Aug 2026 (marking
 * grace to 2 Dec 2026 for generative systems already on the market); Annex III
 * high-risk obligations from 2 Dec 2027. GDPR Arts. 5, 6, 9, 13-15, 22, 28,
 * 33-35 and Chapter V. US state content is deliberately conditional.
 *
 * Legal sign-off PENDING. The marker is hard-coded here rather than read from
 * legal-signoff.ts; register the pack there when it is signed off.
 *
 * Imports: type-only from @prisma/client, nothing from src, so slim-image
 * scripts can import this file.
 */

import type { PolicyType } from "@prisma/client";

// ============================================================
// TYPES
// ============================================================

export type CorePolicyLocale = "en" | "es";
export type Localized = { en: string; es: string };

export interface CorePolicy {
  /** Stable id (not persisted; titles are the dedupe key like templates) */
  id: string;
  title: Localized;
  type: PolicyType;
  description: Localized;
  content: Localized;
}

export interface LocalizedCorePolicy {
  title: string;
  type: PolicyType;
  description: string;
  content: string;
}

// ============================================================
// VERSION AND REVIEW MARKER
// ============================================================

/** Rule-pack version. Bump on any content change. */
export const CORE_POLICY_PACK_VERSION = "2026.09.1";

/** Date the content was last reviewed against source. Sign-off pending. */
export const CORE_POLICY_LAW_REVIEWED_AS_OF = "2026-09-11";

export const CORE_POLICY_REVIEW_MARKER: Localized = {
  en: `Law reviewed as of ${CORE_POLICY_LAW_REVIEWED_AS_OF}; legal sign-off pending.`,
  es: `Revisión jurídica a fecha de ${CORE_POLICY_LAW_REVIEWED_AS_OF}; pendiente de validación jurídica.`,
};

/** The six policy types the program scorecard measures. */
export const CORE_POLICY_TYPES: readonly PolicyType[] = [
  "AI_USAGE",
  "AI_GOVERNANCE",
  "AI_TRANSPARENCY",
  "AI_DATA_GOVERNANCE",
  "AI_PROCUREMENT",
  "AI_INCIDENT_RESPONSE",
];

const withMarker = (l: Localized): Localized => ({
  en: `${l.en}\n\n${CORE_POLICY_REVIEW_MARKER.en}`,
  es: `${l.es}\n\n${CORE_POLICY_REVIEW_MARKER.es}`,
});

/** Headings and paragraphs are separated by a blank line. */
const doc = (...blocks: string[]): string => blocks.join("\n\n");

/** A lead-in line followed by list items, one per line. */
const list = (...lines: string[]): string => lines.join("\n");

// ============================================================
// POLICY PACK
// ============================================================

export const CORE_POLICY_PACK: CorePolicy[] = [
  // ----------------------------------------------------------
  // AI_USAGE
  // ----------------------------------------------------------
  {
    id: "core-ai-use",
    title: {
      en: "AI Acceptable Use Policy",
      es: "Política de uso aceptable de la IA",
    },
    type: "AI_USAGE",
    description: {
      en: "Rules on which AI tools staff may use, for what purposes, with which data and with what human review.",
      es: "Normas sobre qué herramientas de IA puede utilizar el personal, para qué fines, con qué datos y con qué revisión humana.",
    },
    content: withMarker({
      en: doc(
        "Purpose and scope",
        "This policy sets the rules for using artificial intelligence (AI) tools at the organisation. It applies to everyone who uses AI on the organisation's behalf (employees, contractors and others), whether the tool is provided by the organisation, built into other software or accessed online.",
        "Approved tools",
        "Only tools listed in the organisation's approved-tool register may be used for work. For each tool the register records the approved purposes, the account and configuration to be used, the categories of data that may be entered and the system owner. No other tool may be used for work until the AI governance lead has approved it under the AI Procurement Policy.",
        "Prohibited uses",
        list(
          "AI may never be used for a practice prohibited by Article 5 of the EU AI Act (Regulation (EU) 2024/1689), which has applied since 2 February 2025:",
          "(a) manipulative or deceptive techniques that materially distort a person's behaviour and cause, or are reasonably likely to cause, significant harm;",
          "(b) exploiting a person's vulnerabilities due to age, disability or a specific social or economic situation;",
          "(c) social scoring that leads to detrimental or unfavourable treatment;",
          "(d) predicting the risk that a person will commit a criminal offence based solely on profiling or personality traits;",
          "(e) creating or expanding facial recognition databases by untargeted scraping of facial images from the internet or CCTV footage;",
          "(f) inferring emotions in the workplace or in education institutions, except for medical or safety reasons;",
          "(g) biometric categorisation to deduce race, political opinions, trade union membership, religious or philosophical beliefs, sex life or sexual orientation;",
          "(h) real-time remote biometric identification in publicly accessible spaces for law enforcement.",
        ),
        "The organisation also prohibits using AI to generate child sexual abuse material or intimate images of a person without consent (practices that Regulation (EU) 2026/1744 adds to Article 5 from 2 December 2026), or to produce unlawful, discriminatory or harassing content.",
        "Personal accounts and confidential data",
        "Work is done only through accounts provided by the organisation; personal or consumer AI accounts and free versions of tools may not be used for work. Confidential information, trade secrets, customer data and personal data may be entered only into tools that the register approves for that category of data, in a configuration that prevents the provider from using the inputs to train its models. When in doubt, remove identifying details first or ask the AI governance lead.",
        "AI literacy",
        "Article 4 of the EU AI Act, applicable since 2 February 2025, requires the organisation to take measures to ensure a sufficient level of AI literacy among its staff and other persons who operate or use AI systems on its behalf. Each user completes the organisation's AI training before receiving access to an approved tool. The training covers the limits of the tools (including errors and invented content), confidentiality, data protection and this policy, and staff who oversee higher-risk systems receive further training for their role. Training is refreshed at least once a year and completion is recorded.",
        "Human review of outputs",
        "AI output is a draft. The person who uses it is responsible for it and must check its accuracy, completeness and fairness, verifying facts and references against a reliable source, before relying on it, sharing it outside the organisation or using it in a decision about a person. AI may not take a decision with legal or similarly significant effects for a person without meaningful review by someone with the authority and competence to change the outcome.",
        "Records, reporting and review",
        "Use of approved tools is logged where the tool allows it, and logs and training records are kept under the organisation's retention schedule. Any use of an unapproved tool, any entry of data into a tool not approved for it, and any harmful or unexpected output must be reported without delay to the AI governance lead and is handled under the AI Incident Response Policy. Breaches of this policy may lead to disciplinary action. The AI governance lead reviews this policy at least once a year and whenever the law or the organisation's use of AI changes materially.",
      ),
      es: doc(
        "Objeto y ámbito de aplicación",
        "Esta política establece las normas para el uso de herramientas de inteligencia artificial (IA) en la organización. Se aplica a todas las personas que utilicen la IA por cuenta de la organización (empleados, contratistas y otros), tanto si la herramienta la proporciona la organización como si está integrada en otro software o se utiliza en línea.",
        "Herramientas aprobadas",
        "Solo pueden utilizarse para el trabajo las herramientas que figuren en el registro de herramientas aprobadas de la organización. Para cada herramienta, el registro recoge los fines aprobados, la cuenta y la configuración que deben utilizarse, las categorías de datos que pueden introducirse y el propietario del sistema. Ninguna otra herramienta puede utilizarse para el trabajo hasta que el responsable de gobernanza de la IA la haya aprobado conforme a la Política de contratación de sistemas de IA.",
        "Usos prohibidos",
        list(
          "La IA no puede utilizarse nunca para una práctica prohibida por el artículo 5 del Reglamento de IA (Reglamento (UE) 2024/1689), aplicable desde el 2 de febrero de 2025:",
          "(a) técnicas manipuladoras o engañosas que alteren de manera sustancial el comportamiento de una persona y le causen, o sea razonablemente probable que le causen, perjuicios considerables;",
          "(b) aprovechar las vulnerabilidades de una persona derivadas de su edad, de una discapacidad o de una situación social o económica específica;",
          "(c) la puntuación ciudadana que dé lugar a un trato perjudicial o desfavorable;",
          "(d) predecir el riesgo de que una persona cometa un delito basándose únicamente en la elaboración de perfiles o en sus rasgos de personalidad;",
          "(e) crear o ampliar bases de datos de reconocimiento facial mediante la extracción no selectiva de imágenes faciales de internet o de circuitos cerrados de televisión;",
          "(f) inferir las emociones de una persona en el lugar de trabajo o en centros educativos, salvo por motivos médicos o de seguridad;",
          "(g) la categorización biométrica para deducir la raza, las opiniones políticas, la afiliación sindical, las convicciones religiosas o filosóficas, la vida sexual o la orientación sexual;",
          "(h) la identificación biométrica remota en tiempo real en espacios de acceso público con fines de garantía del cumplimiento del Derecho.",
        ),
        "La organización prohíbe además utilizar la IA para generar material de abuso sexual infantil o imágenes íntimas de una persona sin su consentimiento (prácticas que el Reglamento (UE) 2026/1744 añade al artículo 5 a partir del 2 de diciembre de 2026), o para producir contenidos ilícitos, discriminatorios o de acoso.",
        "Cuentas personales y datos confidenciales",
        "El trabajo se realiza únicamente a través de cuentas proporcionadas por la organización; no pueden utilizarse para el trabajo cuentas de IA personales o de consumo ni versiones gratuitas de las herramientas. La información confidencial, los secretos empresariales, los datos de clientes y los datos personales solo pueden introducirse en herramientas que el registro apruebe para esa categoría de datos, con una configuración que impida al proveedor utilizar los datos introducidos para entrenar sus modelos. En caso de duda, deben eliminarse antes los datos identificativos o consultarse al responsable de gobernanza de la IA.",
        "Alfabetización en materia de IA",
        "El artículo 4 del Reglamento de IA, aplicable desde el 2 de febrero de 2025, exige a la organización adoptar medidas para garantizar un nivel suficiente de alfabetización en materia de IA de su personal y de las demás personas que operen o utilicen sistemas de IA en su nombre. Cada usuario completa la formación en IA de la organización antes de obtener acceso a una herramienta aprobada. La formación abarca los límites de las herramientas (incluidos los errores y el contenido inventado), la confidencialidad, la protección de datos y esta política, y el personal que supervisa sistemas de mayor riesgo recibe formación adicional para su función. La formación se actualiza al menos una vez al año y se deja constancia de su realización.",
        "Revisión humana de los resultados",
        "Los resultados de la IA son un borrador. Quien los utiliza responde de ellos y debe comprobar su exactitud, su integridad y su imparcialidad, verificando los hechos y las referencias con una fuente fiable, antes de basarse en ellos, compartirlos fuera de la organización o utilizarlos en una decisión sobre una persona. La IA no puede adoptar una decisión con efectos jurídicos o efectos igualmente significativos para una persona sin una revisión efectiva por parte de alguien con la autoridad y la competencia necesarias para cambiar el resultado.",
        "Registros, comunicación y revisión",
        "El uso de las herramientas aprobadas se registra cuando la herramienta lo permite, y los registros de actividad y de formación se conservan conforme al calendario de conservación de la organización. Todo uso de una herramienta no aprobada, toda introducción de datos en una herramienta no aprobada para ellos y todo resultado dañino o inesperado deben comunicarse sin demora al responsable de gobernanza de la IA y se gestionan conforme a la Política de respuesta a incidentes de IA. El incumplimiento de esta política puede dar lugar a medidas disciplinarias. El responsable de gobernanza de la IA revisa esta política al menos una vez al año y siempre que la normativa o el uso de la IA por la organización cambien de forma significativa.",
      ),
    }),
  },

  // ----------------------------------------------------------
  // AI_GOVERNANCE
  // ----------------------------------------------------------
  {
    id: "core-ai-governance",
    title: {
      en: "AI Governance Policy",
      es: "Política de gobernanza de la IA",
    },
    type: "AI_GOVERNANCE",
    description: {
      en: "Roles, AI inventory, risk classification, high-risk deployer duties, human oversight and review for every AI system the organisation develops, buys or uses.",
      es: "Funciones, inventario de IA, clasificación del riesgo, obligaciones del responsable del despliegue de sistemas de alto riesgo, supervisión humana y revisión de todo sistema de IA que la organización desarrolla, adquiere o utiliza.",
    },
    content: withMarker({
      en: doc(
        "Purpose and scope",
        "This policy sets out how the organisation directs and controls AI, so that every AI system it develops, buys or uses is known, classified, overseen and reviewed, whether the organisation acts as provider or as deployer within the meaning of the EU AI Act (Regulation (EU) 2024/1689).",
        "Roles",
        "The management body approves this policy, sets the organisation's appetite for AI risk and receives a report on the AI programme at least once a year and on every serious incident. The AI governance lead (or an AI governance committee, where the organisation's size warrants one) runs the programme: it maintains the AI inventory, approves risk classifications and deployments, and works with the data protection officer, information security, legal and compliance. Each AI system has a named system owner, accountable for its classification, documentation, oversight, monitoring and retirement.",
        "AI inventory",
        "Every AI system is recorded in the AI inventory before use, stating its purpose, system owner, provider, the organisation's role, the data it uses, the persons it affects, the jurisdictions where it is used, its risk classification and its status. The system owner keeps the record current.",
        "Risk classification",
        "Before deployment, and after any material change, each system is classified against the tiers of the EU AI Act: prohibited practices under Article 5, which may not be deployed; high-risk systems under Article 6, including the areas listed in Annex III (such as biometrics, education, employment, access to essential services and credit); systems with transparency duties under Article 50; and minimal-risk systems. The AI governance lead approves each classification and the reasons for it. Obligations under other applicable laws, such as data protection law and US state laws on automated decisions, are recorded at the same time.",
        "High-risk systems",
        "The obligations for high-risk systems listed in Annex III apply from 2 December 2027, following Regulation (EU) 2026/1744. The organisation prepares for them now. As deployer of a high-risk system it will, under Article 26: use the system in line with the provider's instructions for use; assign human oversight to competent, trained persons with the necessary authority; ensure that input data under its control is relevant and sufficiently representative; monitor the system and inform the provider and, where applicable, the market surveillance authority of risks and serious incidents; keep the logs under its control for at least six months; inform workers' representatives and affected workers before using such a system at work; and inform persons that they are subject to the system where it is used to make, or assist in making, decisions about them.",
        "Fundamental rights impact assessment",
        "Where Article 27 applies (in particular to bodies governed by public law, private entities providing public services, and deployers of systems used to assess creditworthiness or for risk assessment and pricing in life and health insurance), the organisation carries out a fundamental rights impact assessment before first use and notifies the market surveillance authority of the results. This assessment complements any data protection impact assessment.",
        "Human oversight",
        "Article 14 requires high-risk systems to be designed so that natural persons can oversee them effectively. The organisation applies this principle to all its AI systems in proportion to risk: the persons assigned to oversight understand the system's capabilities and limits, guard against over-reliance on its output, can interpret that output, and can decide not to use it, override it or stop the system.",
        "Management framework",
        "The programme is structured on the NIST AI Risk Management Framework (its Govern, Map, Measure and Manage functions) and on ISO/IEC 42001 for the AI management system. Neither is legally required; both give the programme a recognised structure and help to evidence compliance.",
        "Records and review",
        "Classifications, assessments, approvals, oversight decisions and incidents are recorded in the governance system. The AI governance lead reviews this policy, the inventory and the classifications at least once a year, and sooner after a serious incident or a material change in the law.",
      ),
      es: doc(
        "Objeto y ámbito de aplicación",
        "Esta política establece cómo la organización dirige y controla la IA, de modo que todo sistema de IA que desarrolle, adquiera o utilice esté identificado, clasificado, supervisado y revisado, tanto si la organización actúa como proveedor como si actúa como responsable del despliegue, en el sentido del Reglamento de IA (Reglamento (UE) 2024/1689).",
        "Funciones",
        "El órgano de dirección aprueba esta política, fija el nivel de riesgo de IA que la organización está dispuesta a asumir y recibe un informe sobre el programa de IA al menos una vez al año y ante cada incidente grave. El responsable de gobernanza de la IA (o un comité de gobernanza de la IA, cuando el tamaño de la organización lo justifique) dirige el programa: mantiene el inventario de IA, aprueba las clasificaciones del riesgo y los despliegues, y colabora con el delegado de protección de datos, con seguridad de la información, con la asesoría jurídica y con cumplimiento normativo. Cada sistema de IA tiene un propietario del sistema designado, que responde de su clasificación, documentación, supervisión, seguimiento y retirada.",
        "Inventario de IA",
        "Todo sistema de IA se inscribe en el inventario de IA antes de su uso, con indicación de su finalidad, el propietario del sistema, el proveedor, la función de la organización, los datos que utiliza, las personas a las que afecta, las jurisdicciones en las que se utiliza, su clasificación del riesgo y su estado. El propietario del sistema mantiene la inscripción actualizada.",
        "Clasificación del riesgo",
        "Antes del despliegue, y tras cualquier cambio significativo, cada sistema se clasifica conforme a los niveles del Reglamento de IA: prácticas prohibidas del artículo 5, que no pueden desplegarse; sistemas de alto riesgo del artículo 6, incluidos los ámbitos enumerados en el anexo III (como la biometría, la educación, el empleo, el acceso a servicios esenciales y el crédito); sistemas sujetos a obligaciones de transparencia del artículo 50; y sistemas de riesgo mínimo. El responsable de gobernanza de la IA aprueba cada clasificación y sus motivos. Al mismo tiempo se registran las obligaciones derivadas de otras normas aplicables, como la normativa de protección de datos y las leyes estatales de Estados Unidos sobre decisiones automatizadas.",
        "Sistemas de alto riesgo",
        "Las obligaciones relativas a los sistemas de alto riesgo enumerados en el anexo III se aplican a partir del 2 de diciembre de 2027, conforme al Reglamento (UE) 2026/1744. La organización se prepara para ellas desde ahora. Como responsable del despliegue de un sistema de alto riesgo, conforme al artículo 26: utilizará el sistema con arreglo a las instrucciones de uso del proveedor; encomendará la supervisión humana a personas competentes y formadas que tengan la autoridad necesaria; se asegurará de que los datos de entrada que controle sean pertinentes y suficientemente representativos; vigilará el funcionamiento del sistema e informará al proveedor y, cuando proceda, a la autoridad de vigilancia del mercado de los riesgos y de los incidentes graves; conservará durante al menos seis meses los registros que estén bajo su control; informará a los representantes de los trabajadores y a los trabajadores afectados antes de utilizar un sistema de este tipo en el lugar de trabajo; e informará a las personas de que están expuestas al uso del sistema cuando se utilice para tomar decisiones sobre ellas o para ayudar a tomarlas.",
        "Evaluación de impacto sobre los derechos fundamentales",
        "Cuando se aplique el artículo 27 (en particular, a los organismos de Derecho público, a las entidades privadas que prestan servicios públicos y a los responsables del despliegue de sistemas destinados a evaluar la solvencia o a evaluar riesgos y fijar precios en los seguros de vida y de salud), la organización realiza una evaluación de impacto sobre los derechos fundamentales antes del primer uso y notifica sus resultados a la autoridad de vigilancia del mercado. Esta evaluación complementa cualquier evaluación de impacto relativa a la protección de datos.",
        "Supervisión humana",
        "El artículo 14 exige que los sistemas de alto riesgo se diseñen de modo que puedan ser vigilados de manera efectiva por personas físicas. La organización aplica este principio a todos sus sistemas de IA en proporción al riesgo: las personas encargadas de la supervisión comprenden las capacidades y los límites del sistema, evitan confiar en exceso en sus resultados, saben interpretarlos y pueden decidir no utilizarlos, invalidarlos o detener el sistema.",
        "Marco de gestión",
        "El programa se estructura conforme al Marco de Gestión de Riesgos de IA del NIST (sus funciones Govern, Map, Measure y Manage) y a la norma ISO/IEC 42001 para el sistema de gestión de la IA. Ninguno de los dos es obligatorio por ley; ambos aportan al programa una estructura reconocida y ayudan a acreditar el cumplimiento.",
        "Registros y revisión",
        "Las clasificaciones, las evaluaciones, las aprobaciones, las decisiones de supervisión y los incidentes se registran en el sistema de gobernanza. El responsable de gobernanza de la IA revisa esta política, el inventario y las clasificaciones al menos una vez al año, y antes si se produce un incidente grave o un cambio significativo de la normativa.",
      ),
    }),
  },

  // ----------------------------------------------------------
  // AI_TRANSPARENCY
  // ----------------------------------------------------------
  {
    id: "core-ai-transparency",
    title: {
      en: "AI Transparency Policy",
      es: "Política de transparencia sobre la IA",
    },
    type: "AI_TRANSPARENCY",
    description: {
      en: "When and how the organisation tells people that AI is used, marks synthetic content and explains decisions in which AI plays a part.",
      es: "Cuándo y cómo la organización informa a las personas del uso de la IA, marca el contenido sintético y explica las decisiones en las que interviene la IA.",
    },
    content: withMarker({
      en: doc(
        "Purpose and scope",
        "This policy sets out when and how the organisation tells people that AI is being used, and how it explains decisions in which AI plays a part. It applies to every AI system that interacts with people, generates content or is used in decisions about people, in every jurisdiction where the organisation operates.",
        "EU AI Act, Article 50",
        list(
          "The transparency duties in Article 50 of the EU AI Act have applied since 2 August 2026. The organisation will:",
          "(a) ensure that people are informed when they interact directly with an AI system, unless this is obvious from the context;",
          "(b) where it provides a system that generates synthetic audio, images, video or text, mark the output in a machine-readable format so that it can be detected as artificially generated or manipulated (generative systems placed on the market before 2 August 2026 have until 2 December 2026 to do so under Regulation (EU) 2026/1744);",
          "(c) disclose that image, audio or video content is artificially generated or manipulated where it is a deep fake, in a manner that does not hamper the display of an evidently artistic, creative, satirical or fictional work;",
          "(d) disclose that text published to inform the public on matters of public interest was artificially generated or manipulated, unless it has undergone human review and a person holds editorial responsibility for it;",
          "(e) inform people exposed to an emotion recognition or biometric categorisation system of its operation, where the use of such a system is lawful.",
        ),
        "This information is given in a clear and distinguishable manner, at the latest at the time of the first interaction or exposure, and meets the applicable accessibility requirements. The transparency measures for each system are recorded in its transparency profile.",
        "Explanations of decisions",
        "Where a decision is taken on the basis of the output of a high-risk system listed in Annex III and produces legal effects or similarly significantly affects a person, Article 86 gives that person the right to a clear and meaningful explanation of the role of the AI system in the decision and of its main elements. The organisation will have this process in place before the Annex III obligations apply from 2 December 2027.",
        "Where personal data is processed, the information given under Articles 13 and 14 of the GDPR describes the AI processing. Where a decision based solely on automated processing, including profiling, produces legal or similarly significant effects (Article 22), that information and the replies to access requests under Article 15 give meaningful information about the logic involved and about the significance and envisaged consequences for the person. Such decisions are taken only where Article 22 allows it, and the person may obtain human intervention, express their point of view and contest the decision.",
        "United States",
        "Where the organisation is subject to US state laws on AI or automated decision-making, it gives the notices those laws require. For example, where applicable: under the California rules on automated decision-making technology, a pre-use notice before such technology is used to make a significant decision about a consumer, with the opt-out and access rights those rules provide; under Colorado law on automated decisions in consequential matters, the notices, post-decision disclosures and means of recourse that law requires; and, in sectors such as health care and government services, any duty to disclose that a person is interacting with AI. Legal review confirms which laws apply before a system is used.",
        "Records and review",
        "The system owner keeps a copy of every notice, label and statement, with the dates it was in use. The AI governance lead reviews this policy at least once a year and whenever the law or the organisation's systems change materially.",
      ),
      es: doc(
        "Objeto y ámbito de aplicación",
        "Esta política establece cuándo y cómo la organización informa a las personas de que se está utilizando la IA, y cómo explica las decisiones en las que interviene la IA. Se aplica a todo sistema de IA que interactúe con personas, genere contenido o se utilice en decisiones sobre personas, en todas las jurisdicciones en las que opera la organización.",
        "Reglamento de IA, artículo 50",
        list(
          "Las obligaciones de transparencia del artículo 50 del Reglamento de IA son aplicables desde el 2 de agosto de 2026. La organización:",
          "(a) se asegurará de que las personas sean informadas de que interactúan directamente con un sistema de IA, salvo que resulte evidente por el contexto;",
          "(b) cuando sea proveedor de un sistema que genere audio, imágenes, vídeo o texto sintéticos, marcará los resultados en un formato legible por máquina de modo que sea posible detectar que han sido generados o manipulados de manera artificial (los sistemas generativos introducidos en el mercado antes del 2 de agosto de 2026 disponen hasta el 2 de diciembre de 2026 para hacerlo, conforme al Reglamento (UE) 2026/1744);",
          "(c) hará público que un contenido de imagen, audio o vídeo ha sido generado o manipulado de manera artificial cuando constituya una ultrasuplantación, de forma que no dificulte la exhibición de una obra manifiestamente artística, creativa, satírica o de ficción;",
          "(d) hará público que un texto publicado con el fin de informar al público sobre asuntos de interés público ha sido generado o manipulado de manera artificial, salvo que haya sido objeto de revisión humana y una persona asuma la responsabilidad editorial;",
          "(e) informará a las personas expuestas a un sistema de reconocimiento de emociones o de categorización biométrica de su funcionamiento, cuando el uso de dicho sistema sea lícito.",
        ),
        "Esta información se facilita de manera clara y distinguible, a más tardar con ocasión de la primera interacción o exposición, y cumple los requisitos de accesibilidad aplicables. Las medidas de transparencia de cada sistema constan en su perfil de transparencia.",
        "Explicación de las decisiones",
        "Cuando se adopte una decisión basada en los resultados de un sistema de alto riesgo enumerado en el anexo III que produzca efectos jurídicos o afecte de manera igualmente significativa a una persona, el artículo 86 reconoce a esa persona el derecho a obtener una explicación clara y significativa del papel del sistema de IA en la decisión y de sus principales elementos. La organización tendrá implantado este procedimiento antes de que las obligaciones del anexo III se apliquen a partir del 2 de diciembre de 2027.",
        "Cuando se traten datos personales, la información facilitada conforme a los artículos 13 y 14 del RGPD describe el tratamiento mediante IA. Cuando una decisión basada únicamente en el tratamiento automatizado, incluida la elaboración de perfiles, produzca efectos jurídicos o efectos igualmente significativos (artículo 22), esa información y las respuestas a las solicitudes de acceso del artículo 15 ofrecen información significativa sobre la lógica aplicada, así como sobre la importancia y las consecuencias previstas para la persona. Estas decisiones solo se adoptan cuando el artículo 22 lo permite, y la persona puede obtener intervención humana, expresar su punto de vista e impugnar la decisión.",
        "Estados Unidos",
        "Cuando la organización esté sujeta a leyes estatales de Estados Unidos sobre IA o sobre toma de decisiones automatizada, facilita los avisos que esas leyes exigen. Por ejemplo, cuando proceda: conforme a las normas de California sobre tecnología de toma de decisiones automatizada, un aviso previo al uso antes de utilizar esa tecnología para tomar una decisión significativa sobre un consumidor, con los derechos de exclusión y de acceso que esas normas prevén; conforme a la ley de Colorado sobre decisiones automatizadas en asuntos con consecuencias importantes, los avisos, la información posterior a la decisión y las vías de recurso que esa ley exige; y, en sectores como la sanidad y los servicios de la Administración, cualquier deber de informar de que una persona interactúa con una IA. Antes de utilizar un sistema, la revisión jurídica confirma qué leyes son aplicables.",
        "Registros y revisión",
        "El propietario del sistema conserva una copia de cada aviso, etiqueta y declaración, con las fechas en que estuvo en uso. El responsable de gobernanza de la IA revisa esta política al menos una vez al año y siempre que la normativa o los sistemas de la organización cambien de forma significativa.",
      ),
    }),
  },

  // ----------------------------------------------------------
  // AI_DATA_GOVERNANCE
  // ----------------------------------------------------------
  {
    id: "core-ai-data-governance",
    title: {
      en: "AI Data Governance Policy",
      es: "Política de gobernanza de datos para la IA",
    },
    type: "AI_DATA_GOVERNANCE",
    description: {
      en: "Rules for the data used to train, test, prompt and operate AI systems: lawful basis, minimisation, quality, retention, vendor use and transfers.",
      es: "Normas sobre los datos utilizados para entrenar, probar, instruir y operar sistemas de IA: base jurídica, minimización, calidad, conservación, uso por los proveedores y transferencias.",
    },
    content: withMarker({
      en: doc(
        "Purpose and scope",
        "This policy governs the data used to train, fine-tune, test, prompt and operate AI systems, and the outputs that contain personal or confidential information. It applies alongside the organisation's data protection and information security policies.",
        "Roles",
        "The system owner is responsible for the data each system uses. The data protection officer (or privacy lead) advises on and approves any use of personal data in AI, and the AI governance lead reflects these rules in the AI inventory and in approvals.",
        "Lawful basis and purpose limitation",
        "Before personal data is used in an AI system, the system owner records the purpose and the lawful basis under Article 6 of the GDPR, and confirms that the processing respects the principles in Article 5, including purpose limitation, data minimisation, accuracy and storage limitation. Data collected for one purpose is reused (for example, to train or fine-tune a model) only where the new purpose is compatible or a separate lawful basis applies.",
        "Special categories of data",
        "Data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs or trade union membership, genetic data, biometric data used to identify a person, and data concerning health, sex life or sexual orientation are used in AI systems only where a condition in Article 9 of the GDPR applies and the data protection officer has approved the use.",
        "Data protection impact assessment",
        "A data protection impact assessment is carried out before any processing that is likely to result in a high risk to people, as Article 35 of the GDPR requires, in particular for a systematic and extensive evaluation of people based on automated processing, including profiling, that produces legal or similarly significant effects, and for large-scale processing of special categories of data. For high-risk AI systems, the assessment uses the information the provider supplies under Article 13 of the EU AI Act.",
        "Minimisation in prompts and training",
        "Only the data needed for the task is entered into a prompt or included in a dataset. Anonymised or pseudonymised data is preferred, and synthetic data is used where it is suitable.",
        "Quality of training data",
        "Where the organisation is the provider of a high-risk AI system, its training, validation and testing datasets meet Article 10 of the EU AI Act (for Annex III systems, from 2 December 2027): they are subject to documented data governance covering their origin, collection and preparation and the examination of possible biases and gaps, and they are relevant, sufficiently representative and, to the best extent possible, free of errors and complete in view of the intended purpose. As a deployer, the organisation ensures that input data under its control is relevant and sufficiently representative.",
        "Retention",
        "Prompts, outputs, logs and datasets are kept only as long as the retention schedule allows, and tool settings are configured to match it. Logs of high-risk systems under the organisation's control are kept for at least six months. Requests from individuals to access, correct or erase their data are honoured for AI data as for any other data.",
        "Vendor use of data",
        "No vendor may use the organisation's data (inputs, outputs, files or content in telemetry) to train or improve its models, or for any purpose of its own, without prior written approval from the AI governance lead and the data protection officer. Vendors that process personal data on the organisation's behalf sign a contract that meets Article 28 of the GDPR.",
        "Cross-border transfers",
        "Personal data is transferred outside the European Economic Area through an AI service only under Chapter V of the GDPR (an adequacy decision, standard contractual clauses supported by a transfer assessment, or another valid mechanism), and in line with any data location commitments made to customers.",
        "Records and review",
        "The record of processing activities, impact assessments, dataset documentation and approvals are kept up to date. This policy is reviewed at least once a year.",
      ),
      es: doc(
        "Objeto y ámbito de aplicación",
        "Esta política regula los datos utilizados para entrenar, ajustar, probar, instruir y operar sistemas de IA, así como los resultados que contengan información personal o confidencial. Se aplica junto con las políticas de protección de datos y de seguridad de la información de la organización.",
        "Funciones",
        "El propietario del sistema es responsable de los datos que utiliza cada sistema. El delegado de protección de datos (o el responsable de privacidad) asesora sobre todo uso de datos personales en la IA y lo aprueba, y el responsable de gobernanza de la IA refleja estas normas en el inventario de IA y en las aprobaciones.",
        "Base jurídica y limitación de la finalidad",
        "Antes de utilizar datos personales en un sistema de IA, el propietario del sistema deja constancia de la finalidad y de la base jurídica conforme al artículo 6 del RGPD, y confirma que el tratamiento respeta los principios del artículo 5, entre ellos la limitación de la finalidad, la minimización de datos, la exactitud y la limitación del plazo de conservación. Los datos recogidos para una finalidad solo se reutilizan (por ejemplo, para entrenar o ajustar un modelo) cuando la nueva finalidad es compatible o existe otra base jurídica.",
        "Categorías especiales de datos",
        "Los datos que revelen el origen étnico o racial, las opiniones políticas, las convicciones religiosas o filosóficas o la afiliación sindical, los datos genéticos, los datos biométricos dirigidos a identificar a una persona y los datos relativos a la salud, a la vida sexual o a la orientación sexual solo se utilizan en sistemas de IA cuando concurre una de las circunstancias del artículo 9 del RGPD y el delegado de protección de datos ha aprobado su uso.",
        "Evaluación de impacto relativa a la protección de datos",
        "Se realiza una evaluación de impacto relativa a la protección de datos antes de todo tratamiento que pueda entrañar un alto riesgo para las personas, como exige el artículo 35 del RGPD, en particular en caso de evaluación sistemática y exhaustiva de personas basada en un tratamiento automatizado, como la elaboración de perfiles, que produzca efectos jurídicos o efectos igualmente significativos, y de tratamiento a gran escala de categorías especiales de datos. En el caso de los sistemas de IA de alto riesgo, la evaluación utiliza la información que el proveedor facilita conforme al artículo 13 del Reglamento de IA.",
        "Minimización en las instrucciones y en el entrenamiento",
        "Solo se introducen en una instrucción o se incluyen en un conjunto de datos los datos necesarios para la tarea. Se da preferencia a los datos anonimizados o seudonimizados, y se utilizan datos sintéticos cuando sean adecuados.",
        "Calidad de los datos de entrenamiento",
        "Cuando la organización sea proveedor de un sistema de IA de alto riesgo, sus conjuntos de datos de entrenamiento, validación y prueba cumplen el artículo 10 del Reglamento de IA (en el caso de los sistemas del anexo III, a partir del 2 de diciembre de 2027): están sujetos a prácticas documentadas de gobernanza de datos que abarcan su origen, su recogida y su preparación y el examen de posibles sesgos y lagunas, y son pertinentes, suficientemente representativos y, en la mayor medida posible, carecen de errores y están completos en vista de su finalidad prevista. Como responsable del despliegue, la organización se asegura de que los datos de entrada que controla sean pertinentes y suficientemente representativos.",
        "Conservación",
        "Las instrucciones, los resultados, los registros de actividad y los conjuntos de datos se conservan solo durante el tiempo que permita el calendario de conservación, y la configuración de las herramientas se ajusta a él. Los registros de los sistemas de alto riesgo bajo control de la organización se conservan durante al menos seis meses. Las solicitudes de las personas para acceder a sus datos, rectificarlos o suprimirlos se atienden respecto de los datos de IA igual que respecto de cualquier otro dato.",
        "Uso de los datos por los proveedores",
        "Ningún proveedor puede utilizar los datos de la organización (entradas, resultados, archivos o contenidos incluidos en la telemetría) para entrenar o mejorar sus modelos, ni para fines propios, sin la aprobación previa y por escrito del responsable de gobernanza de la IA y del delegado de protección de datos. Los proveedores que traten datos personales por cuenta de la organización firman un contrato que cumple el artículo 28 del RGPD.",
        "Transferencias internacionales",
        "Los datos personales solo se transfieren fuera del Espacio Económico Europeo a través de un servicio de IA conforme al capítulo V del RGPD (una decisión de adecuación, cláusulas contractuales tipo acompañadas de una evaluación de la transferencia u otro mecanismo válido), y de acuerdo con los compromisos de localización de datos asumidos con los clientes.",
        "Registros y revisión",
        "El registro de las actividades de tratamiento, las evaluaciones de impacto, la documentación de los conjuntos de datos y las aprobaciones se mantienen actualizados. Esta política se revisa al menos una vez al año.",
      ),
    }),
  },

  // ----------------------------------------------------------
  // AI_PROCUREMENT
  // ----------------------------------------------------------
  {
    id: "core-ai-procurement",
    title: {
      en: "AI Procurement Policy",
      es: "Política de contratación de sistemas de IA",
    },
    type: "AI_PROCUREMENT",
    description: {
      en: "Due diligence, contract terms and re-assessment for any AI system, model or service the organisation buys, licenses or trials.",
      es: "Diligencia debida, cláusulas contractuales y reevaluación de todo sistema, modelo o servicio de IA que la organización adquiere, licencia o prueba.",
    },
    content: withMarker({
      en: doc(
        "Purpose and scope",
        "This policy applies whenever the organisation buys, licenses, subscribes to or trials an AI system, model or service, including free tools, pilots and AI features that a vendor adds to software the organisation already uses. No such tool may process the organisation's data until it has passed the review below.",
        "Roles",
        "The business owner who requests the tool explains its intended use and becomes its system owner. Procurement runs the process. The AI governance lead, information security, the data protection officer and legal review the tool, with a depth that matches its risk classification under the AI Governance Policy.",
        "Due diligence",
        list(
          "Before a contract is signed, the vendor completes the organisation's AI vendor questionnaire, which covers at least:",
          "(a) the intended purpose, known limits, accuracy and the results of bias testing;",
          "(b) the underlying models, who provides them, and the sources of training data;",
          "(c) security controls and certifications (such as ISO/IEC 27001), vulnerability management and protection against misuse, such as prompt injection;",
          "(d) where data is stored and processed, how long it is kept, and whether inputs or outputs are used to train models;",
          "(e) subprocessors, and how the vendor gives notice of changes to them;",
          "(f) past security incidents and personal data breaches;",
          "(g) for high-risk systems, the evidence of conformity required of the provider from 2 December 2027 (EU declaration of conformity, CE marking and registration in the EU database).",
        ),
        "The review also confirms the roles under the EU AI Act. The vendor is normally the provider and the organisation the deployer, but the organisation may itself become a provider if it puts its name or trade mark on a high-risk system, makes a substantial modification to it or changes its intended purpose so that it becomes high-risk.",
        "Contract terms",
        list(
          "Contracts for AI tools include at least:",
          "(a) use of the organisation's data only to provide the service, with no training or improvement of models without prior written approval;",
          "(b) confidentiality and security obligations, and a data processing agreement that meets Article 28 of the GDPR where personal data is processed;",
          "(c) audit and information rights;",
          "(d) notice without undue delay of security incidents, personal data breaches, serious incidents and material changes to models, subprocessors or data location;",
          "(e) a clear allocation of provider and deployer roles under the EU AI Act, and the vendor's cooperation with the organisation's own obligations;",
          "(f) for high-risk systems, instructions for use that meet Article 13 (including the system's capabilities, the limits of its performance, its level of accuracy and the human oversight measures), kept up to date;",
          "(g) return and deletion of the organisation's data when the contract ends.",
        ),
        "Deviations require the approval of the AI governance lead and legal.",
        "General-purpose AI models",
        "Where a product is built on a general-purpose AI model, or the organisation integrates such a model directly, the organisation obtains the documentation that Article 53 requires model providers to make available to downstream providers, and asks about the provider's policy to comply with Union copyright law and its public summary of the content used for training. These obligations have applied since 2 August 2025.",
        "Approval and re-assessment",
        "The AI governance lead approves the tool before the contract is signed and before live data is used. Pilots run with a defined scope and non-sensitive data. Approved tools are entered in the AI inventory and the approved-tool register. Each tool is re-assessed at renewal, at least once a year where it is high-risk or handles sensitive data, and after any material change, such as a new model, a new subprocessor, changed terms or a security incident. Findings that undermine the approval lead to suspension until the tool is re-assessed.",
        "Records",
        "The questionnaire, the review findings, the approvals and the contract are kept with the vendor record.",
      ),
      es: doc(
        "Objeto y ámbito de aplicación",
        "Esta política se aplica siempre que la organización adquiera, licencie, contrate por suscripción o pruebe un sistema, un modelo o un servicio de IA, incluidas las herramientas gratuitas, los pilotos y las funciones de IA que un proveedor añada a un software que la organización ya utiliza. Ninguna de estas herramientas puede tratar datos de la organización hasta haber superado la revisión que se describe a continuación.",
        "Funciones",
        "El responsable de negocio que solicita la herramienta explica su uso previsto y pasa a ser su propietario del sistema. El departamento de compras dirige el proceso. El responsable de gobernanza de la IA, seguridad de la información, el delegado de protección de datos y la asesoría jurídica revisan la herramienta con una profundidad acorde con su clasificación del riesgo conforme a la Política de gobernanza de la IA.",
        "Diligencia debida",
        list(
          "Antes de firmar un contrato, el proveedor cumplimenta el cuestionario de proveedores de IA de la organización, que abarca al menos:",
          "(a) la finalidad prevista, los límites conocidos, la precisión y los resultados de las pruebas de sesgo;",
          "(b) los modelos subyacentes, quién los proporciona y las fuentes de los datos de entrenamiento;",
          "(c) los controles y certificaciones de seguridad (como ISO/IEC 27001), la gestión de vulnerabilidades y la protección frente a usos indebidos, como la inyección de instrucciones;",
          "(d) dónde se almacenan y tratan los datos, durante cuánto tiempo se conservan y si las entradas o los resultados se utilizan para entrenar modelos;",
          "(e) los subencargados del tratamiento y la forma en que el proveedor comunica los cambios que les afectan;",
          "(f) los incidentes de seguridad y las violaciones de la seguridad de los datos personales anteriores;",
          "(g) en el caso de los sistemas de alto riesgo, las pruebas de conformidad exigidas al proveedor a partir del 2 de diciembre de 2027 (declaración UE de conformidad, marcado CE e inscripción en la base de datos de la UE).",
        ),
        "La revisión confirma también las funciones conforme al Reglamento de IA. Normalmente el proveedor de la herramienta es el proveedor del sistema y la organización es el responsable del despliegue, pero la organización puede pasar a ser proveedor si pone su nombre o su marca en un sistema de alto riesgo, introduce en él una modificación sustancial o modifica su finalidad prevista de modo que pase a ser de alto riesgo.",
        "Cláusulas contractuales",
        list(
          "Los contratos de herramientas de IA incluyen al menos:",
          "(a) el uso de los datos de la organización únicamente para prestar el servicio, sin entrenar ni mejorar modelos sin aprobación previa y por escrito;",
          "(b) obligaciones de confidencialidad y de seguridad, y un contrato de encargo del tratamiento que cumpla el artículo 28 del RGPD cuando se traten datos personales;",
          "(c) derechos de auditoría y de información;",
          "(d) la notificación sin dilación indebida de los incidentes de seguridad, las violaciones de la seguridad de los datos personales, los incidentes graves y los cambios significativos de los modelos, de los subencargados del tratamiento o de la localización de los datos;",
          "(e) una asignación clara de las funciones de proveedor y de responsable del despliegue conforme al Reglamento de IA, y la colaboración del proveedor en el cumplimiento de las obligaciones propias de la organización;",
          "(f) en el caso de los sistemas de alto riesgo, unas instrucciones de uso que cumplan el artículo 13 (incluidas las capacidades del sistema, los límites de su funcionamiento, su nivel de precisión y las medidas de supervisión humana), mantenidas al día;",
          "(g) la devolución y la supresión de los datos de la organización a la terminación del contrato.",
        ),
        "Las excepciones requieren la aprobación del responsable de gobernanza de la IA y de la asesoría jurídica.",
        "Modelos de IA de uso general",
        "Cuando un producto se base en un modelo de IA de uso general, o la organización integre directamente un modelo de este tipo, la organización obtiene la documentación que el artículo 53 obliga a los proveedores de modelos a poner a disposición de los proveedores posteriores, y se informa sobre la política del proveedor para cumplir el Derecho de la Unión en materia de derechos de autor y sobre su resumen público del contenido utilizado para el entrenamiento. Estas obligaciones son aplicables desde el 2 de agosto de 2025.",
        "Aprobación y reevaluación",
        "El responsable de gobernanza de la IA aprueba la herramienta antes de la firma del contrato y antes de que se utilicen datos reales. Los pilotos se realizan con un alcance definido y con datos no sensibles. Las herramientas aprobadas se inscriben en el inventario de IA y en el registro de herramientas aprobadas. Cada herramienta se reevalúa en la renovación, al menos una vez al año cuando es de alto riesgo o trata datos sensibles, y tras cualquier cambio significativo, como un nuevo modelo, un nuevo subencargado del tratamiento, un cambio de condiciones o un incidente de seguridad. Las conclusiones que desvirtúen la aprobación dan lugar a la suspensión de la herramienta hasta que se reevalúe.",
        "Registros",
        "El cuestionario, las conclusiones de la revisión, las aprobaciones y el contrato se conservan junto con la ficha del proveedor.",
      ),
    }),
  },

  // ----------------------------------------------------------
  // AI_INCIDENT_RESPONSE
  // ----------------------------------------------------------
  {
    id: "core-ai-incident-response",
    title: {
      en: "AI Incident Response Policy",
      es: "Política de respuesta a incidentes de IA",
    },
    type: "AI_INCIDENT_RESPONSE",
    description: {
      en: "How AI incidents are reported, triaged, contained, notified to authorities where required, and learned from.",
      es: "Cómo se comunican, evalúan, contienen y notifican a las autoridades, cuando procede, los incidentes de IA, y qué enseñanzas se extraen de ellos.",
    },
    content: withMarker({
      en: doc(
        "Purpose and scope",
        "This policy sets out how the organisation detects, reports, handles and learns from AI incidents. It applies to all AI systems in the AI inventory and to AI tools used in breach of the AI Acceptable Use Policy.",
        "What counts as an AI incident",
        list(
          "An AI incident is any event in which an AI system, or its use:",
          "(a) causes or could cause harm to health, safety, property, the environment or fundamental rights;",
          "(b) produces incorrect, discriminatory or unsafe output that is or may be relied on;",
          "(c) exposes confidential information or personal data, including through prompts, outputs or a vendor breach;",
          "(d) is used for a prohibited or unapproved purpose;",
          "(e) is attacked or manipulated, for example by prompt injection or data poisoning;",
          "(f) acts outside its intended purpose, including an AI agent taking an action it was not authorised to take.",
        ),
        "A serious incident, as the EU AI Act defines it, is an incident or malfunction that directly or indirectly leads to the death of a person or serious harm to health, serious and irreversible disruption of critical infrastructure, an infringement of obligations under Union law that protect fundamental rights, or serious harm to property or the environment.",
        "Reporting",
        "Anyone who suspects an AI incident reports it at once, and within 24 hours at most, to the AI governance lead through the incident channel in the governance system; suspected personal data breaches also go at once to the data protection officer. No one will be penalised for reporting in good faith.",
        "Triage",
        "The AI governance lead and the system owner assess the incident within one working day (an internal target): its severity, whether personal data is involved, whether it may be a serious incident, whether the system is high-risk, whether the organisation is provider or deployer, and which notifications may be due and by when. They appoint an incident lead.",
        "Containment",
        "The incident lead limits the harm, for example by suspending the system or feature, reverting to a manual process, revoking access, or correcting or withdrawing affected outputs and decisions. The system owner and the AI governance lead may suspend a system without prior approval from management. Evidence (prompts, outputs, logs, model version and configuration) is preserved.",
        "Notification",
        "EU AI Act. For high-risk systems, providers report serious incidents under Article 73 to the market surveillance authorities of the Member State where the incident occurred, immediately after establishing a causal link (or its reasonable likelihood) and not later than 15 days after becoming aware of it; shorter limits apply where a person has died (10 days) and for a widespread infringement or a serious disruption of critical infrastructure (2 days). A deployer that identifies a serious incident must immediately inform first the provider, and then the importer or distributor and the relevant market surveillance authorities (Article 26(5)); if it cannot reach the provider, Article 73 applies to it. For Annex III systems these duties apply from 2 December 2027; the organisation already applies the same internal escalation to all its systems.",
        "GDPR. Where the incident is a personal data breach, the organisation, as controller, notifies the competent supervisory authority without undue delay and, where feasible, within 72 hours of becoming aware of it, unless the breach is unlikely to result in a risk to people's rights and freedoms (Article 33). Where the risk is high, it also informs the persons affected without undue delay (Article 34). Where it acts as processor, it notifies the controller without undue delay.",
        "Legal assesses any other notice for each incident, such as to customers under contract, insurers, sector regulators or under US state breach notification laws.",
        "Root cause and lessons learned",
        "Every incident rated high or critical closes with a review of its root cause (data, model, configuration, human oversight, vendor or misuse), corrective actions with owners and due dates, and any changes needed to the risk classification, controls, training, contracts or policies. Findings are shared with the provider where relevant and, where the organisation is a provider, fed into its post-market monitoring under Article 72. Management receives a summary.",
        "Records and review",
        "The incident register records each incident, when the organisation became aware of it, each decision and its reasons, each notification and when it was made, the evidence and the corrective actions. Every personal data breach is documented, as Article 33 requires. This policy and the reporting channel are tested and reviewed at least once a year.",
      ),
      es: doc(
        "Objeto y ámbito de aplicación",
        "Esta política establece cómo la organización detecta, comunica y gestiona los incidentes de IA, y cómo extrae enseñanzas de ellos. Se aplica a todos los sistemas de IA del inventario de IA y a las herramientas de IA utilizadas en contra de la Política de uso aceptable de la IA.",
        "Qué es un incidente de IA",
        list(
          "Un incidente de IA es cualquier hecho en el que un sistema de IA, o su uso:",
          "(a) cause o pueda causar daños a la salud, a la seguridad, a bienes, al medio ambiente o a los derechos fundamentales;",
          "(b) produzca resultados incorrectos, discriminatorios o inseguros en los que alguien se base o pueda basarse;",
          "(c) exponga información confidencial o datos personales, incluso a través de instrucciones, de resultados o de una brecha de un proveedor;",
          "(d) se utilice para una finalidad prohibida o no aprobada;",
          "(e) sea objeto de ataque o manipulación, por ejemplo mediante inyección de instrucciones o envenenamiento de datos;",
          "(f) actúe fuera de su finalidad prevista, incluido el caso de un agente de IA que realice una acción para la que no estaba autorizado.",
        ),
        "Un incidente grave, según la definición del Reglamento de IA, es un incidente o defecto de funcionamiento que, directa o indirectamente, tenga como consecuencia el fallecimiento de una persona o daños graves para la salud, una alteración grave e irreversible de infraestructuras críticas, el incumplimiento de obligaciones en virtud del Derecho de la Unión que protegen los derechos fundamentales, o daños graves a la propiedad o al medio ambiente.",
        "Comunicación",
        "Quien sospeche que se ha producido un incidente de IA lo comunica de inmediato, y como máximo en un plazo de 24 horas, al responsable de gobernanza de la IA a través del canal de incidentes del sistema de gobernanza; las sospechas de violación de la seguridad de los datos personales se comunican también de inmediato al delegado de protección de datos. No se sancionará a nadie por comunicar un incidente de buena fe.",
        "Evaluación inicial",
        "El responsable de gobernanza de la IA y el propietario del sistema evalúan el incidente en un día hábil (como objetivo interno): su gravedad, si afecta a datos personales, si puede tratarse de un incidente grave, si el sistema es de alto riesgo, si la organización actúa como proveedor o como responsable del despliegue, y qué notificaciones pueden ser obligatorias y en qué plazos. Designan a un responsable del incidente.",
        "Contención",
        "El responsable del incidente limita el daño, por ejemplo suspendiendo el sistema o la función, volviendo a un proceso manual, revocando accesos o corrigiendo o retirando los resultados y las decisiones afectados. El propietario del sistema y el responsable de gobernanza de la IA pueden suspender un sistema sin aprobación previa de la dirección. Se conservan las pruebas (instrucciones, resultados, registros de actividad, versión del modelo y configuración).",
        "Notificación",
        "Reglamento de IA. En el caso de los sistemas de alto riesgo, los proveedores notifican los incidentes graves conforme al artículo 73 a las autoridades de vigilancia del mercado del Estado miembro en el que se haya producido el incidente, inmediatamente después de establecer un vínculo causal (o la probabilidad razonable de que exista) y, en todo caso, en un plazo máximo de 15 días desde que tengan conocimiento de él; se aplican plazos más breves en caso de fallecimiento de una persona (10 días) y en caso de infracción generalizada o de alteración grave de infraestructuras críticas (2 días). El responsable del despliegue que detecte un incidente grave debe informar inmediatamente, en primer lugar, al proveedor y, a continuación, al importador o distribuidor y a las autoridades de vigilancia del mercado pertinentes (artículo 26, apartado 5); si no puede contactar con el proveedor, se le aplica el artículo 73. En el caso de los sistemas del anexo III, estas obligaciones se aplican a partir del 2 de diciembre de 2027; la organización ya aplica el mismo procedimiento interno de escalado a todos sus sistemas.",
        "RGPD. Cuando el incidente constituya una violación de la seguridad de los datos personales, la organización, como responsable del tratamiento, la notifica a la autoridad de control competente sin dilación indebida y, de ser posible, en un plazo de 72 horas desde que haya tenido constancia de ella, salvo que sea improbable que constituya un riesgo para los derechos y libertades de las personas (artículo 33). Cuando el riesgo sea alto, informa también sin dilación indebida a las personas afectadas (artículo 34). Cuando actúe como encargado del tratamiento, lo notifica sin dilación indebida al responsable del tratamiento.",
        "La asesoría jurídica evalúa en cada incidente cualquier otro aviso, por ejemplo a clientes por contrato, a aseguradoras, a supervisores sectoriales o conforme a las leyes estatales de Estados Unidos sobre notificación de brechas.",
        "Causa raíz y enseñanzas",
        "Todo incidente calificado como alto o crítico se cierra con una revisión de su causa raíz (datos, modelo, configuración, supervisión humana, proveedor o uso indebido), de las medidas correctoras, con sus responsables y fechas límite, y de los cambios necesarios en la clasificación del riesgo, los controles, la formación, los contratos o las políticas. Las conclusiones se comparten con el proveedor cuando proceda y, cuando la organización sea proveedor, se incorporan a su vigilancia poscomercialización conforme al artículo 72. La dirección recibe un resumen.",
        "Registros y revisión",
        "El registro de incidentes recoge cada incidente, el momento en que la organización tuvo conocimiento de él, cada decisión y sus motivos, cada notificación y el momento en que se realizó, las pruebas y las medidas correctoras. Toda violación de la seguridad de los datos personales se documenta, como exige el artículo 33. Esta política y el canal de comunicación se ponen a prueba y se revisan al menos una vez al año.",
      ),
    }),
  },
];

// ============================================================
// HELPERS
// ============================================================

/**
 * The core policies whose type is not already covered. The Quick Start wizard
 * passes the types a chosen template (or the org) already has, so the pack only
 * fills gaps and never duplicates a policy of the same type.
 */
export function corePoliciesMissingFrom(types: Iterable<string>): CorePolicy[] {
  const present = new Set<string>(types);
  return CORE_POLICY_PACK.filter((p) => !present.has(p.type));
}

/** Resolve a core policy to plain strings in one locale. */
export function localizeCorePolicy(
  p: CorePolicy,
  locale: CorePolicyLocale,
): LocalizedCorePolicy {
  return {
    title: p.title[locale],
    type: p.type,
    description: p.description[locale],
    content: p.content[locale],
  };
}
