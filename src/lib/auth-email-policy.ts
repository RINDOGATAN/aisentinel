// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Server-side e-mail policy for the NextAuth routes.
 *
 * The routes that take an address typed by the visitor (magic link and the
 * local credentials sign-in) are checked before NextAuth sees them, and a
 * refused address gets a 400 with the message key and the localized message.
 * Google and cross-login are refused in the signIn callback / authorize step
 * (src/lib/auth.ts), which redirects to /auth-error?error=EmailNotAccepted.
 */

import {
  BLOCKED_EMAIL_MESSAGE_KEY,
  blockedEmailMessage,
  isBlockedAccountEmail,
} from "@/lib/email-policy";
import { requestLocale } from "@/lib/landing-locale";
import type { AuthRouteContext, AuthRouteHandler } from "@/lib/auth-rate-limit";

/** The NextAuth error code used on the error page for a refused address. */
export const EMAIL_NOT_ACCEPTED_ERROR = "EmailNotAccepted";

/** True for the auth requests whose body carries a typed e-mail address. */
export function carriesTypedEmail(method: string, pathname: string): boolean {
  if (method.toUpperCase() !== "POST") return false;
  return (
    pathname.endsWith("/api/auth/signin/email") ||
    pathname.endsWith("/api/auth/callback/dev-credentials")
  );
}

async function emailFromBody(request: Request): Promise<string | null> {
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("application/json")) {
      const body = (await request.clone().json()) as { email?: unknown };
      return typeof body?.email === "string" ? body.email : null;
    }
    const text = await request.clone().text();
    const value = new URLSearchParams(text).get("email");
    return value;
  } catch {
    return null;
  }
}

export function blockedEmailResponse(request: Request): Response {
  const locale = requestLocale(
    request.headers.get("cookie"),
    request.headers.get("accept-language"),
  );
  return Response.json(
    { error: BLOCKED_EMAIL_MESSAGE_KEY, message: blockedEmailMessage(locale) },
    { status: 400 },
  );
}

export function withEmailPolicy(
  handler: AuthRouteHandler,
): (request: Request, context?: AuthRouteContext) => Promise<Response> {
  return async (request, context) => {
    if (carriesTypedEmail(request.method, new URL(request.url).pathname)) {
      const email = await emailFromBody(request);
      if (email && isBlockedAccountEmail(email)) return blockedEmailResponse(request);
    }
    return handler(request, context);
  };
}
