// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What a system's autonomy means for its governance.
 *
 * The agentic layer used to turn on a single yes-or-no screening answer. That
 * was enough to run the stress test but not to answer the questions the stress
 * test raises: who can stop it, what can it reach, how long can an action be
 * undone. This module reads the agent profile instead and says three things:
 * whether the agentic overlay applies, which controls are missing, and which
 * of the stress-test provisions are already evidenced.
 *
 * The screening answer is still honoured where no profile exists, so nothing
 * that was in scope yesterday falls out of scope today. Pure.
 */

import type { Localized } from "@/config/lawfirm-ai-toolkit";

export const AGENT_RULES_VERSION = "2026.09.1";

export type AgentAutonomyValue =
  | "NOT_ASSESSED"
  | "NONE"
  | "SUGGESTS"
  | "ACTS_WITH_APPROVAL"
  | "ACTS_AUTONOMOUSLY";

export const AGENT_AUTONOMY_VALUES: AgentAutonomyValue[] = [
  "NOT_ASSESSED",
  "NONE",
  "SUGGESTS",
  "ACTS_WITH_APPROVAL",
  "ACTS_AUTONOMOUSLY",
];

export const AUTONOMY_LABELS: Record<AgentAutonomyValue, Localized> = {
  NOT_ASSESSED: { en: "Not answered", es: "Sin responder" },
  NONE: {
    en: "Produces an output a person acts on",
    es: "Produce un resultado sobre el que actúa una persona",
  },
  SUGGESTS: {
    en: "Proposes an action; a person carries it out",
    es: "Propone una acción; la ejecuta una persona",
  },
  ACTS_WITH_APPROVAL: {
    en: "Acts itself, after explicit approval",
    es: "Actúa por sí mismo, tras aprobación expresa",
  },
  ACTS_AUTONOMOUSLY: {
    en: "Acts with no person in the loop",
    es: "Actúa sin intervención de una persona",
  },
};

export const AUTONOMY_HELP: Record<AgentAutonomyValue, Localized> = {
  NOT_ASSESSED: {
    en: "Nobody has answered. The agentic analysis will not run until someone does.",
    es: "Nadie ha respondido. El análisis agéntico no se ejecutará hasta que alguien lo haga.",
  },
  NONE: {
    en: "The ordinary case the regimes were written for: the system scores, ranks or drafts, and a person decides what happens next.",
    es: "El caso ordinario para el que se escribieron los regímenes: el sistema puntúa, ordena o redacta, y una persona decide qué ocurre después.",
  },
  SUGGESTS: {
    en: "The system proposes, but nothing reaches the person affected until someone acts on it. The decision boundary is still the human step.",
    es: "El sistema propone, pero nada llega a la persona afectada hasta que alguien actúa. La frontera de la decisión sigue siendo el paso humano.",
  },
  ACTS_WITH_APPROVAL: {
    en: "The agent executes, but only once approved. The approval is what keeps the decision out of the solely-automated category, so it has to be real and recorded.",
    es: "El agente ejecuta, pero solo una vez aprobado. Esa aprobación es lo que mantiene la decisión fuera de la categoría de únicamente automatizada, así que debe ser real y quedar registrada.",
  },
  ACTS_AUTONOMOUSLY: {
    en: "The agent acts on its own. The decision the person experiences is the agent's action, and every artifact needs the agentic provisions.",
    es: "El agente actúa por su cuenta. La decisión que experimenta la persona es la acción del agente, y todos los documentos necesitan las disposiciones agénticas.",
  },
};

/** An autonomy level at or above which the agentic overlay applies. */
export function autonomyIsAgentic(autonomy: string | null | undefined): boolean {
  return autonomy === "ACTS_WITH_APPROVAL" || autonomy === "ACTS_AUTONOMOUSLY";
}

export interface AgentProfileFacts {
  autonomy: AgentAutonomyValue;
  actionScope: string | null;
  downstreamAgents: string | null;
  tools: readonly string[];
  humanSponsor: string | null;
  killSwitch: string | null;
  killSwitchTestedAt: Date | string | null;
  reversalWindow: string | null;
  traceability: string | null;
}

