// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { brand as defaultBrand, type BrandConfig } from "@/config/brand";

const FALLBACK_ADDRESS = "noreply@todo.law";

/** The bare address out of an EMAIL_FROM value, which may already carry a
 *  display name ("Someone <noreply@x>"). Empty or unusable → the fallback. */
export function mailAddress(raw: string | undefined | null): string {
  const value = (raw ?? "").trim();
  const bracketed = value.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/);
  if (bracketed) return bracketed[1];
  if (/^[^<>\s"]+@[^<>\s"]+$/.test(value)) return value;
  return FALLBACK_ADDRESS;
}

/** The one From header for every e-mail this app sends:
 *  "<Product> by <Company> <address>". The display name is always ours, so an
 *  environment variable can change the address but never the sender name. */
export function mailFrom(
  b: Pick<BrandConfig, "emailName" | "companyName" | "emailFrom"> = defaultBrand,
): string {
  return `${b.emailName} by ${b.companyName} <${mailAddress(b.emailFrom)}>`;
}

/** Subject of the sign-in link e-mail. */
export function signInSubject(b: Pick<BrandConfig, "emailName"> = defaultBrand): string {
  return `Sign in to ${b.emailName}`;
}
