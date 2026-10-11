// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What we are, said before anyone trusts us with anything.
 *
 * The hosted instance is a free pilot on the TODO.LAW cloud. Before a person
 * puts work into it they are told five things, once, and accept the data
 * processing agreement that covers the pilot; the acknowledgement is recorded
 * with its date and the version read. The same five points and the agreement
 * line are published in the documentation (/docs/pilot) so nobody has to
 * remember a pop-up, and both surfaces read them from this file: the wording
 * cannot drift between the screen someone acknowledged and the page they can
 * go back to.
 *
 * Version 2.0.0 (owner's decisions of 11 Oct 2026, DRAFT until approved): the
 * certifications point now names our sub-processors' certifications and links
 * to their list; real data is allowed, with the cases that call for a managed
 * instance or the customer's own hardware; the pilot says it has no service
 * level agreement; deletion says what minimal record survives; and the
 * acknowledgement also accepts the data processing agreement (DISCLOSURE_DPA),
 * so the stored version 2.0.0 is the record of accepting DPA 1.1.
 *
 * What this file must never say: that Rindogatan itself holds a certification
 * (the certifications cited are the sub-processors', with each one on the
 * published list), that anything here is "enterprise grade", or anything else
 * we cannot evidence. The value of the disclosure is that it is true and short.
 *
 * Pure leaf module: no Prisma, no Next, no React. Bumping DISCLOSURE_VERSION
 * means the wording changed materially, and every account is asked again.
 */

import type { PilotLocale } from "./pilot";

/**
 * Bump ONLY when the meaning changes. An acknowledgement is stored against the
 * version acknowledged, so a bump asks everyone again and the old record still
 * says exactly what that person agreed to.
 */
export const DISCLOSURE_VERSION = "2.0.0";

/** The day the wording below was last reviewed. */
export const DISCLOSURE_REVIEWED_AS_OF = "2026-10-11";

/**
 * The data processing agreement accepted with this disclosure version. The
 * acknowledgement row stores DISCLOSURE_VERSION; this constant, kept in the
 * same versioned file, says which agreement that version accepted. Change the
 * agreement version only together with a DISCLOSURE_VERSION bump.
 */
export const DISCLOSURE_DPA = {
  version: "1.1",
  href: {
    en: "https://www.todo.law/legal/eu-cloud-plan-dpa",
    es: "https://www.todo.law/es/legal/encargo-tratamiento-plan-nube-ue",
  },
} as const satisfies { version: string; href: Record<PilotLocale, string> };

/** The published sub-processor list, with each one's certifications. */
export const SUBPROCESSORS_URL: Record<PilotLocale, string> = {
  en: "https://www.todo.law/legal/eu-cloud-plan-subprocessors",
  es: "https://www.todo.law/es/legal/subencargados-plan-nube-ue",
};

export interface DisclosurePoint {
  /** Stable id: what an acknowledgement, a test or a docs anchor refers to. */
  id: string;
  text: Record<PilotLocale, string>;
  /**
   * A link inside the text: `label` appears verbatim in the text and is shown
   * as a link to `href`.
   */
  link?: Record<PilotLocale, { label: string; href: string }>;
}

/**
 * The five points, in the order they are read. Castilian, "tú", no long dashes.
 */
export const DISCLOSURE_POINTS: readonly DisclosurePoint[] = [
  {
    id: "free-pilot",
    text: {
      en: "This is a free pilot on the TODO.LAW cloud, with the limits set out in the documentation. It has no service level agreement; a managed instance can have one.",
      es: "Esto es un piloto gratuito en la nube de TODO.LAW, con los límites que figuran en la documentación. No tiene acuerdo de nivel de servicio; una instancia gestionada puede tenerlo.",
    },
  },
  {
    id: "certified-subprocessors",
    text: {
      en: "The cloud runs on sub-processors that hold ISO 27001 and SOC 2 Type II certifications. The list, with each one's certifications, is published at todo.law/legal/eu-cloud-plan-subprocessors.",
      es: "La nube funciona con subencargados que tienen certificaciones ISO 27001 y SOC 2 Tipo II. La lista, con las certificaciones de cada uno, está publicada en todo.law/es/legal/subencargados-plan-nube-ue.",
    },
    link: {
      en: { label: "todo.law/legal/eu-cloud-plan-subprocessors", href: SUBPROCESSORS_URL.en },
      es: { label: "todo.law/es/legal/subencargados-plan-nube-ue", href: SUBPROCESSORS_URL.es },
    },
  },
  {
    id: "real-data",
    text: {
      en: "You may use real data. For special-category data or privileged information, or if your own controls must cover the system, choose a managed instance or your own hardware.",
      es: "Puedes usar datos reales. Para datos de categorías especiales o información sujeta a secreto profesional, o si tus propios controles deben cubrir el sistema, elige una instancia gestionada o tu propio hardware.",
    },
  },
  {
    id: "export-anytime",
    text: {
      en: "You can export your work at any time, in full, from the program pack in Settings or from any module.",
      es: "Puedes exportar tu trabajo en cualquier momento y en su totalidad, desde el paquete del programa en Configuración o desde cualquier módulo.",
    },
  },
  {
    id: "real-deletion",
    text: {
      en: "You can delete the organization and everything in it from Settings, and it is really deleted: your content and records are removed from the database, not hidden. Only a minimal audit record (who deleted it and when, without content) is kept, for the period the General Terms state.",
      es: "Puedes eliminar la organización y todo su contenido desde Configuración, y se elimina de verdad: tu contenido y tus registros se borran de la base de datos, no se ocultan. Solo se conserva un registro de auditoría mínimo (quién la eliminó y cuándo, sin contenido), durante el plazo que fijan las Condiciones Generales.",
    },
  },
] as const;

/** Heading, the agreement line and the one action, for the screen and for the docs page. */
export const DISCLOSURE_CHROME: Record<
  PilotLocale,
  {
    title: string;
    lead: string;
    dpa: string;
    dpaLinkLabel: string;
    acknowledge: string;
    acknowledgedOn: string;
    docsLink: string;
  }
> = {
  en: {
    title: "Before you start: what this is",
    lead: "Five things about the hosted pilot. Read them once, then get on with the work.",
    dpa: "The data processing agreement applies to this pilot, with its list of sub-processors. By continuing you accept it for your organization.",
    dpaLinkLabel: "data processing agreement",
    acknowledge: "I have read this and accept the agreement",
    acknowledgedOn: "Acknowledged on",
    docsLink: "This wording is also published in the documentation.",
  },
  es: {
    title: "Antes de empezar: qué es esto",
    lead: "Cinco cosas sobre el piloto alojado. Léelas una vez y sigue con tu trabajo.",
    dpa: "A este piloto se aplica el contrato de encargo del tratamiento, con su lista de subencargados. Al continuar lo aceptas en nombre de tu organización.",
    dpaLinkLabel: "contrato de encargo del tratamiento",
    acknowledge: "Lo he leído y acepto el contrato",
    acknowledgedOn: "Aceptado el",
    docsLink: "Este texto también está publicado en la documentación.",
  },
};

/** Where the same wording is published. */
export const DISCLOSURE_DOCS_PATH = "/docs/pilot";

/** The points as plain lines, for a text surface (an export, a log, a test). */
export function disclosureLines(locale: PilotLocale): string[] {
  return DISCLOSURE_POINTS.map((point) => point.text[locale]);
}
