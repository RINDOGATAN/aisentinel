// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The worked example a first-time account can start from.
 *
 * A first run should not face empty forms, and the fastest honest way to show
 * what the product does is to fill one in. So an account can take this example
 * in one click: three AI systems with their risk classifications, the vendor
 * behind one of them, a policy, an oversight gate, an incident and an impact
 * assessment whose questions are already answered well enough to export a
 * document that reads as a real one.
 *
 * Rules this content obeys:
 *  - It is invented, and it says so in every name and description. An example
 *    that could be mistaken for a real client's matter is worse than none.
 *  - It is internally consistent: the high-risk system really is an Annex III
 *    employment case, the limited-risk one really is an Article 50 interaction
 *    case, and the answers match the systems they describe.
 *  - It never asserts something the product would have to derive. The risk
 *    classifications carry a rationale, as a human-entered classification must.
 *  - Both languages, Castilian, "tú", no long dashes.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

import type { PilotLocale } from "./pilot";

/** Bump when the content changes, so the audit entry says which example ran. */
export const WORKED_EXAMPLE_VERSION = "1.0.0";

/**
 * Where the example organisation operates. Scope resolution can say nothing at
 * all until a jurisdiction is declared, so an example with none declared would
 * produce documents that say "no regime resolved yet" on every page, which
 * teaches the opposite of what it should. The organisation's own value is kept
 * and put back when the example is removed.
 */
export const WORKED_EXAMPLE_JURISDICTIONS = ["EU"] as const;

export interface ExampleSystem {
  key: string;
  name: Record<PilotLocale, string>;
  description: Record<PilotLocale, string>;
  purpose: Record<PilotLocale, string>;
  technique:
    | "MACHINE_LEARNING"
    | "GENERATIVE_AI"
    | "NLP"
    | "DEEP_LEARNING"
    | "RULE_BASED";
  role: "PROVIDER" | "DEPLOYER" | "USER";
  status: "DRAFT" | "DEVELOPMENT" | "TESTING" | "DEPLOYED";
  processesPersonalData: boolean;
  businessOwner: Record<PilotLocale, string>;
  technicalOwner: Record<PilotLocale, string>;
  risk: {
    level: "HIGH" | "LIMITED" | "MINIMAL";
    annexIIICategory: string | null;
    rationale: Record<PilotLocale, string>;
  };
  /** The example vendor this system runs on, by key. */
  vendorKey?: string;
}

export interface ExampleVendor {
  key: string;
  name: Record<PilotLocale, string>;
  description: Record<PilotLocale, string>;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
}

export const EXAMPLE_VENDORS: readonly ExampleVendor[] = [
  {
    key: "example-vendor",
    name: { en: "Example Screening Ltd (sample)", es: "Cribado de Ejemplo, S.L. (muestra)" },
    description: {
      en: "Invented supplier of the applicant screening model in this example. It exists only to show how a vendor, a system and an assessment hang together.",
      es: "Proveedor inventado del modelo de cribado de candidaturas de este ejemplo. Existe solo para mostrar cómo se relacionan un proveedor, un sistema y una evaluación.",
    },
    riskLevel: "HIGH",
  },
];

