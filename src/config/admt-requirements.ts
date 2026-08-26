// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * California CCPA — ADMT, Risk Assessments and Cybersecurity Audits.
 *
 * The requirement tree for the fourth compliance framework, sourced from the
 * OAL-approved text of Title 11, Div. 6, Cal. Code Regs. (approved 22 Sept
 * 2025; regulations effective 1 Jan 2026).
 *
 * Two regimes live in one framework and they scope very differently:
 *   - Article 11 (§§ 7200-7222) is NARROW. It bites only where ADMT makes a
 *     "significant decision" — five domains only (§ 7001(ddd)), and
 *     § 7001(ddd)(6) expressly excludes advertising. Compliance is due
 *     1 Jan 2027, with no grace period for uses that start after that date.
 *   - Article 10 (§§ 7150-7157) is BROAD and has been LIVE since 1 Jan 2026.
 *     One of its six triggers is merely selling or sharing personal
 *     information, which reaches organizations that believe they run no
 *     consequential AI at all.
 *   - Article 9 (§§ 7120-7124) adds cybersecurity audits, phased by revenue.
 *
 * APPLICABILITY: every row seeds with `applicableTo: []` — deliberately. The
 * five existing auto-mapping call sites query `applicableTo: { has: <tier> }`
 * with no framework filter, so an empty array makes these rows structurally
 * invisible to EU-risk-tier mapping and no system can be flooded with them.
 * Scope is instead carried by `applicabilityTags`, matched with `hasSome`
 * against the tags the resolver returns for a given system's facts.
 *
 * BILINGUAL CONTENT: ComplianceRequirement.title/description are single-valued
 * columns, so the seed writes ENGLISH into the database (matching the three
 * existing frameworks) and the Spanish lives here. Use
 * `getLocalizedRequirement(code, locale)` to render either language. Making the
 * database columns bilingual would be a cross-framework migration and is out of
 * scope for this pack.
 *
 * GDPR GAP: the strongest analogues for §§ 7221(a) and 7222(b)(2) are GDPR
 * Art. 22(1)/(3) and Arts. 13(2)(f)/15(1)(h). This product seeds no GDPR
 * framework, so those links cannot exist as CrossFrameworkMapping rows and are
 * carried as prose in the descriptions below instead. Seeding a GDPR framework
 * is a separate work item; do not fabricate one to hold these mappings.
 *
 * lawReviewedAsOf: see ADMT_REQUIREMENTS_LAW_REVIEWED_AS_OF. California legal
 * sign-off is PENDING — treat every string in this file as editorial until the
 * review round lands.
 */

import type { ContentLocale, Localized } from "@/config/lawfirm-ai-toolkit";
import type { AdmtApplicabilityTag } from "@/config/admt-rules";

// ============================================================
// VERSION + REVIEW MARKER
// ============================================================

/** Bump on any content change so exports can state which revision produced them. */
export const ADMT_REQUIREMENTS_VERSION = "2026.08.2";
export const ADMT_REQUIREMENTS_LAW_REVIEWED_AS_OF = "2026-08-21";

export const ADMT_REQUIREMENTS_REVIEW_MARKER: Localized = {
  en: `Law reviewed as of ${ADMT_REQUIREMENTS_LAW_REVIEWED_AS_OF}; California legal sign-off pending.`,
  es: `Revisión jurídica a fecha de ${ADMT_REQUIREMENTS_LAW_REVIEWED_AS_OF}; pendiente de validación jurídica en California.`,
};

export const ADMT_FRAMEWORK = {
  code: "CA_CCPA_ADMT",
  name: "California CCPA — ADMT, Risk Assessments & Cybersecurity Audits",
  version: "11 CCR §§ 7001–7222 (OAL-approved 22 Sept 2025; effective 1 Jan 2026)",
  description:
    "California Consumer Privacy Act regulations on automated decisionmaking technology (Article 11), risk assessments (Article 10) and cybersecurity audits (Article 9), as approved by the Office of Administrative Law on 22 September 2025.",
} as const;

// ============================================================
// TYPES
// ============================================================

export interface AdmtRequirementSeed {
  /** Row id is `ca-${slug}`. Never derived from the code: "§" mangles slugs. */
  slug: string;
  /** Display form, with the section symbol. */
  code: string;
  title: Localized;
  description: Localized;
  applicabilityTags: AdmtApplicabilityTag[];
  sortOrder: number;
  children?: AdmtRequirementSeed[];
}

const ART11: AdmtApplicabilityTag[] = ["jurisdiction:US_CA", "admt:art11"];
const ART11_EXC: AdmtApplicabilityTag[] = [
  "jurisdiction:US_CA",
  "admt:art11",
  "admt:art11:optout_exception",
];
const ART10: AdmtApplicabilityTag[] = ["jurisdiction:US_CA", "admt:art10"];
const ART10_ORG: AdmtApplicabilityTag[] = [
  "jurisdiction:US_CA",
  "admt:art10",
  "admt:org",
];
/**
 * Article 9 rows carry `admt:art9` ONLY — deliberately not `admt:org`.
 *
 * `admt:org` is emitted by every positive system-level scope, so tagging the
 * audit rows with it made them arrive for any business with an Article 10
 * trigger, regardless of § 7120(b). The audit duty has its own threshold and
 * must be selected by its own tag.
 */
const ART9_ORG: AdmtApplicabilityTag[] = ["jurisdiction:US_CA", "admt:art9"];
const GATE: AdmtApplicabilityTag[] = [
  "jurisdiction:US_CA",
  "admt:art10",
  "admt:art11",
];

// ============================================================
// CLUSTER A — Gating
// ============================================================

const clusterA: AdmtRequirementSeed[] = [
  {
    slug: "7200",
    code: "§ 7200",
    title: {
      en: "Application of Article 11 to ADMT",
      es: "Aplicación del artículo 11 a la ADMT",
    },
    description: {
      en: "A business that uses automated decisionmaking technology to make a significant decision concerning a consumer must comply with all of Article 11: pre-use notice, the right to opt out, and the right to access ADMT.",
      es: "La empresa que utilice tecnología de decisión automatizada (ADMT) para tomar una decisión significativa sobre un consumidor debe cumplir la totalidad del artículo 11: aviso previo al uso, derecho de exclusión voluntaria y derecho de acceso a la ADMT.",
    },
    applicabilityTags: ART11,
    sortOrder: 7200,
    children: [
      {
        slug: "7200-a",
        code: "§ 7200(a)",
        title: {
          en: "Obligations attach to significant decisions",
          es: "Las obligaciones se activan ante decisiones significativas",
        },
        description: {
          en: "Article 11 applies where ADMT is used to make a significant decision concerning a consumer. Under § 7001(ddd) that means only: financial or lending services; housing; education enrollment or opportunities; employment or independent contracting opportunities or compensation; and healthcare services. § 7001(ddd)(6) states that a significant decision does not include advertising to a consumer.",
          es: "El artículo 11 se aplica cuando se utiliza ADMT para tomar una decisión significativa sobre un consumidor. Conforme al § 7001(ddd), esto abarca únicamente: servicios financieros o crediticios; vivienda; matrícula u oportunidades educativas; oportunidades o retribución de empleo o de contratación independiente; y servicios sanitarios. El § 7001(ddd)(6) precisa que la publicidad dirigida al consumidor no constituye una decisión significativa.",
        },
        applicabilityTags: ART11,
        sortOrder: 1,
      },
      {
        slug: "7200-b",
        code: "§ 7200(b)",
        title: {
          en: "Compliance deadline: 1 January 2027",
          es: "Fecha límite de cumplimiento: 1 de enero de 2027",
        },
        description: {
          en: "A business already using ADMT for significant decisions before 1 January 2027 must be compliant no later than that date. A business that begins such use on or after that date must be compliant at any time it is using the ADMT — there is no grace period for new uses.",
          es: "La empresa que ya utilice ADMT para decisiones significativas antes del 1 de enero de 2027 deberá cumplir a más tardar en esa fecha. La que inicie ese uso en esa fecha o con posterioridad deberá cumplir en todo momento en que utilice la ADMT: no existe periodo de gracia para los usos nuevos.",
        },
        applicabilityTags: ART11,
        sortOrder: 2,
      },
    ],
  },
  {
    slug: "7001-e-1",
    code: "§ 7001(e)(1)",
    title: {
      en: "Human-involvement determination (the ADMT gate)",
      es: "Determinación de intervención humana (la puerta de entrada a la ADMT)",
    },
    description: {
      en: "Document, for each system, whether a human reviewer (A) knows how to interpret and use the technology's output to make the decision, (B) reviews and analyses that output together with any other information relevant to making or changing the decision, and (C) has authority to make or change the decision based on that analysis. The test is conjunctive: failing any one prong means the technology substantially replaces human decisionmaking and IS ADMT. Rubber-stamp review — a reviewer without authority to overturn — does not satisfy it.",
      es: "Documente, para cada sistema, si la persona revisora (A) sabe interpretar y utilizar el resultado de la tecnología para adoptar la decisión, (B) revisa y analiza ese resultado junto con cualquier otra información pertinente para adoptar o modificar la decisión, y (C) tiene autoridad para adoptar o modificar la decisión con base en ese análisis. El test es acumulativo: el incumplimiento de cualquiera de los tres requisitos implica que la tecnología sustituye sustancialmente la decisión humana y ES ADMT. Una revisión meramente formal —sin autoridad para revocar— no lo satisface.",
    },
    applicabilityTags: GATE,
    sortOrder: 7001,
  },
];

// ============================================================
// CLUSTER B — § 7220 Pre-use notice
// ============================================================

