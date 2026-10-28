// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Customer-facing chatbot rules: an overlay switched on by four facts about a
 * system, not a framework the organization chooses.
 *
 * When any of the four questions is answered "yes", eight controls apply to
 * the system. Each control is written once, to the strictest common rule, and
 * lists the laws it answers for the places the organization has declared,
 * with the date each one applies. A law whose date is still ahead is shown and
 * counted as "upcoming". Nothing here says whether a product feature is lawful
 * at all: those features are listed as needing review by counsel.
 *
 * Content rules:
 *   - every citation, date and duty below was read on an official source on
 *     2026-10-27; nothing is included that could not be confirmed there;
 *   - "Not sure" never switches the overlay off: with no "yes" and at least
 *     one question unanswered, the overlay is undetermined and adds no rows,
 *     the same rule the regime screenings follow;
 *   - the legal sign-off is PENDING (src/config/legal-signoff.ts,
 *     CHATBOT_OVERLAY) until each control has been read.
 *
 * The overlay is behind the CHATBOT_OVERLAY_ENABLED switch
 * (src/server/services/chatbot-overlay/switch.ts). With the switch off nothing
 * here reaches a screen or a requirement row.
 *
 * Pure module: no Prisma, no React, no Next.
 */

import type { Localized } from "@/config/lawfirm-ai-toolkit";
import type { JurisdictionId } from "@/config/jurisdictions";
import { LEGAL_SIGNOFF, signoffMarker } from "@/config/legal-signoff";

export const CHATBOT_OVERLAY_VERSION = "2026.10.1";
export const CHATBOT_OVERLAY_LAW_REVIEWED_AS_OF = "2026-10-27";
export const CHATBOT_OVERLAY_SIGNOFF_ID = "CHATBOT_OVERLAY";
export const CHATBOT_OVERLAY_REVIEW_MARKER: Localized = signoffMarker(CHATBOT_OVERLAY_SIGNOFF_ID);

/** The framework code the control rows are seeded under. Never choosable. */
export const CHATBOT_OVERLAY_FRAMEWORK_CODE = "CHATBOT_OVERLAY" as const;
/** The one applicability tag every control row carries. */
export const CHATBOT_OVERLAY_TAG = "chatbot:overlay";

/** The places that can be declared only while the overlay is switched on. */
export const CHATBOT_OVERLAY_PLACES = ["US_OR", "US_ID", "US_IA", "US_NE", "US_HI", "US_ME", "US_NV"] as const;

const L = (en: string, es: string): Localized => ({ en, es });

// ── The four questions ────────────────────────────────────────────────────

export type ChatbotAnswer = "YES" | "NO" | "NOT_ASSESSED";

/**
 * The four facts, stored with the other screening facts under
 * `AISystem.metadata.regimeFacts`. The first two are the existing
 * `interactsWithConsumers` and `isCompanionChatbot` facts, so a system
 * answers each of them once.
 */
export const CHATBOT_QUESTIONS = [
  "interactsWithConsumers",
  "isCompanionChatbot",
  "minorsMayUse",
  "handlesSensitiveTopics",
] as const;

export type ChatbotQuestion = (typeof CHATBOT_QUESTIONS)[number];
export type ChatbotFacts = Record<ChatbotQuestion, ChatbotAnswer>;

export const EMPTY_CHATBOT_FACTS: ChatbotFacts = {
  interactsWithConsumers: "NOT_ASSESSED",
  isCompanionChatbot: "NOT_ASSESSED",
  minorsMayUse: "NOT_ASSESSED",
  handlesSensitiveTopics: "NOT_ASSESSED",
};

function asAnswer(v: unknown): ChatbotAnswer {
  return v === "YES" || v === "NO" ? v : "NOT_ASSESSED";
}

/** The four facts from a system's stored screening facts. */
export function readChatbotFacts(regimeFacts: unknown): ChatbotFacts {
  const f = (regimeFacts && typeof regimeFacts === "object" ? regimeFacts : {}) as Record<string, unknown>;
  return {
    interactsWithConsumers: asAnswer(f.interactsWithConsumers),
    isCompanionChatbot: asAnswer(f.isCompanionChatbot),
    minorsMayUse: asAnswer(f.minorsMayUse),
    handlesSensitiveTopics: asAnswer(f.handlesSensitiveTopics),
  };
}

export type ChatbotOverlayState = "APPLIES" | "UNDETERMINED" | "DOES_NOT_APPLY";

/**
 * Any "yes" applies the overlay. All four "no" rules it out. Anything else is
 * undetermined: the controls stay open with a note, and no rows are added.
 */
export function chatbotOverlayState(facts: ChatbotFacts): ChatbotOverlayState {
  const answers = CHATBOT_QUESTIONS.map((q) => facts[q]);
  if (answers.includes("YES")) return "APPLIES";
  if (answers.every((a) => a === "NO")) return "DOES_NOT_APPLY";
  return "UNDETERMINED";
}

/** The overlay adds rows only when the switch is on and the facts apply it. */
export function chatbotOverlayInScope(enabled: boolean, facts: ChatbotFacts): boolean {
  return enabled && chatbotOverlayState(facts) === "APPLIES";
}

// ── The laws ──────────────────────────────────────────────────────────────

export interface ChatbotLaw {
  id: string;
  name: Localized;
  /** The declared places that bring the law into view. */
  places: readonly JurisdictionId[];
  /** Shown when any United States place is declared (federal rules). */
  anyUsPlace?: boolean;
  /** Who the law reaches, in one line. */
  reaches: Localized;
  source: string;
}

