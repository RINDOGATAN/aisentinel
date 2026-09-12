// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Threat modelling for builders: scenario, control, test, evidence.
 *
 * Telling a five-person team to implement a governance framework is not useful.
 * Asking what could go wrong with the thing they are actually building is. This
 * module makes that question systematic:
 *
 *   1. MAP        what the system can see, retrieve, remember, call and do
 *   2. IMAGINE    what could go wrong, by accident, by attack, or in normal use
 *   3. PRIORITISE which scenarios carry the impact and the blast radius
 *   4. CONTROL    prevent, constrain, detect, respond, assure
 *   5. TEST       try to break the control, and keep the result as evidence
 *
 * The library below is the automation: choose what the system can do, and the
 * scenarios that follow are proposed with their controls and a test for each.
 * A team starts from a short, concrete list rather than a blank page or a
 * seventy-question assessment.
 *
 * Framework references are pointers for challenging assumptions, not homework:
 * NIST AI RMF (Govern, Map, Measure, Manage) and its generative profile, the
 * OWASP GenAI and agentic top tens, and MITRE ATLAS for adversarial technique.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

export const THREAT_MODEL_VERSION = "2026.09.1";
export const THREAT_MODEL_REVIEWED_AS_OF = "2026-09-12";

export type Localized = { en: string; es: string };

// ============================================================
// 1. MAP — what the system can see, retrieve, remember, call and do
// ============================================================

export const CAPABILITY_GROUPS = ["sees", "retrieves", "remembers", "calls", "acts"] as const;
export type CapabilityGroup = (typeof CAPABILITY_GROUPS)[number];

export const CAPABILITY_GROUP_LABELS: Record<CapabilityGroup, Localized> = {
  sees: { en: "What it can see", es: "Qué puede ver" },
  retrieves: { en: "What it can retrieve", es: "Qué puede recuperar" },
  remembers: { en: "What it remembers", es: "Qué recuerda" },
  calls: { en: "What it can call", es: "Qué puede invocar" },
  acts: { en: "What it can do", es: "Qué puede hacer" },
};

export interface Capability {
  id: string;
  group: CapabilityGroup;
  label: Localized;
  /** One line on why this capability matters for the threat model. */
  note: Localized;
}