const clusterB: AdmtRequirementSeed[] = [
  {
    slug: "7220",
    code: "§ 7220",
    title: { en: "Pre-use Notice", es: "Aviso previo al uso" },
    description: {
      en: "Before using ADMT for a significant decision, provide a Pre-use Notice informing consumers of the use and of their rights to opt out and to access the ADMT. It may be delivered within the Notice at Collection provided that notice carries every element required by subsections (b) and (c).",
      es: "Antes de utilizar ADMT para una decisión significativa, facilite un aviso previo al uso que informe al consumidor de dicho uso y de sus derechos de exclusión voluntaria y de acceso a la ADMT. Puede incorporarse al aviso en el momento de la recogida siempre que este contenga todos los elementos exigidos por los apartados (b) y (c).",
    },
    applicabilityTags: ART11,
    sortOrder: 7220,
    children: [
      {
        slug: "7220-a",
        code: "§ 7220(a)",
        title: { en: "Pre-use Notice provided", es: "Aviso previo facilitado" },
        description: {
          en: "A Pre-use Notice exists and is provided to consumers before the ADMT processes their personal information for a significant decision.",
          es: "Existe un aviso previo al uso y se facilita a los consumidores antes de que la ADMT trate sus datos personales para una decisión significativa.",
        },
        applicabilityTags: ART11,
        sortOrder: 1,
      },
      {
        slug: "7220-b-1",
        code: "§ 7220(b)(1)",
        title: { en: "Format requirements", es: "Requisitos de formato" },
        description: {
          en: "The notice complies with § 7003(a)-(b): plain, straightforward language, readable and accessible, with no dark patterns.",
          es: "El aviso cumple el § 7003(a)-(b): lenguaje sencillo y directo, legible y accesible, sin patrones engañosos.",
        },
        applicabilityTags: ART11,
        sortOrder: 2,
      },
      {
        slug: "7220-b-2",
        code: "§ 7220(b)(2)",
        title: {
          en: "Timing and prominence",
          es: "Momento y prominencia",
        },
        description: {
          en: "The notice is presented prominently and conspicuously at or before the point of collection of the personal information the ADMT will process. Where the information was already collected for another purpose, the notice must precede the new ADMT processing.",
          es: "El aviso se presenta de forma prominente y visible en el momento de la recogida de los datos personales que tratará la ADMT, o antes. Si los datos ya se habían recogido para otra finalidad, el aviso debe preceder al nuevo tratamiento por la ADMT.",
        },
        applicabilityTags: ART11,
        sortOrder: 3,
      },
      {
        slug: "7220-b-3",
        code: "§ 7220(b)(3)",
        title: { en: "Delivery channel", es: "Canal de comunicación" },
        description: {
          en: "The notice is presented in the manner in which the business primarily interacts with the consumer.",
          es: "El aviso se presenta por el medio a través del cual la empresa se relaciona principalmente con el consumidor.",
        },
        applicabilityTags: ART11,
        sortOrder: 4,
      },
      {
        slug: "7220-c-1",
        code: "§ 7220(c)(1)",
        title: { en: "Specific purpose stated", es: "Finalidad específica" },
        description: {
          en: "A plain-language explanation of the specific purpose for which the ADMT will be used. Generic phrasing such as 'to make a significant decision about you' is expressly insufficient.",
          es: "Una explicación en lenguaje sencillo de la finalidad específica para la que se utilizará la ADMT. Formulaciones genéricas como «para tomar una decisión significativa sobre usted» son expresamente insuficientes.",
        },
        applicabilityTags: ART11,
        sortOrder: 5,
      },
      {
        slug: "7220-c-2",
        code: "§ 7220(c)(2)",
        title: {
          en: "Opt-out right described with its route",
          es: "Descripción del derecho de exclusión y su vía de ejercicio",
        },
        description: {
          en: "The notice describes the consumer's right to opt out of the ADMT and how to submit that request. This is the CCPA analogue of the GDPR Art. 22(1) right not to be subject to a solely automated decision, though the two differ in default: GDPR states a prohibition subject to exceptions, while this is an opt-out right.",
          es: "El aviso describe el derecho del consumidor a excluirse del uso de la ADMT y la forma de presentar esa solicitud. Es el equivalente en la CCPA del derecho del art. 22(1) del RGPD a no ser objeto de decisiones exclusivamente automatizadas, si bien difieren en su punto de partida: el RGPD establece una prohibición con excepciones, mientras que aquí se configura como un derecho de exclusión.",
        },
        applicabilityTags: ART11,
        sortOrder: 6,
      },
      {
        slug: "7220-c-2-a",
        code: "§ 7220(c)(2)(A)",
        title: {
          en: "Appeal variant where the human-appeal exception is relied on",
          es: "Variante de recurso cuando se invoca la excepción de apelación humana",
        },
        description: {
          en: "Where the business relies on the § 7221(b)(1) human-appeal exception, the notice must instead describe the right to appeal the decision to a qualified human reviewer and explain how to submit that appeal.",
          es: "Cuando la empresa invoque la excepción de apelación humana del § 7221(b)(1), el aviso deberá describir en su lugar el derecho a recurrir la decisión ante una persona revisora cualificada y explicar cómo presentar dicho recurso.",
        },
        applicabilityTags: ART11_EXC,
        sortOrder: 7,
      },
      {
        slug: "7220-c-2-b",
        code: "§ 7220(c)(2)(B)",
        title: {
          en: "Any other exception must be named",
          es: "Toda otra excepción debe identificarse",
        },
        description: {
          en: "Where the business relies on any other § 7221(b) exception, the notice must identify the specific exception relied upon. Note that the exception list is closed at three: security, fraud prevention and physical safety are NOT opt-out exceptions — they limit only what must be disclosed under § 7220(d) and § 7222(c).",
          es: "Cuando la empresa invoque cualquier otra excepción del § 7221(b), el aviso deberá identificar la excepción concreta invocada. Téngase en cuenta que la lista de excepciones es cerrada y consta de tres: la seguridad, la prevención del fraude y la seguridad física NO son excepciones al derecho de exclusión; únicamente limitan lo que debe divulgarse conforme al § 7220(d) y al § 7222(c).",
        },
        applicabilityTags: ART11_EXC,
        sortOrder: 8,
      },
      {
        slug: "7220-c-3",
        code: "§ 7220(c)(3)",
        title: {
          en: "Access right described",
          es: "Descripción del derecho de acceso",
        },
        description: {
          en: "The notice describes the consumer's right to access the ADMT and how to submit that request.",
          es: "El aviso describe el derecho del consumidor a acceder a la ADMT y la forma de presentar esa solicitud.",
        },
        applicabilityTags: ART11,
        sortOrder: 9,
      },
      {
        slug: "7220-c-4",
        code: "§ 7220(c)(4)",
        title: { en: "Non-retaliation statement", es: "Declaración de no represalia" },
        description: {
          en: "The notice states that the business is prohibited from retaliating against consumers for exercising their CCPA rights.",
          es: "El aviso indica que la empresa tiene prohibido tomar represalias contra los consumidores por ejercer sus derechos conforme a la CCPA.",
        },
        applicabilityTags: ART11,
        sortOrder: 10,
      },
      {
        slug: "7220-c-5-a",
        code: "§ 7220(c)(5)(A)",
        title: {
          en: "How the ADMT processes personal information",
          es: "Cómo trata la ADMT los datos personales",
        },
        description: {
          en: "An explanation of how the ADMT processes personal information to make the significant decision, including the categories of personal information that affect the output. May be layered or hyperlinked.",
          es: "Una explicación de cómo la ADMT trata los datos personales para adoptar la decisión significativa, incluidas las categorías de datos personales que influyen en el resultado. Puede presentarse por capas o mediante enlaces.",
        },
        applicabilityTags: ART11,
        sortOrder: 11,
      },
      {
        slug: "7220-c-5-b",
        code: "§ 7220(c)(5)(B)",
        title: {
          en: "Output, sole-factor status and the role of any non-qualifying human",
          es: "Resultado, carácter de factor único y papel de la persona que no cualifica",
        },
        description: {
          en: "An explanation of the type of output the ADMT produces and how the business uses it, including whether the output is the sole factor in the decision and, if not, what the other factors are. Where a human participates but does not satisfy § 7001(e)(1), the notice must describe what that person's role actually is.",
          es: "Una explicación del tipo de resultado que produce la ADMT y del uso que la empresa le da, precisando si el resultado es el factor único de la decisión y, en caso contrario, cuáles son los demás factores. Cuando intervenga una persona que no cumpla el § 7001(e)(1), el aviso deberá describir cuál es realmente su papel.",
        },
        applicabilityTags: ART11,
        sortOrder: 12,
      },
      {
        slug: "7220-c-5-c",
        code: "§ 7220(c)(5)(C)",
        title: {
          en: "Alternative process for consumers who opt out",
          es: "Proceso alternativo para quienes se excluyan",
        },
        description: {
          en: "An explanation of the alternative process the business will use for consumers who opt out, unless a § 7221(b) exception applies.",
          es: "Una explicación del proceso alternativo que aplicará la empresa a los consumidores que se excluyan, salvo que resulte aplicable una excepción del § 7221(b).",
        },
        applicabilityTags: ART11,
        sortOrder: 13,
      },
      {
        slug: "7220-d",
        code: "§ 7220(d)",
        title: {
          en: "Permitted redactions — a redaction right, not an exemption",
          es: "Supresiones permitidas: derecho de supresión, no exención",
        },
        description: {
          en: "The notice need not disclose trade secrets (Civ. Code § 3426.1(d)) or information that would compromise the ability to prevent, detect or investigate security incidents, to resist malicious, deceptive, fraudulent or illegal actions, or to ensure the physical safety of natural persons. This is a right to redact specific content — it is NOT an exemption from giving the notice, and it is not a ground for withholding the opt-out.",
          es: "El aviso no tiene que revelar secretos empresariales (Civ. Code § 3426.1(d)) ni información que comprometa la capacidad de prevenir, detectar o investigar incidentes de seguridad, de resistir actuaciones maliciosas, engañosas, fraudulentas o ilícitas, o de garantizar la seguridad física de las personas. Se trata de un derecho a suprimir contenidos concretos: NO exime de facilitar el aviso ni justifica denegar el derecho de exclusión.",
        },
        applicabilityTags: ART11,
        sortOrder: 14,
      },
      {
        slug: "7220-e",
        code: "§ 7220(e)",
        title: { en: "Consolidated notices", es: "Avisos consolidados" },
        description: {
          en: "A business may consolidate notices: one ADMT used for several purposes, several ADMTs used for one purpose, or several for several. Systematic use of a single ADMT may be covered by one notice rather than re-noticed on each occasion.",
          es: "La empresa puede consolidar avisos: una ADMT para varias finalidades, varias ADMT para una finalidad, o varias para varias. El uso sistemático de una misma ADMT puede cubrirse con un único aviso, sin necesidad de repetirlo en cada ocasión.",
        },
        applicabilityTags: ART11,
        sortOrder: 15,
      },
    ],
  },
];