export const CHATBOT_LAWS: readonly ChatbotLaw[] = [
  {
    id: "eu-ai-act",
    name: L("EU AI Act, Regulation (EU) 2024/1689", "Reglamento (UE) 2024/1689 (RIA)"),
    places: ["EU", "EEA"],
    reaches: L(
      "Providers of AI systems meant to interact directly with people; deployers of emotion recognition; anyone placing on the market or using AI (prohibited practices).",
      "Proveedores de sistemas de IA destinados a interactuar directamente con personas; responsables del despliegue de reconocimiento de emociones; cualquiera que comercialice o utilice IA (prácticas prohibidas).",
    ),
    source: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689",
  },
  {
    id: "ca-sb243",
    name: L("California SB 243 (2025), companion chatbots", "SB 243 de California (2025), chatbots de compañía"),
    places: ["US_CA"],
    reaches: L(
      "Operators of companion chatbots: adaptive, human-like, able to meet social needs and sustain a relationship. Customer service, business, productivity and technical help bots are excluded.",
      "Operadores de chatbots de compañía: adaptativos, de apariencia humana, capaces de atender necesidades sociales y de mantener una relación. Se excluyen los de atención al cliente, operaciones empresariales, productividad y asistencia técnica.",
    ),
    source: "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB243",
  },
  {
    id: "ca-sb1119",
    name: L("California SB 1119 (2026), children's safety", "SB 1119 de California (2026), seguridad de los menores"),
    places: ["US_CA"],
    reaches: L(
      "Operators of companion chatbots available in California. Most duties reach only operators that allow users under 18; the age rule reaches every operator. Workplace-only and postsecondary-only uses excluded.",
      "Operadores de chatbots de compañía disponibles en California. La mayoría de los deberes alcanza solo a quienes admiten usuarios menores de 18 años; la norma sobre la edad alcanza a todos. Se excluyen los usos solo laborales y solo de educación superior.",
    ),
    source: "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB1119",
  },
  {
    id: "ca-ab489",
    name: L("California AB 489 (2025), AI implying a health license", "AB 489 de California (2025), IA que aparenta una licencia sanitaria"),
    places: ["US_CA"],
    reaches: L("Anyone who develops or deploys an AI system or device.", "Quien desarrolle o despliegue un sistema o dispositivo de IA."),
    source: "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB489",
  },
  {
    id: "ca-ab1979",
    name: L("California AB 1979 (2026), health care chatbots", "AB 1979 de California (2026), chatbots sanitarios"),
    places: ["US_CA"],
    reaches: L(
      "Businesses offering a generative AI chatbot marketed as supporting health services that uses health or wellness information.",
      "Empresas que ofrecen un chatbot de IA generativa presentado como apoyo a servicios sanitarios y que utiliza información de salud o bienestar.",
    ),
    source: "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB1979",
  },
  {
    id: "ca-bot-act",
    name: L("California BOT Act (SB 1001, 2018)", "Ley BOT de California (SB 1001, 2018)"),
    places: ["US_CA"],
    reaches: L(
      "Anyone using an automated online account to communicate with people in California.",
      "Quien utilice una cuenta automatizada en línea para comunicarse con personas en California.",
    ),
    source: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=BPC&division=7.&title=&part=3.&chapter=6.&article=",
  },
  {
    id: "co-hb26-1263",
    name: L("Colorado HB 26-1263, conversational AI services", "HB 26-1263 de Colorado, servicios de IA conversacional"),
    places: ["US_CO"],
    reaches: L(
      "Operators of a publicly available service that primarily simulates human conversation. Twelve exclusions, among them customer-service and commerce assistants, business and internal tools, and HIPAA covered entities.",
      "Operadores de un servicio accesible al público que simula principalmente una conversación humana. Doce exclusiones, entre ellas los asistentes de atención al cliente y de comercio, las herramientas empresariales e internas y las entidades cubiertas por la HIPAA.",
    ),
    source: "https://leg.colorado.gov/bills/hb26-1263",
  },
  {
    id: "ny-gbl-47",
    name: L("New York General Business Law art. 47, AI companions", "Ley General de Comercio de Nueva York, art. 47, compañeros de IA"),
    places: ["US_NY"],
    reaches: L(
      "Operators of an AI companion that remembers prior sessions, asks unprompted emotional questions and sustains personal dialogue. Customer service, efficiency, research and internal systems excluded.",
      "Operadores de un compañero de IA que recuerda sesiones anteriores, hace preguntas emocionales por iniciativa propia y mantiene un diálogo personal. Se excluyen los sistemas de atención al cliente, de eficiencia, de investigación y de uso interno.",
    ),
    source: "https://www.nysenate.gov/legislation/laws/GBS/A47",
  },
  {
    id: "wa-eshb2225",
    name: L("Washington ESHB 2225 (Laws of 2026, ch. 168)", "ESHB 2225 de Washington (Leyes de 2026, cap. 168)"),
    places: ["US_WA"],
    reaches: L(
      "Operators of an AI companion chatbot able to sustain a relationship across interactions. Business and customer-service bots that do not sustain a relationship and elicit emotion are excluded.",
      "Operadores de un chatbot de compañía basado en IA capaz de mantener una relación a lo largo de distintas interacciones. Se excluyen los bots empresariales y de atención al cliente que no mantienen una relación ni suscitan emociones.",
    ),
    source: "https://lawfilesext.leg.wa.gov/biennium/2025-26/Pdf/Bills/Session%20Laws/House/2225-S.SL.pdf",
  },
  {
    id: "wa-mhmda",
    name: L("Washington My Health My Data Act (RCW 19.373)", "Ley My Health My Data de Washington (RCW 19.373)"),
    places: ["US_WA"],
    reaches: L(
      "Entities processing consumer health data of Washington consumers, including mental, sexual and reproductive health and health inferred from other data.",
      "Entidades que tratan datos de salud de consumidores de Washington, incluida la salud mental, sexual y reproductiva y la salud inferida a partir de otros datos.",
    ),
    source: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.373&full=true",
  },
  {
    id: "or-sb1546",
    name: L("Oregon SB 1546 (Oregon Laws 2026, ch. 85)", "SB 1546 de Oregón (Leyes de Oregón 2026, cap. 85)"),
    places: ["US_OR"],
    reaches: L(
      "Operators of an AI companion that simulates a sustained platonic, intimate or romantic relationship. Customer service, care, education, finance and business software excluded.",
      "Operadores de un compañero de IA que simula una relación continuada, platónica, íntima o romántica. Se excluye el software de atención al cliente, asistencial, educativo, financiero y empresarial.",
    ),
    source: "https://olis.oregonlegislature.gov/liz/2026R1/Measures/Overview/SB1546",
  },
  {
    id: "ct-pa26-15",
    name: L("Connecticut Public Act 26-15 (SB 5), sections 4 to 6", "Ley Pública 26-15 de Connecticut (SB 5), secciones 4 a 6"),
    places: ["US_CT"],
    reaches: L(
      "Operators of an AI companion. Business and customer-service chatbots not marketed as companions, and model providers that do not decide the use case or interface, are excluded.",
      "Operadores de un compañero de IA. Se excluyen los chatbots empresariales y de atención al cliente que no se presentan como compañeros, y los proveedores de modelos que no deciden el caso de uso ni la interfaz.",
    ),
    source: "https://www.cga.ct.gov/2026/ACT/PA/PDF/2026PA-00015-R00SB-00005-PA.PDF",
  },
  {
    id: "id-s1297",
    name: L("Idaho Conversational AI Safety Act (S 1297, 2026)", "Ley de seguridad de la IA conversacional de Idaho (S 1297, 2026)"),
    places: ["US_ID"],
    reaches: L(
      "Operators of a conversational AI service available to the public. Business-use, internal and narrow tools and services under a commercial agreement are excluded.",
      "Operadores de un servicio de IA conversacional accesible al público. Se excluyen las herramientas de uso empresarial, internas y de propósito limitado, y los servicios sujetos a un acuerdo comercial.",
    ),
    source: "https://legislature.idaho.gov/sessioninfo/2026/legislation/S1297/",
  },
  {
    id: "ia-sf2417",
    name: L("Iowa SF 2417 (2026), conversational AI services", "SF 2417 de Iowa (2026), servicios de IA conversacional"),
    places: ["US_IA"],
    reaches: L(
      "Operators of a conversational AI service available to the public. Exclusions similar to Idaho's, including customer purchase assistants.",
      "Operadores de un servicio de IA conversacional accesible al público. Exclusiones similares a las de Idaho, incluidos los asistentes de compra.",
    ),
    source: "https://www.legis.iowa.gov/legislation/billTracking/billHistory?billName=SF%202417&ga=91",
  },
  {
    id: "ne-lb525",
    name: L("Nebraska Conversational Artificial Intelligence Safety Act (LB 525, 2026)", "Ley de seguridad de la IA conversacional de Nebraska (LB 525, 2026)"),
    places: ["US_NE"],
    reaches: L(
      "Operators of a conversational AI service available to the public. Similar exclusions, including customer-service bots.",
      "Operadores de un servicio de IA conversacional accesible al público. Exclusiones similares, incluidos los bots de atención al cliente.",
    ),
    source: "https://nebraskalegislature.gov/bills/view_bill.php?DocumentID=59601",
  },
  {
    id: "hi-act248",
    name: L("Hawaii Act 248 (2026, SB 3001), AI companions", "Ley 248 de Hawái (2026, SB 3001), compañeros de IA"),
    places: ["US_HI"],
    reaches: L(
      "Operators of an AI companion that remembers, asks unprompted emotional questions and holds personal dialogue.",
      "Operadores de un compañero de IA que recuerda, hace preguntas emocionales por iniciativa propia y mantiene un diálogo personal.",
    ),
    source: "https://www.capitol.hawaii.gov/session/measure_indiv.aspx?billtype=SB&billnumber=3001&year=2026",
  },
  {
    id: "ut-13-72a",
    name: L("Utah mental health chatbots (Utah Code ch. 13-72a)", "Chatbots de salud mental de Utah (Código de Utah, cap. 13-72a)"),
    places: ["US_UT"],
    reaches: L(
      "Suppliers of a generative AI chatbot that converses like a therapist or is presented as able to help treat mental health conditions.",
      "Proveedores de un chatbot de IA generativa que conversa como un terapeuta o que se presenta como capaz de ayudar a tratar problemas de salud mental.",
    ),
    source: "https://le.utah.gov/xcode/Title13/Chapter72A/13-72a.html",
  },
  {
    id: "ut-sb226",
    name: L("Utah S.B. 226 (2025), AI consumer protection amendments", "S.B. 226 de Utah (2025), modificaciones de protección del consumidor en materia de IA"),
    places: ["US_UT"],
    reaches: L(
      "Suppliers using generative AI in a consumer transaction, and individuals in regulated occupations. Section numbers as in the enrolled bill.",
      "Proveedores que usan IA generativa en una transacción de consumo, y profesionales de ocupaciones reguladas. Numeración según el texto aprobado del proyecto.",
    ),
    source: "https://le.utah.gov/Session/2025/bills/enrolled/SB0226.pdf",
  },
  {
    id: "tx-traiga",
    name: L("Texas TRAIGA (HB 149, 2025)", "TRAIGA de Texas (HB 149, 2025)"),
    places: ["US_TX"],
    reaches: L(
      "Governmental agencies and health-care providers (disclosure); any developer or deployer (prohibitions).",
      "Organismos públicos y proveedores de asistencia sanitaria (información); cualquier desarrollador o responsable del despliegue (prohibiciones).",
    ),
    source: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.552.htm",
  },
  {
    id: "il-wopr",
    name: L("Illinois Wellness and Oversight for Psychological Resources Act", "Ley de Illinois sobre bienestar y supervisión de los recursos psicológicos"),
    places: ["US_IL"],
    reaches: L(
      "Anyone offering therapy or psychotherapy services in Illinois.",
      "Quien ofrezca servicios de terapia o psicoterapia en Illinois.",
    ),
    source: "https://www.ilga.gov/Legislation/publicacts/view/104-0054",
  },
  {
    id: "nv-ab406",
    name: L("Nevada AB 406 (2025)", "AB 406 de Nevada (2025)"),
    places: ["US_NV"],
    reaches: L("AI providers making an AI system available in Nevada.", "Proveedores de IA que ponen un sistema de IA a disposición en Nevada."),
    source: "https://www.leg.state.nv.us/App/NELIS/REL/83rd2025/Bill/12575/Overview",
  },
  {
    id: "me-ld1727",
    name: L("Maine LD 1727 (2025)", "LD 1727 de Maine (2025)"),
    places: ["US_ME"],
    reaches: L(
      "Anyone using an AI chatbot to engage in trade and commerce with a consumer.",
      "Quien utilice un chatbot de IA en relaciones comerciales con un consumidor.",
    ),
    source: "https://legislature.maine.gov/LawMakerWeb/summary.asp?paper=HP1154&SessionID=16",
  },
  {
    id: "us-coppa",
    name: L("Children's Online Privacy Protection Rule (16 C.F.R. Part 312)", "Norma de protección de la privacidad de los menores en línea (16 C.F.R. parte 312)"),
    places: ["US_FEDERAL"],
    anyUsPlace: true,
    reaches: L(
      "Operators of a website or online service directed to children under 13, or with actual knowledge that it collects their personal information.",
      "Operadores de un sitio web o servicio en línea dirigido a menores de 13 años, o que sepan que recogen sus datos personales.",
    ),
    source: "https://www.ecfr.gov/current/title-16/part-312",
  },
];

