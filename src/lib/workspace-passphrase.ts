// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Workspace passphrase check for the local (self-host) credentials login.
 *
 * WORKSPACE_PASSPHRASE is a RUNTIME env var (deliberately NOT NEXT_PUBLIC —
 * it must never be baked into the client bundle). When set, the local
 * sign-in form requires it; when empty/unset, behaviour is exactly the
 * pre-passphrase one so existing installs are never locked out.
 *
 * Extracted from the authorize() callback so the comparison logic is
 * unit-testable without NextAuth or Prisma.
 */
import { timingSafeEqual } from "crypto";

/**
 * @param input    what the user typed (may be undefined/absent)
 * @param required the configured passphrase (already trimmed by the caller;
 *                 empty string means "no passphrase configured")
 * @returns true when access should be allowed
 */
export function verifyWorkspacePassphrase(
  input: string | undefined | null,
  required: string
): boolean {
  // No passphrase configured → open, exactly the previous behaviour.
  if (!required) return true;
  if (typeof input !== "string" || input.length === 0) return false;

  const a = Buffer.from(input, "utf8");
  const b = Buffer.from(required, "utf8");
  // timingSafeEqual throws on length mismatch, so length-check first.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