// ============================================================
// CLUSTER C — § 7221 Opt-out
// ============================================================

const clusterC: AdmtRequirementSeed[] = [
  {
    slug: "7221",
    code: "§ 7221",
    title: {
      en: "Right to opt out of ADMT",
      es: "Derecho de exclusión voluntaria de la ADMT",
    },
    description: {
      en: "Provide consumers the ability to opt out of the use of ADMT for significant decisions, subject only to the three exceptions in subsection (b).",
      es: "Facilite a los consumidores la posibilidad de excluirse del uso de ADMT para decisiones significativas, con sujeción únicamente a las tres excepciones del apartado (b).",
    },
    applicabilityTags: ART11,
    sortOrder: 7221,
    children: [
      {
        slug: "7221-a",
        code: "§ 7221(a)",
        title: { en: "Opt-out offered", es: "Exclusión ofrecida" },
        description: {
          en: "The business offers consumers the ability to opt out of ADMT used for a significant decision, except as provided in § 7221(b).",
          es: "La empresa ofrece a los consumidores la posibilidad de excluirse del uso de ADMT para decisiones significativas, salvo lo previsto en el § 7221(b).",
        },
        applicabilityTags: ART11,
        sortOrder: 1,
      },
      {
        slug: "7221-b-1",
        code: "§ 7221(b)(1)",
        title: {
          en: "Exception 1 — human appeal",
          es: "Excepción 1: apelación humana",
        },
        description: {
          en: "Available only if the business designates a human reviewer who reviews and analyses the ADMT output together with other relevant information, must consider information the consumer submits, knows how to interpret the output, and HAS AUTHORITY TO CHANGE THE DECISION; and clearly describes how to appeal, lets the consumer submit supporting information, keeps the process easy and minimal-step, complies with § 7004 and § 7003(a)-(b), meets the § 7021 timelines, and verifies the consumer under Article 5. This mirrors the GDPR Art. 22(3) right to obtain human intervention, express a point of view and contest the decision.",
          es: "Solo procede si la empresa designa a una persona revisora que revise y analice el resultado de la ADMT junto con otra información pertinente, deba considerar la información que aporte el consumidor, sepa interpretar el resultado y TENGA AUTORIDAD PARA MODIFICAR LA DECISIÓN; y además describe con claridad cómo recurrir, permite al consumidor aportar documentación, mantiene un proceso sencillo y con pasos mínimos, cumple el § 7004 y el § 7003(a)-(b), respeta los plazos del § 7021 y verifica la identidad del consumidor conforme al artículo 5. Se corresponde con el derecho del art. 22(3) del RGPD a obtener intervención humana, expresar su punto de vista e impugnar la decisión.",
        },
        applicabilityTags: ART11_EXC,
        sortOrder: 2,
      },
      {
        slug: "7221-b-2",
        code: "§ 7221(b)(2)",
        title: {
          en: "Exception 2 — admission, acceptance or hiring assessment",
          es: "Excepción 2: evaluación de admisión, aceptación o contratación",
        },
        description: {
          en: "Applies only to § 7001(ddd)(3)(A) and (4)(A) decisions, and only if the ADMT is used SOLELY to assess the consumer's ability to perform at work or in an educational program AND the ADMT works for the business's purpose and does not unlawfully discriminate based upon protected characteristics. Both limbs must be evidenced: claiming the exception without testing evidence is a non-compliant posture, not a not-applicable one.",
          es: "Solo se aplica a las decisiones del § 7001(ddd)(3)(A) y (4)(A), y únicamente si la ADMT se utiliza EXCLUSIVAMENTE para evaluar la aptitud del consumidor para desempeñar un trabajo o un programa educativo Y la ADMT funciona para la finalidad de la empresa y no discrimina ilícitamente por características protegidas. Ambos extremos deben acreditarse: invocar la excepción sin pruebas de verificación constituye una situación de incumplimiento, no de inaplicabilidad.",
        },
        applicabilityTags: ART11_EXC,
        sortOrder: 3,
      },
      {
        slug: "7221-b-3",
        code: "§ 7221(b)(3)",
        title: {
          en: "Exception 3 — work allocation or compensation",
          es: "Excepción 3: asignación de trabajo o retribución",
        },
        description: {
          en: "Applies to § 7001(ddd)(4)(B) decisions on allocation or assignment of work and compensation, subject to the same two-part test: the ADMT is used solely to assess ability to perform, and it works for its purpose and does not unlawfully discriminate.",
          es: "Se aplica a las decisiones del § 7001(ddd)(4)(B) sobre asignación de trabajo y retribución, con sujeción al mismo doble requisito: que la ADMT se utilice exclusivamente para evaluar la aptitud y que funcione para su finalidad sin discriminar ilícitamente.",
        },
        applicabilityTags: ART11_EXC,
        sortOrder: 4,
      },
      {
        slug: "7221-c",
        code: "§ 7221(c)",
        title: {
          en: "At least two opt-out methods",
          es: "Al menos dos vías de exclusión",
        },
        description: {
          en: "Provide at least two designated methods for submitting an opt-out, at least one of which reflects the manner in which the business primarily interacts with the consumer. A business operating online must at minimum offer an interactive form reached through an opt-out link in the Pre-use Notice, titled to state what is being opted out of (for example 'Opt out of Automated Decisionmaking Technology').",
          es: "Facilite al menos dos vías designadas para presentar la exclusión, de las cuales al menos una debe reflejar el medio por el que la empresa se relaciona principalmente con el consumidor. La empresa que opere en línea deberá ofrecer, como mínimo, un formulario interactivo accesible mediante un enlace de exclusión incluido en el aviso previo, cuyo título indique de qué se está excluyendo (por ejemplo, «Excluirse de la tecnología de decisión automatizada»).",
        },
        applicabilityTags: ART11,
        sortOrder: 5,
      },
      {
        slug: "7221-c-4",
        code: "§ 7221(c)(4)",
        title: {
          en: "A cookie banner cannot serve as an opt-out method",
          es: "Un banner de cookies no puede servir como vía de exclusión",
        },
        description: {
          en: "A cookie banner or cookie controls do not constitute an acceptable method for submitting a request to opt out of ADMT. Enforcement to date has centred on mechanism failures of exactly this kind, so this line deserves its own evidence.",
          es: "Un banner de cookies o los controles de cookies no constituyen una vía admisible para presentar una solicitud de exclusión de la ADMT. La actividad sancionadora hasta la fecha se ha centrado en fallos de mecanismo precisamente de este tipo, por lo que este punto merece prueba propia.",
        },
        applicabilityTags: ART11,
        sortOrder: 6,
      },
      {
        slug: "7221-d",
        code: "§ 7221(d)",
        title: { en: "Easy to execute", es: "Fácil de ejercer" },
        description: {
          en: "The opt-out method is easy to execute and requires minimal steps, in compliance with § 7004.",
          es: "La vía de exclusión es fácil de ejercer y exige pasos mínimos, conforme al § 7004.",
        },
        applicabilityTags: ART11,
        sortOrder: 7,
      },
      {
        slug: "7221-e",
        code: "§ 7221(e)",
        title: {
          en: "No account and no over-collection",
          es: "Sin cuenta ni recogida excesiva",
        },
        description: {
          en: "The business must not require the consumer to create an account, nor collect information beyond what is necessary to effectuate the opt-out.",
          es: "La empresa no puede exigir la creación de una cuenta ni recabar más información de la necesaria para hacer efectiva la exclusión.",
        },
        applicabilityTags: ART11,
        sortOrder: 8,
      },
      {
        slug: "7221-f",
        code: "§ 7221(f)",
        title: {
          en: "Verification must NOT be required",
          es: "NO puede exigirse verificación",
        },
        description: {
          en: "An opt-out must not be conditioned on a verifiable consumer request. The business may ask for information reasonably necessary to identify the consumer, but must honour the request where possible without it. Contrast § 7222(e), where verification IS required for access requests.",
          es: "La exclusión no puede condicionarse a una solicitud verificable del consumidor. La empresa puede pedir la información razonablemente necesaria para identificarlo, pero debe atender la solicitud, cuando sea posible, sin ella. Contrasta con el § 7222(e), que SÍ exige verificación para las solicitudes de acceso.",
        },
        applicabilityTags: ART11,
        sortOrder: 9,
      },
      {
        slug: "7221-g",
        code: "§ 7221(g)",
        title: {
          en: "Fraud denial must be documented and explained",
          es: "La denegación por fraude debe documentarse y explicarse",
        },
        description: {
          en: "The business may deny an opt-out only on a good-faith, reasonable and documented belief that the request is fraudulent, and must inform the requester of the denial and explain why.",
          es: "La empresa solo puede denegar una exclusión sobre la base de una convicción de buena fe, razonable y documentada de que la solicitud es fraudulenta, y debe informar de la denegación a quien la presentó y explicar sus motivos.",
        },
        applicabilityTags: ART11,
        sortOrder: 10,
      },
      {
        slug: "7221-h",
        code: "§ 7221(h)",
        title: { en: "Confirmation mechanism", es: "Mecanismo de confirmación" },
        description: {
          en: "Provide a means by which the consumer can confirm that their opt-out request has been processed.",
          es: "Facilite un medio por el que el consumidor pueda confirmar que su solicitud de exclusión ha sido tramitada.",
        },
        applicabilityTags: ART11,
        sortOrder: 11,
      },
      {
        slug: "7221-i",
        code: "§ 7221(i)",
        title: {
          en: "Granular choices require a global opt-out",
          es: "Las opciones granulares exigen una exclusión global",
        },
        description: {
          en: "The business may offer granular, per-use opt-out choices only if it also offers a single option to opt out of all ADMT uses.",
          es: "La empresa puede ofrecer opciones de exclusión granulares por uso únicamente si ofrece además una opción única para excluirse de todos los usos de ADMT.",
        },
        applicabilityTags: ART11,
        sortOrder: 12,
      },
      {
        slug: "7221-j",
        code: "§ 7221(j)",
        title: { en: "Authorized agents", es: "Representantes autorizados" },
        description: {
          en: "The business must accept opt-out requests submitted by an authorized agent on written permission signed by the consumer.",
          es: "La empresa debe aceptar las solicitudes de exclusión presentadas por un representante autorizado mediante autorización escrita firmada por el consumidor.",
        },
        applicabilityTags: ART11,
        sortOrder: 13,
      },
      {
        slug: "7221-k",
        code: "§ 7221(k)",
        title: {
          en: "Twelve-month cooling-off before re-asking",
          es: "Periodo de espera de doce meses antes de volver a solicitar consentimiento",
        },
        description: {
          en: "The business must wait at least twelve months from receipt of an opt-out before asking that consumer to consent to the ADMT use again.",
          es: "La empresa debe esperar al menos doce meses desde la recepción de la exclusión antes de volver a pedir a ese consumidor su consentimiento para el uso de la ADMT.",
        },
        applicabilityTags: ART11,
        sortOrder: 14,
      },
      {
        slug: "7221-l",
        code: "§ 7221(l)",
        title: { en: "Non-retaliation", es: "Prohibición de represalias" },
        description: {
          en: "The business must not retaliate against a consumer for exercising the opt-out (Civ. Code § 1798.125; Article 7).",
          es: "La empresa no puede tomar represalias contra el consumidor por ejercer la exclusión (Civ. Code § 1798.125; artículo 7).",
        },
        applicabilityTags: ART11,
        sortOrder: 15,
      },
      {
        slug: "7221-m",
        code: "§ 7221(m)",
        title: {
          en: "Opt-out received before processing begins",
          es: "Exclusión recibida antes de iniciar el tratamiento",
        },
        description: {
          en: "Where the opt-out arrives before processing has begun, the business must not initiate processing of that consumer's personal information with that ADMT.",
          es: "Cuando la exclusión llegue antes de haberse iniciado el tratamiento, la empresa no podrá iniciar el tratamiento de los datos personales de ese consumidor con esa ADMT.",
        },
        applicabilityTags: ART11,
        sortOrder: 16,
      },
      {
        slug: "7221-n-1",
        code: "§ 7221(n)(1)",
        title: {
          en: "Cease processing within 15 business days",
          es: "Cese del tratamiento en 15 días hábiles",
        },
        description: {
          en: "Where the opt-out arrives after processing has begun, cease processing that consumer's personal information with that ADMT as soon as feasibly possible and no later than fifteen BUSINESS days from receipt. Note this clock runs in business days, unlike the § 7157(e) production clock, which runs in calendar days.",
          es: "Cuando la exclusión llegue una vez iniciado el tratamiento, cese el tratamiento de los datos personales de ese consumidor con esa ADMT tan pronto como sea posible y, a más tardar, en quince días HÁBILES desde su recepción. Este plazo se computa en días hábiles, a diferencia del plazo de entrega del § 7157(e), que se computa en días naturales.",
        },
        applicabilityTags: ART11,
        sortOrder: 17,
      },
      {
        slug: "7221-n-2",
        code: "§ 7221(n)(2)",
        title: {
          en: "Propagate the opt-out downstream",
          es: "Propagación de la exclusión a terceros",
        },
        description: {
          en: "Notify every service provider, contractor and other person to whom the personal information was disclosed or made available for that ADMT, and instruct them to comply within the same fifteen-business-day window.",
          es: "Notifique a todo encargado, contratista y demás terceros a quienes se hubieran comunicado o puesto a disposición los datos personales para esa ADMT, y ordéneles cumplir dentro del mismo plazo de quince días hábiles.",
        },
        applicabilityTags: ART11,
        sortOrder: 18,
      },
    ],
  },
];