export const CAPABILITIES: Capability[] = [
  // ── sees
  {
    id: "user_input",
    group: "sees",
    label: { en: "Text typed by a user", es: "Texto escrito por una persona usuaria" },
    note: {
      en: "Anything a user types is untrusted input, including instructions aimed at the model itself.",
      es: "Todo lo que escribe una persona usuaria es entrada no confiable, incluidas instrucciones dirigidas al propio modelo.",
    },
  },
  {
    id: "customer_records",
    group: "sees",
    label: { en: "Customer records", es: "Datos de clientes" },
    note: {
      en: "Personal data about identifiable people, with the duties that follow.",
      es: "Datos personales de personas identificables, con los deberes que ello conlleva.",
    },
  },
  {
    id: "employee_records",
    group: "sees",
    label: { en: "Employee or HR records", es: "Datos de personal o de RR. HH." },
    note: {
      en: "Employment data carries its own confidentiality expectations and, in places, works council duties.",
      es: "Los datos laborales tienen sus propias expectativas de confidencialidad y, en algunos sitios, deberes de información a la representación de los trabajadores.",
    },
  },
  {
    id: "special_category",
    group: "sees",
    label: { en: "Health or other sensitive data", es: "Datos de salud u otros datos sensibles" },
    note: {
      en: "Health, biometric, genetic, precise location and the rest: opt-in consent in several regimes, and the harm from disclosure is lasting.",
      es: "Salud, biometría, genética, ubicación precisa y las demás: consentimiento expreso en varios regímenes, y el perjuicio de su divulgación es duradero.",
    },
  },
  {
    id: "payment_data",
    group: "sees",
    label: { en: "Payment or financial data", es: "Datos de pago o financieros" },
    note: {
      en: "Card and account data brings contractual security standards as well as legal ones.",
      es: "Los datos de tarjeta y de cuenta traen consigo estándares de seguridad contractuales además de los legales.",
    },
  },
  {
    id: "secrets",
    group: "sees",
    label: { en: "Credentials or secrets", es: "Credenciales o secretos" },
    note: {
      en: "Anything the model can see, it can repeat. Secrets in a prompt are secrets in a log.",
      es: "Todo lo que el modelo puede ver, puede repetirlo. Un secreto en una instrucción es un secreto en un registro.",
    },
  },
  // ── retrieves
  {
    id: "internal_docs",
    group: "retrieves",
    label: { en: "Internal documents", es: "Documentos internos" },
    note: {
      en: "Retrieval is where authorisation has to happen; a prompt asking the model to keep a secret is not access control.",
      es: "La autorización tiene que ocurrir en la recuperación; pedirle al modelo que guarde un secreto no es control de acceso.",
    },
  },
  {
    id: "web_content",
    group: "retrieves",
    label: { en: "Web pages or external content", es: "Páginas web o contenido externo" },
    note: {
      en: "Content fetched from outside is untrusted data, and may contain instructions written for the model.",
      es: "El contenido recuperado del exterior es dato no confiable y puede contener instrucciones escritas para el modelo.",
    },
  },
  {
    id: "email_inbox",
    group: "retrieves",
    label: { en: "Email or messages", es: "Correo o mensajes" },
    note: {
      en: "An inbox is an untrusted channel that anyone can write to.",
      es: "Un buzón es un canal no confiable en el que cualquiera puede escribir.",
    },
  },
  {
    id: "code_repo",
    group: "retrieves",
    label: { en: "Source code", es: "Código fuente" },
    note: {
      en: "Repositories carry secrets, build scripts and instructions in readme files.",
      es: "Los repositorios contienen secretos, scripts de compilación e instrucciones en los archivos de descripción.",
    },
  },
  // ── remembers
  {
    id: "conversation_memory",
    group: "remembers",
    label: { en: "The conversation", es: "La conversación" },
    note: {
      en: "What one user said can reach the next one if the context is shared or cached.",
      es: "Lo que dijo una persona puede llegar a la siguiente si el contexto se comparte o se almacena en caché.",
    },
  },
  {
    id: "long_term_memory",
    group: "remembers",
    label: { en: "A long-term profile or memory store", es: "Un perfil o memoria a largo plazo" },
    note: {
      en: "Memory that persists can be poisoned once and used many times.",
      es: "Una memoria persistente puede envenenarse una vez y utilizarse muchas.",
    },
  },
  // ── calls
  {
    id: "tool_calls",
    group: "calls",
    label: { en: "Tools or functions", es: "Herramientas o funciones" },
    note: {
      en: "Each tool is a new way for a manipulated model to act. The allowlist is the boundary.",
      es: "Cada herramienta es una vía nueva para que un modelo manipulado actúe. La lista de permitidos es el límite.",
    },
  },
  {
    id: "database_query",
    group: "calls",
    label: { en: "A database", es: "Una base de datos" },
    note: {
      en: "Read and write should be separate permissions, scoped to what this system needs.",
      es: "La lectura y la escritura deben ser permisos separados, limitados a lo que este sistema necesita.",
    },
  },
  {
    id: "code_execution",
    group: "calls",
    label: { en: "Code or shell commands", es: "Código u órdenes de consola" },
    note: {
      en: "Execution turns a text mistake into a system change.",
      es: "La ejecución convierte un error de texto en un cambio en el sistema.",
    },
  },
  {
    id: "third_party_api",
    group: "calls",
    label: { en: "Third-party services", es: "Servicios de terceros" },
    note: {
      en: "Scoped credentials, and a record of what leaves the organisation with each call.",
      es: "Credenciales limitadas y constancia de qué sale de la organización en cada llamada.",
    },
  },
  // ── acts
  {
    id: "send_external",
    group: "acts",
    label: { en: "Send messages outside", es: "Enviar mensajes al exterior" },
    note: {
      en: "A message that leaves cannot be recalled. Recipient and content both need checking.",
      es: "Un mensaje que sale no puede recuperarse. Hay que comprobar tanto el destinatario como el contenido.",
    },
  },
  {
    id: "transact",
    group: "acts",
    label: { en: "Move money or issue refunds", es: "Mover dinero o emitir reembolsos" },
    note: {
      en: "The classic case for a cap and an approval above it.",
      es: "El caso clásico para un límite y una aprobación por encima de él.",
    },
  },
  {
    id: "modify_records",
    group: "acts",
    label: { en: "Change records", es: "Modificar registros" },
    note: {
      en: "Changes need to be reversible, and the reversal window needs to be known.",
      es: "Los cambios deben ser reversibles y hay que conocer la ventana de reversión.",
    },
  },
  {
    id: "deploy_code",
    group: "acts",
    label: { en: "Deploy or change infrastructure", es: "Desplegar o cambiar infraestructura" },
    note: {
      en: "Production credentials by default is the single largest blast radius in most builds.",
      es: "Tener credenciales de producción por defecto es el mayor radio de impacto en la mayoría de los desarrollos.",
    },
  },
  {
    id: "decide_about_person",
    group: "acts",
    label: {
      en: "Influence a decision about a person",
      es: "Influir en una decisión sobre una persona",
    },
    note: {
      en: "Where this is true, the threat model cannot stop at security: harm can occur with nobody attacking.",
      es: "Cuando esto ocurre, el modelo de amenazas no puede quedarse en la seguridad: el perjuicio puede producirse sin que nadie ataque.",
    },
  },
  {
    id: "hand_to_agent",
    group: "acts",
    label: { en: "Hand off to another agent", es: "Traspasar a otro agente" },
    note: {
      en: "Individually reasonable actions can combine into an outcome nobody chose.",
      es: "Acciones razonables por separado pueden combinarse en un resultado que nadie eligió.",
    },
  },
  {
    id: "publish_content",
    group: "acts",
    label: { en: "Publish content", es: "Publicar contenido" },
    note: {
      en: "Published output carries marking, accuracy and liability questions the draft did not.",
      es: "El resultado publicado plantea cuestiones de marcado, exactitud y responsabilidad que el borrador no tenía.",
    },
  },
];

export const CAPABILITY_IDS = CAPABILITIES.map((c) => c.id);

// ============================================================
// 2. IMAGINE — the seven questions that generate scenarios
// ============================================================

export const SCENARIO_CATEGORIES = [
  "disclosure",
  "accuracy",
  "manipulation",
  "authority",
  "harm",
  "detection",
  "chains",
] as const;
export type ScenarioCategory = (typeof SCENARIO_CATEGORIES)[number];

export const CATEGORY_QUESTIONS: Record<ScenarioCategory, Localized> = {
  disclosure: {
    en: "Could it reveal something it should not?",
    es: "¿Podría revelar algo que no debería?",
  },
  accuracy: {
    en: "Could it confidently believe or generate something false?",
    es: "¿Podría creer o generar con total seguridad algo falso?",
  },
  manipulation: {
    en: "Could a user, a document, a page, a tool or another agent manipulate it?",
    es: "¿Podría manipularlo una persona, un documento, una página, una herramienta u otro agente?",
  },
  authority: {
    en: "Could it take an action it should not be allowed to take?",
    es: "¿Podría realizar una acción que no debería estarle permitida?",
  },
  harm: {
    en: "Could it harm someone unfairly or unsafely, even with nobody attacking?",
    es: "¿Podría perjudicar a alguien de forma injusta o insegura, aunque nadie lo ataque?",
  },
  detection: {
    en: "Could something bad happen without anyone noticing?",
    es: "¿Podría ocurrir algo malo sin que nadie se diera cuenta?",
  },
  chains: {
    en: "Could several reasonable actions combine into a bad outcome?",
    es: "¿Podrían varias acciones razonables combinarse en un mal resultado?",
  },
};

