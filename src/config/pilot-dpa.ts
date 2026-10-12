// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The data processing agreement a hosted pilot organization accepts when it is
 * opened.
 *
 * The storefront's agreement (version 1.1) covers the free pilot, and it is
 * accepted when the pilot organization is opened. The first-run screen asks for
 * it with a checkbox; the server refuses to open an organization on the hosted
 * pilot without it and records the acceptance as an audit-log entry on the new
 * organization (action PILOT_DPA_ACTION, with the version, the language shown
 * and the document; the entry's own date and user say when and who). No column
 * is added for it. Off the hosted pilot (the kit) it is never asked: there we
 * are not the processor.
 *
 * Change `version` only when a new agreement is published; organizations
 * opened earlier keep the entry for the version they accepted.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

import type { PilotLocale } from "./pilot";

export const PILOT_DPA = {
  version: "1.1",
  href: {
    en: "https://www.todo.law/legal/eu-cloud-plan-dpa",
    es: "https://www.todo.law/es/legal/encargo-tratamiento-plan-nube-ue",
  },
} as const satisfies { version: string; href: Record<PilotLocale, string> };

/** The audit-log action that records the acceptance. */
export const PILOT_DPA_ACTION = "DPA_ACCEPTED";

/** The agreement's link in the reader's language (Spanish for "es", English otherwise). */
export function pilotDpaHref(locale: string | undefined): string {
  return locale?.toLowerCase().startsWith("es") ? PILOT_DPA.href.es : PILOT_DPA.href.en;
}

/** The message when a hosted organization is opened without accepting it. */
export const PILOT_DPA_REQUIRED: Record<PilotLocale, string> = {
  en: "To open an organization on the hosted pilot, accept the data processing agreement.",
  es: "Para abrir una organización en el piloto alojado, acepta el contrato de encargo del tratamiento.",
};