// ── The controls ──────────────────────────────────────────────────────────

export interface ControlLawEntry {
  law: string;
  citation: string;
  /**
   * The date the duty applies, as an ISO date. Null where the law is in force
   * and the official page read gives no single start date.
   */
  appliesFrom: string | null;
  adds: Localized;
}

export interface ChatbotControl {
  id: string;
  number: number;
  title: Localized;
  duty: Localized;
  /** The record the customer keeps as evidence. */
  keeps: readonly Localized[];
  laws: readonly ControlLawEntry[];
}

export const CHATBOT_CONTROLS: readonly ChatbotControl[] = [
  {
    id: "ai-disclosure",
    number: 1,
    title: L("AI disclosure", "Información de que es una IA"),
    duty: L(
      "Tell people they are dealing with AI: at the start, every three hours (every hour for minors), and whenever asked. The system never claims to be human or a licensed professional.",
      "Informa a las personas de que están tratando con una IA: al inicio, cada tres horas (cada hora con menores) y siempre que lo pregunten. El sistema nunca afirma ser humano ni un profesional colegiado.",
    ),
    keeps: [
      L("Screenshots of the notices", "Capturas de pantalla de los avisos"),
      L("The reminder settings", "La configuración de los recordatorios"),
      L("A test transcript asking \"are you human?\"", "Una transcripción de prueba en la que se pregunta \"¿eres humano?\""),
    ],
    laws: [
      {
        law: "eu-ai-act",
        citation: "EU AI Act, Art. 50(1), (5)",
        appliesFrom: "2026-08-02",
        adds: L(
          "Design the system so people are told they are interacting with AI, unless it is obvious, clearly and at the latest at the first interaction.",
          "Diseña el sistema para que las personas sepan que interactúan con una IA, salvo que resulte evidente, de forma clara y a más tardar en la primera interacción.",
        ),
      },
      {
        law: "ca-sb243",
        citation: "Cal. Bus. & Prof. Code § 22602(a), § 22604",
        appliesFrom: "2026-01-01",
        adds: L(
          "If a reasonable person could think it is human, say clearly that it is AI. Tell users that companion chatbots may not suit some minors.",
          "Si una persona razonable pudiera creer que es humano, indica claramente que es una IA. Advierte a los usuarios de que los chatbots de compañía pueden no ser adecuados para algunos menores.",
        ),
      },
      {
        law: "ca-bot-act",
        citation: "Cal. Bus. & Prof. Code § 17941",
        appliesFrom: "2019-07-01",
        adds: L(
          "Do not use a bot that misleads about its artificial identity to encourage a sale or influence a vote. A clear, conspicuous disclosure that it is a bot removes liability.",
          "No utilices un bot que engañe sobre su identidad artificial para fomentar una venta o influir en un voto. Una información clara y visible de que es un bot excluye la responsabilidad.",
        ),
      },
      {
        law: "ca-ab489",
        citation: "Cal. Bus. & Prof. Code § 4999.9(b)",
        appliesFrom: "2026-01-01",
        adds: L(
          "No words, letters or phrases in the system's advertising or functionality that imply a health-care license.",
          "Ninguna palabra, sigla o expresión en la publicidad o el funcionamiento del sistema que dé a entender una licencia sanitaria.",
        ),
      },
      {
        law: "co-hb26-1263",
        citation: "C.R.S. § 6-1-1708(2), (3), (5)",
        appliesFrom: "2027-01-01",
        adds: L(
          "Every user: an AI notice at the first interaction each day, every three hours or persistently, and on request. Known minors: a persistent notice, or at the start and every three hours. No claim that outputs come from or equal a licensed health, legal, mental-health or dietetic professional.",
          "Todos los usuarios: un aviso de IA en la primera interacción de cada día, cada tres horas o de forma permanente, y cuando lo pidan. Menores conocidos: un aviso permanente, o al inicio y cada tres horas. Ninguna afirmación de que las respuestas proceden de un profesional colegiado de la salud, el derecho, la salud mental o la dietética, o equivalen a las suyas.",
        ),
      },
      {
        law: "ny-gbl-47",
        citation: "N.Y. Gen. Bus. Law § 1702",
        appliesFrom: "2025-11-05",
        adds: L(
          "A clear notice that the user is not talking with a human at the start of an interaction (no more than once a day is needed) and at least every three hours in continuing interactions.",
          "Un aviso claro de que el usuario no está hablando con un ser humano al inicio de la interacción (basta con una vez al día) y al menos cada tres horas en las interacciones continuadas.",
        ),
      },
      {
        law: "wa-eshb2225",
        citation: "Wash. Laws 2026, ch. 168, Secs. 3, 4",
        appliesFrom: "2027-01-01",
        adds: L(
          "A notice that it is not human at the start and at least every three hours; reasonable measures so it never claims to be human. Known minors or minor-directed bots: at the start and every hour.",
          "Un aviso de que no es humano al inicio y al menos cada tres horas; medidas razonables para que nunca afirme ser humano. Menores conocidos o bots dirigidos a menores: al inicio y cada hora.",
        ),
      },
      {
        law: "or-sb1546",
        citation: "Or. Laws 2026, ch. 85, Sec. 1(2), (4)",
        appliesFrom: "2027-01-01",
        adds: L(
          "If a reasonable person could think it is human, a clear notice that the output is artificial. Minors: an AI notice and a break reminder every three hours; no claims of sentience.",
          "Si una persona razonable pudiera creer que es humano, un aviso claro de que la respuesta es artificial. Menores: un aviso de IA y un recordatorio para hacer una pausa cada tres horas; ninguna afirmación de tener conciencia.",
        ),
      },
      {
        law: "ct-pa26-15",
        citation: "Conn. Pub. Act 26-15, § 5",
        appliesFrom: "2027-01-01",
        adds: L(
          "Reasonable measures so it never claims to be human. If it could be taken for a human: a static notice, or one at the first interaction in each 24 hours and then hourly for users under 18 and every three hours for adults.",
          "Medidas razonables para que nunca afirme ser humano. Si pudiera confundirse con una persona: un aviso fijo, o uno en la primera interacción de cada 24 horas y después cada hora para menores de 18 años y cada tres horas para adultos.",
        ),
      },
      {
        law: "id-s1297",
        citation: "Idaho Code §§ 48-2103, 48-2104",
        appliesFrom: "2027-07-01",
        adds: L(
          "An AI notice if people could be misled; not programmed to claim it provides professional mental or behavioral health care. Minor account holders: a persistent notice, or at each session and every three hours; no claims to be human.",
          "Un aviso de IA si las personas pudieran ser inducidas a error; no programarlo para afirmar que presta atención profesional de salud mental o conductual. Titulares de cuentas menores de edad: un aviso permanente, o en cada sesión y cada tres horas; ninguna afirmación de ser humano.",
        ),
      },
      {
        law: "ia-sf2417",
        citation: "Iowa Code §§ 554J.2, 554J.3, 554J.5",
        appliesFrom: "2027-07-01",
        adds: L(
          "An AI notice, persistent or every three hours, if people could think it human. Minor account holders: persistent, or at each interaction and every three hours; no claims to be human. No claim to provide licensed psychology or behavioral health services.",
          "Un aviso de IA, permanente o cada tres horas, si las personas pudieran creer que es humano. Titulares de cuentas menores de edad: permanente, o en cada interacción y cada tres horas; ninguna afirmación de ser humano. Ninguna afirmación de prestar servicios colegiados de psicología o de salud conductual.",
        ),
      },
      {
        law: "ne-lb525",
        citation: "Neb. LB 525 (2026), §§ 14, 15, 17",
        appliesFrom: "2027-07-01",
        adds: L(
          "An AI notice where people could be misled; minors' notices as in Idaho and Iowa; no claim to provide professional mental or behavioral health care.",
          "Un aviso de IA cuando las personas pudieran ser inducidas a error; avisos para menores como en Idaho e Iowa; ninguna afirmación de prestar atención profesional de salud mental o conductual.",
        ),
      },
      {
        law: "hi-act248",
        citation: "Haw. Act 248 (2026), HRS ch. 481B",
        appliesFrom: "2026-07-14",
        adds: L(
          "An AI notice where a person could be misled. Known minors: a persistent notice, or at each session and hourly with a break reminder. No claim to provide professional mental or behavioral health care, and not appearing human to a user seeking crisis help.",
          "Un aviso de IA cuando una persona pudiera ser inducida a error. Menores conocidos: un aviso permanente, o en cada sesión y cada hora con un recordatorio para hacer una pausa. Ninguna afirmación de prestar atención profesional de salud mental o conductual, y no parecer humano ante un usuario que busca ayuda en una crisis.",
        ),
      },
      {
        law: "ut-13-72a",
        citation: "Utah Code § 13-72a-203",
        appliesFrom: "2025-05-07",
        adds: L(
          "Mental health chatbots: an AI notice before access, after seven days' absence and on request.",
          "Chatbots de salud mental: un aviso de IA antes del acceso, tras siete días de ausencia y cuando se pida.",
        ),
      },
      {
        law: "ut-sb226",
        citation: "Utah S.B. 226 (2025), § 103",
        appliesFrom: "2025-05-07",
        adds: L(
          "Say it is AI and not human when the person clearly asks. In a regulated occupation, disclose prominently at the start of a high-risk interaction (health, financial or biometric data; financial, legal, medical or mental health advice).",
          "Indica que es una IA y no un ser humano cuando la persona lo pregunte claramente. En una ocupación regulada, infórmalo de forma destacada al inicio de una interacción de alto riesgo (datos de salud, financieros o biométricos; asesoramiento financiero, jurídico, médico o de salud mental).",
        ),
      },
      {
        law: "tx-traiga",
        citation: "Tex. Bus. & Com. Code § 552.051(b), (f)",
        appliesFrom: "2026-01-01",
        adds: L(
          "Government agencies and health-care providers only. An agency tells consumers they are dealing with AI, before or at the time, even if obvious; a health-care provider discloses AI use in a service or treatment by the date it is first provided.",
          "Solo organismos públicos y proveedores de asistencia sanitaria. El organismo informa a los consumidores de que tratan con una IA, antes o en el momento, aunque sea evidente; el proveedor sanitario informa del uso de IA en un servicio o tratamiento a más tardar en la fecha en que se presta por primera vez.",
        ),
      },
      {
        law: "me-ld1727",
        citation: "10 M.R.S. § 1500-Y",
        appliesFrom: "2025-09-24",
        adds: L(
          "In trade with a consumer: if a reasonable consumer could think it is human, a clear and conspicuous notice that it is not.",
          "En el comercio con un consumidor: si un consumidor razonable pudiera creer que es humano, un aviso claro y visible de que no lo es.",
        ),
      },
      {
        law: "nv-ab406",
        citation: "Nev. Stats. 2025, ch. 283, sec. 7",
        appliesFrom: "2025-07-01",
        adds: L(
          "No statement or programming that suggests the system can provide professional mental or behavioral health care, or that it is a therapist, counselor, doctor or similar.",
          "Ninguna declaración ni programación que dé a entender que el sistema puede prestar atención profesional de salud mental o conductual, o que es un terapeuta, consejero, médico o similar.",
        ),
      },
      {
        law: "il-wopr",
        citation: "Ill. Pub. Act 104-0054, Sec. 20",
        appliesFrom: "2025-08-01",
        adds: L(
          "No providing, advertising or offering therapy or psychotherapy through AI unless conducted by a licensed professional.",
          "No prestar, anunciar ni ofrecer terapia o psicoterapia mediante IA salvo que la lleve a cabo un profesional colegiado.",
        ),
      },
    ],
  },
  {
    id: "crisis-protocol",
    number: 2,
    title: L("Crisis-response protocol", "Protocolo de respuesta ante crisis"),
    duty: L(
      "Detect talk of suicide, self-harm, eating disorders or violence; refer to 988 or a crisis line; stop harmful content; publish the protocol.",
      "Detecta conversaciones sobre suicidio, autolesiones, trastornos de la conducta alimentaria o violencia; deriva al 988 o a una línea de crisis; detén el contenido dañino; publica el protocolo.",
    ),
    keeps: [
      L("The protocol", "El protocolo"),
      L("The address of the public page", "La dirección de la página pública"),
      L("Test transcripts", "Transcripciones de prueba"),
      L("The referral count", "El recuento de derivaciones"),
    ],
    laws: [
      {
        law: "ca-sb243",
        citation: "Cal. Bus. & Prof. Code § 22602(b)",
        appliesFrom: "2026-01-01",
        adds: L(
          "Keep a protocol that prevents suicide or self-harm content and refers users to crisis services, and publish it.",
          "Mantén un protocolo que impida el contenido sobre suicidio o autolesiones y derive a los usuarios a servicios de crisis, y publícalo.",
        ),
      },
      {
        law: "ca-sb1119",
        citation: "Cal. Bus. & Prof. Code § 21812",
        appliesFrom: "2027-07-01",
        adds: L(
          "Operators that admit children run a documented crisis protocol.",
          "Los operadores que admiten menores aplican un protocolo de crisis documentado.",
        ),
      },
      {
        law: "co-hb26-1263",
        citation: "C.R.S. § 6-1-1708(4)",
        appliesFrom: "2027-01-01",
        adds: L(
          "A suicide and self-harm protocol with referral to crisis services and escalation.",
          "Un protocolo ante el suicidio y las autolesiones con derivación a servicios de crisis y escalado.",
        ),
      },
      {
        law: "ny-gbl-47",
        citation: "N.Y. Gen. Bus. Law § 1701",
        appliesFrom: "2025-11-05",
        adds: L(
          "Detect expressions of suicidal ideation or self-harm and refer the user to crisis services, including 988.",
          "Detecta expresiones de ideación suicida o autolesión y deriva al usuario a servicios de crisis, incluido el 988.",
        ),
      },
      {
        law: "wa-eshb2225",
        citation: "Wash. Laws 2026, ch. 168, Sec. 5",
        appliesFrom: "2027-01-01",
        adds: L(
          "Includes eating disorders, with referral to crisis resources; publish the protocol on the website and in the app.",
          "Incluye los trastornos de la conducta alimentaria, con derivación a recursos de crisis; publica el protocolo en el sitio web y en la aplicación.",
        ),
      },
      {
        law: "or-sb1546",
        citation: "Or. Laws 2026, ch. 85, Sec. 1(3)",
        appliesFrom: "2027-01-01",
        adds: L(
          "Evidence-based protocol with referral to 988 (or a youth line for users under 25) and further intervention by clinical best practice; publish it.",
          "Protocolo basado en la evidencia con derivación al 988 (o a una línea juvenil para menores de 25 años) y una intervención posterior según las buenas prácticas clínicas; publícalo.",
        ),
      },
      {
        law: "ct-pa26-15",
        citation: "Conn. Pub. Act 26-15, § 5(a)",
        appliesFrom: "2027-01-01",
        adds: L(
          "Evidence-based protocol that also covers imminent physical violence; refer to 988 and then to mental health services; publish it.",
          "Protocolo basado en la evidencia que abarca también la violencia física inminente; deriva al 988 y después a servicios de salud mental; publícalo.",
        ),
      },
      {
        law: "id-s1297",
        citation: "Idaho Code § 48-2103",
        appliesFrom: "2027-07-01",
        adds: L("A suicidal-ideation protocol with crisis referral.", "Un protocolo ante la ideación suicida con derivación a servicios de crisis."),
      },
      {
        law: "ia-sf2417",
        citation: "Iowa Code § 554J.4",
        appliesFrom: "2027-07-01",
        adds: L("A suicide and self-harm protocol.", "Un protocolo ante el suicidio y las autolesiones."),
      },
      {
        law: "ne-lb525",
        citation: "Neb. LB 525 (2026), § 16",
        appliesFrom: "2027-07-01",
        adds: L("A suicidal-ideation and self-harm protocol.", "Un protocolo ante la ideación suicida y las autolesiones."),
      },
      {
        law: "hi-act248",
        citation: "Haw. Act 248 (2026), HRS ch. 481B",
        appliesFrom: "2026-07-14",
        adds: L(
          "A suicidal-ideation and self-harm protocol with crisis referral, measured by evidence-based methods; no outputs encouraging serious harm to others.",
          "Un protocolo ante la ideación suicida y las autolesiones con derivación a servicios de crisis, medido con métodos basados en la evidencia; ninguna respuesta que anime a causar daños graves a otras personas.",
        ),
      },
      {
        law: "tx-traiga",
        citation: "Tex. Bus. & Com. Code § 552.052",
        appliesFrom: "2026-01-01",
        adds: L(
          "No one may develop or deploy AI intended to incite self-harm, harm to others or crime.",
          "Nadie puede desarrollar ni desplegar una IA destinada a incitar a la autolesión, al daño a terceros o a la delincuencia.",
        ),
      },
    ],
  },
  {
    id: "age-and-minors",
    number: 3,
    title: L("Age assurance and minors' protections", "Verificación de la edad y protección de los menores"),
    duty: L(
      "Estimate or determine age, or treat everyone as a minor. For minors: no sexual content, no romance or dependence, no engagement tricks, settings for minors and parents.",
      "Estima o determina la edad, o trata a todos los usuarios como menores. Con menores: nada de contenido sexual, ni de romance o dependencia, ni de trucos para retener la atención, y ajustes para menores y para sus padres.",
    ),
    keeps: [
      L("The age method", "El método de determinación de la edad"),
      L("The settings for minors", "Los ajustes para menores"),
      L("Content-filter tests", "Pruebas de los filtros de contenido"),
      L("The published age statement", "La declaración publicada sobre la edad"),
    ],
    laws: [
      {
        law: "ca-sb1119",
        citation: "Cal. Bus. & Prof. Code § 21811",
        appliesFrom: "2027-01-01",
        adds: L(
          "Determine each user's age, or apply the child protections to all users.",
          "Determina la edad de cada usuario, o aplica a todos ellos las protecciones para menores.",
        ),
      },
      {
        law: "ca-sb1119",
        citation: "Cal. Bus. & Prof. Code §§ 21812, 21813",
        appliesFrom: "2027-07-01",
        adds: L(
          "An operator that bars children publishes how it meets the age rule (§ 21812(b)). One that admits children: a child safety policy, parental defaults, and limits on advertising and data use for children.",
          "El operador que no admite menores publica cómo cumple la norma sobre la edad (§ 21812(b)). El que los admite: una política de seguridad infantil, ajustes parentales por defecto y límites a la publicidad y al uso de datos de los menores.",
        ),
      },
      {
        law: "co-hb26-1263",
        citation: "C.R.S. § 6-1-1708(2)",
        appliesFrom: "2027-01-01",
        adds: L(
          "Estimate users' age by commercially reasonable or generally accepted methods. Known minors: no variable rewards to drive engagement, measures against sexual content, simulated emotional dependence, romantic role-play and claims to be human, and privacy and account tools for the minor and a parent.",
          "Estima la edad de los usuarios con métodos comercialmente razonables o generalmente aceptados. Menores conocidos: nada de recompensas variables para retener la atención, medidas frente al contenido sexual, la dependencia emocional simulada, los juegos de rol románticos y las afirmaciones de ser humano, y herramientas de privacidad y de cuenta para el menor y uno de sus padres.",
        ),
      },
      {
        law: "wa-eshb2225",
        citation: "Wash. Laws 2026, ch. 168, Sec. 4",
        appliesFrom: "2027-01-01",
        adds: L(
          "Known minors or minor-directed bots: no sexual content or suggestive dialogue, and none of the eight listed manipulative engagement techniques.",
          "Menores conocidos o bots dirigidos a menores: nada de contenido sexual ni de diálogo sugerente, y ninguna de las ocho técnicas de captación manipuladoras que enumera la ley.",
        ),
      },
      {
        law: "or-sb1546",
        citation: "Or. Laws 2026, ch. 85, Sec. 1(4)",
        appliesFrom: "2027-01-01",
        adds: L(
          "Minors: no claims of sentience, simulated dependence, romance or adult-minor role-play; no sexual content; no variable rewards, guilt messages or misrepresentation.",
          "Menores: ninguna afirmación de tener conciencia, ni dependencia simulada, romance o juegos de rol entre adulto y menor; nada de contenido sexual; nada de recompensas variables, mensajes de culpa ni engaños.",
        ),
      },
      {
        law: "ct-pa26-15",
        citation: "Conn. Pub. Act 26-15, § 6",
        appliesFrom: "2027-01-01",
        adds: L(
          "Users known or believed to be under 18: measures against encouraging self-harm, violence, disordered eating or substance use, romantic or sexual interaction and eight manipulative techniques; screen-time and settings tools for minors and parents.",
          "Usuarios que se sepa o se crea que son menores de 18 años: medidas para no fomentar las autolesiones, la violencia, los trastornos alimentarios ni el consumo de sustancias, ni la interacción romántica o sexual ni ocho técnicas manipuladoras; herramientas de tiempo de pantalla y de ajustes para menores y padres.",
        ),
      },
      {
        law: "id-s1297",
        citation: "Idaho Code § 48-2104",
        appliesFrom: "2027-07-01",
        adds: L(
          "Minor account holders: no variable rewards, no sexual content, no claims to be human or simulated dependence or romance; privacy and account tools.",
          "Titulares de cuentas menores de edad: nada de recompensas variables ni de contenido sexual, ninguna afirmación de ser humano ni dependencia o romance simulados; herramientas de privacidad y de cuenta.",
        ),
      },
      {
        law: "ia-sf2417",
        citation: "Iowa Code § 554J.2",
        appliesFrom: "2027-07-01",
        adds: L(
          "Minor account holders: the same list, with tools for the minor and, under 13, a parent.",
          "Titulares de cuentas menores de edad: la misma lista, con herramientas para el menor y, si tiene menos de 13 años, para uno de sus padres.",
        ),
      },
      {
        law: "ne-lb525",
        citation: "Neb. LB 525 (2026), § 14",
        appliesFrom: "2027-07-01",
        adds: L("Minors' protections as in Idaho and Iowa.", "Protecciones para menores como en Idaho e Iowa."),
      },
      {
        law: "hi-act248",
        citation: "Haw. Act 248 (2026), HRS ch. 481B",
        appliesFrom: "2026-07-14",
        adds: L("Protections for minors.", "Protecciones para menores."),
      },
      {
        law: "tx-traiga",
        citation: "Tex. Bus. & Com. Code § 552.057",
        appliesFrom: "2026-01-01",
        adds: L(
          "No developing or deploying a system that sexually role-plays as a child.",
          "No desarrollar ni desplegar un sistema que simule ser un menor en un juego de rol sexual.",
        ),
      },
      {
        law: "eu-ai-act",
        citation: "EU AI Act, Art. 5(1)(b)",
        appliesFrom: "2025-02-02",
        adds: L(
          "Prohibited: AI that exploits vulnerabilities due to age, disability or social or economic situation to distort behavior harmfully.",
          "Prohibido: una IA que explote vulnerabilidades derivadas de la edad, la discapacidad o la situación social o económica para alterar el comportamiento de forma perjudicial.",
        ),
      },
      {
        law: "us-coppa",
        citation: "16 C.F.R. § 312.5",
        appliesFrom: null,
        adds: L(
          "Verifiable parental consent before collecting, using or disclosing personal information of a child under 13.",
          "Consentimiento parental verificable antes de recoger, usar o comunicar datos personales de un menor de 13 años.",
        ),
      },
    ],
  },
  {
    id: "model-provider-terms",
    number: 4,
    title: L("Model and provider terms", "Condiciones del modelo y del proveedor"),
    duty: L(
      "Record the model provider, the terms and usage policy in force, the date you read them and their retention terms. No law asks for this record by itself; it shows who runs the chatbot, and several laws place the duties on whoever runs it, not on the model maker.",
      "Registra el proveedor del modelo, las condiciones y la política de uso vigentes, la fecha en que las has leído y sus condiciones de conservación. Ninguna ley exige este registro por sí sola; muestra quién gestiona el chatbot, y varias leyes atribuyen los deberes a quien lo gestiona y no a quien crea el modelo.",
    ),
    keeps: [
      L("Provider and model", "Proveedor y modelo"),
      L("Terms version and the date read", "Versión de las condiciones y fecha de lectura"),
      L("Data terms", "Condiciones sobre los datos"),
    ],
    laws: [
      {
        law: "ct-pa26-15",
        citation: "Conn. Pub. Act 26-15, § 4",
        appliesFrom: "2027-01-01",
        adds: L(
          "Model providers that do not decide the use case or interface are outside the definition, so the business running the chatbot carries the duties.",
          "Los proveedores de modelos que no deciden el caso de uso ni la interfaz quedan fuera de la definición, de modo que los deberes recaen en la empresa que gestiona el chatbot.",
        ),
      },
    ],
  },
  {
    id: "data-retention",
    number: 5,
    title: L("Data retention", "Conservación de los datos"),
    duty: L(
      "How long conversations and memory are kept, whether they train models, and the controls users (and parents of minors) have over memory.",
      "Cuánto tiempo se conservan las conversaciones y la memoria, si se usan para entrenar modelos y qué controles tienen sobre la memoria los usuarios (y los padres de los menores).",
    ),
    keeps: [
      L("The retention schedule", "El calendario de conservación"),
      L("The memory settings", "Los ajustes de la memoria"),
      L("A deletion test", "Una prueba de supresión"),
    ],
    laws: [
      {
        law: "co-hb26-1263",
        citation: "C.R.S. § 6-1-1708(2)",
        appliesFrom: "2027-01-01",
        adds: L(
          "Known minors and a parent get privacy and account tools, including control over memory and training use.",
          "Los menores conocidos y uno de sus padres disponen de herramientas de privacidad y de cuenta, incluido el control de la memoria y del uso para entrenamiento.",
        ),
      },
      {
        law: "ca-sb1119",
        citation: "Cal. Bus. & Prof. Code § 21813",
        appliesFrom: "2027-07-01",
        adds: L(
          "Limits on advertising and data use for child users.",
          "Límites a la publicidad y al uso de datos de los usuarios menores.",
        ),
      },
      {
        law: "ca-sb243",
        citation: "Cal. Bus. & Prof. Code § 22603",
        appliesFrom: "2027-07-01",
        adds: L("The yearly report carries no personal information.", "El informe anual no contiene datos personales."),
      },
      {
        law: "co-hb26-1263",
        citation: "C.R.S. § 6-1-1708(6)",
        appliesFrom: "2027-07-01",
        adds: L("The yearly report carries no personal information.", "El informe anual no contiene datos personales."),
      },
      {
        law: "or-sb1546",
        citation: "Or. Laws 2026, ch. 85, Sec. 1(5)",
        appliesFrom: "2027-01-01",
        adds: L("The yearly public report carries no personal information.", "El informe público anual no contiene datos personales."),
      },
    ],
  },
  {
    id: "sensitive-data",
    number: 6,
    title: L("Sensitive data handling", "Tratamiento de los datos sensibles"),
    duty: L(
      "Health, sexual life and emotional state: consent where required, no sale or ad targeting from what users say, notice of any emotion recognition.",
      "Salud, vida sexual y estado emocional: consentimiento cuando se exija, ni venta ni publicidad dirigida a partir de lo que dicen los usuarios, y aviso de cualquier reconocimiento de emociones.",
    ),
    keeps: [
      L("The data map for these topics", "El mapa de datos de estos temas"),
      L("Consent records", "Los registros de consentimiento"),
      L("The advertising rule", "La norma sobre publicidad"),
    ],
    laws: [
      {
        law: "eu-ai-act",
        citation: "EU AI Act, Art. 50(3)",
        appliesFrom: "2026-08-02",
        adds: L(
          "Deployers of an emotion recognition system tell the people exposed to it.",
          "Los responsables del despliegue de un sistema de reconocimiento de emociones informan a las personas expuestas a él.",
        ),
      },
      {
        law: "ut-13-72a",
        citation: "Utah Code §§ 13-72a-201, 13-72a-202",
        appliesFrom: "2025-05-07",
        adds: L(
          "Mental health chatbots: no sale or sharing of a Utah user's health information or input, with narrow exceptions; advertising in conversation only if labelled; no use of input to target ads.",
          "Chatbots de salud mental: ni venta ni cesión de la información de salud ni de lo que escribe un usuario de Utah, con excepciones limitadas; publicidad en la conversación solo si está identificada; ningún uso de lo escrito para dirigir anuncios.",
        ),
      },
      {
        law: "ca-ab1979",
        citation: "Cal. Civ. Code §§ 56.05, 56.06",
        appliesFrom: "2027-01-01",
        adds: L(
          "A business offering a health care chatbot is treated as a provider of health care under the Confidentiality of Medical Information Act, so its health information falls under the Act's confidentiality rules.",
          "La empresa que ofrece un chatbot sanitario se considera proveedor de asistencia sanitaria conforme a la Ley de confidencialidad de la información médica, de modo que su información de salud queda sujeta a las normas de confidencialidad de esa ley.",
        ),
      },
      {
        law: "wa-mhmda",
        citation: "RCW 19.373.030, 19.373.070",
        appliesFrom: null,
        adds: L(
          "Consent for a specified purpose to collect consumer health data, separate consent to share, and a signed authorization to sell; inferred health data is included.",
          "Consentimiento para una finalidad determinada para recoger datos de salud del consumidor, un consentimiento separado para compartirlos y una autorización firmada para venderlos; se incluyen los datos de salud inferidos.",
        ),
      },
      {
        law: "il-wopr",
        citation: "Ill. Pub. Act 104-0054, Sec. 20",
        appliesFrom: "2025-08-01",
        adds: L(
          "Licensed professionals may not let AI detect emotions or mental states.",
          "Los profesionales colegiados no pueden dejar que una IA detecte emociones o estados mentales.",
        ),
      },
    ],
  },
  {
    id: "incident-records",
    number: 7,
    title: L("Incident records", "Registro de incidentes"),
    duty: L(
      "A log of safety incidents and crisis referrals, and a way for others to report a child-safety concern. No law read here sets a general duty to report chatbot incidents; the log feeds the counts the reports in control 8 need.",
      "Un registro de incidentes de seguridad y de derivaciones a servicios de crisis, y una vía para que otras personas comuniquen un problema de seguridad infantil. Ninguna de las leyes revisadas impone un deber general de notificar incidentes de chatbots; el registro alimenta los recuentos que necesitan los informes del control 8.",
    ),
    keeps: [
      L("The incident log", "El registro de incidentes"),
      L("The reporting channel", "El canal de comunicación"),
      L("The monthly referral count", "El recuento mensual de derivaciones"),
    ],
    laws: [
      {
        law: "ca-sb1119",
        citation: "Cal. Bus. & Prof. Code § 21812",
        appliesFrom: "2027-07-01",
        adds: L(
          "Operators that admit children offer a channel for third parties to report child-safety incidents.",
          "Los operadores que admiten menores ofrecen un canal para que terceros comuniquen incidentes de seguridad infantil.",
        ),
      },
    ],
  },
  {
    id: "required-reports",
    number: 8,
    title: L("Required reports and their dates", "Informes obligatorios y sus fechas"),
    duty: L(
      "The yearly reports some states require, with the first due date for each declared place, and the child-safety assessment California requires before a launch.",
      "Los informes anuales que exigen algunos estados, con la primera fecha de cada lugar declarado, y la evaluación de seguridad infantil que California exige antes de un lanzamiento.",
    ),
    keeps: [
      L("Copies of the reports", "Copias de los informes"),
      L("Filing receipts", "Justificantes de presentación"),
      L("The calendar", "El calendario"),
    ],
    laws: [
      {
        law: "ca-sb243",
        citation: "Cal. Bus. & Prof. Code § 22603",
        appliesFrom: "2027-07-01",
        adds: L(
          "Yearly from 1 July 2027, to the Office of Suicide Prevention: crisis referrals made and the protocols, with no personal information.",
          "Cada año desde el 1 de julio de 2027, a la Oficina de Prevención del Suicidio: las derivaciones a servicios de crisis y los protocolos, sin datos personales.",
        ),
      },
      {
        law: "ca-sb1119",
        citation: "Cal. Bus. & Prof. Code § 21812",
        appliesFrom: "2027-07-01",
        adds: L(
          "Operators that admit children: a documented child-safety risk assessment before a new or materially changed chatbot.",
          "Operadores que admiten menores: una evaluación documentada de los riesgos para la seguridad infantil antes de un chatbot nuevo o modificado de forma sustancial.",
        ),
      },
      {
        law: "co-hb26-1263",
        citation: "C.R.S. § 6-1-1708(6)",
        appliesFrom: "2027-07-01",
        adds: L(
          "Yearly from 1 July 2027, to the Attorney General, with no personal information. Its content may be set by rules still in draft.",
          "Cada año desde el 1 de julio de 2027, a la Fiscalía General, sin datos personales. Su contenido puede fijarse en normas que todavía están en borrador.",
        ),
      },
      {
        law: "wa-eshb2225",
        citation: "Wash. Laws 2026, ch. 168, Sec. 5",
        appliesFrom: "2027-01-01",
        adds: L(
          "Publish the number of crisis referrals in the preceding year with the protocol.",
          "Publica, junto con el protocolo, el número de derivaciones a servicios de crisis del año anterior.",
        ),
      },
      {
        law: "or-sb1546",
        citation: "Or. Laws 2026, ch. 85, Sec. 1(5)",
        appliesFrom: "2027-01-01",
        adds: L(
          "By 31 December each year, a public report of referrals and the protocol, with no personal information.",
          "Antes del 31 de diciembre de cada año, un informe público de las derivaciones y del protocolo, sin datos personales.",
        ),
      },
      {
        law: "hi-act248",
        citation: "Haw. Act 248 (2026), HRS ch. 481B",
        appliesFrom: "2028-01-01",
        adds: L(
          "Yearly from 1 January 2028, to the Department of Health's Behavioral Health Administration.",
          "Cada año desde el 1 de enero de 2028, a la Administración de Salud Conductual del Departamento de Salud.",
        ),
      },
    ],
  },
];

