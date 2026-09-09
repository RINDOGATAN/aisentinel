// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The agentic stress test.
 *
 * Every regime in this product was written for a system that produces an
 * output which a person then uses. An autonomous downstream agent that acts on
 * that output breaks the assumption in a different place in each regime, and
 * each of the three artifacts fails differently as a result.
 *
 * This module encodes where. Each finding names the artifact that breaks, the
 * assumption it rested on, what the handoff does to it, and the provision the
 * agentic layer demands. Findings are gated on the regimes that actually apply
 * to the system, so a Texas-only deployer is not shown a GDPR failure.
 *
 * Pure data and pure selection. Legal sign-off PENDING.
 */

import { signoffMarker } from "@/config/legal-signoff";
import type { Localized } from "@/config/lawfirm-ai-toolkit";
import type { OverlayTag } from "@/config/unified-assessment";

export const AGENTIC_STRESS_TEST_VERSION = "2026.09.1";
export const AGENTIC_STRESS_TEST_LAW_REVIEWED_AS_OF = "2026-09-08";
export const AGENTIC_STRESS_TEST_REVIEW_MARKER: Localized = signoffMarker("AGENTIC_STRESS_TEST");

/** Which of the three artifacts the finding breaks. */
export type BreakingArtifact = "assessment" | "notice" | "protocol";

export type Severity = "breaks" | "weakens" | "watch";

export interface AgenticFinding {
  id: string;
  /** Shown only when every tag in `requires` is active. Empty = always. */
  requires: OverlayTag[];
  artifacts: BreakingArtifact[];
  severity: Severity;
  title: Localized;
  /** The assumption the regime made. */
  assumption: Localized;
  /** What the handoff does to it. */
  breakage: Localized;
  /** The provision the agentic layer demands. */
  provision: Localized;
  citations: string[];
  /** Question ids whose answers evidence the provision, when they exist. */
  evidencedBy: string[];
}

const L = (en: string, es: string): Localized => ({ en, es });

