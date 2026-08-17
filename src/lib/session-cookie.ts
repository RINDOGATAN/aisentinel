// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// Single source of truth for the NextAuth session cookie.
//
// This app overrides NextAuth's default cookie names (`next-auth.session-token`)
// with an app-specific one. Anything that decodes the session OUTSIDE the
// NextAuth handler — notably `getToken()` in the /api/export/* routes — must be
// told that name, or it silently looks for the default, finds nothing, and
// returns 401 to a perfectly valid session. Import from here rather than
// re-deriving the name, so the two can never drift apart again.
//
// `useSecureCookies` is keyed on the URL scheme, not NODE_ENV: the sovereign
// image runs NODE_ENV=production on plain http://localhost, and browsers drop
// `Secure` (and `__Secure-`-prefixed) cookies there — sign-in would "succeed"
// and the session would evaporate.
export const useSecureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

export const SESSION_COOKIE_NAME = useSecureCookies
  ? "__Secure-aisentinel.session-token"
  : "aisentinel.session-token";

export const CALLBACK_URL_COOKIE_NAME = useSecureCookies
  ? "__Secure-aisentinel.callback-url"
  : "aisentinel.callback-url";
