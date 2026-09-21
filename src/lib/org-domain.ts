// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The domain claim.
 *
 * An organisation's `domain` decides who is joined to it at sign-in, so it is
 * a claim that needs proof. The only proof this product holds is a sign-in
 * address: an organisation may carry a domain only when that domain is the
 * domain of its creator's (later: its owner's) own address, and the domain is
 * not a public mail provider, where sharing a domain says nothing about
 * sharing an employer.
 *
 * One rule, used on create and again at every auto-join, so a row written
 * before the rule existed cannot collect anybody.
 */

/**
 * Public mail providers. The sibling privacy product applies the same rule;
 * change the two lists together. A domain here can never be claimed by, or auto-join anyone to, an organisation.
 */
export const PUBLIC_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.es",
  "hotmail.com",
  "hotmail.es",
  "hotmail.co.uk",
  "hotmail.fr",
  "live.com",
  "live.co.uk",
  "msn.com",
  "yahoo.com",
  "yahoo.es",
  "yahoo.co.uk",
  "yahoo.fr",
  "yahoo.de",
  "ymail.com",
  "rocketmail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "tutanota.com",
  "tuta.io",
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "gmx.es",
  "web.de",
  "mail.com",
  "zoho.com",
  "zohomail.com",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "fastmail.com",
  "hey.com",
  "duck.com",
  "qq.com",
  "163.com",
  "126.com",
  "naver.com",
  "telefonica.net",
  "terra.es",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "laposte.net",
  "libero.it",
  "t-online.de",
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "btinternet.com",
]);

/** The lower-cased domain of an address, or null when it has none. */
export function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain || null;
}

/**
 * The domain an organisation may carry, given the address that vouches for it:
 * the requested domain when it equals that address's own domain and is not a
 * public mail provider, otherwise null. Never throws: the caller stores null
 * and carries on, an organisation is not refused over its domain.
 */
export function claimableDomain(
  requested: string | null | undefined,
  voucherEmail: string | null | undefined,
): string | null {
  const wanted = requested?.trim().toLowerCase();
  if (!wanted) return null;
  const own = emailDomain(voucherEmail);
  if (!own || own !== wanted) return null;
  if (PUBLIC_EMAIL_DOMAINS.has(wanted)) return null;
  return wanted;
}