// ============================================================
// CLUSTER D — § 7222 Right to access ADMT
// ============================================================

const clusterD: AdmtRequirementSeed[] = [
  {
    slug: "7222",
    code: "§ 7222",
    title: {
      en: "Right to access ADMT",
      es: "Derecho de acceso a la ADMT",
    },
    description: {
      en: "Respond to a verified consumer request to access ADMT with the information required by subsection (b), subject to the redactions permitted by subsection (c).",
      es: "Atienda la solicitud verificada de acceso a la ADMT facilitando la información exigida por el apartado (b), con las supresiones permitidas por el apartado (c).",
    },
    applicabilityTags: ART11,
    sortOrder: 7222,
    children: [
      {
        slug: "7222-b-1",
        code: "§ 7222(b)(1)",
        title: { en: "Specific purpose", es: "Finalidad específica" },
        description: {
          en: "A plain-language explanation of the specific purpose for which the business used the ADMT with respect to this consumer. Generic phrasing such as 'to improve our services' is expressly insufficient.",
          es: "Una explicación en lenguaje sencillo de la finalidad específica para la que la empresa utilizó la ADMT respecto de ese consumidor. Formulaciones genéricas como «para mejorar nuestros servicios» son expresamente insuficientes.",
        },
        applicabilityTags: ART11,
        sortOrder: 1,
      },
      {
        slug: "7222-b-2",
        code: "§ 7222(b)(2)",
        title: {
          en: "Logic, parameters and the specific output",
          es: "Lógica, parámetros y resultado concreto",
        },
        description: {
          en: "Information about the logic of the ADMT sufficient to enable the consumer to understand how it processed their personal information to generate an output, which may include the parameters that generated the output as well as the specific output with respect to that consumer. This tracks the GDPR formula on meaningful information about the logic involved (Arts. 13(2)(f), 14(2)(g), 15(1)(h)) and adds parameters explicitly.",
          es: "Información sobre la lógica de la ADMT suficiente para que el consumidor comprenda cómo trató sus datos personales para generar un resultado, lo que puede incluir los parámetros que generaron el resultado y el resultado concreto respecto de ese consumidor. Sigue la fórmula del RGPD sobre información significativa acerca de la lógica aplicada (arts. 13(2)(f), 14(2)(g) y 15(1)(h)) y añade expresamente los parámetros.",
        },
        applicabilityTags: ART11,
        sortOrder: 2,
      },
      {
        slug: "7222-b-3",
        code: "§ 7222(b)(3)",
        title: {
          en: "Outcome, sole-factor status and the human's actual role",
          es: "Resultado, carácter de factor único y papel real de la persona",
        },
        description: {
          en: "The outcome of the decisionmaking process, including whether the ADMT output was the sole factor; if not, what the other factors were; and, where a human participated but did not satisfy § 7001(e)(1), what that person's role was.",
          es: "El resultado del proceso decisorio, precisando si el resultado de la ADMT fue el factor único; en caso contrario, cuáles fueron los demás factores; y, cuando intervino una persona que no cumplía el § 7001(e)(1), cuál fue su papel.",
        },
        applicabilityTags: ART11,
        sortOrder: 3,
      },
      {
        slug: "7222-b-3-a",
        code: "§ 7222(b)(3)(A)",
        title: {
          en: "Planned future reuse of the output",
          es: "Reutilización futura prevista del resultado",
        },
        description: {
          en: "Where the output will be used for a future significant decision, explain how — with the same sole-factor, other-factors and human-role breakdown, stated prospectively.",
          es: "Cuando el resultado vaya a utilizarse para una futura decisión significativa, explique cómo, con el mismo desglose de factor único, demás factores y papel de la persona, formulado de forma prospectiva.",
        },
        applicabilityTags: ART11,
        sortOrder: 4,
      },
      {
        slug: "7222-b-4",
        code: "§ 7222(b)(4)",
        title: {
          en: "Non-retaliation and rights instructions",
          es: "No represalia e instrucciones sobre derechos",
        },
        description: {
          en: "State the prohibition on retaliation and give instructions, with direct links or a portal, for exercising the consumer's other CCPA rights. A link must land on the specific section of the privacy policy — linking to the top of the policy does not satisfy this.",
          es: "Indique la prohibición de represalias y facilite instrucciones, con enlaces directos o un portal, para ejercer los demás derechos del consumidor conforme a la CCPA. El enlace debe dirigir a la sección concreta de la política de privacidad: enlazar al inicio de la política no cumple este requisito.",
        },
        applicabilityTags: ART11,
        sortOrder: 5,
      },
      {
        slug: "7222-c",
        code: "§ 7222(c)",
        title: {
          en: "Permitted redactions in the access response",
          es: "Supresiones permitidas en la respuesta de acceso",
        },
        description: {
          en: "Trade secrets and security, fraud-resistance or physical-safety information may be withheld — the same three-part carve-out as § 7220(d) — but only from subsections (b)(2) and (b)(3). Record each redaction and its ground.",
          es: "Pueden omitirse los secretos empresariales y la información relativa a seguridad, resistencia al fraude o seguridad física —la misma salvedad triple del § 7220(d)—, pero únicamente respecto de los apartados (b)(2) y (b)(3). Deje constancia de cada supresión y de su fundamento.",
        },
        applicabilityTags: ART11,
        sortOrder: 6,
      },
      {
        slug: "7222-d",
        code: "§ 7222(d)",
        title: {
          en: "Submission method free of dark patterns",
          es: "Vía de presentación sin patrones engañosos",
        },
        description: {
          en: "The submission method is easy to use and free of dark patterns. The business may reuse its existing § 7020 intake for know, delete and correct requests.",
          es: "La vía de presentación es fácil de usar y carece de patrones engañosos. La empresa puede reutilizar su canal de entrada del § 7020 para las solicitudes de conocimiento, supresión y rectificación.",
        },
        applicabilityTags: ART11,
        sortOrder: 7,
      },
      {
        slug: "7222-e",
        code: "§ 7222(e)",
        title: {
          en: "Verification IS required for access",
          es: "El acceso SÍ exige verificación",
        },
        description: {
          en: "The business must verify the consumer under Article 5 before responding to a request to access ADMT, and must inform the requester where the request cannot be verified. This is the deliberate opposite of § 7221(f), which forbids REQUIRING a verifiable consumer request for an opt-out — though the business may still ask for the information needed to identify the consumer.",
          es: "La empresa debe verificar la identidad del consumidor conforme al artículo 5 antes de responder a una solicitud de acceso a la ADMT, e informar a quien la presentó cuando no sea posible verificarla. Es lo contrario, deliberadamente, del § 7221(f), que prohíbe EXIGIR una solicitud verificable del consumidor para la exclusión, si bien la empresa sí puede pedir la información necesaria para identificarlo.",
        },
        applicabilityTags: ART11,
        sortOrder: 8,
      },
      {
        slug: "7222-f",
        code: "§ 7222(f)",
        title: { en: "Denial explanation", es: "Explicación de la denegación" },
        description: {
          en: "Where a request is denied in whole or in part because of a conflict with law or a CCPA exception, inform the consumer and explain the basis unless prohibited by law; where partial, disclose the remainder.",
          es: "Cuando se deniegue una solicitud total o parcialmente por conflicto con la ley o por una excepción de la CCPA, informe al consumidor y explique el fundamento, salvo que la ley lo prohíba; si la denegación es parcial, facilite el resto.",
        },
        applicabilityTags: ART11,
        sortOrder: 9,
      },
      {
        slug: "7222-g-h",
        code: "§ 7222(g)-(h)",
        title: {
          en: "Secure transmission and self-service portal",
          es: "Transmisión segura y portal de autoservicio",
        },
        description: {
          en: "Use reasonable security when transmitting the response. A business with password-protected accounts may respond through a secure self-service portal providing a portable copy, full disclosure, reasonable access controls and Article 5 verification.",
          es: "Emplee medidas de seguridad razonables al transmitir la respuesta. La empresa que disponga de cuentas protegidas con contraseña puede responder mediante un portal seguro de autoservicio que facilite una copia portable, la divulgación completa, controles de acceso razonables y verificación conforme al artículo 5.",
        },
        applicabilityTags: ART11,
        sortOrder: 10,
      },
      {
        slug: "7222-i",
        code: "§ 7222(i)",
        title: {
          en: "Service providers must assist",
          es: "Los encargados deben colaborar",
        },
        description: {
          en: "Service providers and contractors must assist the business in responding to a verified request to access ADMT, including by providing or enabling access to the consumer's personal information in their possession.",
          es: "Los encargados y contratistas deben colaborar con la empresa en la respuesta a una solicitud verificada de acceso a la ADMT, incluso facilitando o habilitando el acceso a los datos personales del consumidor que obren en su poder.",
        },
        applicabilityTags: ART11,
        sortOrder: 11,
      },
      {
        slug: "7222-j",
        code: "§ 7222(j)",
        title: {
          en: "Aggregate response above four uses in twelve months",
          es: "Respuesta agregada a partir de cuatro usos en doce meses",
        },
        description: {
          en: "Where the ADMT was used with respect to the consumer more than four times in the preceding twelve months, the business may answer subsection (b)(2) at aggregate level: a summary of outputs over that period, the parameters that on average affected outputs, and a summary of how those parameters applied.",
          es: "Cuando la ADMT se haya utilizado respecto del consumidor más de cuatro veces en los doce meses anteriores, la empresa puede responder al apartado (b)(2) de forma agregada: un resumen de los resultados de ese periodo, los parámetros que en promedio influyeron en ellos y un resumen de cómo se aplicaron.",
        },
        applicabilityTags: ART11,
        sortOrder: 12,
      },
      {
        slug: "7222-k",
        code: "§ 7222(k)",
        title: {
          en: "Non-retaliation for exercising access",
          es: "No represalia por ejercer el acceso",
        },
        description: {
          en: "The business must not retaliate against a consumer for exercising the right to access ADMT.",
          es: "La empresa no puede tomar represalias contra el consumidor por ejercer el derecho de acceso a la ADMT.",
        },
        applicabilityTags: ART11,
        sortOrder: 13,
      },
    ],
  },
];