export const EXAMPLE_SYSTEMS: readonly ExampleSystem[] = [
  {
    key: "applicant-screening",
    name: { en: "Applicant screening model (sample)", es: "Modelo de cribado de candidaturas (muestra)" },
    description: {
      en: "An invented model that scores applications for junior roles and orders them for a first sift. Trained on five years of the example organisation's own hiring records and retrained each quarter.",
      es: "Un modelo inventado que puntúa las candidaturas a puestos de nivel inicial y las ordena para un primer cribado. Entrenado con cinco años de registros de contratación de la organización de ejemplo y reentrenado cada trimestre.",
    },
    purpose: {
      en: "Order incoming applications so a recruiter reads the most relevant first. No application is rejected by the model alone.",
      es: "Ordenar las candidaturas recibidas para que una persona de selección lea primero las más relevantes. Ninguna candidatura se rechaza solo por el modelo.",
    },
    technique: "MACHINE_LEARNING",
    role: "DEPLOYER",
    status: "DEPLOYED",
    processesPersonalData: true,
    businessOwner: { en: "Head of hiring (sample)", es: "Dirección de selección (muestra)" },
    technicalOwner: { en: "Data platform team (sample)", es: "Equipo de plataforma de datos (muestra)" },
    risk: {
      level: "HIGH",
      annexIIICategory: "employment_contracting",
      rationale: {
        en: "Used in recruitment to filter applications and rank candidates, which Annex III point 4 of the EU AI Act lists as high risk. The decision affects access to employment, and the people affected are applicants who cannot negotiate the terms on which they are assessed.",
        es: "Se utiliza en la contratación para filtrar candidaturas y ordenar personas candidatas, un supuesto que el anexo III, punto 4, del Reglamento de IA de la UE califica de alto riesgo. La decisión afecta al acceso al empleo y las personas afectadas no pueden negociar las condiciones en que se las evalúa.",
      },
    },
    vendorKey: "example-vendor",
  },
  {
    key: "customer-assistant",
    name: { en: "Customer assistant (sample)", es: "Asistente de clientes (muestra)" },
    description: {
      en: "An invented generative assistant on the example organisation's public site. It answers questions about products and opening hours, and hands anything else to a person.",
      es: "Un asistente generativo inventado en el sitio público de la organización de ejemplo. Responde preguntas sobre productos y horarios y deriva cualquier otro asunto a una persona.",
    },
    purpose: {
      en: "Answer routine public questions at any hour and pass everything else to a person, with the handover visible to the customer.",
      es: "Responder preguntas públicas rutinarias a cualquier hora y pasar todo lo demás a una persona, con el traspaso visible para la clientela.",
    },
    technique: "GENERATIVE_AI",
    role: "DEPLOYER",
    status: "DEPLOYED",
    processesPersonalData: true,
    businessOwner: { en: "Customer operations (sample)", es: "Operaciones de clientela (muestra)" },
    technicalOwner: { en: "Web team (sample)", es: "Equipo web (muestra)" },
    risk: {
      level: "LIMITED",
      annexIIICategory: null,
      rationale: {
        en: "Interacts directly with people, so Article 50 of the EU AI Act requires that they be told they are dealing with an AI system. It informs no decision about a person, so no high-risk use case in Annex III applies.",
        es: "Interactúa directamente con personas, por lo que el artículo 50 del Reglamento de IA de la UE exige informarles de que tratan con un sistema de IA. No fundamenta ninguna decisión sobre una persona, de modo que no se aplica ningún supuesto de alto riesgo del anexo III.",
      },
    },
  },
  {
    key: "meeting-notes",
    name: { en: "Internal meeting summariser (sample)", es: "Resumidor de reuniones internas (muestra)" },
    description: {
      en: "An invented tool that turns the example organisation's own internal meeting transcripts into summaries for the people who attended.",
      es: "Una herramienta inventada que convierte las transcripciones de reuniones internas de la organización de ejemplo en resúmenes para quienes asistieron.",
    },
    purpose: {
      en: "Save the time spent writing up internal meetings. The summary goes only to the attendees, who correct it.",
      es: "Ahorrar el tiempo de redactar actas de reuniones internas. El resumen llega solo a quienes asistieron, que lo corrigen.",
    },
    technique: "NLP",
    role: "DEPLOYER",
    status: "TESTING",
    processesPersonalData: true,
    businessOwner: { en: "Operations (sample)", es: "Operaciones (muestra)" },
    technicalOwner: { en: "IT (sample)", es: "Sistemas (muestra)" },
    risk: {
      level: "MINIMAL",
      annexIIICategory: null,
      rationale: {
        en: "Summarises the organisation's own internal records for the people who were in the room. It informs no decision about anyone and interacts with no member of the public, so neither Annex III nor Article 50 is engaged. Data protection duties still apply to the transcripts.",
        es: "Resume registros internos de la propia organización para las personas que estuvieron en la reunión. No fundamenta ninguna decisión sobre nadie ni interactúa con el público, por lo que no entran en juego ni el anexo III ni el artículo 50. Las obligaciones de protección de datos siguen aplicándose a las transcripciones.",
      },
    },
  },
];

/**
 * The answers the example records for the high-risk system, keyed by the unified
 * assessment's question ids. Enough to produce a document that reads as a real
 * one; deliberately NOT every question, so the reader also sees what an open
 * item looks like and how the document carries it.
 */