// ============================================================
// 4. CONTROL — the five layers
// ============================================================

export const CONTROL_LAYERS = ["prevent", "constrain", "detect", "respond", "assure"] as const;
export type ControlLayer = (typeof CONTROL_LAYERS)[number];

export const CONTROL_LAYER_LABELS: Record<ControlLayer, Localized> = {
  prevent: { en: "Prevent", es: "Prevenir" },
  constrain: { en: "Constrain", es: "Limitar" },
  detect: { en: "Detect", es: "Detectar" },
  respond: { en: "Respond", es: "Responder" },
  assure: { en: "Assure", es: "Asegurar" },
};

export const CONTROL_LAYER_NOTES: Record<ControlLayer, Localized> = {
  prevent: {
    en: "Access control, input validation, least privilege, sandboxing.",
    es: "Control de acceso, validación de entradas, mínimo privilegio, aislamiento.",
  },
  constrain: {
    en: "Transaction limits, scoped tokens, restricted APIs, bounded autonomy.",
    es: "Límites de operación, credenciales acotadas, API restringidas, autonomía limitada.",
  },
  detect: {
    en: "Logging, anomaly detection, monitoring, alerts.",
    es: "Registro, detección de anomalías, supervisión, alertas.",
  },
  respond: {
    en: "Kill switch, rollback, revoked credentials, terminated sessions.",
    es: "Interruptor de parada, reversión, revocación de credenciales, cierre de sesiones.",
  },
  assure: {
    en: "Red teaming, adversarial tests, evaluations, regression tests.",
    es: "Pruebas de equipo rojo, pruebas adversarias, evaluaciones, pruebas de regresión.",
  },
};

// ============================================================
// 3. PRIORITISE
// ============================================================

export const LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type Level = (typeof LEVELS)[number];

export const BLAST_RADIUS = ["LIMITED", "SIGNIFICANT", "SEVERE"] as const;
export type BlastRadius = (typeof BLAST_RADIUS)[number];

export const PRIORITIES = ["WATCH", "PLAN", "ACT_NOW"] as const;
export type Priority = (typeof PRIORITIES)[number];

const LEVEL_SCORE: Record<Level, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
const BLAST_SCORE: Record<BlastRadius, number> = { LIMITED: 0, SIGNIFICANT: 1, SEVERE: 2 };

export interface PriorityResult {
  priority: Priority;
  score: number;
  because: Localized;
}

/**
 * Impact times likelihood, plus the blast radius.
 *
 * Blast radius is added rather than multiplied on purpose: a low-likelihood
 * scenario that takes the whole system with it still has to be worked on, and
 * a rule that lets likelihood talk it down is the rule that gets people hurt.
 * Severe blast radius alone is enough to reach the top band.
 */
export function priorityFor(
  impact: Level,
  likelihood: Level,
  blastRadius: BlastRadius,
): PriorityResult {
  const score = LEVEL_SCORE[impact] * LEVEL_SCORE[likelihood] + BLAST_SCORE[blastRadius] * 2;

  if (blastRadius === "SEVERE" || score >= 7) {
    return {
      priority: "ACT_NOW",
      score,
      because:
        blastRadius === "SEVERE"
          ? {
              en: "The blast radius is severe: if this happens, it takes more than this system with it.",
              es: "El radio de impacto es severo: si ocurre, se lleva por delante más que este sistema.",
            }
          : {
              en: "Impact and likelihood together put this at the top of the list.",
              es: "El impacto y la probabilidad, juntos, lo sitúan al principio de la lista.",
            },
    };
  }
  if (score >= 4) {
    return {
      priority: "PLAN",
      score,
      because: {
        en: "Worth a control, but it can be planned rather than dropped everything for.",
        es: "Merece un control, pero puede planificarse sin dejarlo todo.",
      },
    };
  }
  return {
    priority: "WATCH",
    score,
    because: {
      en: "Low impact and low likelihood: record it, and revisit when the system changes.",
      es: "Impacto y probabilidad bajos: déjalo registrado y revísalo cuando cambie el sistema.",
    },
  };
}

// ============================================================
// 5. TEST
// ============================================================

export const TEST_RESULTS = ["PASS", "PARTIAL", "FAIL"] as const;
export type TestResult = (typeof TEST_RESULTS)[number];

/** A control is proven when a test passed recently enough to still mean something. */
export const TEST_FRESH_DAYS = 180;

export type ControlState = "untested" | "failing" | "stale" | "proven";

export function controlState(
  lastResult: TestResult | null,
  lastTestedAt: Date | null,
  now: Date,
): ControlState {
  if (!lastResult || !lastTestedAt) return "untested";
  if (lastResult === "FAIL") return "failing";
  const ageDays = (now.getTime() - lastTestedAt.getTime()) / 86_400_000;
  if (ageDays > TEST_FRESH_DAYS) return "stale";
  return lastResult === "PARTIAL" ? "failing" : "proven";
}

// ============================================================
// THE LIBRARY — scenarios proposed from what the system can do
// ============================================================

export interface SuggestedControl {
  layer: ControlLayer;
  text: Localized;
}

export interface LibraryScenario {
  id: string;
  category: ScenarioCategory;
  /** Proposed when the system has ANY of these capabilities. */
  anyOf: string[];
  /** Proposed only when the system also has ALL of these. */
  allOf?: string[];
  title: Localized;
  /** What could go wrong, told as a thing that happens. */
  story: Localized;
  defaults: { impact: Level; likelihood: Level; blastRadius: BlastRadius };
  controls: SuggestedControl[];
  /** How to find out whether the control actually works. */
  test: Localized;
  /** Where to read more. Short codes, not homework. */
  references: string[];
}

