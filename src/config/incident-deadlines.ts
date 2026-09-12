// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Statutory clocks for an AI incident.
 *
 * The product recorded a due date that a person typed in. The deadlines that
 * matter are fixed by law and run from the moment of awareness, and the ones
 * that are missed are missed because nobody computed them on the day.
 *
 * Verified against the consolidated texts on 2026-09-11:
 *
 * - **EU AI Act Art. 73** (providers of high-risk systems): report to the
 *   market surveillance authorities of the Member State where the incident
 *   occurred, immediately after establishing a causal link or its reasonable
 *   likelihood, and in any event **not later than 15 days** after becoming
 *   aware. **Two days** for a widespread infringement or a serious incident
 *   under Art. 3(49)(b) (a serious and irreversible disruption of the
 *   management or operation of critical infrastructure). **Ten days** where a
 *   person has died. An incomplete initial report may be completed later
 *   (Art. 73(5)). Where the AI Office is exclusively competent under the
 *   amended Art. 75(1), the report goes to the AI Office instead.
 * - **EU AI Act Art. 26(5)** (deployers): inform the provider immediately, then
 *   the importer or distributor and the market surveillance authorities. No
 *   number is given, so it is shown as immediate rather than invented.
 * - **GDPR Art. 33**: notify the supervisory authority without undue delay and,
 *   where feasible, **within 72 hours** of becoming aware, unless the breach is
 *   unlikely to result in a risk. **Art. 34**: inform the people affected
 *   without undue delay where the risk is high.
 *
 * Dates are calendar days, as the instruments state them. The clocks are
 * advisory: they compute from the facts recorded, and the facts are recorded by
 * a person who may not yet know everything.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

export const INCIDENT_DEADLINES_VERSION = "2026.09.1";
export const INCIDENT_DEADLINES_LAW_REVIEWED_AS_OF = "2026-09-11";

export type Localized = { en: string; es: string };

export interface IncidentFacts {
  /** When the organisation became aware. Usually the reported date. */
  awareAt: Date;
  /** Does the organisation act as provider, deployer, or is it undeclared? */
  role: "PROVIDER" | "DEPLOYER" | "OTHER";
  /** Is the system high-risk under the EU AI Act? */
  euHighRisk: boolean;
  /** Did a person die? */
  death?: boolean;
  /** A widespread infringement, or a serious and irreversible disruption of
   *  the management or operation of critical infrastructure. */
  widespreadOrCriticalInfrastructure?: boolean;
  /** Does the incident involve personal data (a breach under the GDPR)? */
  personalDataBreach?: boolean;
  /** Is the risk to people high (which triggers telling them as well)? */
  highRiskToIndividuals?: boolean;
  /** Is the AI Office exclusively competent (amended Art. 75(1))? */
  aiOfficeCompetent?: boolean;
  /** Which jurisdictions the organisation operates in. */
  jurisdictions: string[];
}

export interface ComputedDeadline {
  id: string;
  label: Localized;
  /** Who the report goes to. */
  recipient: Localized;
  /** The provision, exactly as it should be cited. */
  citation: string;
  /** Null where the law says "immediately" without a number. */
  dueAt: Date | null;
  /** How the date was derived, so a reader can check it. */
  basis: Localized;
  /** immediate: act now; hours/days: a computed date. */
  kind: "immediate" | "computed";
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function plusDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY);
}

function inEu(jurisdictions: string[]): boolean {
  return jurisdictions.some((j) => j === "EU" || j === "EEA");
}

/**
 * The deadlines that follow from these facts. Returns an empty list rather
 * than guessing where the facts do not support a clock: an invented deadline is
 * worse than none, because it is relied on.
 */