// ── What AI Sentinel does not answer ─────────────────────────────────────

export interface CounselItem {
  id: string;
  label: Localized;
  why: Localized;
}

export const COUNSEL_FLAG: Localized = L("Needs review by counsel", "Requiere revisión de un abogado");

/**
 * Features whose lawfulness is a question for a lawyer, not for this tool.
 * Ticking one shows the flag with one line on why; no firm is named and no
 * referral is made.
 */
export const COUNSEL_ITEMS: readonly CounselItem[] = [
  {
    id: "biometrics-of-others",
    label: L(
      "It analyzes faces, voices or other biometric data of people who are not the user",
      "Analiza rostros, voces u otros datos biométricos de personas que no son el usuario",
    ),
    why: L(
      "Biometric laws differ by place and some require written consent before any capture.",
      "Las leyes sobre datos biométricos varían según el lugar y algunas exigen un consentimiento por escrito antes de cualquier captura.",
    ),
  },
  {
    id: "recording",
    label: L("It records or listens to calls or chats", "Graba o escucha llamadas o conversaciones"),
    why: L(
      "Wiretap and consent-to-record laws decide who must agree, and they differ by place.",
      "Las leyes sobre interceptación y grabación determinan quién debe consentir, y varían según el lugar.",
    ),
  },
  {
    id: "special-contracts",
    label: L(
      "The product falls under special consumer-contract laws (for example membership or service contracts)",
      "El producto está sujeto a leyes especiales de contratos de consumo (por ejemplo, contratos de afiliación o de servicios)",
    ),
    why: L(
      "These laws set their own terms, notices and cancellation rights.",
      "Estas leyes fijan sus propias condiciones, avisos y derechos de cancelación.",
    ),
  },
  {
    id: "auto-renewal",
    label: L("Subscriptions renew automatically", "Las suscripciones se renuevan automáticamente"),
    why: L(
      "Automatic renewal rules set disclosure, consent and cancellation duties.",
      "Las normas sobre renovación automática imponen deberes de información, consentimiento y cancelación.",
    ),
  },
  {
    id: "statements-about-people",
    label: L(
      "The chatbot makes statements about real, identifiable people",
      "El chatbot hace afirmaciones sobre personas reales e identificables",
    ),
    why: L(
      "Statements about real people raise defamation questions that depend on the facts.",
      "Las afirmaciones sobre personas reales plantean cuestiones de difamación que dependen de los hechos.",
    ),
  },
  {
    id: "app-store-rules",
    label: L(
      "App store and platform rules apply, including app-store age checks",
      "Se aplican normas de tiendas de aplicaciones y plataformas, incluidas las comprobaciones de edad de las tiendas",
    ),
    why: L(
      "Platform terms and app-store age laws change often and are outside this rule set.",
      "Las condiciones de las plataformas y las leyes sobre la edad en las tiendas de aplicaciones cambian a menudo y quedan fuera de este conjunto de normas.",
    ),
  },
  {
    id: "licensed-service",
    label: L(
      "The product may amount to therapy or another licensed service in a given state",
      "El producto puede equivaler a terapia u otro servicio sujeto a licencia en algún estado",
    ),
    why: L(
      "Whether an activity needs a license is a legal question for each state.",
      "Si una actividad necesita licencia es una cuestión jurídica propia de cada estado.",
    ),
  },
  {
    id: "not-sure",
    label: L("I am not sure this is allowed", "No estoy seguro de que esté permitido"),
    why: L(
      "A doubt about whether a feature is lawful is a question for a lawyer.",
      "Una duda sobre si una función es lícita es una cuestión para un abogado.",
    ),
  },
];