// ============================================================
// CLUSTER E — Cross-cutting
// ============================================================

const clusterE: AdmtRequirementSeed[] = [
  {
    slug: "7021-a",
    code: "§ 7021(a)",
    title: {
      en: "Acknowledge within 10 business days",
      es: "Acuse de recibo en 10 días hábiles",
    },
    description: {
      en: "Confirm receipt of a request to access ADMT, or to appeal an ADMT decision, within ten business days, describing the verification process and the expected timing of the response.",
      es: "Confirme la recepción de una solicitud de acceso a la ADMT, o de recurso frente a una decisión de ADMT, en el plazo de diez días hábiles, describiendo el proceso de verificación y el plazo previsto de respuesta.",
    },
    applicabilityTags: ART11,
    sortOrder: 7021,
  },
  {
    slug: "7021-b",
    code: "§ 7021(b)",
    title: {
      en: "Respond within 45 days, extendable once",
      es: "Respuesta en 45 días, prorrogable una vez",
    },
    description: {
      en: "Respond substantively within forty-five calendar days of receipt. One further forty-five-day extension is permitted — ninety days maximum — with notice to the consumer and an explanation.",
      es: "Responda de forma sustantiva en el plazo de cuarenta y cinco días naturales desde la recepción. Se permite una única prórroga de otros cuarenta y cinco días —noventa como máximo— previa notificación al consumidor con explicación de los motivos.",
    },
    applicabilityTags: ART11,
    sortOrder: 7022,
  },
  {
    slug: "7080",
    code: "§ 7080",
    title: {
      en: "Non-discrimination for exercising rights",
      es: "No discriminación por ejercer derechos",
    },
    description: {
      en: "Treating a consumer differently because they exercised a CCPA right is discriminatory and prohibited (Civ. Code § 1798.125). A permitted denial of a request to access ADMT or to opt out is not, by itself, discriminatory.",
      es: "Tratar de forma distinta a un consumidor por haber ejercido un derecho de la CCPA es discriminatorio y está prohibido (Civ. Code § 1798.125). La denegación admisible de una solicitud de acceso a la ADMT o de exclusión no es, por sí sola, discriminatoria.",
    },
    applicabilityTags: ART11,
    sortOrder: 7080,
  },
  {
    slug: "7011-e",
    code: "§ 7011(e)",
    title: {
      en: "Privacy-policy disclosures for ADMT",
      es: "Menciones en la política de privacidad sobre ADMT",
    },
    description: {
      en: "The privacy policy must disclose the right to opt out of ADMT (except where a § 7221(b) exception applies), the right to access ADMT, and the right not to be retaliated against — expressly extended to educational-program applicants, job applicants, students, employees and independent contractors — and must describe the verification process for requests to access ADMT.",
      es: "La política de privacidad debe informar del derecho de exclusión de la ADMT (salvo cuando resulte aplicable una excepción del § 7221(b)), del derecho de acceso a la ADMT y del derecho a no sufrir represalias —extendido expresamente a solicitantes de programas educativos, candidatos a empleo, estudiantes, personas empleadas y contratistas independientes—, y debe describir el proceso de verificación de las solicitudes de acceso a la ADMT.",
    },
    applicabilityTags: ["jurisdiction:US_CA", "admt:art11", "admt:org"],
    sortOrder: 7011,
  },
  {
    slug: "7102-a-1-d-g",
    code: "§ 7102(a)(1)(D),(G)",
    title: {
      en: "Annual request metrics by 1 July",
      es: "Métricas anuales de solicitudes antes del 1 de julio",
    },
    description: {
      en: "A business that buys, sells, shares, receives for commercial purposes, or otherwise makes available for commercial purposes the personal information of ten million or more consumers in a calendar year must compile and publish by 1 July each year the number of requests to access ADMT and requests to opt out of ADMT received, complied with in whole or in part, and denied.",
      es: "La empresa que compre, venda, comunique, reciba con fines comerciales o ponga de otro modo a disposición con fines comerciales los datos personales de diez millones o más de consumidores en un año natural debe recopilar y publicar antes del 1 de julio de cada año el número de solicitudes de acceso a la ADMT y de exclusión de la ADMT recibidas, atendidas total o parcialmente, y denegadas.",
    },
    // Article 11 as well as org-level: the counts being reported are counts of
    // ADMT access and opt-out requests, which only exist where Article 11 bites.
    applicabilityTags: ["jurisdiction:US_CA", "admt:art11", "admt:org"],
    sortOrder: 7102,
  },
];

// ============================================================
// CLUSTER F — Article 10 risk assessments
// ============================================================

