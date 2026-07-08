// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Middleware for geo-IP currency detection and locale defaults
 *
 * Sets a currency cookie based on the visitor's country.
 * US visitors get USD, everyone else gets EUR.
 * Sets a default locale cookie if missing.
 *
 * AGPL-3.0 License - Part of the open-source core
 */

import { NextRequest, NextResponse } from "next/server";

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

  const response = NextResponse.next();

  // Set currency cookie based on geo-IP (US → USD, else EUR)
  if (!request.cookies.has("currency")) {
    const country = request.headers.get("x-vercel-ip-country") || "";
    const currency = country === "US" ? "USD" : "EUR";
    response.cookies.set("currency", currency, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });
  }

  // Set default locale cookie if missing
  if (!request.cookies.has("locale")) {
    response.cookies.set("locale", "en", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)" ],
};