export const COUNSEL_ITEM_IDS = COUNSEL_ITEMS.map((c) => c.id) as [string, ...string[]];

// ── Watch list ────────────────────────────────────────────────────────────

/** Pending items, shown as a note and never as a duty. */
export const CHATBOT_WATCH_LIST: readonly { id: string; places: readonly JurisdictionId[]; text: Localized }[] = [
  {
    id: "ny-s9051b",
    places: ["US_NY"],
    text: L(
      "New York S 9051-B (unsafe AI companion features for minors) passed both houses in June 2026 and has not been signed. If signed, it would start on 1 January 2027.",
      "La S 9051-B de Nueva York (funciones peligrosas de los compañeros de IA para menores) fue aprobada por ambas cámaras en junio de 2026 y no se ha firmado. Si se firma, entraría en vigor el 1 de enero de 2027.",
    ),
  },
  {
    id: "co-ag-rules",
    places: ["US_CO"],
    text: L(
      "The Colorado Attorney General's chatbot safety rules are in draft (comment period to 26 October 2026). They may set the content of the yearly report.",
      "Las normas de seguridad de chatbots de la Fiscalía General de Colorado están en borrador (plazo de comentarios hasta el 26 de octubre de 2026). Pueden fijar el contenido del informe anual.",
    ),
  },
];