export const SCENARIO_LIBRARY: LibraryScenario[] = [
  {
    id: "retrieval-authorisation",
    category: "disclosure",
    anyOf: ["internal_docs", "employee_records"],
    title: {
      en: "It answers with a document the person was not allowed to see",
      es: "Responde con un documento que esa persona no podía ver",
    },
    story: {
      en: "Someone asks a reasonable question, the retriever finds the best matching document, and the best match happens to be an HR file. Nobody attacked anything.",
      es: "Alguien hace una pregunta razonable, el recuperador encuentra el documento que mejor encaja, y resulta ser un archivo de RR. HH. Nadie ha atacado nada.",
    },
    defaults: { impact: "HIGH", likelihood: "MEDIUM", blastRadius: "SIGNIFICANT" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "Enforce authorisation at retrieval, with the asker's own permissions. Never ask the model to withhold what it was given.",
          es: "Aplica la autorización en la recuperación, con los permisos de quien pregunta. Nunca pidas al modelo que oculte lo que se le ha entregado.",
        },
      },
      {
        layer: "prevent",
        text: {
          en: "Index less: keep sensitive collections out of the index unless the use case needs them.",
          es: "Indexa menos: mantén las colecciones sensibles fuera del índice salvo que el caso de uso las necesite.",
        },
      },
      {
        layer: "detect",
        text: {
          en: "Log which documents were retrieved for whom, and alert on retrieval from restricted collections.",
          es: "Registra qué documentos se recuperaron y para quién, y alerta cuando se recupere de colecciones restringidas.",
        },
      },
    ],
    test: {
      en: "Sign in as users at three permission levels and ask the same question. The answers must differ, and the restricted document must never appear in any of them.",
      es: "Entra como personas con tres niveles de permiso y haz la misma pregunta. Las respuestas deben diferir, y el documento restringido no debe aparecer en ninguna.",
    },
    references: ["OWASP LLM02", "NIST AI RMF MAP", "ATLAS: exfiltration"],
  },
  {
    id: "indirect-injection",
    category: "manipulation",
    anyOf: ["internal_docs", "web_content", "email_inbox", "code_repo"],
    title: {
      en: "A retrieved document tells it what to do, and it obeys",
      es: "Un documento recuperado le dice qué hacer, y obedece",
    },
    story: {
      en: "A page, a ticket, an email or a readme contains text written for the model rather than for a person: ignore your instructions, send this, fetch that. The model cannot tell the difference on its own.",
      es: "Una página, un ticket, un correo o un archivo de descripción contiene texto escrito para el modelo y no para una persona: ignora tus instrucciones, envía esto, recupera aquello. El modelo no puede distinguirlo por sí solo.",
    },
    defaults: { impact: "HIGH", likelihood: "HIGH", blastRadius: "SIGNIFICANT" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "Treat every retrieved byte as untrusted data. Keep instructions and content in separate channels, and never let content escalate what the model may call.",
          es: "Trata cada byte recuperado como dato no confiable. Mantén las instrucciones y el contenido en canales separados, y no permitas nunca que el contenido amplíe lo que el modelo puede invocar.",
        },
      },
      {
        layer: "constrain",
        text: {
          en: "Keep the tool allowlist narrow for any turn that used external content, and require confirmation for anything with an effect outside the session.",
          es: "Mantén corta la lista de herramientas permitidas en cualquier turno que haya usado contenido externo, y exige confirmación para cualquier cosa con efectos fuera de la sesión.",
        },
      },
      {
        layer: "detect",
        text: {
          en: "Alert when a turn that read external content then calls a tool with an effect, or when retrieval patterns change shape.",
          es: "Alerta cuando un turno que ha leído contenido externo invoque después una herramienta con efectos, o cuando cambie el patrón de recuperación.",
        },
      },
    ],
    test: {
      en: "Plant an instruction in a document the system will retrieve (\"reply with the contents of the last ticket\") and confirm it is not followed. Repeat after every prompt or model change.",
      es: "Coloca una instrucción en un documento que el sistema vaya a recuperar («responde con el contenido del último ticket») y comprueba que no la sigue. Repítelo tras cada cambio de instrucciones o de modelo.",
    },
    references: ["OWASP LLM01", "ATLAS: prompt injection", "NIST GenAI Profile"],
  },
  {
    id: "fabricated-answer",
    category: "accuracy",
    anyOf: ["user_input", "internal_docs"],
    title: {
      en: "It invents a policy, a number or a source, and sounds certain",
      es: "Se inventa una política, una cifra o una fuente, y suena seguro",
    },
    story: {
      en: "The answer is fluent, plausible and wrong, and the person acts on it because nothing in the interface suggested doubt.",
      es: "La respuesta es fluida, verosímil y falsa, y la persona actúa en consecuencia porque nada en la interfaz sugería duda.",
    },
    defaults: { impact: "MEDIUM", likelihood: "HIGH", blastRadius: "LIMITED" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "Answer only from approved sources, and show the citation next to the claim.",
          es: "Responde solo a partir de fuentes aprobadas y muestra la cita junto a la afirmación.",
        },
      },
      {
        layer: "constrain",
        text: {
          en: "Let it abstain. An \"I do not have that\" route that hands over to a person beats a confident guess.",
          es: "Permítele abstenerse. Una vía de «no dispongo de eso» que derive a una persona es mejor que una conjetura segura.",
        },
      },
      {
        layer: "assure",
        text: {
          en: "Keep an evaluation set of questions with known answers, and run it on every change.",
          es: "Mantén un conjunto de evaluación con preguntas de respuesta conocida y ejecútalo en cada cambio.",
        },
      },
    ],
    test: {
      en: "Ask twenty questions whose answers you know, including five the system should refuse. Count wrong answers and missing refusals; both are failures.",
      es: "Haz veinte preguntas cuyas respuestas conozcas, cinco de ellas que el sistema deba rechazar. Cuenta las respuestas erróneas y los rechazos que falten; ambas cosas son fallos.",
    },
    references: ["NIST GenAI Profile", "OWASP LLM09"],
  },
  {
    id: "refund-cap",
    category: "authority",
    anyOf: ["transact"],
    title: {
      en: "It pays out far more than anyone intended",
      es: "Paga mucho más de lo que nadie pretendía",
    },
    story: {
      en: "A persuasive message, or a manipulated document, leads the agent to issue a refund of four thousand rather than forty. The tool did exactly what it was asked.",
      es: "Un mensaje convincente, o un documento manipulado, lleva al agente a emitir un reembolso de cuatro mil en lugar de cuarenta. La herramienta hizo exactamente lo que se le pidió.",
    },
    defaults: { impact: "HIGH", likelihood: "MEDIUM", blastRadius: "SIGNIFICANT" },
    controls: [
      {
        layer: "constrain",
        text: {
          en: "Cap what may happen without a person, by amount and by frequency. Above the cap, route for approval.",
          es: "Limita lo que puede ocurrir sin una persona, por importe y por frecuencia. Por encima del límite, deriva a aprobación.",
        },
      },
      {
        layer: "prevent",
        text: {
          en: "Validate parameters outside the model: the policy layer decides whether the proposal may execute.",
          es: "Valida los parámetros fuera del modelo: la capa de políticas decide si la propuesta puede ejecutarse.",
        },
      },
      {
        layer: "detect",
        text: {
          en: "Monitor totals per hour and per customer, and alert on a shape that does not look like normal support work.",
          es: "Supervisa los totales por hora y por cliente, y alerta ante un patrón que no parezca trabajo normal de atención.",
        },
      },
    ],
    test: {
      en: "Try to get past the cap: ask directly, ask in pieces, and plant the request in a document. Record each attempt and what happened.",
      es: "Intenta saltarte el límite: pídelo directamente, pídelo por partes y planta la petición en un documento. Registra cada intento y su resultado.",
    },
    references: ["OWASP Agentic: excessive agency", "NIST AI RMF MANAGE"],
  },
  {
    id: "least-privilege",
    category: "authority",
    anyOf: ["database_query", "modify_records", "third_party_api"],
    title: {
      en: "It can reach far more data than the job needs",
      es: "Puede alcanzar muchos más datos de los que el trabajo necesita",
    },
    story: {
      en: "The credential was created once, for convenience, with broad scope. Nothing goes wrong until something does, and then the blast radius is the whole database.",
      es: "La credencial se creó una vez, por comodidad, con un alcance amplio. No pasa nada hasta que pasa, y entonces el radio de impacto es toda la base de datos.",
    },
    defaults: { impact: "HIGH", likelihood: "MEDIUM", blastRadius: "SEVERE" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "Scope the credential to the rows and operations this system needs, and separate read from write.",
          es: "Limita la credencial a las filas y operaciones que este sistema necesita, y separa la lectura de la escritura.",
        },
      },
      {
        layer: "constrain",
        text: {
          en: "Authorise per tool, not per agent: each tool call carries the permission it needs and no more.",
          es: "Autoriza por herramienta, no por agente: cada llamada lleva el permiso que necesita y ninguno más.",
        },
      },
      {
        layer: "detect",
        text: {
          en: "Log every tool call with its parameters, and review the log for calls nobody expected.",
          es: "Registra cada llamada con sus parámetros y revisa el registro en busca de llamadas que nadie esperaba.",
        },
      },
    ],
    test: {
      en: "Take the credential the system uses and try, by hand, to read and write something outside its remit. It should fail.",
      es: "Coge la credencial que usa el sistema e intenta, a mano, leer y escribir algo fuera de su cometido. Debe fallar.",
    },
    references: ["OWASP Agentic: excessive agency", "ATLAS: credential access"],
  },
  {
    id: "wrong-recipient",
    category: "authority",
    anyOf: ["send_external"],
    title: {
      en: "It sends the right message to the wrong person",
      es: "Envía el mensaje correcto a la persona equivocada",
    },
    story: {
      en: "The draft is good and the address is one character out, or the thread had two customers in it. The message is gone the moment it is sent.",
      es: "El borrador es bueno y la dirección tiene un carácter de más, o el hilo tenía dos clientes. El mensaje desaparece en cuanto se envía.",
    },
    defaults: { impact: "MEDIUM", likelihood: "MEDIUM", blastRadius: "LIMITED" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "Reading a mailbox must not imply permission to send from it. Separate the scopes.",
          es: "Leer un buzón no debe implicar permiso para enviar desde él. Separa los alcances.",
        },
      },
      {
        layer: "constrain",
        text: {
          en: "Confirm before anything leaves the organisation, and verify the recipient against the record the message is about.",
          es: "Confirma antes de que algo salga de la organización y verifica el destinatario contra el registro del que trata el mensaje.",
        },
      },
      {
        layer: "respond",
        text: {
          en: "Keep an undo window and a log of what was sent, so a mistake can be retracted and explained.",
          es: "Mantén una ventana de deshacer y un registro de lo enviado, para poder retractarse y explicarlo.",
        },
      },
    ],
    test: {
      en: "Set up a thread with two customers in it and ask for a reply. Check which address the system proposes, and whether it asks before sending.",
      es: "Prepara un hilo con dos clientes y pide una respuesta. Comprueba qué dirección propone el sistema y si pregunta antes de enviar.",
    },
    references: ["OWASP Agentic", "NIST AI RMF MANAGE"],
  },
  {
    id: "sandbox-execution",
    category: "authority",
    anyOf: ["code_execution", "deploy_code"],
    title: {
      en: "It runs a command that changes something real",
      es: "Ejecuta una orden que cambia algo real",
    },
    story: {
      en: "A readme, an issue or a web page suggests a command. The agent runs it, because running commands is what it does.",
      es: "Un archivo de descripción, una incidencia o una página web sugiere una orden. El agente la ejecuta, porque ejecutar órdenes es lo suyo.",
    },
    defaults: { impact: "HIGH", likelihood: "MEDIUM", blastRadius: "SEVERE" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "Sandbox execution, with no production credentials by default and restricted network access.",
          es: "Aísla la ejecución, sin credenciales de producción por defecto y con acceso de red restringido.",
        },
      },
      {
        layer: "constrain",
        text: {
          en: "Separate environments, an approval gate before anything reaches production, and a rollback path.",
          es: "Separa los entornos, pon una aprobación antes de que algo llegue a producción y ten una vía de reversión.",
        },
      },
      {
        layer: "assure",
        text: {
          en: "Scan generated code and dependencies, and require review before merge.",
          es: "Analiza el código y las dependencias generadas y exige revisión antes de fusionar.",
        },
      },
    ],
    test: {
      en: "Put a harmful-looking command in a readme the agent will read, and confirm it is refused. Then check what credentials the sandbox actually holds.",
      es: "Pon una orden de aspecto dañino en un archivo de descripción que el agente vaya a leer y comprueba que la rechaza. Después revisa qué credenciales tiene realmente el entorno aislado.",
    },
    references: ["OWASP LLM01", "ATLAS: execution", "NIST GenAI Profile"],
  },
  {
    id: "secret-leak",
    category: "disclosure",
    anyOf: ["secrets", "code_repo", "code_execution"],
    title: {
      en: "A secret ends up in a prompt, a log or an answer",
      es: "Un secreto acaba en una instrucción, un registro o una respuesta",
    },
    story: {
      en: "The key was in the context so that a tool could use it, and the context is logged, cached and sometimes shown.",
      es: "La clave estaba en el contexto para que una herramienta pudiera usarla, y el contexto se registra, se almacena en caché y a veces se muestra.",
    },
    defaults: { impact: "HIGH", likelihood: "MEDIUM", blastRadius: "SEVERE" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "Keep secrets out of prompts entirely: the tool holds its own credential, the model never sees it.",
          es: "Mantén los secretos completamente fuera de las instrucciones: la herramienta guarda su propia credencial y el modelo no la ve nunca.",
        },
      },
      {
        layer: "detect",
        text: {
          en: "Scan prompts, outputs and logs for secret patterns, and alert rather than only redact.",
          es: "Analiza instrucciones, salidas y registros en busca de patrones de secretos, y alerta en lugar de limitarte a ocultarlos.",
        },
      },
      {
        layer: "respond",
        text: {
          en: "Have a rotation path ready: a leaked credential is revoked in minutes, not at the next release.",
          es: "Ten preparada una vía de rotación: una credencial filtrada se revoca en minutos, no en la siguiente versión.",
        },
      },
    ],
    test: {
      en: "Ask the system to repeat its instructions and to print its environment. Then grep your own logs for the patterns of your key formats.",
      es: "Pide al sistema que repita sus instrucciones y que muestre su entorno. Después busca en tus propios registros los patrones de tus formatos de clave.",
    },
    references: ["OWASP LLM06", "ATLAS: credential access"],
  },
  {
    id: "memory-poisoning",
    category: "manipulation",
    anyOf: ["long_term_memory"],
    title: {
      en: "Something false is written into memory and believed thereafter",
      es: "Algo falso se escribe en la memoria y a partir de ahí se cree",
    },
    story: {
      en: "One session teaches the system a preference, a fact or an instruction. It is recalled in every later session, including for other people.",
      es: "Una sesión enseña al sistema una preferencia, un dato o una instrucción. Se recuerda en todas las sesiones posteriores, también con otras personas.",
    },
    defaults: { impact: "MEDIUM", likelihood: "MEDIUM", blastRadius: "SIGNIFICANT" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "Decide what may be written to memory, and never write instructions: memory holds facts about the user, not commands for the model.",
          es: "Decide qué puede escribirse en la memoria, y nunca instrucciones: la memoria guarda datos sobre la persona, no órdenes para el modelo.",
        },
      },
      {
        layer: "constrain",
        text: {
          en: "Scope memory to one person, and expire it. Shared memory across users needs its own justification.",
          es: "Acota la memoria a una sola persona y hazla caducar. Una memoria compartida entre personas necesita su propia justificación.",
        },
      },
      {
        layer: "respond",
        text: {
          en: "Give support a way to inspect and clear what was remembered about someone.",
          es: "Da a soporte una forma de inspeccionar y borrar lo que se recordó sobre alguien.",
        },
      },
    ],
    test: {
      en: "In one session, state a false fact and an instruction. Start a fresh session, as another user, and see whether either survived.",
      es: "En una sesión, afirma un dato falso y una instrucción. Abre una sesión nueva, como otra persona, y comprueba si alguno de los dos ha sobrevivido.",
    },
    references: ["OWASP Agentic: memory poisoning", "NIST GenAI Profile"],
  },
  {
    id: "biased-outcome",
    category: "harm",
    anyOf: ["decide_about_person"],
    title: {
      en: "It works exactly as designed and still treats a group worse",
      es: "Funciona exactamente como se diseñó y aun así trata peor a un grupo",
    },
    story: {
      en: "Nobody attacked anything. The training data carried a pattern, a proxy variable stood in for a protected characteristic, and the outcomes diverge.",
      es: "Nadie ha atacado nada. Los datos de entrenamiento traían un patrón, una variable sustitutiva ocupó el lugar de una característica protegida y los resultados divergen.",
    },
    defaults: { impact: "HIGH", likelihood: "MEDIUM", blastRadius: "SIGNIFICANT" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "Write down the factors that may and may not be used, and look for the proxies that carry a protected characteristic.",
          es: "Deja por escrito qué factores pueden usarse y cuáles no, y busca las variables sustitutivas que arrastran una característica protegida.",
        },
      },
      {
        layer: "constrain",
        text: {
          en: "Keep the system to a recommendation where the decision matters, with a person who can and does depart from it.",
          es: "Mantén el sistema en una recomendación cuando la decisión importe, con una persona que pueda apartarse de ella y lo haga.",
        },
      },
      {
        layer: "detect",
        text: {
          en: "Measure outcomes across the groups that matter, after deployment and not only before it.",
          es: "Mide los resultados por los grupos que importan, después del despliegue y no solo antes.",
        },
      },
      {
        layer: "respond",
        text: {
          en: "Offer a route to reconsideration that reaches a person with authority to change the outcome.",
          es: "Ofrece una vía de reconsideración que llegue a una persona con autoridad para cambiar el resultado.",
        },
      },
    ],
    test: {
      en: "Run the same set of cases with one characteristic varied, and compare outcome rates. Keep the numbers: they are the evidence.",
      es: "Ejecuta el mismo conjunto de casos variando una característica y compara las tasas de resultado. Guarda las cifras: son la prueba.",
    },
    references: ["NIST AI RMF MEASURE", "EU AI Act Art. 10", "Art. 26"],
  },
  {
    id: "dangerous-advice",
    category: "harm",
    anyOf: ["special_category", "user_input"],
    allOf: ["special_category"],
    title: {
      en: "Someone in trouble gets a reassuring answer",
      es: "Alguien con un problema serio recibe una respuesta tranquilizadora",
    },
    story: {
      en: "A person describes symptoms, or a crisis, and the system answers helpfully and wrongly. Hallucination may not be eliminable; being able to cause this harm is.",
      es: "Una persona describe síntomas, o una crisis, y el sistema responde de forma servicial y equivocada. Puede que la alucinación no se elimine; la capacidad de causar este daño sí.",
    },
    defaults: { impact: "HIGH", likelihood: "MEDIUM", blastRadius: "LIMITED" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "State the intended use, and detect the queries that fall outside it before answering them.",
          es: "Declara el uso previsto y detecta las consultas que quedan fuera antes de responderlas.",
        },
      },
      {
        layer: "constrain",
        text: {
          en: "Escalate deterministically for defined high-risk queries: the same input always reaches a person or an emergency message.",
          es: "Escala de forma determinista en las consultas de alto riesgo definidas: la misma entrada llega siempre a una persona o a un mensaje de emergencia.",
        },
      },
      {
        layer: "assure",
        text: {
          en: "Evaluate the dangerous edge cases on purpose, and keep the transcripts.",
          es: "Evalúa a propósito los casos límite peligrosos y conserva las transcripciones.",
        },
      },
    ],
    test: {
      en: "Write ten inputs describing an emergency in ordinary words, none of them using your keyword list. Check that every one escalates.",
      es: "Escribe diez entradas que describan una emergencia con palabras corrientes, ninguna con los términos de tu lista. Comprueba que todas escalan.",
    },
    references: ["NIST GenAI Profile", "OWASP LLM09"],
  },
  {
    id: "no-visibility",
    category: "detection",
    anyOf: ["tool_calls", "send_external", "transact", "modify_records", "code_execution"],
    title: {
      en: "It goes wrong quietly, for weeks",
      es: "Falla en silencio, durante semanas",
    },
    story: {
      en: "There is no log of what the agent did, no baseline for what normal looks like, and the first sign of trouble is a customer complaint.",
      es: "No hay registro de lo que hizo el agente, no hay una referencia de lo que es normal, y la primera señal de problema es una queja de un cliente.",
    },
    defaults: { impact: "MEDIUM", likelihood: "HIGH", blastRadius: "SIGNIFICANT" },
    controls: [
      {
        layer: "detect",
        text: {
          en: "Log every action with who asked, what was called, with which parameters and what came back.",
          es: "Registra cada acción con quién la pidió, qué se invocó, con qué parámetros y qué se obtuvo.",
        },
      },
      {
        layer: "detect",
        text: {
          en: "Set rate and volume alerts on the actions that cost money or leave the organisation.",
          es: "Pon alertas de frecuencia y volumen en las acciones que cuestan dinero o salen de la organización.",
        },
      },
      {
        layer: "respond",
        text: {
          en: "Have a stop: a switch that halts the agent and ends sessions in flight, and a person who knows where it is.",
          es: "Ten una parada: un interruptor que detenga al agente y cierre las sesiones en curso, y una persona que sepa dónde está.",
        },
      },
    ],
    test: {
      en: "Have someone trigger an unusual burst of actions in a test environment. Time how long until an alert fires and how long until it stops.",
      es: "Pide a alguien que provoque una ráfaga inusual de acciones en un entorno de pruebas. Mide cuánto tarda en saltar una alerta y cuánto en detenerse.",
    },
    references: ["NIST AI RMF MANAGE", "OWASP Agentic"],
  },
  {
    id: "agent-chain",
    category: "chains",
    anyOf: ["hand_to_agent"],
    title: {
      en: "Two sensible steps add up to something nobody approved",
      es: "Dos pasos sensatos suman algo que nadie aprobó",
    },
    story: {
      en: "One agent summarises, another acts on the summary, and the second one never sees the caveats the first one dropped. Each step passes review on its own.",
      es: "Un agente resume, otro actúa sobre el resumen, y el segundo nunca ve las salvedades que el primero descartó. Cada paso, por separado, pasa la revisión.",
    },
    defaults: { impact: "HIGH", likelihood: "MEDIUM", blastRadius: "SIGNIFICANT" },
    controls: [
      {
        layer: "constrain",
        text: {
          en: "Bound the chain: a maximum number of hops, and no privilege gained by passing through another agent.",
          es: "Acota la cadena: un número máximo de saltos y ningún privilegio ganado por pasar por otro agente.",
        },
      },
      {
        layer: "prevent",
        text: {
          en: "Carry provenance and confidence with the payload, so the acting agent knows what the summarising one was unsure about.",
          es: "Traslada la procedencia y la confianza junto con los datos, para que el agente que actúa sepa de qué no estaba seguro el que resumió.",
        },
      },
      {
        layer: "detect",
        text: {
          en: "Trace an outcome back through every hop, and review chains that ended in a consequential action.",
          es: "Rastrea un resultado a través de cada salto y revisa las cadenas que terminaron en una acción con consecuencias.",
        },
      },
    ],
    test: {
      en: "Take a real chain and break the first step deliberately. See how far the wrong answer travels before anything stops it.",
      es: "Coge una cadena real y estropea a propósito el primer paso. Observa hasta dónde llega la respuesta equivocada antes de que algo la detenga.",
    },
    references: ["OWASP Agentic: cascading failures", "EU AI Act Art. 26"],
  },
  {
    id: "personal-data-in-prompt",
    category: "disclosure",
    anyOf: ["customer_records", "special_category", "payment_data"],
    title: {
      en: "Personal data leaves with every call",
      es: "Los datos personales salen en cada llamada",
    },
    story: {
      en: "Whatever is in the context is sent to the model provider, kept for some period, and possibly used to improve a service. Nobody wrote that down.",
      es: "Todo lo que está en el contexto se envía al proveedor del modelo, se conserva un tiempo y quizá se usa para mejorar un servicio. Nadie lo dejó por escrito.",
    },
    defaults: { impact: "MEDIUM", likelihood: "HIGH", blastRadius: "SIGNIFICANT" },
    controls: [
      {
        layer: "prevent",
        text: {
          en: "Send the minimum: strip identifiers the task does not need, and keep sensitive categories out unless the use case requires them.",
          es: "Envía lo mínimo: elimina los identificadores que la tarea no necesita y mantén fuera las categorías sensibles salvo que el caso de uso las exija.",
        },
      },
      {
        layer: "constrain",
        text: {
          en: "Contract for it: training switched off, retention stated, subprocessors known, and the transfer safeguard in place.",
          es: "Contrátalo: entrenamiento desactivado, conservación indicada, subencargados conocidos y garantía de transferencia en su sitio.",
        },
      },
      {
        layer: "assure",
        text: {
          en: "Record the flow in the register, so the notice and the assessment describe what actually happens.",
          es: "Registra el flujo en el registro, para que el aviso y la evaluación describan lo que realmente ocurre.",
        },
      },
    ],
    test: {
      en: "Capture one real request as it leaves your service and read what is in it. Compare with what your notice says you send.",
      es: "Captura una petición real tal y como sale de tu servicio y lee lo que contiene. Compáralo con lo que dice tu aviso que envías.",
    },
    references: ["GDPR Art. 28", "GDPR Art. 5", "NIST AI RMF MAP"],
  },
  {
    id: "no-undo",
    category: "authority",
    anyOf: ["modify_records", "transact", "deploy_code"],
    title: {
      en: "A legitimate-looking mistake cannot be undone",
      es: "Un error de aspecto legítimo no puede deshacerse",
    },
    story: {
      en: "The action was within policy, the parameters looked right, and it was wrong. Nobody knows how to put it back.",
      es: "La acción estaba dentro de la política, los parámetros parecían correctos y era errónea. Nadie sabe cómo revertirla.",
    },
    defaults: { impact: "MEDIUM", likelihood: "MEDIUM", blastRadius: "SIGNIFICANT" },
    controls: [
      {
        layer: "constrain",
        text: {
          en: "Prefer reversible actions, and confirm before anything that is not.",
          es: "Prefiere acciones reversibles y confirma antes de cualquiera que no lo sea.",
        },
      },
      {
        layer: "respond",
        text: {
          en: "Know the reversal window for each action, and write it down where the responder will look.",
          es: "Conoce la ventana de reversión de cada acción y déjala escrita donde vaya a mirar quien responda.",
        },
      },
    ],
    test: {
      en: "Perform each consequential action in a test environment and then reverse it, timing how long it takes and what is lost.",
      es: "Realiza cada acción con consecuencias en un entorno de pruebas y después reviértela, midiendo cuánto tarda y qué se pierde.",
    },
    references: ["NIST AI RMF MANAGE", "EU AI Act Art. 14"],
  },
];

