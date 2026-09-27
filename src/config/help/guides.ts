// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The three short guides a newcomer needs before the product makes sense:
 * "What is my role?", "What is high risk?" and "Which rules apply to me?".
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
  slug: "my-role" | "high-risk" | "which-rules";
  title: Localized;
  lead: Localized;
  sections: GuideSection[];
  official: OfficialLink[];
  /** Where the reader most likely goes next, inside the product. */
  next?: { href: string; label: Localized };
}

export const GUIDES: Guide[] = [
  {
    slug: "my-role",
    title: L("What is my role?", "¿Cuál es mi papel?"),
    lead: L(
      "The EU AI Act gives you duties according to the role you play around an AI system. Most organisations are deployers; some are also providers. The same organisation can hold more than one role, even for the same system.",
      "El Reglamento de IA de la UE te asigna obligaciones según el papel que desempeñes en relación con un sistema de IA. La mayoría de las organizaciones son responsables del despliegue; algunas son además proveedores. Una misma organización puede tener más de un papel, incluso respecto al mismo sistema.",
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
              "Utiliza un sistema de IA bajo su propia autoridad en el marco de su actividad (art. 3). Los responsables del despliegue deben usar el sistema conforme a las instrucciones, mantener la supervisión humana y, para ciertos usos de alto riesgo, realizar una evaluación de impacto sobre los derechos fundamentales.",
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
              "Establecido en la UE, introduce en el mercado un sistema de IA que lleva el nombre de un proveedor establecido fuera de la UE (art. 3), y debe comprobar que el proveedor cumplió su parte.",
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
      "El Reglamento de IA de la UE ordena los usos de la IA en cuatro niveles: prohibido, alto, limitado y mínimo. El alto riesgo es el nivel que conlleva las obligaciones sustanciales, y se define por para qué se usa el sistema, no por lo avanzado que sea. Un sistema sencillo en un área de alto riesgo es de alto riesgo; uno sofisticado en un área inocua no lo es.",
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
              "The system is used in one of the areas the Act lists as high risk in Annex III. This is the route most organisations meet.",
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
          "Un sistema de alto riesgo atrae las obligaciones sustanciales: gestión de riesgos, gobernanza de datos, documentación técnica, conservación de registros, transparencia hacia los responsables del despliegue, supervisión humana y exactitud, solidez y ciberseguridad. Los proveedores realizan una evaluación de la conformidad; determinados responsables del despliegue realizan una evaluación de impacto sobre los derechos fundamentales. AI Sentinel plantea justamente estas obligaciones en cuanto un sistema se clasifica como de alto riesgo.",
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
      "Más de un cuerpo normativo puede alcanzar a la vez al mismo sistema de IA: el Reglamento de IA de la UE, el RGPD y leyes de IA o de datos de distintos estados de EE. UU. Cuáles aplican depende de dónde operas y de qué hace el sistema. AI Sentinel lo determina por ti, pero solo a partir de los datos que le facilites.",
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
          "Respondes un único conjunto de preguntas, no uno por ley. AI Sentinel redacta según el régimen más estricto que aplique y produce los documentos que espera cada régimen, reutilizando una respuesta entre regímenes cuando la prueba legal es la misma y registrando el razonamiento. Así, una sola evaluación puede satisfacer a la vez el Reglamento de IA de la UE, el RGPD y una ley estatal de EE. UU., sin que respondas lo mismo tres veces.",
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
];

const BY_SLUG: Record<string, Guide> = Object.fromEntries(GUIDES.map((g) => [g.slug, g]));

export function guideBySlug(slug: string): Guide | undefined {
  return BY_SLUG[slug];
}
