// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * GDPR (Regulation (EU) 2016/679) — the provisions that govern AI systems
 * processing personal data, with the automated-decision and impact-assessment
 * articles in full. Scoped by tags from src/config/regimes/regime-rules.ts:
 *   gdpr:core     any personal data processed with an EU/EEA/UK nexus
 *   gdpr:adm      Art. 22 decisions (solely automated, legal or similar effect)
 *   gdpr:dpia     Art. 35 high-risk processing
 *   gdpr:special  Art. 9 special-category data
 *
 * Legal sign-off PENDING. Article text is paraphrased from the Regulation;
 * the CJEU reading of Art. 22 (C-634/21, 7 Dec 2023) is noted where it bites.
 */

import { signoffMarker } from "@/config/legal-signoff";
import type { RegimeFramework, RegimePack, RegimeRequirementSeed } from "./types";

const REVIEWED = "2026-09-08";

export const GDPR_FRAMEWORK: RegimeFramework = {
  code: "EU_GDPR",
  idPrefix: "gdpr",
  name: "GDPR (AI provisions)",
  version: "Reg. (EU) 2016/679, AI-relevant articles",
  abbreviation: "GDPR",
  description:
    "The General Data Protection Regulation provisions that govern AI systems processing personal data: principles, lawful basis, transparency about automated decision-making, the Article 22 right not to be subject to solely automated decisions, and the Article 35 data protection impact assessment.",
  contentVersion: "2026.09.1",
  lawReviewedAsOf: REVIEWED,
  reviewMarker: signoffMarker("EU_GDPR"),
};

const CORE = ["jurisdiction:EU", "gdpr:core"] as const;
const ADM = ["jurisdiction:EU", "gdpr:adm"] as const;
const DPIA = ["jurisdiction:EU", "gdpr:dpia"] as const;
const SPECIAL = ["jurisdiction:EU", "gdpr:special"] as const;

