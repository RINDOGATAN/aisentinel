// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Rate limiting for the NextAuth routes.
 *
 * NextAuth owns everything under /api/auth/[...nextauth], so there is no hook
 * inside it to limit. The route handler is ours, though, so the limit goes
 * around it: every request is classified by path, and the two that an
 * unauthenticated caller can abuse are counted before NextAuth sees them.
 *
 *   credential sign-in   POST /api/auth/callback/credentials
 *   magic link           POST /api/auth/signin/email
 *
 * Everything else (the session endpoint the browser polls, the CSRF token, the
 * provider list, the OAuth redirect legs) is deliberately NOT limited. Those
 * are called constantly by ordinary use and limiting them would break the app
 * long before it inconvenienced anybody.
 *
 * The magic link is the one that matters most. Without a limit, anyone can
 * make the server send unlimited e-mail to any address they choose: an
 * unauthenticated way to spend the mail quota and to harass a third party.
 */

import type { PolicyName } from "@/lib/rate-limit";
import { enforce } from "@/lib/rate-limit";

/**
 * Which policy applies to a request, or null to let it through untouched.
 *
 * Exported for the tests: the classification is the part worth pinning, and it
 * is a pure function of method and path.
 */
export function policyForAuthRequest(method: string, pathname: string): PolicyName | null {
  if (method.toUpperCase() !== "POST") return null;
  if (pathname.endsWith("/api/auth/signin/email")) return "magicLink";
  if (pathname.endsWith("/api/auth/callback/email")) return "magicLink";
  if (pathname.endsWith("/api/auth/callback/credentials")) return "signin";
  if (pathname.endsWith("/api/auth/callback/dev-credentials")) return "signin";
  return null;
}

/**
 * The context Next.js hands a catch-all route handler. The parameter is
 * optional here so the wrapper can be called directly in a test without
 * inventing one; Next only requires that the handler accepts it.
 */
export type AuthRouteContext = { params: Promise<{ nextauth: string[] }> };

export type AuthRouteHandler = (
  request: Request,
  context?: AuthRouteContext,
) => Response | Promise<Response>;

/**
 * Wrap a NextAuth handler so the abusable paths are counted first.
 *
 * The limit is keyed by address and policy, so exhausting the magic-link
 * allowance does not lock the same person out of signing in with a password.
 */
export function withAuthRateLimit(
  handler: AuthRouteHandler,
): (request: Request, context?: AuthRouteContext) => Promise<Response> {
  return async (request, context) => {
    const policy = policyForAuthRequest(request.method, new URL(request.url).pathname);
    if (policy) {
      const limited = enforce(request, policy);
      if (limited) return limited;
    }
    return handler(request, context);
  };
}
