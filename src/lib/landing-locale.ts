// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { localeCookieValues, type Locale } from "@/lib/locale-cookie";

/**
 * Whether the browser prefers Spanish to English: the first of the two in the
 * Accept-Language list, by quality (es-ES, es-419 and plain es all count).
 */
export function prefersSpanish(acceptLanguage: string | null | undefined): boolean {
  if (!acceptLanguage) return false;
  const ranked = acceptLanguage
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: tag.split("-")[0], q: q ? Number(q.slice(2)) || 0 : 1, i };
    })
    .filter((x) => (x.base === "es" || x.base === "en") && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return ranked[0]?.base === "es";
}

/**
 * The language the landing is rendered in, decided on the server so the first
 * paint is already in that language (a Spanish browser saw
 * English for a moment): `?lang=` first, then the `locale` cookie when there is
 * one, then the browser's Accept-Language, English otherwise. The browser keeps
 * the same order (src/landing/LandingPage.tsx), so nothing switches after load.
 */
export function requestLandingLocale(
  lang: string | null | undefined,
  cookieHeader: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (lang === "es" || lang === "en") return lang;
  const values = localeCookieValues(cookieHeader);
  if (values.length > 0) return values[values.length - 1] === "es" ? "es" : "en";
  return prefersSpanish(acceptLanguage) ? "es" : "en";
}