export const EXAMPLE_ASSESSMENT_ANSWERS: Record<string, Record<PilotLocale, string>> = {
  sys_description: {
    en: "A gradient-boosted model over the text of an application and its structured fields, trained on five years of the example organisation's own hiring outcomes and retrained each quarter. It returns a score between 0 and 1 and an ordering; it returns no decision.",
    es: "Un modelo de refuerzo del gradiente sobre el texto de la candidatura y sus campos estructurados, entrenado con cinco años de resultados de contratación de la propia organización de ejemplo y reentrenado cada trimestre. Devuelve una puntuación entre 0 y 1 y una ordenación; no devuelve una decisión.",
  },
  sys_purpose: {
    en: "To put the most relevant applications in front of a recruiter first, for roles that receive several hundred applications each. The organisation uses it to shorten time to first response, not to reduce the number of people who read an application.",
    es: "Situar las candidaturas más relevantes ante la persona de selección en primer lugar, en puestos que reciben varios cientos de candidaturas cada uno. La organización lo utiliza para acortar el tiempo hasta la primera respuesta, no para reducir el número de personas que leen una candidatura.",
  },
  sys_necessity: {
    en: "Manual ordering was tried and took four working days per role, during which good applicants withdrew. A simple keyword filter was tried and rejected because it excluded career changers whose wording differed. The model is used because it orders rather than excludes: every application is still read by a person.",
    es: "Se probó la ordenación manual y llevaba cuatro días laborables por puesto, durante los cuales se retiraban buenas candidaturas. Se probó un filtro simple por palabras clave y se descartó porque excluía a personas que cambiaban de carrera y se expresaban de otro modo. El modelo se usa porque ordena en lugar de excluir: toda candidatura la sigue leyendo una persona.",
  },
  ppl_categories: {
    en: "Applicants for junior roles, around 4,000 a year. Most are in their first five years of work.",
    es: "Personas candidatas a puestos de nivel inicial, unas 4.000 al año. La mayoría está en sus primeros cinco años de vida laboral.",
  },
  ppl_vulnerable: {
    en: "Applicants are in a clear imbalance of power: they cannot see the model, cannot negotiate how they are assessed, and depend on the outcome for access to work. A proportion are recent graduates and career changers. No children are involved; the minimum age for the roles is 18.",
    es: "Las personas candidatas están en un claro desequilibrio de poder: no ven el modelo, no pueden negociar cómo se las evalúa y dependen del resultado para acceder al empleo. Una parte son recién tituladas o cambian de carrera. No participan menores: la edad mínima para los puestos es de 18 años.",
  },
  data_categories: {
    en: "Input: the application text, education and employment history, and the role applied for. Training: the same fields for past applications, with the hiring outcome as the label. Evaluation: a held-out year of applications. No special category data is used as an input.",
    es: "Entrada: el texto de la candidatura, el historial formativo y laboral y el puesto solicitado. Entrenamiento: los mismos campos de candidaturas anteriores, con el resultado de contratación como etiqueta. Evaluación: un año de candidaturas reservado. No se utiliza ninguna categoría especial de datos como entrada.",
  },
  dec_description: {
    en: "The model orders applications for a first sift. A recruiter reads them in that order and decides who goes to interview. If the model orders an application low, the consequence for that person is that their application is read later, not that it is rejected.",
    es: "El modelo ordena las candidaturas para un primer cribado. Una persona de selección las lee en ese orden y decide quién pasa a entrevista. Si el modelo ordena una candidatura en una posición baja, la consecuencia para esa persona es que su candidatura se lee más tarde, no que se rechace.",
  },
  dec_human_role: {
    en: "The recruiter sees the application in full, the model's score, and the note that the score is an ordering aid. They also see the applications the model ordered lowest, in a separate list they are required to work through. They can interview anyone at any position and are not asked to justify departing from the order.",
    es: "La persona de selección ve la candidatura completa, la puntuación del modelo y la advertencia de que la puntuación es solo una ayuda a la ordenación. También ve, en una lista aparte que está obligada a revisar, las candidaturas peor ordenadas. Puede convocar a entrevista a cualquier persona en cualquier posición y no se le pide justificar apartarse del orden.",
  },
  risk_discrimination: {
    en: "The main risk is that the model learns the pattern of past hiring rather than the requirements of the role, and so reproduces any historic under-representation. The characteristics at stake are sex, age, ethnic origin and disability. The example organisation tests selection rates by sex and age band each quarter against a four-fifths rule and records the result; ethnic origin and disability are not held, so those are tested by proxy audit on applicant surveys.",
    es: "El riesgo principal es que el modelo aprenda el patrón de contrataciones pasadas en lugar de los requisitos del puesto y reproduzca así cualquier infrarrepresentación histórica. Las características en juego son el sexo, la edad, el origen étnico y la discapacidad. La organización de ejemplo comprueba cada trimestre las tasas de selección por sexo y tramo de edad frente a una regla de cuatro quintos y registra el resultado; el origen étnico y la discapacidad no constan, por lo que se comprueban mediante auditoría indirecta sobre encuestas a las personas candidatas.",
  },
  meas_oversight: {
    en: "Two recruiters oversee every role, one of whom must be outside the hiring team. Both are trained on how the score is produced and on automation bias, and the training is repeated annually. The requirement to work through the lowest-ordered applications is the specific countermeasure to accepting the order uncritically.",
    es: "Dos personas de selección supervisan cada puesto, y una de ellas debe ser ajena al equipo contratante. Ambas reciben formación sobre cómo se produce la puntuación y sobre el sesgo de automatización, y la formación se repite cada año. La obligación de revisar las candidaturas peor ordenadas es la contramedida concreta frente a aceptar el orden sin criterio.",
  },
  rev_route: {
    en: "Every applicant is told, in the acknowledgement email and on the application page, that an AI system helps order applications, and is given an address at which to ask for their application to be read by a person outside the process. The route does not require a reason.",
    es: "A cada persona candidata se le informa, en el correo de acuse de recibo y en la página de la candidatura, de que un sistema de IA ayuda a ordenar las candidaturas, y se le facilita una dirección para pedir que su candidatura la lea una persona ajena al proceso. La vía no exige alegar un motivo.",
  },
  gov_owners: {
    en: "Business owner: the head of hiring of the example organisation. Technical owner: its data platform team. Accountable for this assessment: the AI officer, who signs it before the next quarterly retraining.",
    es: "Responsable de negocio: la dirección de selección de la organización de ejemplo. Responsable técnico: su equipo de plataforma de datos. Responsable de esta evaluación: el responsable de IA, que la firma antes del siguiente reentrenamiento trimestral.",
  },
};