export const AGENTIC_FINDINGS: AgenticFinding[] = [
  {
    id: "gdpr-22-boundary",
    requires: ["gdpr:adm"],
    artifacts: ["assessment", "protocol"],
    severity: "breaks",
    title: L(
      "The Article 22 boundary moves to the agent",
      "La frontera del artículo 22 se desplaza al agente",
    ),
    assumption: L(
      "Your Art. 22 analysis concluded the decision is not solely automated because a person reviews the model's output before it takes effect.",
      "Su análisis del art. 22 concluyó que la decisión no es únicamente automatizada porque una persona revisa el resultado del modelo antes de que produzca efectos.",
    ),
    breakage: L(
      "When an agent acts on the output, the decision the person experiences is the agent's action, not the model's score. If nobody reviews the action, that decision is solely automated even though the score was reviewed. The CJEU already treats an automatically generated score as a decision when a third party draws heavily on it; an agent that acts on the score is a stronger case, not a weaker one.",
      "Cuando un agente actúa sobre el resultado, la decisión que experimenta la persona es la acción del agente, no la puntuación del modelo. Si nadie revisa esa acción, esa decisión es únicamente automatizada aunque la puntuación se revisara. El TJUE ya considera decisión una puntuación generada automáticamente cuando un tercero se apoya de forma determinante en ella; un agente que actúa sobre la puntuación es un caso más claro, no menos.",
    ),
    provision: L(
      "State, in the assessment and in the protocol, where the decision ends for Art. 22 purposes. Either the agent may not execute an action with legal or similarly significant effect until a reviewer with authority has approved it, or you accept the decision is solely automated and provide the Art. 22(3) safeguards on the agent's action itself.",
      "Establezca, en la evaluación y en el protocolo, dónde termina la decisión a efectos del art. 22. O bien el agente no puede ejecutar una acción con efectos jurídicos o similarmente significativos hasta que una persona revisora con autoridad la haya aprobado, o bien acepta que la decisión es únicamente automatizada y ofrece las garantías del art. 22.3 sobre la propia acción del agente.",
    ),
    citations: ["EU GDPR Art. 22", "EU GDPR Art. 22(3)"],
    evidencedBy: ["agt_still_human", "agt_handoff"],
  },
  {
    id: "ca-prongs-fail",
    requires: ["admt:art11"],
    artifacts: ["assessment", "protocol"],
    severity: "breaks",
    title: L(
      "The human-involvement prongs fail at the handoff",
      "Los elementos de intervención humana fallan en la delegación",
    ),
    assumption: L(
      "The California determination rested on a reviewer who interprets the output, reviews it against other relevant information, and has authority to make or change the decision.",
      "La determinación de California se apoyó en una persona revisora que interpreta el resultado, lo contrasta con otra información pertinente y tiene autoridad para adoptar o cambiar la decisión.",
    ),
    breakage: L(
      "An agent that executes before or without that review removes the third prong in practice: the reviewer cannot change a decision that has already taken effect. The test is conjunctive, so failing one prong makes the technology ADMT and pulls in the full Article 11 notice, opt-out and access duties.",
      "Un agente que ejecuta antes de esa revisión, o sin ella, elimina en la práctica el tercer elemento: la persona revisora no puede cambiar una decisión que ya ha producido efectos. La prueba es conjuntiva, de modo que fallar un elemento convierte la tecnología en ADMT y arrastra todos los deberes de aviso, exclusión y acceso del artículo 11.",
    ),
    provision: L(
      "Record whether the agent can act before review completes. If it can, re-run the ADMT determination on that basis and attach the Article 11 duties, rather than relying on a human-involvement finding the workflow no longer supports.",
      "Documente si el agente puede actuar antes de que concluya la revisión. Si puede, rehaga la determinación de ADMT sobre esa base y adjunte los deberes del artículo 11, en lugar de apoyarse en una conclusión de intervención humana que el flujo ya no sostiene.",
    ),
    citations: ["CA CCPA ADMT § 7001(e)(1)", "CA CCPA ADMT § 7221"],
    evidencedBy: ["agt_still_human", "dec_human_role"],
  },
  {
    id: "notice-scope",
    requires: [],
    artifacts: ["notice"],
    severity: "breaks",
    title: L(
      "The notice describes a decision the agent has already left behind",
      "El aviso describe una decisión que el agente ya ha dejado atrás",
    ),
    assumption: L(
      "The notice tells people that AI is used to make one identified decision about them, and describes that decision's logic and consequences.",
      "El aviso informa a las personas de que se usa IA para adoptar una decisión identificada sobre ellas, y describe su lógica y sus consecuencias.",
    ),
    breakage: L(
      "An agent chains actions the notice never named: it may open a case, contact a third party, adjust an entitlement or trigger a second model. Each is a processing operation, and some are decisions in their own right. A notice that lists only the first decision is incomplete for every one that follows.",
      "Un agente encadena acciones que el aviso nunca mencionó: puede abrir un expediente, contactar con un tercero, ajustar un derecho o activar un segundo modelo. Cada una es una operación de tratamiento y algunas son decisiones por sí mismas. Un aviso que solo enumera la primera decisión es incompleto para todas las siguientes.",
    ),
    provision: L(
      "Describe the agent's authority in the notice as a bounded scope: the categories of action it may take without a person, and the point at which a person is involved. Say plainly that some steps are carried out by an autonomous agent, and how the person is told when one acted on their case.",
      "Describa en el aviso la autoridad del agente como un ámbito acotado: las categorías de acción que puede realizar sin intervención humana y el punto en que interviene una persona. Diga con claridad que algunas fases las ejecuta un agente autónomo y cómo se informa a la persona cuando uno ha actuado en su expediente.",
    ),
    citations: ["EU GDPR Art. 13(2)(f) / 14(2)(g)", "EU AI Act Art. 50(1)", "CO SB 26-189 CO-DEP-1"],
    evidencedBy: ["agt_notice_coverage", "agt_handoff"],
  },
  {
    id: "protocol-no-reversal",
    requires: [],
    artifacts: ["protocol"],
    severity: "breaks",
    title: L(
      "The protocol reviews a decision the agent has already carried out",
      "El protocolo revisa una decisión que el agente ya ha ejecutado",
    ),
    assumption: L(
      "The appeal protocol assumes review happens before or instead of the outcome taking effect, so a reviewer changing the decision changes what happens to the person.",
      "El protocolo de recurso presupone que la revisión ocurre antes de que el resultado produzca efectos, o en su lugar, de modo que si la persona revisora cambia la decisión cambia lo que le ocurre a la persona.",
    ),
    breakage: L(
      "With an agent in the chain the action is often complete before anyone appeals: a payment made, an account closed, a message sent. Review without reversal is not the human intervention the GDPR requires, nor the authority to change the decision that California requires.",
      "Con un agente en la cadena, la acción suele estar completa antes de que nadie recurra: un pago realizado, una cuenta cerrada, un mensaje enviado. Revisar sin poder revertir no es la intervención humana que exige el RGPD, ni la autoridad para cambiar la decisión que exige California.",
    ),
    provision: L(
      "Add a reversal procedure to the protocol, distinct from review: what can be undone, by whom, within what period, and what compensating step is taken where an action cannot be undone. State the deadline within which an agent-initiated action can still be reversed.",
      "Añada al protocolo un procedimiento de reversión, distinto de la revisión: qué puede deshacerse, quién puede hacerlo, en qué plazo y qué medida compensatoria se adopta cuando una acción no puede deshacerse. Indique el plazo dentro del cual sigue siendo posible revertir una acción iniciada por el agente.",
    ),
    citations: ["EU GDPR Art. 22(3)", "CA CCPA ADMT § 7221(b)(1)", "CO SB 26-189 CO-DEP-4"],
    evidencedBy: ["agt_killswitch", "rev_timing"],
  },
  {
    id: "traceability",
    requires: [],
    artifacts: ["assessment", "protocol"],
    severity: "breaks",
    title: L(
      "Records trace the output, not the action",
      "Los registros rastrean el resultado, no la acción",
    ),
    assumption: L(
      "Record-keeping captures the model's inputs and output, which is what an auditor or a reviewer needs to reconstruct the decision.",
      "El registro documenta las entradas y el resultado del modelo, que es lo que un auditor o una persona revisora necesita para reconstruir la decisión.",
    ),
    breakage: L(
      "The agent's chain sits between the output and the effect. Without a trace linking an action back to the decision, the model version and the data behind it, neither the Colorado three-year record nor the AI Act logging duty can answer the only question that matters after the fact: why did this happen to this person?",
      "La cadena del agente se sitúa entre el resultado y el efecto. Sin una traza que enlace la acción con la decisión, la versión del modelo y los datos que la sustentan, ni el registro trienal de Colorado ni el deber de registro del Reglamento de IA pueden responder a la única pregunta que importa después: ¿por qué le ocurrió esto a esta persona?",
    ),
    provision: L(
      "Log every agent-initiated action with the decision id, the model version, the input data reference and the authority under which the agent acted, and retain it for the longest applicable period.",
      "Registre cada acción iniciada por el agente con el identificador de la decisión, la versión del modelo, la referencia a los datos de entrada y la habilitación en virtud de la cual actuó el agente, y consérvelo durante el plazo aplicable más largo.",
    ),
    citations: ["EU AI Act Art. 12(1)", "CO SB 26-189 CO-REC-1"],
    evidencedBy: ["agt_traceability", "gov_records"],
  },
  {
    id: "co-principal-reasons",
    requires: ["co:deployer"],
    artifacts: ["notice", "protocol"],
    severity: "weakens",
    title: L(
      "The principal reasons belong to the agent, not the model",
      "Las razones principales son del agente, no del modelo",
    ),
    assumption: L(
      "After an adverse decision the deployer can state the principal reasons and the categories of personal data that drove it, because the model produced the decision.",
      "Tras una decisión desfavorable, el responsable del despliegue puede indicar las razones principales y las categorías de datos personales que la determinaron, porque el modelo produjo la decisión.",
    ),
    breakage: L(
      "If the agent selected among the model's options, weighed a policy or combined several outputs, the reasons the person receives must reflect the agent's reasoning too. A disclosure that explains only the score is incomplete and, worse, misleading about what actually decided.",
      "Si el agente eligió entre las opciones del modelo, ponderó una política o combinó varios resultados, las razones que recibe la persona deben reflejar también el razonamiento del agente. Una información que solo explica la puntuación es incompleta y, peor aún, engañosa sobre lo que realmente decidió.",
    ),
    provision: L(
      "Require the agent to record its own decisive factors at the moment it acts, in the same plain language the adverse-decision disclosure uses, and include them in that disclosure.",
      "Exija que el agente registre sus propios factores determinantes en el momento en que actúa, en el mismo lenguaje sencillo que emplea la información de decisión desfavorable, e inclúyalos en ella.",
    ),
    citations: ["CO SB 26-189 CO-DEP-3"],
    evidencedBy: ["agt_traceability", "dec_logic"],
  },
  {
    id: "oversight-interrupt",
    requires: ["eu:high-risk"],
    artifacts: ["assessment", "protocol"],
    severity: "breaks",
    title: L(
      "Oversight requires a stop the agent may not have",
      "La supervisión exige una parada que el agente puede no tener",
    ),
    assumption: L(
      "Human oversight means a person can monitor the system, decide not to use its output, and intervene or interrupt it.",
      "La supervisión humana significa que una persona puede vigilar el sistema, decidir no usar su resultado e intervenir o interrumpirlo.",
    ),
    breakage: L(
      "An agent running asynchronously, in a queue or across sessions may have no point at which a person can interrupt it, and actions already dispatched may be beyond recall. Oversight that exists only in the interface is not oversight of the agent.",
      "Un agente que se ejecuta de forma asíncrona, en una cola o a lo largo de varias sesiones puede no ofrecer ningún punto en el que una persona pueda interrumpirlo, y las acciones ya emitidas pueden ser irrecuperables. La supervisión que solo existe en la interfaz no es supervisión del agente.",
    ),
    provision: L(
      "Document a stop control: who can halt the agent, how quickly it takes effect, what happens to actions in flight, and how the halt is tested. Name the person accountable for exercising it.",
      "Documente un control de parada: quién puede detener al agente, con qué rapidez surte efecto, qué ocurre con las acciones en curso y cómo se prueba esa parada. Identifique a la persona responsable de ejercerlo.",
    ),
    citations: ["EU AI Act Art. 14(4)", "EU AI Act Art. 14(1)"],
    evidencedBy: ["agt_killswitch"],
  },
  {
    id: "supply-chain-reach",
    requires: [],
    artifacts: ["assessment"],
    severity: "weakens",
    title: L(
      "The agent reaches further than the contract does",
      "El agente llega más lejos que el contrato",
    ),
    assumption: L(
      "The processing contract and the vendor assessment cover the model provider and its known subprocessors.",
      "El contrato de tratamiento y la evaluación del proveedor cubren al proveedor del modelo y a sus subencargados conocidos.",
    ),
    breakage: L(
      "An agent with tool access can call services nobody assessed: a search API, a messaging provider, a second model, a customer system. Each may receive personal data under no contract, and some sit outside the transfer safeguards you documented.",
      "Un agente con acceso a herramientas puede llamar a servicios que nadie evaluó: una API de búsqueda, un proveedor de mensajería, un segundo modelo, un sistema de clientes. Cada uno puede recibir datos personales sin contrato alguno, y algunos quedan fuera de las garantías de transferencia que documentó.",
    ),
    provision: L(
      "Enumerate the tools and services the agent may call, restrict it to that list, and bring each within the processing contract and the transfer analysis before it is enabled.",
      "Enumere las herramientas y servicios a los que el agente puede llamar, restrínjalo a esa lista e incorpore cada uno al contrato de tratamiento y al análisis de transferencias antes de habilitarlo.",
    ),
    citations: ["EU GDPR Art. 28", "EU GDPR Art. 44", "EU AI Act Art. 26(1)"],
    evidencedBy: ["agt_downstream_vendors"],
  },
  {
    id: "tx-intent",
    requires: ["tx:core"],
    artifacts: ["assessment"],
    severity: "watch",
    title: L(
      "Intent-based prohibitions meet an actor with no intent",
      "Prohibiciones basadas en la intención frente a un actor sin intención",
    ),
    assumption: L(
      "The Texas prohibitions turn on whether a person developed or deployed the system with the intent to manipulate, discriminate or infringe rights.",
      "Las prohibiciones de Texas dependen de si una persona desarrolló o desplegó el sistema con la intención de manipular, discriminar o vulnerar derechos.",
    ),
    breakage: L(
      "An agent that discovers a prohibited route to its objective raises an unsettled question: whose intent counts. The safe reading is that the intent examined is that of the party who gave the agent an objective and an unconstrained action space.",
      "Un agente que descubre una vía prohibida para alcanzar su objetivo plantea una cuestión no resuelta: de quién es la intención relevante. La lectura prudente es que se examina la intención de quien fijó al agente un objetivo y un espacio de acción sin restricciones.",
    ),
    provision: L(
      "Constrain the agent's action space explicitly against the prohibited categories, and record that constraint as part of the design rationale. An unconstrained objective is the fact a regulator will read as intent.",
      "Restrinja de forma expresa el espacio de acción del agente frente a las categorías prohibidas y documente esa restricción como parte de la justificación del diseño. Un objetivo sin restricciones es el hecho que un regulador leerá como intención.",
    ),
    citations: ["TX TRAIGA § 552.052", "TX TRAIGA § 552.056"],
    evidencedBy: ["risk_prohibited", "agt_handoff"],
  },
  {
    id: "wa-crisis-handoff",
    requires: ["wa:companion"],
    artifacts: ["notice", "protocol"],
    severity: "breaks",
    title: L(
      "The crisis protocol does not travel with the handoff",
      "El protocolo de crisis no acompaña a la delegación",
    ),
    assumption: L(
      "The companion detects expressions of suicidal ideation or self-harm and responds with crisis resources instead of continuing the conversation.",
      "El acompañante detecta expresiones de ideación suicida o autolesión y responde con recursos de crisis en lugar de continuar la conversación.",
    ),
    breakage: L(
      "If the conversation is handed to another agent, model or channel, the detection and the protocol must follow it. A handoff that drops the safety layer is the failure mode this statute exists to prevent, and it carries a private right of action.",
      "Si la conversación se transfiere a otro agente, modelo o canal, la detección y el protocolo deben acompañarla. Una transferencia que pierde la capa de seguridad es precisamente el fallo que esta ley pretende evitar, y lleva aparejada una acción privada.",
    ),
    provision: L(
      "Require the crisis-detection layer and the published protocol to apply to every agent and channel in the chain, and test the handoff against the protocol before enabling it.",
      "Exija que la capa de detección de crisis y el protocolo publicado se apliquen a todos los agentes y canales de la cadena, y pruebe la transferencia frente al protocolo antes de habilitarla.",
    ),
    citations: ["WA HB 2225 § 4", "WA HB 2225 § 5"],
    evidencedBy: ["not_companion", "agt_handoff"],
  },
  {
    id: "dpia-review-trigger",
    requires: ["gdpr:dpia"],
    artifacts: ["assessment"],
    severity: "weakens",
    title: L(
      "Adding the agent is itself a change of risk",
      "Añadir el agente es en sí mismo un cambio de riesgo",
    ),
    assumption: L(
      "The impact assessment reflects the processing as assessed, and is reviewed when the risk changes.",
      "La evaluación de impacto refleja el tratamiento evaluado y se revisa cuando cambia el riesgo.",
    ),
    breakage: L(
      "Introducing an autonomous agent changes the nature, scope and context of the processing, not merely its scale. An assessment that predates the agent no longer describes the processing it is supposed to cover.",
      "Introducir un agente autónomo cambia la naturaleza, el alcance y el contexto del tratamiento, no solo su escala. Una evaluación anterior al agente ya no describe el tratamiento que se supone que cubre.",
    ),
    provision: L(
      "Re-run and re-date the assessment when an agent is added or its authority widens, and record the agent change as the trigger.",
      "Rehaga y vuelva a fechar la evaluación cuando se añada un agente o se amplíe su autoridad, y deje constancia del cambio del agente como desencadenante.",
    ),
    citations: ["EU GDPR Art. 35(11)"],
    evidencedBy: ["gov_review"],
  },
];

