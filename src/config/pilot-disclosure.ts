// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * RETIRED. The hosted pilot no longer shows an opening statement, and nothing
 * in the application renders or asks for this wording any more.
 *
 * It is kept as the record of what earlier acknowledgements refer to: each row
 * of `pilot_disclosure_acknowledgements` stores the version a person read
 * (DISCLOSURE_VERSION below) with its date and language, and those rows are
 * kept. This file is the wording of that version, word for word, so a stored
 * acknowledgement can still be read against what was shown.
 *
 * Do not import this module from a screen, a page or a router. A test checks
 * that only tests import it.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

import type { PilotLocale } from "./pilot";

/** The version stored on every acknowledgement row: the only version ever shown. */
export const DISCLOSURE_VERSION = "1.0.0";

/** The day the wording below was last reviewed, while it was shown. */
export const DISCLOSURE_REVIEWED_AS_OF = "2026-09-19";

export interface DisclosurePoint {
  /** Stable id: what an acknowledgement, a test or a docs anchor refers to. */
  id: string;
  text: Record<PilotLocale, string>;
}

/** The five points of version 1.0.0, in the order they were shown. */
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

/** The points of the recorded version as plain lines (for an export of the record, or a test). */
export function disclosureLines(locale: PilotLocale): string[] {
  return DISCLOSURE_POINTS.map((point) => point.text[locale]);
}