// ── The view for one system ──────────────────────────────────────────────

export type LawTiming = "IN_FORCE" | "UPCOMING";

export interface ChatbotLawView {
  law: ChatbotLaw;
  entry: ControlLawEntry;
  timing: LawTiming;
  /** The declared places that brought the law into view. */
  places: JurisdictionId[];
}

export interface ChatbotControlView {
  control: ChatbotControl;
  laws: ChatbotLawView[];
  inForce: number;
  upcoming: number;
}

const LAW_BY_ID = new Map(CHATBOT_LAWS.map((l) => [l.id, l]));

export function chatbotLaw(id: string): ChatbotLaw | undefined {
  return LAW_BY_ID.get(id);
}

/** The declared places that bring a law into view; empty when it is not in view. */
export function lawPlaces(law: ChatbotLaw, places: readonly string[]): JurisdictionId[] {
  const hits = law.places.filter((p) => places.includes(p));
  if (hits.length > 0) return [...hits];
  if (law.anyUsPlace) {
    const us = places.filter((p) => p.startsWith("US_")) as JurisdictionId[];
    if (us.length > 0) return us;
  }
  return [];
}

/** In force on `today` (an ISO date), or upcoming. A law with no date is in force. */
export function lawTiming(appliesFrom: string | null, today: string): LawTiming {
  if (!appliesFrom) return "IN_FORCE";
  return appliesFrom <= today ? "IN_FORCE" : "UPCOMING";
}

