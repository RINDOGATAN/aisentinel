// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Middleware for geo-IP currency detection and locale defaults
 *
 * Sets a currency cookie based on the visitor's country: EUR only for a
 * visitor known to be outside the US, USD otherwise (including unknown).
 * Never writes a default locale cookie (no cookie renders English). When a
 * hosted request carries more than one `locale` value, expires the host-only
 * duplicate and re-writes the domain-wide cookie (see @/lib/locale-cookie).
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import { NextRequest, NextResponse } from "next/server";
import { localeCleanupSetCookies } from "@/lib/locale-cookie";
import { currencyForCountry } from "@/lib/currency";
import {
  SKIN_COOKIE,
  SKIN_COOKIE_OPTIONS,
  SKIN_QUERY,
  isDashboardPath,
  skinFromQuery,
} from "@/lib/skin";

export default function middleware(request: NextRequest) {
  // Skip for API routes, static files, and Next.js internals
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // `?skin=guided` / `?skin=classic` on a dashboard address (for demos): keep
  // the choice in its cookie and come back to the same address without the
  // parameter, so the layout reads the cookie on the one render that follows.
  const askedSkin = skinFromQuery(request.nextUrl.searchParams.get(SKIN_QUERY));
  if (askedSkin && isDashboardPath(pathname)) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete(SKIN_QUERY);
    const redirect = NextResponse.redirect(clean);
    redirect.cookies.set(SKIN_COOKIE, askedSkin, SKIN_COOKIE_OPTIONS);
    return redirect;
  }

  const response = NextResponse.next();

  // Set currency cookie based on geo-IP: EUR only for a known non-US country
  if (!request.cookies.has("currency")) {
    const currency = currencyForCountry(request.headers.get("x-vercel-ip-country"));
    response.cookies.set("currency", currency, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });
  }

  // Collapse duplicate locale cookies. Appended raw and last: both Set-Cookie
  // headers carry the name `locale`, which response.cookies would merge, and
  // any later response.cookies.set rewrites the whole header list.
  for (const setCookie of localeCleanupSetCookies(
    request.headers.get("cookie"),
    request.nextUrl.hostname,
  )) {
    response.headers.append("Set-Cookie", setCookie);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)" ],
};