export interface ExamplePolicy {
  key: string;
  title: Record<PilotLocale, string>;
  type: "AI_USAGE";
  description: Record<PilotLocale, string>;
  content: Record<PilotLocale, string>;
}

export const EXAMPLE_POLICY: ExamplePolicy = {
  key: "acceptable-use",
  title: { en: "Acceptable use of AI (sample)", es: "Uso aceptable de la IA (muestra)" },
  type: "AI_USAGE",
  description: {
    en: "An invented one-page rule for how people in the example organisation may use AI tools at work. Short on purpose: a policy nobody reads governs nothing.",
    es: "Una norma inventada de una página sobre cómo pueden usar herramientas de IA en el trabajo las personas de la organización de ejemplo. Breve a propósito: una política que nadie lee no gobierna nada.",
  },
  content: {
    en: [
      "1. Any AI tool used for work goes in the AI inventory before it touches organisation data. Adding it takes a few minutes and is not a request for permission.",
      "",
      "2. Do not put personal data about a colleague, a customer or an applicant into a tool that is not in the inventory.",
      "",
      "3. Where an AI system informs a decision about a person, a named person decides and is accountable for the decision. The system's output is one input among others.",
      "",
      "4. Where people interact with an AI system, they are told so plainly, in the first exchange.",
      "",
      "5. If an AI system produces a result that harms someone or could have, report it as an incident the same day. Reporting is never penalised.",
      "",
      "This is a sample policy in a worked example. Replace it with your own before you rely on it.",
    ].join("\n"),
    es: [
      "1. Toda herramienta de IA que se use para el trabajo se inscribe en el inventario de IA antes de que trate datos de la organización. Inscribirla lleva unos minutos y no es una solicitud de permiso.",
      "",
      "2. No introduzcas datos personales de una persona del equipo, de la clientela o de una candidatura en una herramienta que no esté en el inventario.",
      "",
      "3. Cuando un sistema de IA fundamente una decisión sobre una persona, decide una persona con nombre y apellidos, que responde de la decisión. El resultado del sistema es una entrada más entre otras.",
      "",
      "4. Cuando las personas interactúen con un sistema de IA, se les informa de ello con claridad en el primer intercambio.",
      "",
      "5. Si un sistema de IA produce un resultado que perjudica a alguien o pudo hacerlo, comunícalo como incidente ese mismo día. Comunicarlo nunca se penaliza.",
      "",
      "Esta es una política de muestra dentro de un ejemplo. Sustitúyela por la tuya antes de confiar en ella.",
    ].join("\n"),
  },
};

export const EXAMPLE_GATE = {
  systemKey: "applicant-screening",
  gateType: "PERIODIC_REVIEW" as const,
  description: {
    en: "Quarterly review of the applicant screening model before each retraining: selection rates by sex and age band, the reviewers' log of departures from the model's order, and any complaint received through the human review route.",
    es: "Revisión trimestral del modelo de cribado de candidaturas antes de cada reentrenamiento: tasas de selección por sexo y tramo de edad, registro de las veces que las personas revisoras se apartaron del orden del modelo y cualquier reclamación recibida por la vía de revisión humana.",
  },
  reviewCadence: { en: "Quarterly", es: "Trimestral" },
  /** Days from creation to the first review date. */
  firstReviewInDays: 30,
};

