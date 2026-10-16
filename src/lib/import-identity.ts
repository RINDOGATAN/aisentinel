// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The signed identity statement on the inbound /api/import/* calls.
 *
 * The `x-api-key` header says which sibling application is calling. It does
 * not say for whom: the account is named in the request body. The calling
 * application therefore also sends `x-import-identity`, a short-lived HS256
 * JWT that states who is signed in there:
 *
 *   iss  the calling application ("dpocentral" | "vendorwatch")
 *   aud  "aisentinel-import"
 *   sub  the signed-in person's e-mail, trimmed and lower-cased
 *   iat, exp  exp - iat at most 300 seconds; jti random
 *
 * signed with a secret listed in IMPORT_IDENTITY_SECRETS (comma-separated, so
 * a secret can be rotated). This module verifies it with node:crypto only.
 *
 * Every call must carry a statement that verifies and names the account the
 * body names. Without a configured secret, every call is refused (fails
 * closed), the same as an unset import key.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const IMPORT_IDENTITY_HEADER = "x-import-identity";
export const IMPORT_IDENTITY_AUDIENCE = "aisentinel-import";
export const IMPORT_IDENTITY_ISSUERS: readonly string[] = ["dpocentral", "vendorwatch"];
/** Longest lifetime a statement may declare (exp - iat), in seconds. */
export const IMPORT_IDENTITY_MAX_LIFETIME = 300;
/** Clock skew tolerated between the two servers, in seconds. */
export const IMPORT_IDENTITY_CLOCK_TOLERANCE = 30;

export type IdentityResult =
  | { ok: true; email: string; issuer: string }
  | { ok: false; reason: string };

function b64urlDecode(part: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]*$/.test(part)) return null;
  return Buffer.from(part, "base64url");
}

function parseJson(buf: Buffer | null): Record<string, unknown> | null {
  if (!buf) return null;
  try {
    const value = JSON.parse(buf.toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** Verify a statement against the given secrets. Pure apart from the clock. */
export function verifyIdentityStatement(
  token: string,
  secrets: readonly string[],
  opts: { audience: string; issuers: readonly string[]; now?: number },
): IdentityResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [h, p, s] = parts;

  const header = parseJson(b64urlDecode(h));
  if (!header || header.alg !== "HS256") return { ok: false, reason: "algorithm" };

  const given = b64urlDecode(s);
  if (!given || given.length !== 32) return { ok: false, reason: "signature" };
  let signed = false;
  for (const secret of secrets) {
    const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest();
    if (timingSafeEqual(expected, given)) signed = true;
  }
  if (!signed) return { ok: false, reason: "signature" };

  const claims = parseJson(b64urlDecode(p));
  if (!claims) return { ok: false, reason: "malformed" };
  if (claims.aud !== opts.audience) return { ok: false, reason: "audience" };
  if (typeof claims.iss !== "string" || !opts.issuers.includes(claims.iss)) {
    return { ok: false, reason: "issuer" };
  }
  const { iat, exp, sub } = claims;
  if (typeof iat !== "number" || typeof exp !== "number") return { ok: false, reason: "times" };
  if (exp <= iat || exp - iat > IMPORT_IDENTITY_MAX_LIFETIME) return { ok: false, reason: "lifetime" };
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  if (iat > now + IMPORT_IDENTITY_CLOCK_TOLERANCE) return { ok: false, reason: "not yet valid" };
  if (now > exp + IMPORT_IDENTITY_CLOCK_TOLERANCE) return { ok: false, reason: "expired" };
  if (typeof sub !== "string" || !sub.trim()) return { ok: false, reason: "subject" };

  return { ok: true, email: sub.trim().toLowerCase(), issuer: claims.iss };
}

function configuredSecrets(): string[] {
  return (process.env.IMPORT_IDENTITY_SECRETS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function refuse(status: 401 | 403, error: string): Response {
  return NextResponse.json({ error }, { status });
}

/**
 * The identity guard every /api/import/* route calls once it knows which
 * account the body names (after guardImportRequest). Returns a Response to
 * send back, or null to carry on.
 */
export function checkImportIdentity(request: Request, accountEmail: string): Response | null {
  const secrets = configuredSecrets();
  const token = request.headers.get(IMPORT_IDENTITY_HEADER);

  if (secrets.length === 0) {
    logger.error("Import identity verification is not configured (IMPORT_IDENTITY_SECRETS unset); refusing");
    return refuse(401, "Identity statement required");
  }
  if (!token) return refuse(401, "Identity statement required");

  const result = verifyIdentityStatement(token, secrets, {
    audience: IMPORT_IDENTITY_AUDIENCE,
    issuers: IMPORT_IDENTITY_ISSUERS,
  });
  if (!result.ok) {
    logger.warn("Import identity statement refused", { reason: result.reason });
    return refuse(401, "Invalid identity statement");
  }
  if (result.email !== accountEmail.trim().toLowerCase()) {
    return refuse(403, "Identity does not match the account");
  }
  return null;
}
