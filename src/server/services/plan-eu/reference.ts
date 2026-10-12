// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The organisation reference carried through checkout as the payment link's
 * client_reference_id: `pe1-<app>-<organisationId>-<signature>`, where the
 * signature is the first 32 hex characters of
 * HMAC-SHA256(PLAN_SYNC_SECRET, "plan-eu-ref:v1:<app>:<organisationId>").
 *
 * The payment link accepts any client_reference_id a visitor types into its
 * address, so a reference is trusted only when its signature checks out: only
 * this app (holding the secret) can make one, and it makes one only for a
 * signed-in owner or administrator of the organisation.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const SIG_LENGTH = 32;
const MAX_LENGTH = 200;
const CHARSET = /^[A-Za-z0-9_-]+$/;

function signature(secret: string, app: string, organizationId: string): string {
  return createHmac("sha256", secret)
    .update(`plan-eu-ref:v1:${app}:${organizationId}`)
    .digest("hex")
    .slice(0, SIG_LENGTH);
}

export function makePlanReference(secret: string, app: string, organizationId: string): string {
  const ref = `pe1-${app}-${organizationId}-${signature(secret, app, organizationId)}`;
  if (ref.length > MAX_LENGTH || !CHARSET.test(ref)) {
    throw new Error("plan reference: organisation id not usable in a reference");
  }
  return ref;
}

export type ParsedReference =
  | { kind: "none" }
  | { kind: "other-app"; app: string }
  | { kind: "invalid" }
  | { kind: "valid"; organizationId: string };

/**
 * Reads a reference for `app`. "none": no reference, or not a plan reference;
 * "other-app": a plan reference made by another app (its signature cannot be
 * checked here); "invalid": ours, but malformed or wrongly signed.
 */
export function parsePlanReference(
  secret: string,
  app: string,
  value: string | null | undefined,
): ParsedReference {
  if (!value || !value.startsWith("pe1-")) return { kind: "none" };
  if (value.length > MAX_LENGTH || !CHARSET.test(value)) return { kind: "invalid" };
  const parts = value.split("-");
  if (parts.length !== 4) return { kind: "invalid" };
  const [, refApp, organizationId, sig] = parts;
  if (refApp !== app) return { kind: "other-app", app: refApp };
  if (!organizationId || sig.length !== SIG_LENGTH) return { kind: "invalid" };
  const expected = Buffer.from(signature(secret, app, organizationId));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { kind: "invalid" };
  return { kind: "valid", organizationId };
}
