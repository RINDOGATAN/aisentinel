// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The response headers every page and route carries (next.config.ts).
 *
 * Content Security Policy, enforced. Scripts may come only from this origin
 * ('unsafe-inline' stays because Next.js inlines its bootstrap scripts and a
 * nonce would need every route rendered dynamically; same choice as DPO
 * Central). What it still enforces: no script, style, font, media or fetch
 * from any other origin, no plugins, no <base> hijack, no framing, and forms
 * post only here or to Google's sign-in (the Google button is a form whose
 * POST redirects there, and browsers apply form-action to that redirect).
 * Stripe is reached by navigation (links and redirects), never embedded, so
 * it needs no entry. Images may be any https source (logos in content).
 *
 * Imported by next.config.ts at build time: no path aliases, no runtime deps.
 */

export function contentSecurityPolicy(opts: { dev: boolean }): string {
  return [
    "default-src 'self'",
    // Next dev mode needs eval for react-refresh; production does not get it.
    `script-src 'self' 'unsafe-inline'${opts.dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self'",
    `connect-src 'self'${opts.dev ? " ws:" : ""}`,
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(opts: { dev: boolean }): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(opts) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
}
