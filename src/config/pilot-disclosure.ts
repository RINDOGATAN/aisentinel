// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What we are, said before anyone trusts us with anything.
 *
 * The hosted instance is a free pilot on our own servers. Before a person puts
 * work into it they are told five things, once, and the acknowledgement is
 * recorded with its date. The same five points are published in the
 * documentation (/docs/pilot) so nobody has to remember a pop-up, and both
 * surfaces read them from this file: the wording cannot drift between the
 * screen someone acknowledged and the page they can go back to.
 *
 * What this file must never say: that we hold a certification, that anything
 * here is "enterprise grade", or anything else we cannot evidence. The value
 * of the disclosure is that it is true and short.
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
export const DISCLOSURE_VERSION = "1.0.0";

/** The day the wording below was last reviewed. */
export const DISCLOSURE_REVIEWED_AS_OF = "2026-09-19";

export interface DisclosurePoint {
  /** Stable id: what an acknowledgement, a test or a docs anchor refers to. */
  id: string;
  text: Record<PilotLocale, string>;
}

/**
 * The five points, in the order they are read. Castilian, "tú", no long dashes.
 */
export const DISCLOSURE_POINTS: readonly DisclosurePoint[] = [
  {
    id: "free-pilot",
    text: {
      en: "This is a free pilot running on our servers. We may change it or take it down, and we do not promise it will be available.",
      es: "Esto es un piloto gratuito que funciona en nuestros servidores. Podemos cambiarlo o retirarlo, y no prometemos que esté disponible.",
    },
  },
  {
    id: "no-certifications",
    text: {
      en: "We do not hold the usual security certifications for it. There is no ISO 27001 and no SOC 2 report covering this service.",
      es: "No disponemos de las certificaciones de seguridad habituales para este servicio. No hay ISO 27001 ni informe SOC 2 que lo cubra.",
    },
  },
  {
    id: "no-real-data",
    text: {
      en: "Do not put real client matter or personal data in it. Use invented names, invented figures and invented documents.",
      es: "No introduzcas asuntos reales de clientes ni datos personales. Utiliza nombres, cifras y documentos inventados.",
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
      en: "You can delete the account and everything in it from Settings, and it is really deleted: the records are removed from the database, not hidden.",
      es: "Puedes eliminar la cuenta y todo su contenido desde Configuración, y se elimina de verdad: los registros se borran de la base de datos, no se ocultan.",
    },
  },
] as const;

/** Heading and the one action, for the screen and for the docs page. */
export const DISCLOSURE_CHROME: Record<
  PilotLocale,
  { title: string; lead: string; acknowledge: string; acknowledgedOn: string; docsLink: string }
> = {
  en: {
    title: "Before you start: what this is",
    lead: "Five things about the hosted pilot. Read them once, then get on with the work.",
    acknowledge: "I have read this",
    acknowledgedOn: "Acknowledged on",
    docsLink: "This wording is also published in the documentation.",
  },
  es: {
    title: "Antes de empezar: qué es esto",
    lead: "Cinco cosas sobre el piloto alojado. Léelas una vez y sigue con tu trabajo.",
    acknowledge: "Lo he leído",
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
