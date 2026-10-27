// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The three short guides a newcomer needs before the product makes sense:
 * "What is my role?", "What is high risk?" and "Which rules apply to me?",
 * and a fourth, longer reference guide on the rules aimed at frontier AI
 * developers and what they mean for an organization that uses AI.
 *
 * They are docs pages under /docs/guides, linked from every help panel and
 * from the first-run card. The content is typed data here (bilingual), like
 * the rest of the help feature, so a page stays a thin renderer and a sister
 * app can reuse the same shape.
 *
 * Legal references are named in the text, not hidden, and each guide carries
 * the official links it rests on. Content is plain, not advice: it explains
 * the law, it does not decide a reader's position for them.
 */

import type { Localized } from "@/config/lawfirm-ai-toolkit";
import { OFFICIAL_LINKS, type OfficialLink } from "@/config/help/official-links";

const L = (en: string, es: string): Localized => ({ en, es });

export interface GuideItem {
  /** A short bold lead, e.g. a role name or a risk area. */
  term: Localized;
  /** The plain explanation. */
  body: Localized;
  /** An example, shown as "For example: ...". Optional. */
  example?: Localized;
}

export interface GuideSection {
  heading: Localized;
  /** Free paragraphs before the items. */
  intro?: Localized;
  items?: GuideItem[];
}

export interface Guide {
  slug: "my-role" | "high-risk" | "which-rules" | "frontier-ai";
  title: Localized;
  lead: Localized;
  sections: GuideSection[];
  official: OfficialLink[];
  /**
   * Heading for the source list. Defaults to the generic "the law itself"
   * label; a guide that also cites proposals, not only law, names its own.
   */
  sourcesHeading?: Localized;
  /** Where the reader most likely goes next, inside the product. */
  next?: { href: string; label: Localized };
}