const clusterF: AdmtRequirementSeed[] = [
  {
    slug: "7150",
    code: "§ 7150",
    title: {
      en: "When a risk assessment is required",
      es: "Cuándo se exige una evaluación de riesgos",
    },
    description: {
      en: "Conduct and document a risk assessment BEFORE initiating any of the six processing activities listed in subsection (b). This duty has been live since 1 January 2026; processing that began before that date and continues must be assessed by 31 December 2027 under § 7155(b).",
      es: "Realice y documente una evaluación de riesgos ANTES de iniciar cualquiera de las seis actividades de tratamiento enumeradas en el apartado (b). Esta obligación está en vigor desde el 1 de enero de 2026; los tratamientos iniciados antes de esa fecha que continúen deberán evaluarse antes del 31 de diciembre de 2027 conforme al § 7155(b).",
    },
    applicabilityTags: ART10,
    sortOrder: 7150,
    children: [
      {
        slug: "7150-b-1",
        code: "§ 7150(b)(1)",
        title: {
          en: "Trigger — selling or sharing personal information",
          es: "Supuesto: venta o comunicación de datos personales",
        },
        description: {
          en: "Selling or sharing personal information triggers a risk assessment. This is the widest trigger in the regime: advertising pixels and audience feeds generally constitute sharing, so organizations that run no consequential AI at all are frequently in scope.",
          es: "La venta o comunicación de datos personales activa la obligación de evaluación de riesgos. Es el supuesto más amplio del régimen: los píxeles publicitarios y los envíos de audiencias suelen constituir comunicación, por lo que con frecuencia quedan sujetas organizaciones que no utilizan ninguna IA de consecuencias relevantes.",
        },
        applicabilityTags: [
          "jurisdiction:US_CA",
          "admt:art10",
          "admt:art10:trigger:sell_share_pi",
        ],
        sortOrder: 1,
      },
      {
        slug: "7150-b-2",
        code: "§ 7150(b)(2)",
        title: {
          en: "Trigger — processing sensitive personal information",
          es: "Supuesto: tratamiento de datos personales sensibles",
        },
        description: {
          en: "Processing sensitive personal information triggers a risk assessment, subject to the narrow subsection (b)(2)(A) carve-out for human-resources administration: compensation payments, employment authorization, benefits administration, legally required accommodation and wage reporting.",
          es: "El tratamiento de datos personales sensibles activa la obligación, con la salvedad estricta del apartado (b)(2)(A) para la administración de recursos humanos: pago de retribuciones, autorización de trabajo, gestión de prestaciones, ajustes exigidos legalmente y declaración de salarios.",
        },
        applicabilityTags: [
          "jurisdiction:US_CA",
          "admt:art10",
          "admt:art10:trigger:sensitive_pi",
        ],
        sortOrder: 2,
      },
      {
        slug: "7150-b-3",
        code: "§ 7150(b)(3)",
        title: {
          en: "Trigger — ADMT for a significant decision",
          es: "Supuesto: ADMT para una decisión significativa",
        },
        description: {
          en: "Using ADMT to make a significant decision concerning a consumer triggers a risk assessment. This is the single trigger that overlaps Article 11; a system may fall within Article 10 without falling within Article 11.",
          es: "Utilizar ADMT para adoptar una decisión significativa sobre un consumidor activa la obligación. Es el único supuesto que se solapa con el artículo 11; un sistema puede quedar sujeto al artículo 10 sin quedar sujeto al artículo 11.",
        },
        applicabilityTags: [
          "jurisdiction:US_CA",
          "admt:art10",
          "admt:art10:trigger:admt_significant_decision",
        ],
        sortOrder: 3,
      },
      {
        slug: "7150-b-4",
        code: "§ 7150(b)(4)",
        title: {
          en: "Trigger — work or educational profiling",
          es: "Supuesto: elaboración de perfiles laborales o educativos",
        },
        description: {
          en: "Automated processing to infer or extrapolate intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), preferences, interests, reliability, predispositions, behaviour, location or movements, based on systematic observation of a person acting as an educational-program applicant, job applicant, student, employee or independent contractor.",
          es: "Tratamiento automatizado dirigido a inferir o extrapolar inteligencia, capacidad, aptitud, rendimiento laboral, situación económica, salud (incluida la salud mental), preferencias, intereses, fiabilidad, predisposiciones, comportamiento, localización o movimientos, a partir de la observación sistemática de una persona en su condición de solicitante de un programa educativo, candidato a empleo, estudiante, persona empleada o contratista independiente.",
        },
        applicabilityTags: [
          "jurisdiction:US_CA",
          "admt:art10",
          "admt:art10:trigger:work_education_profiling",
        ],
        sortOrder: 4,
      },
      {
        slug: "7150-b-5",
        code: "§ 7150(b)(5)",
        title: {
          en: "Trigger — sensitive-location profiling",
          es: "Supuesto: elaboración de perfiles en ubicaciones sensibles",
        },
        description: {
          en: "Automated processing to profile a consumer through systematic observation of a sensitive location as defined in § 7001(aaa), such as a healthcare facility. Delivery and transportation to a sensitive location is carved out.",
          es: "Tratamiento automatizado para elaborar el perfil de un consumidor mediante la observación sistemática de una ubicación sensible según la define el § 7001(aaa), como un centro sanitario. Queda excluido el reparto y el transporte hacia una ubicación sensible.",
        },
        applicabilityTags: [
          "jurisdiction:US_CA",
          "admt:art10",
          "admt:art10:trigger:sensitive_location_profiling",
        ],
        sortOrder: 5,
      },
      {
        slug: "7150-b-6",
        code: "§ 7150(b)(6)",
        title: {
          en: "Trigger — training ADMT or biometric technology",
          es: "Supuesto: entrenamiento de ADMT o de tecnología biométrica",
        },
        description: {
          en: "Processing personal information that the business intends to use to train an ADMT for a significant decision, or to train facial-recognition, emotion-recognition or other identity-verification or physical-or-biological identification or profiling technology. 'Intends to use' is defined expansively: is using, plans to use, permits others to use, plans to permit others to use, is advertising or marketing the use of, or plans to advertise or market the use of.",
          es: "Tratamiento de datos personales que la empresa pretenda utilizar para entrenar una ADMT destinada a decisiones significativas, o para entrenar tecnología de reconocimiento facial, de reconocimiento de emociones u otra de verificación de identidad o de identificación o elaboración de perfiles físicos o biológicos. La expresión «pretenda utilizar» se define de forma amplia: utiliza, planea utilizar, permite utilizar a terceros, planea permitirlo, anuncia o comercializa dicho uso, o planea anunciarlo o comercializarlo.",
        },
        applicabilityTags: [
          "jurisdiction:US_CA",
          "admt:art10",
          "admt:art10:trigger:training_admt_or_biometric",
        ],
        sortOrder: 6,
      },
    ],
  },
  {
    slug: "7151",
    code: "§ 7151",
    title: {
      en: "Stakeholder involvement",
      es: "Participación de las partes interesadas",
    },
    description: {
      en: "Employees whose job duties include participating in the processing MUST be included in the risk-assessment process. External parties MAY be included: service providers, contractors, experts in detecting and mitigating bias in ADMT, affected consumers and consumer-advocacy organizations.",
      es: "Las personas empleadas cuyas funciones incluyan participar en el tratamiento DEBEN intervenir en el proceso de evaluación de riesgos. PODRÁN intervenir además terceros: encargados, contratistas, personas expertas en la detección y mitigación de sesgos en ADMT, consumidores afectados y organizaciones de defensa de los consumidores.",
    },
    applicabilityTags: ART10,
    sortOrder: 7151,
  },
  {
    slug: "7152",
    code: "§ 7152",
    title: {
      en: "Risk assessment report contents",
      es: "Contenido del informe de evaluación de riesgos",
    },
    description: {
      en: "The documented content of a risk assessment, from the specific purpose through to the dated approval. Each subsection below is separately evidenced.",
      es: "Contenido documentado de la evaluación de riesgos, desde la finalidad específica hasta la aprobación fechada. Cada apartado siguiente se acredita por separado.",
    },
    applicabilityTags: ART10,
    sortOrder: 7152,
    children: [
      {
        slug: "7152-a-1",
        code: "§ 7152(a)(1)",
        title: { en: "Specific purpose", es: "Finalidad específica" },
        description: {
          en: "Document the specific purpose of the processing. A generic statement of purpose does not satisfy this.",
          es: "Documente la finalidad específica del tratamiento. Una declaración genérica de finalidad no lo satisface.",
        },
        applicabilityTags: ART10,
        sortOrder: 1,
      },
      {
        slug: "7152-a-2",
        code: "§ 7152(a)(2)",
        title: {
          en: "Categories of personal information and the minimum necessary",
          es: "Categorías de datos personales y mínimo necesario",
        },
        description: {
          en: "Document the categories of personal information processed, including sensitive personal information, AND the minimum personal information necessary to achieve the stated purpose.",
          es: "Documente las categorías de datos personales tratados, incluidos los datos personales sensibles, Y el mínimo de datos personales necesario para lograr la finalidad declarada.",
        },
        applicabilityTags: ART10,
        sortOrder: 2,
      },
      {
        slug: "7152-a-3",
        code: "§ 7152(a)(3)",
        title: { en: "Operational elements", es: "Elementos operativos" },
        description: {
          en: "Document: (A) the method of collection, use, disclosure and retention and its sources; (B) retention periods or the criteria that set them; (C) the method and purpose of interaction with consumers; (D) the approximate number of consumers affected; (E) disclosures made or planned and how; and (F) the names or categories of service providers, contractors and third parties receiving the information and the purpose of disclosure.",
          es: "Documente: (A) el método de recogida, uso, comunicación y conservación y sus fuentes; (B) los plazos de conservación o los criterios que los determinan; (C) el método y la finalidad de la interacción con los consumidores; (D) el número aproximado de consumidores afectados; (E) las comunicaciones realizadas o previstas y su forma; y (F) los nombres o categorías de encargados, contratistas y terceros receptores y la finalidad de la comunicación.",
        },
        applicabilityTags: ART10,
        sortOrder: 3,
      },
      {
        slug: "7152-a-3-g",
        code: "§ 7152(a)(3)(G)",
        title: {
          en: "ADMT logic, assumptions, limitations and output use",
          es: "Lógica, hipótesis, limitaciones y uso del resultado de la ADMT",
        },
        description: {
          en: "For § 7150(b)(3) ADMT uses, additionally identify (i) the logic of the ADMT, including any assumptions or limitations of that logic, and (ii) the output, and how the business will use the output to make a significant decision.",
          es: "En los usos de ADMT del § 7150(b)(3), identifique además (i) la lógica de la ADMT, incluidas las hipótesis o limitaciones de dicha lógica, y (ii) el resultado y el modo en que la empresa lo utilizará para adoptar una decisión significativa.",
        },
        applicabilityTags: [
          "jurisdiction:US_CA",
          "admt:art10",
          "admt:art11",
          "admt:art10:trigger:admt_significant_decision",
        ],
        sortOrder: 4,
      },
      {
        slug: "7152-a-4",
        code: "§ 7152(a)(4)",
        title: { en: "Benefits identified", es: "Beneficios identificados" },
        description: {
          en: "Identify the benefits of the processing to the business, the consumer, other stakeholders and the public. Generic benefit statements do not satisfy this.",
          es: "Identifique los beneficios del tratamiento para la empresa, el consumidor, otras partes interesadas y el público. Las declaraciones genéricas de beneficio no lo satisfacen.",
        },
        applicabilityTags: ART10,
        sortOrder: 5,
      },
      {
        slug: "7152-a-5",
        code: "§ 7152(a)(5)",
        title: {
          en: "Negative impacts, with sources and causes",
          es: "Impactos negativos, con fuentes y causas",
        },
        description: {
          en: "Identify the negative impacts on consumer privacy and their sources and causes. The enumerated categories are: unauthorized access, destruction, use, modification or disclosure, and loss of availability; discrimination on protected characteristics; impairment of consumer control over personal information; coercion, including through dark patterns; economic harms, including limiting economic opportunities, higher prices, or lower compensation based upon profiling; physical harms; reputational harms; and psychological harms.",
          es: "Identifique los impactos negativos sobre la privacidad del consumidor y sus fuentes y causas. Las categorías enumeradas son: acceso, destrucción, uso, modificación o comunicación no autorizados, y pérdida de disponibilidad; discriminación por características protegidas; menoscabo del control del consumidor sobre sus datos personales; coacción, incluso mediante patrones engañosos; perjuicios económicos, incluida la limitación de oportunidades económicas, precios más altos o retribuciones más bajas derivados de la elaboración de perfiles; daños físicos; daños reputacionales; y daños psicológicos.",
        },
        applicabilityTags: ART10,
        sortOrder: 6,
      },
      {
        slug: "7152-a-6",
        code: "§ 7152(a)(6)",
        title: { en: "Safeguards", es: "Salvaguardias" },
        description: {
          en: "Document the safeguards planned. The illustrative list includes encryption, segmentation, access controls, change management and monitoring; privacy-enhancing technologies such as trusted execution environments, federated learning, homomorphic encryption and differential privacy; consulting external parties for emergent-risk knowledge; and policies, procedures and training to ensure that the business's ADMT works for the business's purpose and does not unlawfully discriminate based upon protected characteristics. That last item is what makes bias testing effectively mandatory documentation.",
          es: "Documente las salvaguardias previstas. La lista ilustrativa comprende cifrado, segmentación, controles de acceso, gestión de cambios y supervisión; tecnologías de mejora de la privacidad como entornos de ejecución confiables, aprendizaje federado, cifrado homomórfico y privacidad diferencial; la consulta a terceros para conocer riesgos emergentes; y políticas, procedimientos y formación que garanticen que la ADMT de la empresa funciona para su finalidad y no discrimina ilícitamente por características protegidas. Este último elemento convierte la verificación de sesgos en documentación materialmente obligatoria.",
        },
        applicabilityTags: ART10,
        sortOrder: 7,
      },
      {
        slug: "7152-a-7",
        code: "§ 7152(a)(7)",
        title: {
          en: "Go/no-go decision recorded",
          es: "Decisión de inicio o no inicio registrada",
        },
        description: {
          en: "Document whether the business will initiate the processing, having weighed the negative impacts against the benefits.",
          es: "Documente si la empresa iniciará el tratamiento, tras ponderar los impactos negativos frente a los beneficios.",
        },
        applicabilityTags: ART10,
        sortOrder: 8,
      },
      {
        slug: "7152-a-8",
        code: "§ 7152(a)(8)",
        title: { en: "Contributor log", es: "Registro de intervinientes" },
        description: {
          en: "Document the individuals who provided information for the assessment, excluding legal counsel giving legal advice.",
          es: "Documente las personas que aportaron información para la evaluación, excluidos los letrados que presten asesoramiento jurídico.",
        },
        applicabilityTags: ART10,
        sortOrder: 9,
      },
      {
        slug: "7152-a-9",
        code: "§ 7152(a)(9)",
        title: {
          en: "Dated approval with names and positions",
          es: "Aprobación fechada con nombres y cargos",
        },
        description: {
          en: "Document the date the assessment was reviewed and approved, together with the names and positions of the individuals who reviewed or approved it — except legal counsel who provided legal advice, who need not be named. An approver must have authority to participate in deciding whether the business will initiate the processing. Nothing generated automatically can satisfy this row.",
          es: "Documente la fecha de revisión y aprobación de la evaluación, junto con los nombres y cargos de quienes la revisaron o aprobaron, salvo los de la asesoría jurídica que haya prestado asesoramiento legal, a la que no es necesario identificar. Quien apruebe debe tener autoridad para participar en la decisión de que la empresa inicie el tratamiento. Ningún elemento generado automáticamente puede satisfacer este requisito.",
        },
        applicabilityTags: ART10,
        sortOrder: 10,
      },
    ],
  },
  {
    slug: "7153",
    code: "§ 7153",
    title: {
      en: "Developer duty to the recipient business",
      es: "Deber del desarrollador frente a la empresa receptora",
    },
    description: {
      en: "A business that makes ADMT available to another business for significant decisions must provide that recipient all facts available to it that are necessary for the recipient to conduct its own risk assessment. This applies to ADMT trained using personal information and is the structural analogue of the provider-to-deployer information duty in EU AI Act Art. 13.",
      es: "La empresa que ponga una ADMT a disposición de otra para decisiones significativas debe facilitarle todos los datos de que disponga que resulten necesarios para que esta realice su propia evaluación de riesgos. Se aplica a las ADMT entrenadas con datos personales y constituye el análogo estructural del deber de información del proveedor al responsable del despliegue del art. 13 del Reglamento de IA de la UE.",
    },
    applicabilityTags: ART10,
    sortOrder: 7153,
  },
  {
    slug: "7154",
    code: "§ 7154",
    title: {
      en: "Restrict or prohibit where risks outweigh benefits",
      es: "Restringir o prohibir cuando los riesgos superen los beneficios",
    },
    description: {
      en: "The goal of the assessment is to restrict or prohibit the processing where the risks to consumer privacy outweigh the benefits. Pair this with the § 7152(a)(7) go/no-go record.",
      es: "La finalidad de la evaluación es restringir o prohibir el tratamiento cuando los riesgos para la privacidad del consumidor superen los beneficios. Debe leerse junto con el registro de decisión del § 7152(a)(7).",
    },
    applicabilityTags: ART10,
    sortOrder: 7154,
  },
  {
    slug: "7155",
    code: "§ 7155",
    title: {
      en: "Timing, updates, backfill and retention",
      es: "Plazos, actualizaciones, regularización y conservación",
    },
    description: {
      en: "Conduct the assessment before initiating the processing; review and update it at least every three years; update it within forty-five calendar days of a material change; complete assessments for pre-1 January 2026 processing that continues by 31 December 2027; and retain each assessment for as long as the processing continues or five years after completion, whichever is later.",
      es: "Realice la evaluación antes de iniciar el tratamiento; revísela y actualícela al menos cada tres años; actualícela en los cuarenta y cinco días naturales siguientes a un cambio sustancial; complete antes del 31 de diciembre de 2027 las evaluaciones de los tratamientos anteriores al 1 de enero de 2026 que continúen; y conserve cada evaluación mientras dure el tratamiento o cinco años desde su finalización, si este plazo fuera mayor.",
    },
    applicabilityTags: ART10,
    sortOrder: 7155,
  },
  {
    slug: "7156",
    code: "§ 7156",
    title: {
      en: "Reuse and consolidation of assessments",
      es: "Reutilización y consolidación de evaluaciones",
    },
    description: {
      en: "A single assessment may cover a comparable set of processing activities presenting similar risks. An assessment prepared for another law — for example another state's data-protection statute, or an EU AI Act Art. 27 fundamental-rights impact assessment — may be reused if supplemented with anything § 7152 requires that the other law omits.",
      es: "Una misma evaluación puede cubrir un conjunto comparable de actividades de tratamiento que presenten riesgos similares. Una evaluación elaborada para otra norma —por ejemplo, la legislación de protección de datos de otro estado o una evaluación de impacto en los derechos fundamentales del art. 27 del Reglamento de IA de la UE— puede reutilizarse si se completa con todo lo que exige el § 7152 y aquella omite.",
    },
    applicabilityTags: ART10,
    sortOrder: 7156,
  },
  {
    slug: "7157",
    code: "§ 7157",
    title: {
      en: "Submission to the Agency and production on demand",
      es: "Presentación a la Agencia y entrega a requerimiento",
    },
    description: {
      en: "Annual submission of counts and an attestation to the California Privacy Protection Agency, and production of the actual reports on demand.",
      es: "Presentación anual de recuentos y de una declaración responsable ante la California Privacy Protection Agency, y entrega de los informes efectivos a requerimiento.",
    },
    applicabilityTags: ART10_ORG,
    sortOrder: 7157,
    children: [
      {
        slug: "7157-a-d",
        code: "§ 7157(a)-(d)",
        title: {
          en: "Annual submission and executive attestation",
          es: "Presentación anual y declaración de la dirección",
        },
        description: {
          en: "Submit to the Agency via cppa.ca.gov: business name and point of contact; the period covered by month and year; the number of risk assessments conducted or updated in total and for each § 7150(b) activity; whether they involved each category of personal and sensitive personal information; the verbatim attestation under penalty of perjury; and the submitter's name, title and date. The submitter must be a member of the executive management team directly responsible for compliance, with sufficient knowledge and authority to submit. You submit COUNTS and an attestation — not the reports themselves. The first submission is due 1 April 2028, covering 2026 and 2027.",
          es: "Presente a la Agencia a través de cppa.ca.gov: la denominación de la empresa y su punto de contacto; el periodo cubierto, expresado en mes y año; el número de evaluaciones de riesgos realizadas o actualizadas, en total y por cada actividad del § 7150(b); si afectaron a cada categoría de datos personales y de datos personales sensibles; la declaración literal bajo pena de perjurio; y el nombre, cargo y fecha de quien presenta. Quien presente debe ser miembro del equipo directivo, directamente responsable del cumplimiento, con conocimiento suficiente y autoridad para presentarla. Se presentan RECUENTOS y una declaración, no los informes. La primera presentación vence el 1 de abril de 2028 y cubre 2026 y 2027.",
        },
        applicabilityTags: ART10_ORG,
        sortOrder: 1,
      },
      {
        slug: "7157-e",
        code: "§ 7157(e)",
        title: {
          en: "Produce the reports within 30 calendar days",
          es: "Entrega de los informes en 30 días naturales",
        },
        description: {
          en: "The Agency or the Attorney General may require the actual risk assessment reports at any time; the business must produce them within thirty CALENDAR days. This clock runs in calendar days, unlike the fifteen-business-day cessation clock in § 7221(n)(1).",
          es: "La Agencia o el Fiscal General pueden requerir en cualquier momento los informes efectivos de evaluación de riesgos; la empresa deberá entregarlos en treinta días NATURALES. Este plazo se computa en días naturales, a diferencia del plazo de cese de quince días hábiles del § 7221(n)(1).",
        },
        applicabilityTags: ART10_ORG,
        sortOrder: 2,
      },
    ],
  },
];

