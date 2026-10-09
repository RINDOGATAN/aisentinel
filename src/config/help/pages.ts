// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The help content for every dashboard page, as typed data.
 *
 * One entry per page (keyed by its base path). The "?" panel reads these, so
 * the content lives here and the component stays product-neutral: a sister app
 * reuses the component by supplying its own registry of the same shape.
 *
 * Each entry says, in plain words, what the page is for, what to do first, the
 * terms it uses (resolved to their meanings from the glossary), a way into the
 * fuller docs, and, where the page enforces a law, a link to the words of the
 * law. Everything is bilingual.
 *
 * A detail or "new" page (`/governance/ai-registry/123`) has no entry of its
 * own; `helpForPath` falls back to the nearest parent, so the section's help
 * still opens there.
 */

import type { Localized, PageHelp } from "@/config/help/types";
import { OFFICIAL_LINKS } from "@/config/help/official-links";

const L = (en: string, es: string): Localized => ({ en, es });

const DOC = (href: string, en: string, es: string) => ({ href, label: L(en, es) });

export const PAGE_HELP: PageHelp[] = [
  {
    route: "/governance",
    title: L("Dashboard", "Panel"),
    purpose: L(
      "The one screen that shows where your AI governance programme stands: what is registered, what still needs doing, and the next legal deadline that touches your own systems.",
      "La pantalla que muestra dónde está tu programa de gobernanza de la IA: qué está registrado, qué queda por hacer y el próximo plazo legal que afecta a tus propios sistemas.",
    ),
    firstStep: L(
      "If you are just starting, open Quick start; otherwise use the cards to go to whatever is still open.",
      "Si empiezas ahora, abre el inicio rápido; si no, usa las tarjetas para ir a lo que quede pendiente.",
    ),
    terms: ["regime", "high-risk", "evidence"],
    docs: [
      DOC("/docs", "How AI Sentinel works", "Cómo funciona AI Sentinel"),
      DOC("/docs/how-it-fits", "How the parts fit together", "Cómo encajan las partes"),
    ],
    official: [OFFICIAL_LINKS.euAiAct],
  },
  {
    route: "/governance/quickstart",
    title: L("Quick start", "Inicio rápido"),
    purpose: L(
      "A short guided path that sets up a working programme in minutes: it adds core policies, drafts an impact assessment for each high-risk system, and reviews your catalogue vendors.",
      "Un recorrido guiado breve que pone en marcha un programa en minutos: añade políticas básicas, redacta una evaluación de impacto para cada sistema de alto riesgo y revisa los proveedores de tu catálogo.",
    ),
    firstStep: L(
      "Choose whether you are working for your own organisation or for clients, then follow the steps in order.",
      "Elige si trabajas para tu propia organización o para clientes y sigue los pasos en orden.",
    ),
    terms: ["high-risk", "provider", "deployer"],
    docs: [
      DOC("/docs", "How AI Sentinel works", "Cómo funciona AI Sentinel"),
      DOC("/docs/guides/which-rules", "Which rules apply to me?", "¿Qué normas me aplican?"),
    ],
    official: [OFFICIAL_LINKS.euAiAct],
  },
  {
    route: "/governance/program",
    title: L("Programme", "Programa"),
    purpose: L(
      "The whole programme on one page: the six stages, how far each has come, and a 30/60/90-day plan over them. It is where you see progress rather than do a single task.",
      "Todo el programa en una página: las seis etapas, hasta dónde ha llegado cada una y un plan de 30/60/90 días sobre ellas. Es donde ves el avance, no donde haces una tarea concreta.",
    ),
    firstStep: L(
      "Read the plan for the next 30 days, then open the earliest stage that is not yet done.",
      "Lee el plan de los próximos 30 días y abre la primera etapa que aún no esté completa.",
    ),
    terms: ["evidence"],
    docs: [DOC("/docs/how-it-fits", "How the parts fit together", "Cómo encajan las partes")],
    official: [],
  },
  {
    route: "/governance/ai-registry",
    title: L("AI registry", "Registro de IA"),
    purpose: L(
      "The inventory of every AI system your organisation builds or uses. A complete inventory is the starting point for every other duty, because you cannot govern what you have not written down.",
      "El inventario de todos los sistemas de IA que tu organización construye o utiliza. Un inventario completo es el punto de partida de cualquier otra obligación, porque no se puede gobernar lo que no se ha registrado.",
    ),
    firstStep: L(
      "Register each AI system and give it a business owner; a system without an owner is nobody's responsibility.",
      "Registra cada sistema de IA y asígnale un responsable de negocio; un sistema sin responsable no es tarea de nadie.",
    ),
    terms: ["provider", "deployer", "transparency", "stakeholder"],
    docs: [DOC("/docs/ai-registry", "The AI registry", "El registro de IA")],
    official: [OFFICIAL_LINKS.euArt26],
  },
  {
    route: "/governance/risk-classification",
    title: L("Risk classification", "Clasificación de riesgo"),
    purpose: L(
      "Works out each system's risk tier under the EU AI Act: prohibited, high, limited or minimal. The tier decides which duties apply, so it is the fork every later obligation follows.",
      "Determina el nivel de riesgo de cada sistema según el Reglamento de IA de la UE: prohibido, alto, limitado o mínimo. El nivel decide qué obligaciones aplican, así que es la bifurcación que sigue todo lo demás.",
    ),
    firstStep: L(
      "Run the wizard for each registered system; the answers place it in a tier and record why.",
      "Ejecuta el asistente para cada sistema registrado; las respuestas lo sitúan en un nivel y registran el motivo.",
    ),
    terms: ["high-risk", "bias", "stakeholder"],
    docs: [
      DOC("/docs/risk-classification", "Risk classification", "Clasificación de riesgo"),
      DOC("/docs/guides/high-risk", "What is high risk?", "¿Qué es el alto riesgo?"),
    ],
    official: [OFFICIAL_LINKS.euArt6, OFFICIAL_LINKS.euAnnexIII, OFFICIAL_LINKS.euArt5],
  },
  {
    route: "/governance/assessments",
    title: L("Assessments", "Evaluaciones"),
    purpose: L(
      "Where you carry out and keep the assessments a system needs: impact, conformity, fundamental rights and bias. Each finished assessment becomes evidence you can show a regulator.",
      "Donde realizas y conservas las evaluaciones que necesita un sistema: de impacto, de conformidad, de derechos fundamentales y de sesgo. Cada evaluación terminada se convierte en una prueba que puedes mostrar a un organismo.",
    ),
    firstStep: L(
      "Start an assessment for a high-risk system by choosing the assessment type, then the system.",
      "Empieza una evaluación para un sistema de alto riesgo eligiendo el tipo de evaluación y luego el sistema.",
    ),
    terms: ["conformity-assessment", "fria", "bias", "evidence"],
    docs: [DOC("/docs/assessments", "Assessments", "Evaluaciones")],
    official: [OFFICIAL_LINKS.euArt27, OFFICIAL_LINKS.euArt43, OFFICIAL_LINKS.euArt10],
  },
  {
    route: "/governance/oversight",
    title: L("Oversight gates", "Puntos de control"),
    purpose: L(
      "Records the points where a named person must review and decide before a system acts on its own. Human oversight is a duty for high-risk systems, and this is where you show it is real.",
      "Registra los puntos en los que una persona designada debe revisar y decidir antes de que un sistema actúe por sí solo. La supervisión humana es una obligación para los sistemas de alto riesgo, y aquí demuestras que existe.",
    ),
    firstStep: L(
      "Add an oversight gate to each high-risk system and name who decides at it.",
      "Añade un punto de control a cada sistema de alto riesgo e indica quién decide en él.",
    ),
    terms: ["oversight-gate", "high-risk"],
    docs: [DOC("/docs/oversight", "Human oversight", "Supervisión humana")],
    official: [OFFICIAL_LINKS.euArt14],
  },
  {
    route: "/governance/incidents",
    title: L("Incidents", "Incidentes"),
    purpose: L(
      "The log of things that went wrong with an AI system, with the clock each law puts on reporting them. A serious incident with a high-risk system must be reported within tight deadlines.",
      "El registro de lo que salió mal con un sistema de IA, con el plazo que cada ley marca para notificarlo. Un incidente grave con un sistema de alto riesgo debe notificarse en plazos ajustados.",
    ),
    firstStep: L(
      "Record an incident as soon as it is known; the timeline and reporting deadlines start from that.",
      "Registra un incidente en cuanto se conozca; la cronología y los plazos de notificación arrancan desde ahí.",
    ),
    terms: ["high-risk", "stakeholder"],
    docs: [DOC("/docs/incidents", "Incidents", "Incidentes")],
    official: [OFFICIAL_LINKS.euArt73, OFFICIAL_LINKS.euArt72],
  },
  {
    route: "/governance/compliance",
    title: L("Compliance", "Cumplimiento"),
    purpose: L(
      "The matrix of every requirement that applies to your systems across all the frameworks in scope, each with a status and the evidence behind it. It is the single place a reviewer checks coverage.",
      "La matriz de todos los requisitos que aplican a tus sistemas en los marcos que están dentro del alcance, cada uno con un estado y la prueba que lo respalda. Es el único lugar donde quien revisa comprueba la cobertura.",
    ),
    firstStep: L(
      "Give each mapped requirement a status and attach at least one piece of evidence.",
      "Da un estado a cada requisito mapeado y adjunta al menos una prueba.",
    ),
    terms: ["evidence", "regime", "conformity-assessment"],
    docs: [
      DOC("/docs/compliance", "Compliance", "Cumplimiento"),
      DOC("/docs/frameworks", "The frameworks", "Los marcos"),
    ],
    official: [OFFICIAL_LINKS.euAiAct, OFFICIAL_LINKS.nistRmf, OFFICIAL_LINKS.iso42001],
  },
  {
    route: "/governance/vendors",
    title: L("Vendors", "Proveedores"),
    purpose: L(
      "Your record of the outside suppliers behind your AI, and the due-diligence review of each. When a system relies on a vendor, the vendor's failings become yours to answer for.",
      "Tu registro de los proveedores externos que hay detrás de tu IA y la revisión de diligencia debida de cada uno. Cuando un sistema depende de un proveedor, sus fallos pasan a ser tu responsabilidad.",
    ),
    firstStep: L(
      "Add a vendor from the catalogue, then complete its due-diligence assessment.",
      "Añade un proveedor desde el catálogo y completa su evaluación de diligencia debida.",
    ),
    terms: ["provider", "evidence", "stakeholder"],
    docs: [DOC("/docs/vendors", "Vendors", "Proveedores")],
    official: [],
  },
  {
    route: "/governance/vendor-catalog",
    title: L("Vendor catalogue", "Catálogo de proveedores"),
    purpose: L(
      "A ready-made library of AI vendors with their governance facts already gathered. Adding one from here saves you finding and typing the same details for every organisation.",
      "Una biblioteca de proveedores de IA con sus datos de gobernanza ya recopilados. Añadir uno desde aquí te ahorra buscar y escribir los mismos datos para cada organización.",
    ),
    firstStep: L(
      "Search for a vendor you use and add it; it becomes a vendor record you can then assess.",
      "Busca un proveedor que utilices y añádelo; se convierte en un registro de proveedor que luego puedes evaluar.",
    ),
    terms: ["provider"],
    docs: [DOC("/docs/vendor-catalog", "The vendor catalogue", "El catálogo de proveedores")],
    official: [],
  },
  {
    route: "/governance/policies",
    title: L("Policies", "Políticas"),
    purpose: L(
      "Your organisation's written rules for building and using AI: acceptable use, incident response and the rest. Policies are how a duty becomes something staff can actually follow.",
      "Las reglas escritas de tu organización para construir y usar IA: uso aceptable, respuesta ante incidentes y demás. Las políticas son la forma en que una obligación se convierte en algo que el personal puede cumplir.",
    ),
    firstStep: L(
      "Approve or publish an acceptable-use policy; a draft nobody has approved does not yet govern anything.",
      "Aprueba o publica una política de uso aceptable; un borrador que nadie ha aprobado todavía no rige nada.",
    ),
    terms: ["evidence", "stakeholder"],
    docs: [DOC("/docs/policies", "Policies", "Políticas")],
    official: [],
  },
  {
    route: "/governance/shadow-ai",
    title: L("Shadow AI", "IA en la sombra"),
    purpose: L(
      "Finds and records the AI tools people are using without them being on the registry. What you do not know about you cannot govern, so bringing shadow tools into the light comes first.",
      "Encuentra y registra las herramientas de IA que se usan sin estar en el registro. No se puede gobernar lo que se desconoce, así que sacar a la luz las herramientas en la sombra es lo primero.",
    ),
    firstStep: L(
      "Triage each discovered tool: decide whether to register, allow or block it.",
      "Clasifica cada herramienta descubierta: decide si registrarla, permitirla o bloquearla.",
    ),
    terms: ["stakeholder"],
    docs: [DOC("/docs/shadow-ai", "Shadow AI discovery", "Descubrimiento de IA en la sombra")],
    official: [],
  },
  {
    route: "/governance/obligations",
    title: L("Obligations calendar", "Calendario de obligaciones"),
    purpose: L(
      "The dated legal duties that touch your own systems, in the order they fall due, across every regime in scope. It turns a stack of laws into a list of dates you can plan around.",
      "Las obligaciones legales con fecha que afectan a tus propios sistemas, en el orden en que vencen, en todos los regímenes dentro del alcance. Convierte un montón de leyes en una lista de fechas con la que planificar.",
    ),
    firstStep: L(
      "Declare your operating jurisdictions in Settings so the calendar shows only the deadlines that apply to you.",
      "Declara tus jurisdicciones de actividad en Configuración para que el calendario muestre solo los plazos que te aplican.",
    ),
    terms: ["regime", "high-risk"],
    docs: [
      DOC("/docs/cross-border", "Cross-border regimes", "Regímenes transfronterizos"),
      DOC("/docs/guides/which-rules", "Which rules apply to me?", "¿Qué normas me aplican?"),
    ],
    official: [OFFICIAL_LINKS.euAiAct, OFFICIAL_LINKS.gdpr],
  },
  {
    route: "/governance/proceedings",
    title: L("Proceedings", "Procedimientos"),
    purpose: L(
      "Tracks any formal matter opened against or about a system, such as a regulator's inquiry, with its own clock. It keeps a live matter and its deadlines separate from the incident log.",
      "Hace seguimiento de cualquier asunto formal abierto contra un sistema o sobre él, como una investigación de un organismo, con su propio plazo. Mantiene un asunto en curso y sus plazos separados del registro de incidentes.",
    ),
    firstStep: L(
      "Open a proceeding when a formal matter begins; close it when it ends.",
      "Abre un procedimiento cuando comience un asunto formal; ciérralo cuando termine.",
    ),
    terms: ["evidence"],
    docs: [DOC("/docs/incidents", "Incidents", "Incidentes")],
    official: [OFFICIAL_LINKS.euArt73],
  },
  {
    route: "/governance/board",
    title: L("Board reporting", "Informes al consejo"),
    purpose: L(
      "Produces a report for senior management or the board, capturing a snapshot of the programme so the figures can be reproduced later. Governance the board never sees is governance it cannot back.",
      "Genera un informe para la dirección o el consejo, con una instantánea del programa para que las cifras puedan reproducirse después. Una gobernanza que el consejo nunca ve es una gobernanza que no puede respaldar.",
    ),
    firstStep: L(
      "Generate a board report; it saves the snapshot behind every figure it shows.",
      "Genera un informe para el consejo; guarda la instantánea que respalda cada cifra que muestra.",
    ),
    terms: ["evidence"],
    docs: [DOC("/docs/how-it-fits", "How the parts fit together", "Cómo encajan las partes")],
    official: [],
  },
  {
    route: "/governance/threat-model",
    title: L("Threat model", "Modelo de amenazas"),
    purpose: L(
      "Builds a threat model for a system: what could go wrong, how likely and how bad, and the controls that answer each threat. A control with a passing test becomes evidence towards compliance.",
      "Construye un modelo de amenazas para un sistema: qué puede salir mal, con qué probabilidad y gravedad, y los controles que responden a cada amenaza. Un control con una prueba superada se convierte en prueba de cumplimiento.",
    ),
    firstStep: L(
      "Create a threat model from the system's capabilities, then move it past draft once reviewed.",
      "Crea un modelo de amenazas a partir de las capacidades del sistema y sácalo del borrador una vez revisado.",
    ),
    terms: ["evidence", "oversight-gate"],
    docs: [DOC("/docs/threat-model", "Threat modelling", "Modelado de amenazas")],
    official: [OFFICIAL_LINKS.euArt9],
  },
  {
    route: "/governance/agent-testing",
    title: L("Agent testing", "Pruebas de agentes"),
    purpose: L(
      "Records the tests an AI agent must pass under the AIUC-1 standard before it can be certified. Agents act on their own, so each is tested per requirement and re-tested regularly.",
      "Registra las pruebas que un agente de IA debe superar según la norma AIUC-1 antes de poder certificarse. Los agentes actúan por sí solos, así que cada uno se prueba por requisito y se vuelve a probar periódicamente.",
    ),
    firstStep: L(
      "Pick an agent and record a test result, or a not-applicable decision, for each requirement.",
      "Elige un agente y registra un resultado de prueba, o una decisión de no aplicable, para cada requisito.",
    ),
    terms: ["evidence", "oversight-gate"],
    docs: [DOC("/docs/frameworks", "The frameworks", "Los marcos")],
    official: [OFFICIAL_LINKS.aiuc1],
  },
  {
    route: "/governance/sensitive-data",
    title: L("Sensitive data", "Datos sensibles"),
    purpose: L(
      "Classifies how sensitive the data a system handles is, weighing its content, use and possible harm. Health and other special-category data raise the duties that apply, so this feeds every later step.",
      "Clasifica lo sensibles que son los datos que trata un sistema, sopesando su contenido, su uso y el posible perjuicio. Los datos de salud y otras categorías especiales elevan las obligaciones que aplican, así que esto alimenta cada paso posterior.",
    ),
    firstStep: L(
      "Assess each system that processes personal data; the result cannot be lowered below its highest factor.",
      "Evalúa cada sistema que trata datos personales; el resultado no puede rebajarse por debajo de su factor más alto.",
    ),
    terms: ["stakeholder", "bias"],
    docs: [DOC("/docs/compliance", "Compliance", "Cumplimiento")],
    official: [OFFICIAL_LINKS.euArt10, OFFICIAL_LINKS.gdpr],
  },
  {
    route: "/governance/audit",
    title: L("Audit trail", "Registro de auditoría"),
    purpose: L(
      "The record of who changed what and when across the programme, which the product keeps on its own. It is the account you rely on when someone asks how a decision was reached.",
      "El registro de quién cambió qué y cuándo en todo el programa, que el producto mantiene por sí solo. Es la cuenta en la que te apoyas cuando alguien pregunta cómo se llegó a una decisión.",
    ),
    firstStep: L(
      "Read the trail to see recent changes; export it to CSV when you need to keep or share it.",
      "Lee el registro para ver los cambios recientes; expórtalo a CSV cuando necesites conservarlo o compartirlo.",
    ),
    terms: ["evidence"],
    docs: [DOC("/docs/security", "Security", "Seguridad")],
    official: [],
  },
  {
    route: "/governance/review",
    title: L("Review queue", "Cola de revisión"),
    purpose: L(
      "Everything the product derived for you and marked as needing a person's confirmation, in one queue. Anything auto-derived stays marked until a human agrees, so the programme is never falsely complete.",
      "Todo lo que el producto ha derivado por ti y ha marcado como pendiente de confirmación, en una sola cola. Lo derivado automáticamente sigue marcado hasta que una persona lo acepta, para que el programa nunca parezca completo por error.",
    ),
    firstStep: L(
      "Work through the queue, confirming or correcting each item.",
      "Recorre la cola confirmando o corrigiendo cada elemento.",
    ),
    terms: ["evidence"],
    docs: [DOC("/docs/how-it-fits", "How the parts fit together", "Cómo encajan las partes")],
    official: [],
  },
  {
    route: "/governance/portfolio",
    title: L("All clients", "Todos los clientes"),
    purpose: L(
      "For accounts that work for several client organisations: one view showing where each client stands, so you can see at a glance which needs attention. Each client keeps its own separate records.",
      "Para las cuentas que trabajan para varias organizaciones cliente: una vista que muestra dónde está cada cliente, para ver de un vistazo cuál necesita atención. Cada cliente conserva sus propios registros separados.",
    ),
    firstStep: L(
      "Pick a client to open its programme, or add a new client organisation.",
      "Elige un cliente para abrir su programa o añade una nueva organización cliente.",
    ),
    terms: [],
    docs: [DOC("/docs/how-it-fits", "How the parts fit together", "Cómo encajan las partes")],
    official: [],
  },
  {
    route: "/governance/skills",
    title: L("Skills", "Skills"),
    purpose: L(
      "Where you upload and activate a licence for a premium skill package bought from the storefront. A licence unlocks a feature; it never installs code, and it is tied to the buyer's email.",
      "Donde subes y activas una licencia de un paquete de complementos premium comprado en la tienda. Una licencia desbloquea una función; nunca instala código y está vinculada al correo del comprador.",
    ),
    firstStep: L(
      "Upload your licence file to activate it; only an owner or admin can do this.",
      "Sube tu archivo de licencia para activarla; solo un propietario o administrador puede hacerlo.",
    ),
    terms: [],
    docs: [DOC("/docs/support", "Support", "Soporte")],
    official: [],
  },
  {
    route: "/governance/settings",
    title: L("Settings", "Configuración"),
    purpose: L(
      "Your organisation's own details: its operating jurisdictions, the cross-border regime screening, the team and their roles. The jurisdictions you set here decide which regimes the rest of the product applies.",
      "Los datos de tu organización: sus jurisdicciones de actividad, el análisis de regímenes transfronterizos, el equipo y sus funciones. Las jurisdicciones que fijes aquí deciden qué regímenes aplica el resto del producto.",
    ),
    firstStep: L(
      "Set your operating jurisdictions and answer the regime screening; both drive what applies to you.",
      "Fija tus jurisdicciones de actividad y responde el análisis de regímenes; ambos determinan lo que te aplica.",
    ),
    terms: ["regime", "stakeholder"],
    docs: [
      DOC("/docs/roles", "Roles and permissions", "Funciones y permisos"),
      DOC("/docs/cross-border", "Cross-border regimes", "Regímenes transfronterizos"),
    ],
    official: [],
  },
  {
    route: "/governance/billing",
    title: L("Billing", "Facturación"),
    purpose: L(
      "Your subscription and payment details. On the hosted pilot and the self-hosted kit the in-app features are free, so this is only shown where paid billing is turned on.",
      "Tu suscripción y datos de pago. En el piloto alojado y en el kit autoalojado las funciones de la aplicación son gratuitas, así que esto solo aparece donde la facturación de pago está activada.",
    ),
    firstStep: L(
      "Review your plan and payment method.",
      "Revisa tu plan y tu método de pago.",
    ),
    terms: [],
    docs: [DOC("/docs/pilot", "The pilot", "El piloto")],
    official: [],
  },
];

const BY_ROUTE: Record<string, PageHelp> = Object.fromEntries(
  PAGE_HELP.map((entry) => [entry.route, entry]),
);

/** Every route that has its own help entry, longest first (for prefix matching). */
const ROUTES_BY_LENGTH = PAGE_HELP.map((entry) => entry.route).sort(
  (a, b) => b.length - a.length,
);

/**
 * The help for a path. An exact match wins; otherwise the nearest parent that
 * has an entry, so a detail or "new" page shows its section's help. `null` when
 * nothing matches (a page outside the governance area).
 */
export function helpForPath(pathname: string): PageHelp | null {
  const clean = pathname.split("?")[0].replace(/\/+$/, "") || "/governance";
  if (BY_ROUTE[clean]) return BY_ROUTE[clean];
  for (const route of ROUTES_BY_LENGTH) {
    if (route === "/governance") continue; // never let the root swallow a child
    if (clean === route || clean.startsWith(route + "/")) return BY_ROUTE[route];
  }
  if (clean === "/governance" || clean.startsWith("/governance/")) {
    return BY_ROUTE["/governance"];
  }
  return null;
}

/** The base routes that must each carry help, for the coverage test. */
export const HELP_ROUTES: string[] = PAGE_HELP.map((entry) => entry.route);
