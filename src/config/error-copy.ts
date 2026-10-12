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
    ? `No se ha podido completar por un problema nuestro. Vuelve a intentarlo en un momento; si vuelve a pasar, envíanos la referencia ${reference} desde el formulario de sugerencias.`
    : `This could not be completed because of a problem on our side. Try again in a moment; if it happens again, send us the reference ${reference} through the feedback form.`;
}

/**
 * What a person reads when the server no longer recognises their session (it
 * expired, or they signed out in another tab) while a form was open, instead
 * of the bare code. The form keeps what was typed.
 */
export function sessionEndedMessage(locale: ErrorLocale): string {
  return locale === "es"
    ? "Tu sesión ha terminado. Vuelve a iniciar sesión en otra pestaña y guarda de nuevo: lo que has escrito aquí se conserva."
    : "Your session has ended. Sign in again in another tab, then save again: what you typed here is kept.";
}

/** Plain names for the fields a form sends, used when one of them is refused. */
const FIELD_NAMES: Record<string, { en: string; es: string }> = {
  name: { en: "name", es: "nombre" },
  title: { en: "title", es: "título" },
  description: { en: "description", es: "descripción" },
  purpose: { en: "intended purpose", es: "finalidad prevista" },
};

/**
 * Input the server refused (too long, a wrong value), as a sentence with the
 * fields named, instead of the validator's raw list.
 */
export function invalidInputMessage(
  locale: ErrorLocale,
  issues: { path: string; maximum?: number }[],
): string {
  const parts = issues.slice(0, 4).map(({ path, maximum }) => {
    const name = FIELD_NAMES[path]?.[locale] ?? path;
    if (maximum === undefined) return name;
    return locale === "es" ? `${name}: ${maximum} caracteres como máximo` : `${name}: at most ${maximum} characters`;
  });
  const list = parts.join("; ");
  return locale === "es"
    ? `Parte de lo introducido no es válido${list ? ` (${list})` : ""}. Corrígelo y guarda de nuevo.`
    : `Some of what was entered is not valid${list ? ` (${list})` : ""}. Correct it and save again.`;
}

/** The locale from a `document.cookie` string; English unless it says Spanish. */
export function errorLocaleFromCookie(cookie: string): ErrorLocale {
  return /(?:^|;\s*)locale=es(?:;|$)/.test(cookie) ? "es" : "en";
}