// ============================================================
// CLUSTER G — Article 9 cybersecurity audits
// ============================================================

const clusterG: AdmtRequirementSeed[] = [
  {
    slug: "7120-b",
    code: "§ 7120(b)",
    title: {
      en: "Audit applicability test",
      es: "Criterio de aplicabilidad de la auditoría",
    },
    description: {
      en: "A cybersecurity audit is required if EITHER the business derives 50% or more of its annual revenue from selling or sharing personal information, OR it meets the revenue threshold in Civ. Code § 1798.140(d)(1)(A) AND processed the personal information of 250,000 or more consumers or households, or the sensitive personal information of 50,000 or more consumers, in the preceding calendar year.",
      es: "Se exige auditoría de ciberseguridad si O BIEN la empresa obtiene el 50 % o más de sus ingresos anuales de la venta o comunicación de datos personales, O BIEN alcanza el umbral de ingresos del Civ. Code § 1798.140(d)(1)(A) Y trató datos personales de 250.000 o más consumidores u hogares, o datos personales sensibles de 50.000 o más consumidores, en el año natural anterior.",
    },
    applicabilityTags: ART9_ORG,
    sortOrder: 7120,
  },
  {
    slug: "7121",
    code: "§ 7121",
    title: {
      en: "Phase-in by revenue tier",
      es: "Implantación escalonada por tramo de ingresos",
    },
    description: {
      en: "Businesses with more than $100M in 2026 revenue (measured as of 1 January 2027) audit the period 1 January 2027 to 1 January 2028 and report by 1 April 2028. The $50M–$100M tier measures 2027 revenue as of 1 January 2028 and reports by 1 April 2029. The under-$50M tier measures 2028 revenue and reports by 1 April 2030. Each tier measures a DIFFERENT revenue year — this is not one revenue figure with three deadlines.",
      es: "Las empresas con más de 100 M USD de ingresos en 2026 (medidos a 1 de enero de 2027) auditan el periodo del 1 de enero de 2027 al 1 de enero de 2028 e informan antes del 1 de abril de 2028. El tramo de 50 a 100 M USD mide los ingresos de 2027 a 1 de enero de 2028 e informa antes del 1 de abril de 2029. El tramo inferior a 50 M USD mide los ingresos de 2028 e informa antes del 1 de abril de 2030. Cada tramo mide un año de ingresos DISTINTO: no se trata de una única cifra con tres plazos.",
    },
    applicabilityTags: ART9_ORG,
    sortOrder: 7121,
  },
  {
    slug: "7122",
    code: "§ 7122",
    title: {
      en: "Auditor independence and five-year retention",
      es: "Independencia del auditor y conservación quinquenal",
    },
    description: {
      en: "The audit must be performed by a qualified, objective and independent professional using accepted auditing procedures and standards — AICPA, PCAOB, ISACA and ISO are named. The business and the auditor must retain all documents relevant to each audit for a minimum of five years after completion.",
      es: "La auditoría debe realizarla un profesional cualificado, objetivo e independiente conforme a procedimientos y normas de auditoría aceptados; se citan AICPA, PCAOB, ISACA e ISO. La empresa y el auditor deben conservar toda la documentación relevante de cada auditoría durante un mínimo de cinco años desde su finalización.",
    },
    applicabilityTags: ART9_ORG,
    sortOrder: 7122,
  },
  {
    slug: "7123",
    code: "§ 7123",
    title: {
      en: "Audit scope and report",
      es: "Alcance e informe de la auditoría",
    },
    description: {
      en: "What the audit must assess and what the resulting report must contain.",
      es: "Qué debe evaluar la auditoría y qué debe contener el informe resultante.",
    },
    applicabilityTags: ART9_ORG,
    sortOrder: 7123,
    children: [
      {
        slug: "7123-b-d",
        code: "§ 7123(b)-(d)",
        title: { en: "Scope of assessment", es: "Alcance de la evaluación" },
        description: {
          en: "Assess the establishment, implementation and maintenance of the cybersecurity program and its written documentation, proportionate to the size and complexity of the business and the nature and scope of its processing, taking into account the state of the art and cost of implementation; each applicable listed component; and how the business implements and ENFORCES compliance. Enumerated components include multi-factor authentication (phishing-resistant for personnel, service providers and contractors), strong unique passwords, encryption at rest and in transit, account management and least-privilege access controls.",
          es: "Evalúe el establecimiento, la implantación y el mantenimiento del programa de ciberseguridad y su documentación escrita, de forma proporcionada al tamaño y la complejidad de la empresa y a la naturaleza y el alcance de su tratamiento, atendiendo al estado de la técnica y al coste de implantación; cada componente aplicable de la lista; y cómo la empresa implanta y HACE CUMPLIR el cumplimiento. Entre los componentes enumerados figuran la autenticación multifactor (resistente al phishing para personal, encargados y contratistas), contraseñas robustas y únicas, cifrado en reposo y en tránsito, y controles de gestión de cuentas y de mínimo privilegio.",
        },
        applicabilityTags: ART9_ORG,
        sortOrder: 1,
      },
      {
        slug: "7123-e",
        code: "§ 7123(e)",
        title: {
          en: "Report contents including the gap register",
          es: "Contenido del informe, incluido el registro de deficiencias",
        },
        description: {
          en: "The report must describe the information system; identify the policies, criteria and specific evidence relied on and justify the findings; identify the components assessed and explain their effectiveness; IDENTIFY AND DESCRIBE IN DETAIL the status of any gaps or weaknesses; DOCUMENT THE REMEDIATION PLAN INCLUDING ITS TIMEFRAME; identify corrections or amendments to prior reports; name up to three qualified individuals responsible for the program; give the auditor's name, affiliation and qualifications; carry a signed, dated certification by the highest-ranking auditor attesting to independence, objective and impartial judgment, and that they did not rely primarily on management assertions; and include a sample or description of any consumer breach notifications under Civ. Code § 1798.82(a) and any regulator notifications, with dates, details and remediation.",
          es: "El informe debe describir el sistema de información; identificar las políticas, criterios y pruebas concretas en que se basa y justificar las conclusiones; identificar los componentes evaluados y explicar su eficacia; IDENTIFICAR Y DESCRIBIR DETALLADAMENTE el estado de las deficiencias o debilidades; DOCUMENTAR EL PLAN DE SUBSANACIÓN Y SU CALENDARIO; identificar correcciones o modificaciones de informes anteriores; designar hasta tres personas cualificadas responsables del programa; indicar el nombre, la vinculación y la cualificación del auditor; incorporar una certificación firmada y fechada por el auditor de mayor rango que acredite su independencia, su juicio objetivo e imparcial y que no se basó principalmente en manifestaciones de la dirección; e incluir una muestra o descripción de las notificaciones de brecha a consumidores conforme al Civ. Code § 1798.82(a) y de las notificaciones a autoridades, con fechas, detalles y subsanación.",
        },
        applicabilityTags: ART9_ORG,
        sortOrder: 2,
      },
      {
        slug: "7123-f",
        code: "§ 7123(f)",
        title: {
          en: "Reuse of an existing audit — NIST CSF 2.0 named",
          es: "Reutilización de una auditoría existente: se cita el NIST CSF 2.0",
        },
        description: {
          en: "An audit or assessment prepared for another purpose may be reused if it meets all Article 9 requirements alone or with supplementation. The regulation names the NIST Cybersecurity Framework 2.0 as the example, which makes an existing CSF programme directly reusable here.",
          es: "Puede reutilizarse una auditoría o evaluación elaborada con otra finalidad si cumple todos los requisitos del artículo 9, por sí sola o completada. La norma cita como ejemplo el NIST Cybersecurity Framework 2.0, lo que permite reutilizar directamente un programa CSF existente.",
        },
        applicabilityTags: ART9_ORG,
        sortOrder: 3,
      },
    ],
  },
  {
    slug: "7124",
    code: "§ 7124",
    title: {
      en: "Certification of completion",
      es: "Certificación de finalización",
    },
    description: {
      en: "For each year an audit is required, submit a written certification to the Agency via cppa.ca.gov by 1 April following the audit year, signed by a member of the executive management team who is directly responsible, sufficiently knowledgeable and authorised. It must include the business name and contact, a statement that the audit was completed, the period covered by month and year, the verbatim electronically signed attestation under penalty of perjury — which includes an affirmative statement that the business has not made any attempt to influence the auditor's decisions or assessments — and the submitter's name, title and date.",
      es: "Por cada ejercicio en que se exija auditoría, presente a la Agencia a través de cppa.ca.gov, antes del 1 de abril siguiente al año auditado, una certificación escrita firmada por un miembro del equipo directivo directamente responsable, con conocimiento suficiente y debidamente autorizado. Deberá incluir la denominación y el contacto de la empresa, la manifestación de que la auditoría se completó, el periodo cubierto expresado en mes y año, la declaración literal firmada electrónicamente bajo pena de perjurio —que incorpora la afirmación expresa de que la empresa no ha intentado influir en las decisiones o valoraciones del auditor— y el nombre, cargo y fecha de quien la presenta.",
    },
    applicabilityTags: ART9_ORG,
    sortOrder: 7124,
  },
];