export const EMPTY_AGENT_FACTS: AgentProfileFacts = {
  autonomy: "NOT_ASSESSED",
  actionScope: null,
  downstreamAgents: null,
  tools: [],
  humanSponsor: null,
  killSwitch: null,
  killSwitchTestedAt: null,
  reversalWindow: null,
  traceability: null,
};

/** Controls a system that acts on its own is expected to have recorded. */
export type AgentControl =
  | "actionScope"
  | "humanSponsor"
  | "killSwitch"
  | "killSwitchTested"
  | "reversalWindow"
  | "traceability"
  | "tools";

export const AGENT_CONTROL_LABELS: Record<AgentControl, Localized> = {
  actionScope: {
    en: "The bounded scope of what it may do without a person",
    es: "El ámbito acotado de lo que puede hacer sin una persona",
  },
  humanSponsor: {
    en: "A named person accountable for its actions",
    es: "Una persona identificada como responsable de sus acciones",
  },
  killSwitch: {
    en: "Who can stop it, how quickly, and what happens to actions in flight",
    es: "Quién puede detenerlo, con qué rapidez y qué ocurre con las acciones en curso",
  },
  killSwitchTested: {
    en: "A date on which stopping it was actually exercised",
    es: "Una fecha en la que la parada se haya ejercido realmente",
  },
  reversalWindow: {
    en: "How long an action it took can still be reversed",
    es: "Durante cuánto tiempo puede revertirse una acción que haya realizado",
  },
  traceability: {
    en: "How an action traces back to the decision, model version and data",
    es: "Cómo se rastrea una acción hasta la decisión, la versión del modelo y los datos",
  },
  tools: {
    en: "The tools and services it may call",
    es: "Las herramientas y servicios a los que puede llamar",
  },
};

function has(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

export interface AgentAssessment {
  /** True when the agentic overlay and stress test apply. */
  isAgentic: boolean;
  /** Nobody has answered the autonomy question yet. */
  undetermined: boolean;
  /** Controls expected at this autonomy level that are not recorded. */
  missing: AgentControl[];
  /** Controls that are recorded, so the stress test can credit them. */
  recorded: AgentControl[];
}

/**
 * Which controls a profile is expected to carry.
 *
 * An agent that only proposes still needs a named sponsor and a bounded scope,
 * because the proposal reaches a person who will act on it. Everything else
 * becomes expected once the agent can act by itself. Testing the stop control
 * is asked only of a fully autonomous agent: that is where an untested claim
 * does the most damage.
 */
function expectedControls(autonomy: AgentAutonomyValue): AgentControl[] {
  switch (autonomy) {
    case "ACTS_AUTONOMOUSLY":
      return [
        "actionScope",
        "humanSponsor",
        "killSwitch",
        "killSwitchTested",
        "reversalWindow",
        "traceability",
        "tools",
      ];
    case "ACTS_WITH_APPROVAL":
      return ["actionScope", "humanSponsor", "killSwitch", "traceability", "tools"];
    case "SUGGESTS":
      return ["actionScope", "humanSponsor"];
    default:
      return [];
  }
}

export function assessAgent(facts: AgentProfileFacts): AgentAssessment {
  const expected = expectedControls(facts.autonomy);
  const present = (control: AgentControl): boolean => {
    switch (control) {
      case "actionScope":
        return has(facts.actionScope);
      case "humanSponsor":
        return has(facts.humanSponsor);
      case "killSwitch":
        return has(facts.killSwitch);
      case "killSwitchTested":
        return facts.killSwitchTestedAt != null;
      case "reversalWindow":
        return has(facts.reversalWindow);
      case "traceability":
        return has(facts.traceability);
      case "tools":
        return facts.tools.length > 0;
    }
  };
  return {
    isAgentic: autonomyIsAgentic(facts.autonomy),
    undetermined: facts.autonomy === "NOT_ASSESSED",
    missing: expected.filter((c) => !present(c)),
    recorded: expected.filter(present),
  };
}