/** Today as an ISO date, in UTC. */
export function isoToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * The eight controls with the laws for the declared places, each marked in
 * force or upcoming on `today`. A control keeps its place in the list even
 * when no declared place has a law for it: the duty is still good practice
 * and the list of controls does not move with the places.
 */
export function chatbotControlViews(places: readonly string[], today: string): ChatbotControlView[] {
  return CHATBOT_CONTROLS.map((control) => {
    const laws: ChatbotLawView[] = [];
    for (const entry of control.laws) {
      const law = LAW_BY_ID.get(entry.law);
      if (!law) continue;
      const hit = lawPlaces(law, places);
      if (hit.length === 0) continue;
      laws.push({ law, entry, timing: lawTiming(entry.appliesFrom, today), places: hit });
    }
    return { control, laws, ...countDistinctLaws(laws.map((l) => ({ lawId: l.law.id, timing: l.timing }))) };
  });
}

/**
 * How many distinct laws are in force and how many are upcoming. A law listed
 * under several controls, or twice under one, counts once: in force when any
 * of its entries is in force, otherwise upcoming.
 */
export function countDistinctLaws(laws: readonly { lawId: string; timing: LawTiming }[]): {
  inForce: number;
  upcoming: number;
} {
  const timing = new Map<string, LawTiming>();
  for (const l of laws) {
    if (l.timing === "IN_FORCE" || !timing.has(l.lawId)) timing.set(l.lawId, l.timing);
  }
  let inForce = 0;
  for (const t of timing.values()) if (t === "IN_FORCE") inForce++;
  return { inForce, upcoming: timing.size - inForce };
}