export const GDPR_REQUIREMENTS: RegimeRequirementSeed[] = [
  {
    slug: "art-5",
    code: "Art. 5",
    title: { en: "Principles relating to processing", es: "Principios relativos al tratamiento" },
    description: {
      en: "Every AI system that processes personal data must satisfy the six processing principles and the controller must be able to demonstrate it (accountability, Art. 5(2)). For AI the pressure points are fairness, purpose limitation for training and re-use, and accuracy of inferred data.",
      es: "Todo sistema de IA que trate datos personales debe cumplir los seis principios del tratamiento y el responsable debe poder demostrarlo (responsabilidad proactiva, art. 5.2). En la IA los puntos críticos son la lealtad, la limitación de la finalidad en el entrenamiento y la reutilización, y la exactitud de los datos inferidos.",
    },
    applicabilityTags: CORE,
    sortOrder: 50,
    children: [
      {
        slug: "art-5-1-a",
        code: "Art. 5(1)(a)",
        title: { en: "Lawfulness, fairness and transparency", es: "Licitud, lealtad y transparencia" },
        description: {
          en: "Processing by the AI system must rest on a lawful basis, must not be unfair to the people it affects, and must be transparent to them. Opaque models do not suspend the duty; they raise the bar for the explanation given.",
          es: "El tratamiento por el sistema de IA debe apoyarse en una base jurídica, no debe ser desleal para las personas afectadas y debe resultarles transparente. La opacidad del modelo no suspende el deber; eleva el listón de la explicación que debe darse.",
        },
        applicabilityTags: CORE,
        sortOrder: 51,
      },
      {
        slug: "art-5-1-b",
        code: "Art. 5(1)(b)",
        title: { en: "Purpose limitation", es: "Limitación de la finalidad" },
        description: {
          en: "Personal data collected for one purpose may not be used to train or run an AI system for an incompatible purpose. Document the compatibility assessment for any re-use of existing data as training data.",
          es: "Los datos personales recogidos para una finalidad no pueden usarse para entrenar o ejecutar un sistema de IA con una finalidad incompatible. Documenta el análisis de compatibilidad de cualquier reutilización de datos existentes como datos de entrenamiento.",
        },
        applicabilityTags: CORE,
        sortOrder: 52,
      },
      {
        slug: "art-5-1-c",
        code: "Art. 5(1)(c)",
        title: { en: "Data minimisation", es: "Minimización de datos" },
        description: {
          en: "Training, validation and inference data must be adequate, relevant and limited to what is necessary. Record why each category of input is needed for the system's stated purpose.",
          es: "Los datos de entrenamiento, validación e inferencia deben ser adecuados, pertinentes y limitados a lo necesario. Deja constancia de por qué cada categoría de entrada es necesaria para la finalidad declarada del sistema.",
        },
        applicabilityTags: CORE,
        sortOrder: 53,
      },
      {
        slug: "art-5-1-d",
        code: "Art. 5(1)(d)",
        title: { en: "Accuracy, including inferred data", es: "Exactitud, incluidos los datos inferidos" },
        description: {
          en: "Outputs, scores and inferences about a person are personal data and must be accurate and kept up to date, with reasonable steps to erase or rectify inaccurate ones. Establish how a person can challenge an inaccurate inference.",
          es: "Los resultados, puntuaciones e inferencias sobre una persona son datos personales y deben ser exactos y estar actualizados, con medidas razonables para suprimir o rectificar los inexactos. Establece cómo puede una persona impugnar una inferencia inexacta.",
        },
        applicabilityTags: CORE,
        sortOrder: 54,
      },
    ],
  },
  {
    slug: "art-6",
    code: "Art. 6",
    title: { en: "Lawful basis for processing", es: "Base jurídica del tratamiento" },
    description: {
      en: "Identify and record the lawful basis for each processing operation the AI system performs: training, evaluation, inference and any re-use of outputs. Where legitimate interests are relied on, keep the balancing test.",
      es: "Identifica y documenta la base jurídica de cada operación de tratamiento que realice el sistema de IA: entrenamiento, evaluación, inferencia y cualquier reutilización de los resultados. Si se invoca el interés legítimo, conserva la ponderación.",
    },
    applicabilityTags: CORE,
    sortOrder: 60,
  },
  {
    slug: "art-9",
    code: "Art. 9",
    title: { en: "Special categories of personal data", es: "Categorías especiales de datos personales" },
    description: {
      en: "Processing of health, biometric, genetic, racial or ethnic origin, political, religious, trade-union, sex-life or sexual-orientation data is prohibited unless an Art. 9(2) exception applies. Inferences the model draws about these attributes are caught even when the input data are not.",
      es: "El tratamiento de datos de salud, biométricos, genéticos, de origen racial o étnico, opiniones políticas, convicciones religiosas, afiliación sindical, vida sexual u orientación sexual está prohibido salvo que concurra una excepción del art. 9.2. Las inferencias que el modelo extraiga sobre estos atributos quedan comprendidas aunque los datos de entrada no lo estén.",
    },
    applicabilityTags: SPECIAL,
    sortOrder: 90,
  },
  {
    slug: "art-12",
    code: "Art. 12",
    title: { en: "Transparent information and communication", es: "Transparencia de la información y de las comunicaciones" },
    description: {
      en: "Information about the AI system's processing must be concise, transparent, intelligible and easily accessible, in clear and plain language. Layered notices are acceptable; a notice that only a data scientist can follow is not.",
      es: "La información sobre el tratamiento del sistema de IA debe ser concisa, transparente, inteligible y de fácil acceso, en lenguaje claro y sencillo. Se admiten los avisos por capas; no se admite un aviso que solo entienda un científico de datos.",
    },
    applicabilityTags: CORE,
    sortOrder: 120,
  },
  {
    slug: "art-13-2-f",
    code: "Art. 13(2)(f) / 14(2)(g)",
    title: { en: "Information on automated decision-making at collection", es: "Información sobre decisiones automatizadas en el momento de la recogida" },
    description: {
      en: "When personal data are collected, tell the person whether automated decision-making including profiling under Art. 22 exists, and give meaningful information about the logic involved and the significance and envisaged consequences for them. This is the GDPR anchor of the multi-jurisdictional AI notice.",
      es: "Al recoger los datos personales, informa a la persona de si existen decisiones automatizadas, incluida la elaboración de perfiles, en el sentido del art. 22, y facilita información significativa sobre la lógica aplicada y sobre la importancia y las consecuencias previstas para ella. Es el anclaje en el RGPD del aviso de IA multijurisdiccional.",
    },
    applicabilityTags: ADM,
    sortOrder: 130,
  },
  {
    slug: "art-15-1-h",
    code: "Art. 15(1)(h)",
    title: { en: "Access request: automated decision-making", es: "Derecho de acceso: decisiones automatizadas" },
    description: {
      en: "On an access request the controller must confirm whether automated decision-making including profiling exists and provide meaningful information about the logic, significance and consequences. The CJEU (C-203/22, 27 Feb 2025) reads this as a real explanation of the procedure and principles applied, not a disclosure of the algorithm.",
      es: "Ante una solicitud de acceso, el responsable debe confirmar si existen decisiones automatizadas, incluida la elaboración de perfiles, y facilitar información significativa sobre la lógica, la importancia y las consecuencias. El TJUE (C-203/22, 27 de febrero de 2025) lo interpreta como una explicación real del procedimiento y de los principios aplicados, no como la revelación del algoritmo.",
    },
    applicabilityTags: ADM,
    sortOrder: 150,
  },
  {
    slug: "art-21",
    code: "Art. 21",
    title: { en: "Right to object, including to profiling", es: "Derecho de oposición, incluida la elaboración de perfiles" },
    description: {
      en: "Where processing rests on public interest or legitimate interests, the person may object to it, including to profiling. Objection to direct-marketing profiling is absolute. The AI system needs a way to stop processing the objector's data.",
      es: "Cuando el tratamiento se base en el interés público o en el interés legítimo, la persona puede oponerse, incluida la elaboración de perfiles. La oposición a la elaboración de perfiles con fines de mercadotecnia directa es absoluta. El sistema de IA necesita un mecanismo para dejar de tratar los datos de quien se opone.",
    },
    applicabilityTags: CORE,
    sortOrder: 210,
  },
  {
    slug: "art-22",
    code: "Art. 22",
    title: { en: "Automated individual decision-making, including profiling", es: "Decisiones individuales automatizadas, incluida la elaboración de perfiles" },
    description: {
      en: "A person has the right not to be subject to a decision based solely on automated processing, including profiling, that produces legal effects concerning them or similarly significantly affects them. The CJEU (C-634/21, 7 Dec 2023) held that an automatically generated score is itself such a decision when a third party draws strongly on it. A human who merely rubber-stamps the output does not take the decision outside Art. 22.",
      es: "Toda persona tiene derecho a no ser objeto de una decisión basada únicamente en el tratamiento automatizado, incluida la elaboración de perfiles, que produzca efectos jurídicos en ella o le afecte significativamente de modo similar. El TJUE (C-634/21, 7 de diciembre de 2023) declaró que una puntuación generada automáticamente es en sí misma tal decisión cuando un tercero se apoya de forma determinante en ella. Una persona que se limite a ratificar el resultado no saca la decisión del ámbito del art. 22.",
    },
    applicabilityTags: ADM,
    sortOrder: 220,
    children: [
      {
        slug: "art-22-2",
        code: "Art. 22(2)",
        title: { en: "Permitted grounds", es: "Supuestos permitidos" },
        description: {
          en: "The solely automated decision is allowed only if it is necessary for entering into or performing a contract with the person, authorised by Union or Member State law with suitable safeguards, or based on the person's explicit consent. Record which ground the system relies on.",
          es: "La decisión únicamente automatizada solo se permite si es necesaria para celebrar o ejecutar un contrato con la persona, está autorizada por el Derecho de la Unión o de un Estado miembro con garantías adecuadas, o se basa en el consentimiento explícito de la persona. Deja constancia del supuesto en que se apoya el sistema.",
        },
        applicabilityTags: ADM,
        sortOrder: 222,
      },
      {
        slug: "art-22-3",
        code: "Art. 22(3)",
        title: { en: "Safeguards: human intervention, expressing a view, contesting", es: "Garantías: intervención humana, expresar el punto de vista, impugnar" },
        description: {
          en: "Under the contract and consent grounds the controller must implement suitable measures, at least the right to obtain human intervention, to express one's point of view and to contest the decision. The reviewer must have the authority and the information to change the outcome. This is the GDPR anchor of the human-review and appeal protocol.",
          es: "En los supuestos de contrato y consentimiento, el responsable debe adoptar medidas adecuadas, como mínimo el derecho a obtener intervención humana, a expresar su punto de vista y a impugnar la decisión. La persona revisora debe tener autoridad e información para cambiar el resultado. Es el anclaje en el RGPD del protocolo de revisión humana y recurso.",
        },
        applicabilityTags: ADM,
        sortOrder: 223,
      },
      {
        slug: "art-22-4",
        code: "Art. 22(4)",
        title: { en: "Special-category data in automated decisions", es: "Datos de categorías especiales en decisiones automatizadas" },
        description: {
          en: "Solely automated decisions may not be based on special categories of personal data unless Art. 9(2)(a) or (g) applies and suitable safeguards are in place. Check whether the model infers protected attributes as proxies.",
          es: "Las decisiones únicamente automatizadas no pueden basarse en categorías especiales de datos personales salvo que se aplique el art. 9.2.a o g y existan garantías adecuadas. Comprueba si el modelo infiere atributos protegidos como variables sustitutivas.",
        },
        applicabilityTags: ADM,
        sortOrder: 224,
      },
    ],
  },
  {
    slug: "art-25",
    code: "Art. 25",
    title: { en: "Data protection by design and by default", es: "Protección de datos desde el diseño y por defecto" },
    description: {
      en: "Design and default settings of the AI system must implement the principles effectively: minimised inputs, pseudonymisation where feasible, and no processing beyond what the purpose needs unless the person chooses it.",
      es: "El diseño y la configuración por defecto del sistema de IA deben aplicar los principios de forma efectiva: entradas minimizadas, seudonimización cuando sea viable y ningún tratamiento más allá de lo que la finalidad exige salvo elección de la persona.",
    },
    applicabilityTags: CORE,
    sortOrder: 250,
  },
  {
    slug: "art-28",
    code: "Art. 28",
    title: { en: "Processors and model providers", es: "Encargados del tratamiento y proveedores de modelos" },
    description: {
      en: "An AI vendor that processes personal data on the controller's behalf is a processor and needs an Art. 28 contract, including sub-processor controls. Confirm whether the vendor also uses the data for its own model training, which makes it a controller for that purpose.",
      es: "Un proveedor de IA que trate datos personales por cuenta del responsable es un encargado y necesita un contrato conforme al art. 28, con control de los subencargados. Confirma si el proveedor usa además los datos para entrenar sus propios modelos, lo que lo convierte en responsable para esa finalidad.",
    },
    applicabilityTags: CORE,
    sortOrder: 280,
  },
  {
    slug: "art-30",
    code: "Art. 30",
    title: { en: "Records of processing activities", es: "Registro de las actividades de tratamiento" },
    description: {
      en: "Each AI processing operation belongs in the record of processing activities with its purposes, data categories, recipients, transfers and retention. The AI registry entry should map to a record entry.",
      es: "Cada operación de tratamiento de IA debe figurar en el registro de actividades de tratamiento con sus finalidades, categorías de datos, destinatarios, transferencias y plazos de conservación. La entrada del registro de IA debe corresponderse con una entrada del registro de actividades.",
    },
    applicabilityTags: CORE,
    sortOrder: 300,
  },
  {
    slug: "art-32",
    code: "Art. 32",
    title: { en: "Security of processing", es: "Seguridad del tratamiento" },
    description: {
      en: "Apply technical and organisational measures appropriate to the risk, including against model-specific threats such as training-data extraction, prompt injection and membership inference.",
      es: "Aplica medidas técnicas y organizativas adecuadas al riesgo, incluidas las frente a amenazas propias de los modelos, como la extracción de datos de entrenamiento, la inyección de instrucciones y la inferencia de pertenencia.",
    },
    applicabilityTags: CORE,
    sortOrder: 320,
  },
  {
    slug: "art-35",
    code: "Art. 35",
    title: { en: "Data protection impact assessment", es: "Evaluación de impacto relativa a la protección de datos" },
    description: {
      en: "Where processing, in particular using new technologies, is likely to result in a high risk to rights and freedoms, the controller must carry out a data protection impact assessment before processing. High-risk AI under the EU AI Act, systematic profiling with significant effects and large-scale special-category processing are the usual triggers. The DPIA and the Art. 27 AI Act fundamental rights impact assessment may be one document.",
      es: "Cuando el tratamiento, en particular con nuevas tecnologías, entrañe probablemente un alto riesgo para los derechos y libertades, el responsable debe realizar una evaluación de impacto antes del tratamiento. Los desencadenantes habituales son la IA de alto riesgo del Reglamento de IA, la elaboración sistemática de perfiles con efectos significativos y el tratamiento a gran escala de categorías especiales. La EIPD y la evaluación de impacto sobre los derechos fundamentales del art. 27 del Reglamento de IA pueden ser un único documento.",
    },
    applicabilityTags: DPIA,
    sortOrder: 350,
    children: [
      {
        slug: "art-35-3-a",
        code: "Art. 35(3)(a)",
        title: { en: "Mandatory trigger: systematic and extensive evaluation of personal aspects", es: "Supuesto obligatorio: evaluación sistemática y exhaustiva de aspectos personales" },
        description: {
          en: "A DPIA is required for a systematic and extensive evaluation of personal aspects based on automated processing, including profiling, on which decisions are based that produce legal effects or similarly significantly affect the person. Any Art. 22 system meets this trigger.",
          es: "La EIPD es obligatoria en caso de evaluación sistemática y exhaustiva de aspectos personales basada en un tratamiento automatizado, incluida la elaboración de perfiles, sobre cuya base se tomen decisiones que produzcan efectos jurídicos o afecten significativamente a la persona. Todo sistema del art. 22 cumple este supuesto.",
        },
        applicabilityTags: DPIA,
        sortOrder: 353,
      },
      {
        slug: "art-35-7",
        code: "Art. 35(7)",
        title: { en: "Minimum content of the assessment", es: "Contenido mínimo de la evaluación" },
        description: {
          en: "The assessment must contain a systematic description of the processing and its purposes, an assessment of necessity and proportionality, an assessment of the risks to rights and freedoms, and the measures envisaged to address them, including safeguards and mechanisms that demonstrate compliance.",
          es: "La evaluación debe contener una descripción sistemática del tratamiento y de sus fines, una evaluación de la necesidad y la proporcionalidad, una evaluación de los riesgos para los derechos y libertades, y las medidas previstas para afrontarlos, incluidas las garantías y los mecanismos que demuestren el cumplimiento.",
        },
        applicabilityTags: DPIA,
        sortOrder: 357,
      },
      {
        slug: "art-35-9",
        code: "Art. 35(9)",
        title: { en: "Seeking the views of data subjects", es: "Recabar la opinión de los interesados" },
        description: {
          en: "Where appropriate, seek the views of data subjects or their representatives on the intended processing. Record whom you consulted, or why consultation was not appropriate.",
          es: "Cuando proceda, recaba la opinión de los interesados o de sus representantes sobre el tratamiento previsto. Deja constancia de a quién consultaste, o de por qué la consulta no era procedente.",
        },
        applicabilityTags: DPIA,
        sortOrder: 359,
      },
      {
        slug: "art-35-11",
        code: "Art. 35(11)",
        title: { en: "Review when the risk changes", es: "Revisión cuando cambie el riesgo" },
        description: {
          en: "Review the assessment when the risk represented by the processing changes: a new model version, new data sources, a new use case, or a handoff to an autonomous agent all qualify.",
          es: "Revisa la evaluación cuando cambie el riesgo que representa el tratamiento: una nueva versión del modelo, nuevas fuentes de datos, un nuevo caso de uso o la delegación en un agente autónomo son cambios relevantes.",
        },
        applicabilityTags: DPIA,
        sortOrder: 361,
      },
    ],
  },
  {
    slug: "art-36",
    code: "Art. 36",
    title: { en: "Prior consultation of the supervisory authority", es: "Consulta previa a la autoridad de control" },
    description: {
      en: "If the assessment shows the processing would result in a high risk that the controller cannot mitigate, consult the supervisory authority before processing starts.",
      es: "Si la evaluación indica que el tratamiento entrañaría un alto riesgo que el responsable no puede mitigar, consulta a la autoridad de control antes de iniciar el tratamiento.",
    },
    applicabilityTags: DPIA,
    sortOrder: 360,
  },
  {
    slug: "art-44",
    code: "Art. 44",
    title: { en: "International transfers", es: "Transferencias internacionales" },
    description: {
      en: "Personal data sent to a model provider or its subprocessors outside the EEA needs a valid transfer mechanism. The vendor supply chain in this product shows where the data goes.",
      es: "Los datos personales enviados a un proveedor de modelos o a sus subencargados fuera del EEE necesitan un mecanismo de transferencia válido. La cadena de suministro del proveedor en este producto muestra adónde van los datos.",
    },
    applicabilityTags: CORE,
    sortOrder: 440,
  },
];

export const GDPR_PACK: RegimePack = { framework: GDPR_FRAMEWORK, requirements: GDPR_REQUIREMENTS };