export function computeIncidentDeadlines(facts: IncidentFacts): ComputedDeadline[] {
  const out: ComputedDeadline[] = [];
  const euScope = inEu(facts.jurisdictions);

  if (euScope && facts.euHighRisk && facts.role === "PROVIDER") {
    const aiOffice = facts.aiOfficeCompetent === true;
    const recipient: Localized = aiOffice
      ? {
          en: "The AI Office (exclusively competent under Art. 75(1) as amended)",
          es: "La Oficina de IA (competencia exclusiva conforme al art. 75, apartado 1, en su versión modificada)",
        }
      : {
          en: "The market surveillance authority of the Member State where the incident occurred",
          es: "La autoridad de vigilancia del mercado del Estado miembro en el que se produjo el incidente",
        };

    if (facts.widespreadOrCriticalInfrastructure) {
      out.push({
        id: "eu-ai-act-73-2day",
        label: {
          en: "Serious incident report: two days",
          es: "Notificación de incidente grave: dos días",
        },
        recipient,
        citation: "Reg. (EU) 2024/1689, Art. 73(3)",
        dueAt: plusDays(facts.awareAt, 2),
        basis: {
          en: "Widespread infringement, or a serious and irreversible disruption of the management or operation of critical infrastructure: immediately, and not later than two days after becoming aware.",
          es: "Infracción generalizada, o perturbación grave e irreversible de la gestión o el funcionamiento de infraestructuras críticas: de inmediato y, a más tardar, dos días después de tener conocimiento.",
        },
        kind: "computed",
      });
    } else if (facts.death) {
      out.push({
        id: "eu-ai-act-73-10day",
        label: {
          en: "Serious incident report: ten days",
          es: "Notificación de incidente grave: diez días",
        },
        recipient,
        citation: "Reg. (EU) 2024/1689, Art. 73(4)",
        dueAt: plusDays(facts.awareAt, 10),
        basis: {
          en: "Death of a person: immediately after establishing or suspecting a causal relationship, and not later than ten days after becoming aware.",
          es: "Fallecimiento de una persona: inmediatamente después de establecer o sospechar una relación causal y, a más tardar, diez días después de tener conocimiento.",
        },
        kind: "computed",
      });
    } else {
      out.push({
        id: "eu-ai-act-73-15day",
        label: {
          en: "Serious incident report: fifteen days",
          es: "Notificación de incidente grave: quince días",
        },
        recipient,
        citation: "Reg. (EU) 2024/1689, Art. 73(2)",
        dueAt: plusDays(facts.awareAt, 15),
        basis: {
          en: "Immediately after establishing a causal link or its reasonable likelihood, and in any event not later than fifteen days after becoming aware. An incomplete initial report may be sent and completed afterwards (Art. 73(5)).",
          es: "Inmediatamente después de establecer un vínculo causal o su probabilidad razonable y, en todo caso, a más tardar quince días después de tener conocimiento. Puede enviarse un informe inicial incompleto y completarlo después (art. 73, apartado 5).",
        },
        kind: "computed",
      });
    }
  }

  if (euScope && facts.euHighRisk && facts.role === "DEPLOYER") {
    out.push({
      id: "eu-ai-act-26-5",
      label: {
        en: "Inform the provider, then the importer or distributor and the authority",
        es: "Informar al proveedor y, después, al importador o distribuidor y a la autoridad",
      },
      recipient: {
        en: "First the provider; then the importer or distributor and the relevant market surveillance authorities",
        es: "Primero el proveedor; después el importador o distribuidor y las autoridades de vigilancia del mercado pertinentes",
      },
      citation: "Reg. (EU) 2024/1689, Art. 26(5)",
      dueAt: null,
      basis: {
        en: "A deployer that identifies a serious incident must inform immediately; no period is stated. If the provider cannot be reached, Art. 73 applies to the deployer.",
        es: "El responsable del despliegue que detecte un incidente grave debe informar de inmediato; no se fija un plazo. Si no puede contactar con el proveedor, se le aplica el art. 73.",
      },
      kind: "immediate",
    });
  }

  if (euScope && facts.personalDataBreach) {
    out.push({
      id: "gdpr-33",
      label: {
        en: "Personal data breach: 72 hours",
        es: "Violación de datos personales: 72 horas",
      },
      recipient: {
        en: "The competent supervisory authority",
        es: "La autoridad de control competente",
      },
      citation: "Reg. (EU) 2016/679, Art. 33(1)",
      dueAt: new Date(facts.awareAt.getTime() + 72 * HOUR),
      basis: {
        en: "Without undue delay and, where feasible, not later than 72 hours after becoming aware, unless the breach is unlikely to result in a risk to people's rights and freedoms. A later notification must explain the delay.",
        es: "Sin dilación indebida y, de ser posible, a más tardar 72 horas después de tener constancia, salvo que sea improbable que constituya un riesgo para los derechos y libertades. Una notificación posterior debe explicar el retraso.",
      },
      kind: "computed",
    });

    if (facts.highRiskToIndividuals) {
      out.push({
        id: "gdpr-34",
        label: {
          en: "Tell the people affected",
          es: "Comunicarlo a las personas afectadas",
        },
        recipient: { en: "The people affected", es: "Las personas afectadas" },
        citation: "Reg. (EU) 2016/679, Art. 34(1)",
        dueAt: null,
        basis: {
          en: "Where the breach is likely to result in a high risk to their rights and freedoms, without undue delay. No period is stated.",
          es: "Cuando sea probable que entrañe un alto riesgo para sus derechos y libertades, sin dilación indebida. No se fija un plazo.",
        },
        kind: "immediate",
      });
    }
  }

  return out;
}

/** How a deadline stands right now. */
export type DeadlineState = "immediate" | "due-soon" | "overdue" | "open";

export function deadlineState(
  deadline: ComputedDeadline,
  now: Date,
  soonHours = 24,
): DeadlineState {
  if (!deadline.dueAt) return "immediate";
  const remaining = deadline.dueAt.getTime() - now.getTime();
  if (remaining < 0) return "overdue";
  if (remaining <= soonHours * HOUR) return "due-soon";
  return "open";
}

/**
 * Incident types that ordinarily involve personal data, used to pre-fill the
 * breach question rather than to answer it. The person reporting decides.
 */
export function suggestsPersonalDataBreach(incidentType: string): boolean {
  return ["UNAUTHORIZED_ACCESS", "PRIVACY_VIOLATION", "DATA_POISONING"].includes(incidentType);
}
