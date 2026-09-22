// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What a person reads when something fails: the error pages and the message a
 * failed procedure returns.
 *
 * Kept here rather than in the i18n message files on purpose. An error page
 * has to render when the thing that failed is the page's own setup (the root
 * layout, the message provider), so it cannot depend on it. The locale is
 * read from the same `locale` cookie the rest of the app uses.
 */

export type ErrorLocale = "en" | "es";

export const SUPPORT_DOC_PATH = "/docs/support";

export const ERROR_PAGE_COPY = {
  en: {
    title: "Something went wrong",
    body: "This page could not be shown. Your saved work is not affected.",
    reference: "Reference",
    referenceHelp:
      "If you report the problem, quote this reference so we can find exactly what happened.",
    retry: "Try again",
    back: "Back to the dashboard",
    home: "Back to the start",
    support: "How to report a problem",
  },
  es: {
    title: "Algo ha fallado",
    body: "No se ha podido mostrar esta página. Tu trabajo guardado no se ha visto afectado.",
    reference: "Referencia",
    referenceHelp:
      "Si nos informas del problema, indica esta referencia para que podamos localizar qué ha pasado.",
    retry: "Volver a intentarlo",
    back: "Volver al panel",
    home: "Volver al inicio",
    support: "Cómo informar de un problema",
  },
} as const satisfies Record<ErrorLocale, Record<string, string>>;

/** The message a procedure returns when it fails for a reason on our side. */
export function internalErrorMessage(locale: ErrorLocale, reference: string): string {
  return locale === "es"
    ? `No se ha podido completar por un problema nuestro. Vuelve a intentarlo en un momento; si vuelve a pasar, envíanos la referencia ${reference} desde el formulario de comentarios.`
    : `This could not be completed because of a problem on our side. Try again in a moment; if it happens again, send us the reference ${reference} through the feedback form.`;
}

/** The locale from a `document.cookie` string; English unless it says Spanish. */
export function errorLocaleFromCookie(cookie: string): ErrorLocale {
  return /(?:^|;\s*)locale=es(?:;|$)/.test(cookie) ? "es" : "en";
}