export const GUIDES: Guide[] = [
  {
    slug: "my-role",
    title: L("What is my role?", "¿Cuál es mi papel?"),
    lead: L(
      "The EU AI Act gives you duties according to the role you play around an AI system. Most organizations are deployers; some are also providers. The same organization can hold more than one role, even for the same system.",
      "El RIA te asigna obligaciones según el papel que desempeñes en relación con un sistema de IA. La mayoría de las organizaciones son responsables del despliegue; algunas son además proveedores. Una misma organización puede tener más de un papel, incluso respecto al mismo sistema.",
    ),
    sections: [
      {
        heading: L("The roles", "Los papeles"),
        items: [
          {
            term: L("Provider", "Proveedor"),
            body: L(
              "Develops an AI system, or has one developed, and places it on the market or puts it into service under its own name (Art. 3). Providers carry the heaviest duties, including conformity assessment for high-risk systems.",
              "Desarrolla un sistema de IA, o hace que se desarrolle, y lo introduce en el mercado o lo pone en servicio con su propio nombre (art. 3). Los proveedores asumen las obligaciones más gravosas, incluida la evaluación de la conformidad de los sistemas de alto riesgo.",
            ),
            example: L(
              "A company that builds a CV-screening tool and sells it to employers.",
              "Una empresa que construye una herramienta de cribado de currículums y la vende a empleadores.",
            ),
          },
          {
            term: L("Deployer", "Responsable del despliegue"),
            body: L(
              "Uses an AI system under its own authority in the course of its work (Art. 3). Deployers must use the system as instructed, keep human oversight, and, for some high-risk uses, carry out a fundamental rights impact assessment.",
              "Utiliza un sistema de IA bajo su propia autoridad en el marco de su actividad (art. 3). Los responsables del despliegue deben usar el sistema conforme a las instrucciones, mantener la supervisión humana y, para ciertos usos de alto riesgo, realizar una evaluación de impacto en los derechos fundamentales.",
            ),
            example: L(
              "An employer that runs that CV-screening tool to shortlist candidates.",
              "Un empleador que utiliza esa herramienta de cribado de currículums para preseleccionar candidatos.",
            ),
          },
          {
            term: L("Importer", "Importador"),
            body: L(
              "Placed in the EU, it puts on the market an AI system that carries the name of a provider established outside the EU (Art. 3), and must check the provider did its part.",
              "Establecido en la UE, introduce en el mercado un sistema de IA que lleva el nombre de un proveedor establecido fuera de la UE (art. 3), y debe comprobar que el proveedor ha cumplido su parte.",
            ),
            example: L(
              "An EU reseller of an AI product made by a company in another country.",
              "Un distribuidor de la UE de un producto de IA fabricado por una empresa de otro país.",
            ),
          },
          {
            term: L("Distributor", "Distribuidor"),
            body: L(
              "Any other party in the supply chain that makes an AI system available on the market (Art. 3), with a duty to check the required marks and documents are present.",
              "Cualquier otra parte de la cadena de suministro que comercializa un sistema de IA (art. 3), con el deber de comprobar que existen las marcas y los documentos exigidos.",
            ),
          },
          {
            term: L("GPAI provider", "Proveedor de IA de uso general"),
            body: L(
              "The provider of a general-purpose AI model, such as a large language model many applications build on, with its own duties on documentation and, for the most capable models, systemic-risk controls (Arts. 53 to 55).",
              "El proveedor de un modelo de IA de uso general, como un gran modelo de lenguaje sobre el que se construyen muchas aplicaciones, con obligaciones propias de documentación y, para los modelos más capaces, controles de riesgo sistémico (arts. 53 a 55).",
            ),
          },
        ],
      },
      {
        heading: L("Why it matters here", "Por qué importa aquí"),
        intro: L(
          "When you register a system you tell AI Sentinel your role for it. That choice decides which duties the product raises, which documents it drafts, and which questions the assessment asks. If you are unsure, start as a deployer: it is the most common role and you can add the provider role later.",
          "Cuando registras un sistema, indicas a AI Sentinel tu papel respecto a él. Esa elección decide qué obligaciones plantea el producto, qué documentos redacta y qué preguntas hace la evaluación. Si tienes dudas, empieza como responsable del despliegue: es el papel más habitual y podrás añadir el de proveedor más adelante.",
        ),
      },
    ],
    official: [OFFICIAL_LINKS.euAiAct, OFFICIAL_LINKS.euArt26],
    next: {
      href: "/governance/ai-registry",
      label: L("Go to the AI registry", "Ir al registro de IA"),
    },
  },
  {
    slug: "high-risk",
    title: L("What is high risk?", "¿Qué es el alto riesgo?"),
    lead: L(
      "The EU AI Act sorts AI uses into four tiers: prohibited, high, limited and minimal. High risk is the tier that carries the substantial duties, and it is defined by what the system is used for, not by how advanced it is. A simple system in a high-risk area is high risk; a sophisticated one in a harmless area is not.",
      "El RIA ordena los usos de la IA en cuatro niveles: prohibido, alto, limitado y mínimo. El alto riesgo es el nivel que conlleva las obligaciones sustanciales, y se define por para qué se usa el sistema, no por lo avanzado que sea. Un sistema sencillo en un área de alto riesgo es de alto riesgo; uno sofisticado en un área inocua no lo es.",
    ),
    sections: [
      {
        heading: L("The two routes to high risk (Art. 6)", "Las dos vías al alto riesgo (art. 6)"),
        items: [
          {
            term: L("Safety component of a regulated product", "Componente de seguridad de un producto regulado"),
            body: L(
              "The system is a safety component of a product already covered by EU product-safety law (for example machinery or medical devices), or is itself such a product (Art. 6(1)).",
              "El sistema es un componente de seguridad de un producto ya cubierto por la legislación de seguridad de productos de la UE (por ejemplo, máquinas o productos sanitarios), o es él mismo uno de esos productos (art. 6.1).",
            ),
          },
          {
            term: L("A use listed in Annex III", "Un uso enumerado en el anexo III"),
            body: L(
              "The system is used in one of the areas the Act lists as high risk in Annex III. This is the route most organizations meet.",
              "El sistema se utiliza en una de las áreas que la norma enumera como de alto riesgo en el anexo III. Es la vía que encuentran la mayoría de las organizaciones.",
            ),
          },
        ],
      },
      {
        heading: L("The Annex III areas, in plain words", "Las áreas del anexo III, en palabras llanas"),
        intro: L(
          "Biometrics; critical infrastructure; education and vocational training; employment, worker management and access to self-employment; access to essential private and public services (including creditworthiness and insurance pricing); law enforcement; migration, asylum and border control; and the administration of justice and democratic processes. A narrow carve-out exists where the system does not pose a significant risk, for example purely preparatory tasks; note that financial-fraud detection is treated as minimal risk, not high.",
          "Biometría; infraestructuras críticas; educación y formación profesional; empleo, gestión de trabajadores y acceso al trabajo por cuenta propia; acceso a servicios esenciales privados y públicos (incluidas la solvencia crediticia y la fijación de precios de seguros); aplicación de la ley; migración, asilo y control de fronteras; y administración de justicia y procesos democráticos. Existe una excepción limitada cuando el sistema no plantea un riesgo significativo, por ejemplo tareas meramente preparatorias; ten en cuenta que la detección de fraude financiero se considera de riesgo mínimo, no alto.",
        ),
      },
      {
        heading: L("What follows if you are high risk", "Qué se deriva de ser de alto riesgo"),
        intro: L(
          "A high-risk system draws the substantial duties: risk management, data governance, technical documentation, record-keeping, transparency to deployers, human oversight, and accuracy, robustness and cybersecurity. Providers carry out a conformity assessment; certain deployers carry out a fundamental rights impact assessment. AI Sentinel raises exactly these once a system is classified high risk.",
          "Un sistema de alto riesgo atrae las obligaciones sustanciales: gestión de riesgos, gobernanza de datos, documentación técnica, conservación de registros, transparencia hacia los responsables del despliegue, supervisión humana y exactitud, solidez y ciberseguridad. Los proveedores realizan una evaluación de la conformidad; determinados responsables del despliegue realizan una evaluación de impacto en los derechos fundamentales. AI Sentinel plantea justamente estas obligaciones en cuanto un sistema se clasifica como de alto riesgo.",
        ),
      },
    ],
    official: [OFFICIAL_LINKS.euArt6, OFFICIAL_LINKS.euAnnexIII, OFFICIAL_LINKS.euArt5],
    next: {
      href: "/governance/risk-classification",
      label: L("Classify a system", "Clasificar un sistema"),
    },
  },
  {
    slug: "which-rules",
    title: L("Which rules apply to me?", "¿Qué normas me aplican?"),
    lead: L(
      "More than one body of law can reach the same AI system at once: the EU AI Act, the GDPR, and AI or data acts from individual US states. Which apply depends on where you operate and what the system does. AI Sentinel works this out for you, but it can only do so from facts you give it.",
      "Más de un cuerpo normativo puede alcanzar a la vez al mismo sistema de IA: el RIA, el RGPD y leyes de IA o de datos de distintos estados de EE. UU. Cuáles aplican depende de dónde operas y de qué hace el sistema. AI Sentinel lo determina por ti, pero solo a partir de los datos que le facilites.",
    ),
    sections: [
      {
        heading: L("How the product decides", "Cómo lo decide el producto"),
        intro: L(
          "You declare your operating jurisdictions and answer a short screening for each regime in Settings. Each system's own facts (its role, its risk tier, whether it makes automated decisions, whether it processes health data) then decide which regimes reach it. Where a fact is undeclared, the product treats the regime as undetermined and applies nothing: \"we do not know\" never becomes \"none of this applies to you\".",
          "Declaras tus jurisdicciones de actividad y respondes un breve análisis para cada régimen en Configuración. Después, los datos propios de cada sistema (su papel, su nivel de riesgo, si toma decisiones automatizadas, si trata datos de salud) deciden qué regímenes lo alcanzan. Cuando un dato no se ha declarado, el producto considera el régimen indeterminado y no aplica nada: «no lo sabemos» nunca se convierte en «nada de esto te aplica».",
        ),
      },
      {
        heading: L("The one-question-set promise", "La promesa de un único conjunto de preguntas"),
        intro: L(
          "You answer one question set, not one per law. AI Sentinel drafts to the strictest regime that applies and produces the documents each regime expects, reusing an answer across regimes where the legal test is the same and recording the reasoning. So a single assessment can satisfy the EU AI Act, the GDPR and a US state act together, without you answering the same thing three times.",
          "Respondes un único conjunto de preguntas, no uno por ley. AI Sentinel redacta según el régimen más estricto que aplique y produce los documentos que espera cada régimen, reutilizando una respuesta entre regímenes cuando la prueba legal es la misma y registrando el razonamiento. Así, una sola evaluación puede satisfacer a la vez el RIA, el RGPD y una ley estatal de EE. UU., sin que respondas lo mismo tres veces.",
        ),
      },
      {
        heading: L("Start with the applicability check", "Empieza por la comprobación de aplicabilidad"),
        intro: L(
          "The fastest way to see your picture is the applicability check: it reads your declared facts and shows which regimes are in scope, out of scope, or still undetermined for want of an answer. Fill the gaps it shows and the obligations calendar and the generated documents follow.",
          "La forma más rápida de ver tu situación es la comprobación de aplicabilidad: lee los datos que has declarado y muestra qué regímenes están dentro del alcance, fuera de él o aún indeterminados por falta de respuesta. Cubre los huecos que señala y el calendario de obligaciones y los documentos generados vendrán detrás.",
        ),
      },
    ],
    official: [OFFICIAL_LINKS.euAiAct, OFFICIAL_LINKS.gdpr],
    next: {
      href: "/governance/settings",
      label: L("Set your jurisdictions", "Fija tus jurisdicciones"),
    },
  },
  {
    slug: "frontier-ai",
    title: L("Frontier AI rules and your AI program", "Las normas sobre IA de frontera y tu programa de IA"),
    lead: L(
      "Three sets of rules aim at the companies that build the most capable AI models: California's Transparency in Frontier Artificial Intelligence Act (SB 53), the EU AI Act's rules for general-purpose AI models, and a federal framework that Anthropic proposed in June 2026. They place duties on those developers, not on the organizations that use their models. If your organization uses AI, they reach you mostly through the information developers must now publish or pass on to you, and that information is useful evidence for your own program.",
      "Tres conjuntos de normas se dirigen a las empresas que construyen los modelos de IA más capaces: la Ley de transparencia en la inteligencia artificial de frontera de California (SB 53), las normas del RIA para los modelos de IA de uso general y un marco federal que Anthropic ha propuesto en junio de 2026. Imponen obligaciones a esos desarrolladores, no a las organizaciones que utilizan sus modelos. Si tu organización utiliza IA, te alcanzan sobre todo a través de la información que los desarrolladores deben ahora publicar o transmitirte, y esa información es una prueba útil para tu propio programa.",
    ),
    sections: [
      {
        heading: L("Who these rules apply to", "A quién se aplican estas normas"),
        items: [
          {
            term: L("California SB 53 (in force since 1 January 2026)", "SB 53 de California (en vigor desde el 1 de enero de 2026)"),
            body: L(
              "Signed on 29 September 2025. A frontier developer is a person that has trained, or begun training, a foundation model using more than 10²⁶ computing operations. Every frontier developer must publish a transparency report when it deploys a new or substantially modified frontier model (it may form part of a system card) and report critical safety incidents to the California Office of Emergency Services within 15 days of discovering them, or within 24 hours to an appropriate authority where an incident poses an imminent risk of death or serious physical injury. A large frontier developer (more than $500 million in annual gross revenue, with its affiliates, in the preceding calendar year) must also publish a frontier AI framework, review it at least once a year, and send the Office of Emergency Services a summary of its internal-use catastrophic risk assessments every three months, or on another reasonable schedule it sets and communicates. Employees who report catastrophic risks are protected, and only the Attorney General can seek civil penalties of up to $1 million per violation.",
              "Firmada el 29 de septiembre de 2025. Un desarrollador de frontera es quien ha entrenado, o ha iniciado el entrenamiento de, un modelo fundacional con más de 10²⁶ operaciones de cómputo. Todo desarrollador de frontera debe publicar un informe de transparencia cuando despliega un modelo de frontera nuevo o sustancialmente modificado (puede formar parte de una ficha del sistema) y notificar los incidentes críticos de seguridad a la Oficina de Servicios de Emergencia de California en los 15 días siguientes a su descubrimiento, o en 24 horas a la autoridad competente cuando un incidente supone un riesgo inminente de muerte o de lesión física grave. Un gran desarrollador de frontera (más de 500 millones de dólares de ingresos brutos anuales, junto con sus filiales, en el año natural anterior) debe además publicar un marco de IA de frontera, revisarlo al menos una vez al año y enviar a esa Oficina un resumen de sus evaluaciones del riesgo catastrófico derivado del uso interno cada tres meses, o con otra periodicidad razonable que fije y comunique. Se protege a los empleados que denuncian riesgos catastróficos, y solo el Fiscal General puede reclamar sanciones civiles de hasta 1 millón de dólares por infracción.",
            ),
          },
          {
            term: L("EU AI Act: general-purpose AI models (Arts. 53 and 55)", "RIA: modelos de IA de uso general (arts. 53 y 55)"),
            body: L(
              "Every provider of a general-purpose AI model must keep technical documentation for the authorities, give the providers who integrate the model into their own AI systems the information they need to understand its capabilities and limitations (Art. 53(1)(b) and Annex XII), adopt a copyright policy, and publish a summary of the content used for training. A model is presumed to carry systemic risk when its training used more than 10²⁵ floating-point operations (Art. 51(2)); its provider must also evaluate it, including adversarial testing, assess and mitigate systemic risks, report serious incidents to the AI Office without undue delay, and protect its cybersecurity (Art. 55).",
              "Todo proveedor de un modelo de IA de uso general debe mantener documentación técnica para las autoridades, facilitar a los proveedores que integran el modelo en sus propios sistemas de IA la información que necesitan para entender sus capacidades y limitaciones (art. 53.1.b y anexo XII), adoptar directrices sobre derechos de autor y publicar un resumen del contenido utilizado para el entrenamiento. Se presume que un modelo tiene riesgo sistémico cuando su entrenamiento ha utilizado más de 10²⁵ operaciones de coma flotante (art. 51.2); su proveedor debe además evaluarlo, incluidas pruebas adversarias, evaluar y mitigar los riesgos sistémicos, comunicar los incidentes graves a la Oficina de IA sin demora indebida y proteger su ciberseguridad (art. 55).",
            ),
          },
          {
            term: L("EU AI Act: the dates", "RIA: las fechas"),
            body: L(
              "These obligations apply since 2 August 2025 (Art. 113). The Commission's enforcement powers apply from 2 August 2026: it can request information and access to a model, require measures, ask a provider to restrict, withdraw or recall a model (Art. 93), and fine up to 3% of worldwide annual turnover or EUR 15 million, whichever is higher (Art. 101). Models placed on the market before 2 August 2025 must comply by 2 August 2027 (Art. 111(3)).",
              "Estas obligaciones se aplican desde el 2 de agosto de 2025 (art. 113). Los poderes de ejecución de la Comisión se aplican desde el 2 de agosto de 2026: puede solicitar información y acceso a un modelo, exigir medidas, pedir a un proveedor que restrinja la comercialización de un modelo, lo retire o lo recupere (art. 93) e imponer multas de hasta el 3 % del volumen de negocios mundial anual o de 15 millones de euros, si esta cifra es superior (art. 101). Los modelos introducidos en el mercado antes del 2 de agosto de 2025 deben cumplir a más tardar el 2 de agosto de 2027 (art. 111.3).",
            ),
          },
          {
            term: L("The General-Purpose AI Code of Practice", "El Código de buenas prácticas de IA de uso general"),
            body: L(
              "A voluntary code the Commission received on 10 July 2025. It has three chapters: Transparency and Copyright, for every provider, and Safety and Security, for the few providers of the most advanced models. The Transparency chapter includes a Model Documentation Form. Providers that sign it can rely on it to show they meet Arts. 53 and 55 until a harmonised standard is published (Arts. 53(4) and 55(2)).",
              "Un código voluntario que la Comisión ha recibido el 10 de julio de 2025. Tiene tres capítulos: Transparencia y Derechos de autor, para todos los proveedores, y Seguridad y Protección, para los pocos proveedores de los modelos más avanzados. El capítulo de Transparencia incluye un formulario de documentación del modelo. Los proveedores que lo firman pueden apoyarse en él para demostrar que cumplen los arts. 53 y 55 hasta que se publique una norma armonizada (arts. 53.4 y 55.2).",
            ),
          },
          {
            term: L("Anthropic's Advanced AI Framework (a proposal, not law)", "El Advanced AI Framework de Anthropic (una propuesta, no una ley)"),
            body: L(
              "A policy proposal published in June 2026, written mainly for the US federal government. It would cover developers that train models with more than 10²⁵ operations and either earn more than $500 million a year in AI revenue or spend more than $1 billion a year on AI research and development. They would publish a safety framework and certify compliance with it every year, publish a system card for each covered model release or major new capability and a risk report at least every six months, report critical safety incidents to a federal agency within 15 days, and engage an independent evaluator. It creates no duty today.",
              "Una propuesta normativa publicada en junio de 2026, pensada sobre todo para el Gobierno federal de EE. UU. Abarcaría a los desarrolladores que entrenen modelos con más de 10²⁵ operaciones y que, además, ingresen más de 500 millones de dólares al año por IA o inviertan más de 1.000 millones de dólares al año en investigación y desarrollo de IA. Deberían publicar un marco de seguridad y certificar cada año que lo cumplen, publicar una ficha del sistema por cada lanzamiento de un modelo cubierto o cada nueva capacidad importante y un informe de riesgos al menos cada seis meses, notificar los incidentes críticos de seguridad a una agencia federal en 15 días y contar con un evaluador independiente. Hoy no crea ninguna obligación.",
            ),
          },
        ],
      },
      {
        heading: L("What they mean if your organization uses AI", "Qué suponen si tu organización utiliza IA"),
        intro: L(
          "An organization that uses AI models built by others is very unlikely to meet these thresholds. The rules still matter to it, because they make the developers of the models it relies on publish or hand over information it can use.",
          "Es muy poco probable que una organización que utiliza modelos de IA construidos por otros alcance estos umbrales. Aun así, las normas le importan, porque obligan a los desarrolladores de los modelos de los que depende a publicar o entregar información que puede aprovechar.",
        ),
        items: [
          {
            term: L("Published documents you can ask for and keep", "Documentos publicados que puedes pedir y conservar"),
            body: L(
              "A frontier AI framework and a transparency report or system card for each frontier model (California), the public training-content summary and the provider's copyright policy (EU), and whether the provider has signed the Code of Practice. Each tells you something about intended uses, restrictions on use and known risks that belongs in your own risk assessment and vendor review.",
              "Un marco de IA de frontera y un informe de transparencia o una ficha del sistema para cada modelo de frontera (California), el resumen público del contenido de entrenamiento y las directrices del proveedor sobre derechos de autor (UE), y si el proveedor ha firmado el Código de buenas prácticas. Cada uno te dice algo sobre usos previstos, restricciones de uso y riesgos conocidos que tiene su lugar en tu propia evaluación de riesgos y en la revisión del proveedor.",
            ),
          },
          {
            term: L("Documentation passed downstream", "Documentación que se transmite aguas abajo"),
            body: L(
              "If you build a general-purpose model into an AI system that you provide, including one you put into service for your own use, you are a downstream provider under the EU AI Act (Art. 3(68)) and the model's provider must give you the information in Art. 53(1)(b) and Annex XII. If you change a model substantially, check whether you become its provider; the Commission's guidelines for providers of general-purpose AI models explain who is in scope. The AI Office also runs a channel for downstream providers to report suspected infringements by model providers.",
              "Si integras un modelo de uso general en un sistema de IA del que eres proveedor, incluido uno que pones en servicio para tu propio uso, eres un proveedor posterior conforme al RIA (art. 3.68) y el proveedor del modelo debe facilitarte la información del art. 53.1.b y del anexo XII. Si modificas un modelo de forma sustancial, comprueba si pasas a ser su proveedor; las directrices de la Comisión para los proveedores de modelos de IA de uso general explican quién está incluido. La Oficina de IA dispone además de un canal para que los proveedores posteriores denuncien posibles infracciones de los proveedores de modelos.",
            ),
          },
          {
            term: L("Incidents you should hear about", "Incidentes de los que deberías enterarte"),
            body: L(
              "A critical safety incident at a model's developer may affect the systems you run on that model. Members of the public can also report such incidents to the California Office of Emergency Services. Treat a provider's incident disclosure as a trigger to review the systems that depend on it.",
              "Un incidente crítico de seguridad en el desarrollador de un modelo puede afectar a los sistemas que utilizas sobre ese modelo. Cualquier persona puede además notificar esos incidentes a la Oficina de Servicios de Emergencia de California. Trata la comunicación de un incidente por parte de un proveedor como el aviso para revisar los sistemas que dependen de él.",
            ),
          },
        ],
      },
      {
        heading: L("How AI Sentinel helps", "Cómo te ayuda AI Sentinel"),
        intro: L(
          "AI Sentinel does not add SB 53 or Anthropic's proposal as frameworks, because neither places duties on an organization that uses AI. It gives you places to keep what the developers publish, next to the frameworks it does map: the EU AI Act, the GDPR, the NIST AI RMF, ISO/IEC 42001, AIUC-1 and the California, Colorado, Texas and Washington rules.",
          "AI Sentinel no incorpora la SB 53 ni la propuesta de Anthropic como marcos, porque ninguna impone obligaciones a una organización que utiliza IA. Te da lugares donde guardar lo que publican los desarrolladores, junto a los marcos que sí mapea: el RIA, el RGPD, el NIST AI RMF, la ISO/IEC 42001, AIUC-1 y las normas de California, Colorado, Texas y Washington.",
        ),
        items: [
          {
            term: L("Vendors and vendor reviews", "Proveedores y revisiones de proveedores"),
            body: L(
              "Record each model developer as a vendor, link it to the systems that use it, and run a vendor assessment with findings and a next review date. Note in the findings which disclosures the developer has published and whether it has signed the Code of Practice. A vendor added from the catalog brings its trust center link, certifications and frameworks with it.",
              "Registra a cada desarrollador de modelos como proveedor, vincúlalo a los sistemas que lo utilizan y realiza una evaluación del proveedor con conclusiones y una fecha de próxima revisión. Anota en las conclusiones qué documentos ha publicado el desarrollador y si ha firmado el Código de buenas prácticas. Un proveedor añadido desde el catálogo trae consigo el enlace a su centro de confianza, sus certificaciones y sus marcos.",
            ),
          },
          {
            term: L("The model behind each system", "El modelo que hay detrás de cada sistema"),
            body: L(
              "In the AI registry, each system lists the models it uses, with provider, version, a training data summary and known limitations. Take these from the provider's system card or model documentation, and export them with the model inventory report.",
              "En el registro de IA, cada sistema enumera los modelos que utiliza, con el proveedor, la versión, un resumen de los datos de entrenamiento y las limitaciones conocidas. Tómalos de la ficha del sistema o de la documentación del modelo del proveedor y expórtalos con el informe del inventario de modelos.",
            ),
          },
          {
            term: L("Evidence", "Pruebas"),
            body: L(
              "Attach a provider's published document as an evidence item, with its link and a description, to the requirements you map in Compliance. The EU AI Act framework includes the Art. 53 requirements on technical documentation, information for downstream providers, the copyright policy and the training content summary.",
              "Adjunta un documento publicado por un proveedor como prueba, con su enlace y una descripción, a los requisitos que mapeas en Cumplimiento. El marco del RIA incluye los requisitos del art. 53 sobre documentación técnica, información para proveedores posteriores, directrices sobre derechos de autor y resumen del contenido de entrenamiento.",
            ),
          },
          {
            term: L("Incidents, oversight and the calendar", "Incidentes, supervisión y calendario"),
            body: L(
              "Log a provider's incident disclosure as an incident on each affected system, with its timeline, and use an oversight gate for the decision to adopt or upgrade a model. Once you declare the relevant jurisdictions, the obligations calendar shows the EU general-purpose AI milestone and the California SB 53 milestone as context.",
              "Registra la comunicación de un incidente por parte de un proveedor como incidente en cada sistema afectado, con su cronología, y utiliza un punto de control de supervisión para la decisión de adoptar o actualizar un modelo. Cuando declaras las jurisdicciones pertinentes, el calendario de obligaciones muestra como contexto el hito de la UE sobre IA de uso general y el hito de la SB 53 de California.",
            ),
          },
        ],
      },
      {
        heading: L("Information, not legal advice", "Información, no asesoramiento jurídico"),
        intro: L(
          "This page summarizes the rules as published in the sources below, read on 26 October 2026. It is information, not legal advice, and it does not decide whether a rule applies to your organization. Anthropic's framework is a proposal: it may change, and it may never become law.",
          "Esta página resume las normas tal como se publican en las fuentes siguientes, consultadas el 26 de octubre de 2026. Es información, no asesoramiento jurídico, y no decide si una norma se aplica a tu organización. El marco de Anthropic es una propuesta: puede cambiar y puede no llegar nunca a ser ley.",
        ),
      },
    ],
    official: [
      OFFICIAL_LINKS.caSb53,
      OFFICIAL_LINKS.caOesFrontierReporting,
      OFFICIAL_LINKS.caAgSb53,
      OFFICIAL_LINKS.euArt51,
      OFFICIAL_LINKS.euArt53,
      OFFICIAL_LINKS.euArt55,
      OFFICIAL_LINKS.euArt93,
      OFFICIAL_LINKS.euArt113,
      OFFICIAL_LINKS.gpaiEnforcementFaq,
      OFFICIAL_LINKS.gpaiCodeOfPractice,
      OFFICIAL_LINKS.gpaiCodePressRelease,
      OFFICIAL_LINKS.anthropicAdvancedAiFramework,
    ],
    sourcesHeading: L("Sources", "Fuentes"),
    next: {
      href: "/governance/vendors",
      label: L("Go to vendors", "Ir a proveedores"),
    },
  },
];

const BY_SLUG: Record<string, Guide> = Object.fromEntries(GUIDES.map((g) => [g.slug, g]));

export function guideBySlug(slug: string): Guide | undefined {
  return BY_SLUG[slug];
}