export const EXAMPLE_INCIDENT = {
  systemKey: "customer-assistant",
  type: "HALLUCINATION" as const,
  severity: "MEDIUM" as const,
  title: {
    en: "Assistant stated a refund window that does not exist (sample)",
    es: "El asistente indicó un plazo de devolución que no existe (muestra)",
  },
  description: {
    en: "In this invented incident the customer assistant told several people they had 60 days to return an item, where the published term is 30. Three customers relied on it. The example organisation honoured the 60 days for those three, corrected the retrieval source the same day, and added the published terms to the assistant's grounding set. Recorded here to show what an incident record and its clocks look like.",
    es: "En este incidente inventado, el asistente de clientes indicó a varias personas que disponían de 60 días para devolver un artículo, cuando el plazo publicado es de 30. Tres clientes se fiaron de esa información. La organización de ejemplo respetó los 60 días en esos tres casos, corrigió la fuente de recuperación el mismo día y añadió las condiciones publicadas al conjunto de anclaje del asistente. Se registra aquí para mostrar el aspecto de un registro de incidente y de sus plazos.",
  },
  rootCauseCategory: { en: "Ungrounded retrieval", es: "Recuperación sin anclaje" },
  impactDescription: {
    en: "Three customers were given a term the organisation does not offer. No personal data was exposed and nobody was refused a refund.",
    es: "Tres clientes recibieron una condición que la organización no ofrece. No se expuso ningún dato personal y no se denegó ninguna devolución.",
  },
};

/** The one action, and what it says it will do. */
export const WORKED_EXAMPLE_CHROME: Record<
  PilotLocale,
  {
    title: string;
    lead: string;
    startExample: string;
    startEmpty: string;
    contents: string;
    jurisdictionNote: string;
    markedNote: string;
    removeTitle: string;
    removeLead: string;
    remove: string;
    removed: string;
    badge: string;
  }
> = {
  en: {
    title: "Start from a worked example, or start empty",
    lead: "A governance programme is easier to judge filled in than blank. Take the example and change what does not fit, or start with nothing. Either way you can change your mind.",
    startExample: "Start from the worked example",
    startEmpty: "Start empty",
    contents:
      "The example adds three AI systems with their risk classifications, the vendor behind one of them, an acceptable-use policy, a quarterly oversight review, one incident, and an impact assessment with its answers already recorded.",
    jurisdictionNote:
      "It also records that the example organisation operates in the European Union, because nothing can be assessed until somewhere is declared. Change it in Settings at any time; removing the example puts back whatever was there before.",
    markedNote:
      "Everything the example creates is marked as sample data wherever it appears, and one action removes all of it without touching anything you have created yourself.",
    removeTitle: "Sample data",
    removeLead:
      "This organisation holds records from the worked example. Removing them deletes only those records; anything you have created yourself stays.",
    remove: "Remove the sample data",
    removed: "The sample data is gone.",
    badge: "Sample",
  },
  es: {
    title: "Empieza desde un ejemplo o empieza en blanco",
    lead: "Un programa de gobernanza se juzga mejor relleno que vacío. Toma el ejemplo y cambia lo que no encaje, o empieza sin nada. En cualquier caso puedes cambiar de idea.",
    startExample: "Empezar desde el ejemplo",
    startEmpty: "Empezar en blanco",
    contents:
      "El ejemplo añade tres sistemas de IA con su clasificación de riesgo, el proveedor de uno de ellos, una política de uso aceptable, una revisión de supervisión trimestral, un incidente y una evaluación de impacto con las respuestas ya registradas.",
    jurisdictionNote:
      "También registra que la organización de ejemplo opera en la Unión Europea, porque no se puede evaluar nada hasta que se declara un territorio. Cámbialo en Configuración cuando quieras; al quitar el ejemplo se restablece lo que hubiera antes.",
    markedNote:
      "Todo lo que crea el ejemplo aparece marcado como datos de muestra en cada pantalla, y una sola acción lo elimina por completo sin tocar nada de lo que hayas creado tú.",
    removeTitle: "Datos de muestra",
    removeLead:
      "Esta organización contiene registros del ejemplo. Al quitarlos se eliminan solo esos registros; todo lo que hayas creado tú se mantiene.",
    remove: "Quitar los datos de muestra",
    removed: "Los datos de muestra se han eliminado.",
    badge: "Muestra",
  },
};