export interface StressTestResult {
  applicable: AgenticFinding[];
  /** Findings grouped by the artifact they break. */
  byArtifact: Record<BreakingArtifact, AgenticFinding[]>;
  counts: { breaks: number; weakens: number; watch: number };
}

/**
 * The findings that apply to one system. `agentic` must be among the tags:
 * without a handoff there is nothing to stress.
 */
export function runAgenticStressTest(overlayTags: readonly string[]): StressTestResult {
  const active = new Set(overlayTags);
  const empty: StressTestResult = {
    applicable: [],
    byArtifact: { assessment: [], notice: [], protocol: [] },
    counts: { breaks: 0, weakens: 0, watch: 0 },
  };
  if (!active.has("agentic")) return empty;

  const applicable = AGENTIC_FINDINGS.filter((f) => f.requires.every((tag) => active.has(tag)));
  const byArtifact: Record<BreakingArtifact, AgenticFinding[]> = {
    assessment: applicable.filter((f) => f.artifacts.includes("assessment")),
    notice: applicable.filter((f) => f.artifacts.includes("notice")),
    protocol: applicable.filter((f) => f.artifacts.includes("protocol")),
  };
  return {
    applicable,
    byArtifact,
    counts: {
      breaks: applicable.filter((f) => f.severity === "breaks").length,
      weakens: applicable.filter((f) => f.severity === "weakens").length,
      watch: applicable.filter((f) => f.severity === "watch").length,
    },
  };
}
