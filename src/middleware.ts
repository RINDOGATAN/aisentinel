/**
 * Middleware for geo-IP currency detection
 *
 * Sets a currency cookie based on the visitor's country.
 * US visitors get USD, everyone else gets EUR.
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

  // Set currency cookie based on geo-IP (US → USD, else EUR)
  if (!request.cookies.has("currency")) {
    const country = request.headers.get("x-vercel-ip-country") || "";
    const currency = country === "US" ? "USD" : "EUR";
    const response = NextResponse.next();
    response.cookies.set("currency", currency, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)" ],
};