// ============================================================
// EXPORT
// ============================================================

/**
 * Authored in thematic clusters but exported in section-number order, which is
 * how a reader of the regulation expects to move through it: definitions and
 * the gate, then the cross-cutting duties, then Article 9, Article 10 and
 * Article 11 in turn. `sortOrder` is the section number, so this ordering is
 * also what the compliance matrix renders.
 */
export const ADMT_REQUIREMENTS: AdmtRequirementSeed[] = [
  ...clusterA,
  ...clusterB,
  ...clusterC,
  ...clusterD,
  ...clusterE,
  ...clusterF,
  ...clusterG,
].sort((a, b) => a.sortOrder - b.sortOrder);

/** Flatten parents and children into one list, preserving order. */
export function flattenAdmtRequirements(
  rows: AdmtRequirementSeed[] = ADMT_REQUIREMENTS,
): AdmtRequirementSeed[] {
  return rows.flatMap((r) => [r, ...flattenAdmtRequirements(r.children ?? [])]);
}

/** Row id for a slug. Never derive an id from the code — "§" mangles slugs. */
export function admtRequirementId(slug: string): string {
  return `ca-${slug}`;
}

/**
 * Localized title and description for a requirement code. The database stores
 * English only; Spanish lives in this module.
 */
export function getLocalizedRequirement(
  code: string,
  locale: ContentLocale,
): { title: string; description: string } | null {
  const row = flattenAdmtRequirements().find((r) => r.code === code);
  if (!row) return null;
  return { title: row.title[locale], description: row.description[locale] };
}
