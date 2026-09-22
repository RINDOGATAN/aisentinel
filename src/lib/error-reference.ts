// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The reference a person sees when something fails, and the same string in
 * the log line that records the failure. Quoting it in a report is how the
 * report and the log line are matched.
 *
 * `crypto.getRandomValues` rather than `randomUUID`: the second is missing in
 * a browser on a plain-http address, which is how a self-hosted install on a
 * firm's own network is often reached.
 */

// No 0/O or 1/I/L: the reference is read aloud and typed by hand.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newErrorReference(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `E-${out}`;
}

/**
 * The reference for an error caught by an error page. A server-side error
 * carries Next.js's `digest`, which is also the id in the server's log line,
 * so that one is shown; a client-side error gets a fresh reference.
 */
export function errorPageReference(error: { digest?: string }): string {
  return error.digest ? `D-${error.digest}` : newErrorReference();
}
