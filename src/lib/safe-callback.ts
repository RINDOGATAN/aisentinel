// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// A callbackUrl carried into sign-in may only be a path inside this app, never
// an absolute or protocol-relative URL to somewhere else. A browser treats
// both "//evil.com" and "/\evil.com" as network-path references, so both are
// rejected along with anything that is not rooted at "/".
export function safeCallbackUrl(value: string | undefined | null, fallback = "/governance"): string {
  if (!value || value[0] !== "/") return fallback;
  if (value[1] === "/" || value[1] === "\\") return fallback;
  return value;
}