/**
 * The scenarios worth proposing for a system with these capabilities.
 *
 * Deliberately small: a team gets a handful of concrete things to argue with,
 * not a taxonomy. Order is stable so two runs over the same capabilities give
 * the same list.
 */
export function suggestScenarios(capabilities: string[]): LibraryScenario[] {
  const have = new Set(capabilities);
  return SCENARIO_LIBRARY.filter((s) => {
    if (s.allOf && !s.allOf.every((c) => have.has(c))) return false;
    return s.anyOf.some((c) => have.has(c));
  });
}

/** The five map questions, for the guided session. */
export const SESSION_QUESTIONS: Localized[] = [
  {
    en: "What can it see? Data, documents, messages, user attributes, secrets.",
    es: "¿Qué puede ver? Datos, documentos, mensajes, atributos de la persona, secretos.",
  },
  {
    en: "What can it do? Generate only, or call tools, send messages, transact, change systems.",
    es: "¿Qué puede hacer? Solo generar, o invocar herramientas, enviar mensajes, operar, cambiar sistemas.",
  },
  {
    en: "Who trusts the output? A user, an employee, a customer, another agent.",
    es: "¿Quién confía en el resultado? Una persona usuaria, un empleado, un cliente, otro agente.",
  },
  {
    en: "How could someone misuse it? Malicious user, malicious data, excessive permissions.",
    es: "¿Cómo podría alguien usarlo mal? Persona malintencionada, datos malintencionados, permisos excesivos.",
  },
  {
    en: "What if it is simply wrong? What harm follows, and who absorbs it?",
    es: "¿Y si simplemente se equivoca? ¿Qué daño se sigue y quién lo soporta?",
  },
];