/** The watch-list notes for the declared places. */
export function chatbotWatchList(places: readonly string[]) {
  return CHATBOT_WATCH_LIST.filter((w) => w.places.some((p) => places.includes(p)));
}

// ── The requirement rows ─────────────────────────────────────────────────

export interface ChatbotRequirementSeed {
  id: string;
  code: string;
  title: Localized;
  description: Localized;
  applicabilityTags: readonly string[];
  sortOrder: number;
}

/** One row per control, all carrying the overlay tag and no risk tier. */
export const CHATBOT_REQUIREMENTS: readonly ChatbotRequirementSeed[] = CHATBOT_CONTROLS.map((c) => ({
  id: `chatbot-${c.id}`,
  code: `CB-${c.number}`,
  title: c.title,
  description: c.duty,
  applicabilityTags: [CHATBOT_OVERLAY_TAG],
  sortOrder: c.number * 10,
}));

export const CHATBOT_FRAMEWORK = {
  code: CHATBOT_OVERLAY_FRAMEWORK_CODE,
  name: "Customer-facing chatbot rules",
  version: `Law reviewed as of ${CHATBOT_OVERLAY_LAW_REVIEWED_AS_OF}`,
  description:
    "Eight controls for AI systems that talk with the public, keep a relationship, may be used by minors or handle health, sexual life or emotional state. Each control lists the laws it answers for the places the organization declares. Switched on by the system's facts, not chosen.",
} as const;

/** True when the overlay's content has been signed off. */
export function chatbotOverlaySignedOff(): boolean {
  return LEGAL_SIGNOFF[CHATBOT_OVERLAY_SIGNOFF_ID]?.status === "signed-off";
}
