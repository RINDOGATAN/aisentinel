// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The dashboard has one layout, Guided: a left menu that walks the program
 * path. The Classic layout (top-bar menus) was retired on 9 October 2026.
 *
 * - `ais_menu=collapsed` shrinks the left menu to icons (a per-browser choice).
 * - The old `ais_skin` cookie is left where a browser holds it and is never
 *   read again.
 * - Addresses that only Classic had, and the old `?skin=` parameter, are sent
 *   to their Guided equivalent by the middleware, so a bookmark never ends on
 *   a missing page (`retiredClassicRedirect`).
 *
 * Pure string helpers, safe on the server, the edge and the client.
 */

export const MENU_COOKIE = "ais_menu";

/** The parameter that used to choose the layout (`?skin=guided|classic`). */
export const RETIRED_SKIN_QUERY = "skin";

/**
 * Pages that existed only in Classic, and where each one now lives. The query
 * string is kept, so "My clients > + Add organization" (`?add=1`) still opens
 * the add dialog on All clients.
 */
export const RETIRED_CLASSIC_PATHS: Readonly<Record<string, string>> = {
  "/governance/clients": "/governance/portfolio",
};

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** True when the left menu should show icons only. */
export function parseMenuCollapsed(value: string | null | undefined): boolean {
  return value === "collapsed";
}

/** The signed-in dashboard. */
export function isDashboardPath(pathname: string): boolean {
  return pathname === "/governance" || pathname.startsWith("/governance/");
}

/**
 * Where a retired Classic address goes now, as a path and query, or null when
 * the address is current. Drops the old `?skin=` parameter and maps the
 * Classic-only pages; everything else in the query is kept.
 */
export function retiredClassicRedirect(pathname: string, search: string): string | null {
  if (!isDashboardPath(pathname)) return null;
  const params = new URLSearchParams(search);
  const hadSkin = params.has(RETIRED_SKIN_QUERY);
  params.delete(RETIRED_SKIN_QUERY);
  const trimmed = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const mapped = RETIRED_CLASSIC_PATHS[trimmed];
  if (!hadSkin && !mapped) return null;
  const query = params.toString();
  return `${mapped ?? pathname}${query ? `?${query}` : ""}`;
}

/** A `document.cookie` assignment for a choice, host-only, one year, SameSite=Lax. */
export function cookieAssignment(name: string, value: string): string {
  return `${name}=${value}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
