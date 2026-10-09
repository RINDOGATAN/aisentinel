// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The lock beside a premium entry of the menu (owner's decision, 9 October
 * 2026, as the retired Classic menu had it).
 *
 * The menu asks the very question the premium page asks before it draws its
 * locked screen: the page's own `checkAccess` procedure, which runs the
 * entitlement check (src/server/services/licensing/entitlement.ts). So the
 * lock shows exactly where the page would show the locked state, and nowhere
 * else: never on the hosted pilot, never where every skill is free, never for
 * an organisation that holds the licence, and never while the answer is still
 * on its way (an unknown answer draws no lock).
 *
 * Pure leaf module: no Prisma, no React.
 */

/** Which access answer each premium entry waits for. */
export type PremiumAccessKey = "shadowAi" | "vendorCatalog";

/** The menu entries that are premium, by the address they open. */
export const PREMIUM_MENU_ENTRIES: readonly { href: string; access: PremiumAccessKey }[] = [
  { href: "/governance/shadow-ai", access: "shadowAi" },
  { href: "/governance/vendor-catalog", access: "vendorCatalog" },
];

/** The pages' access answers; `undefined` while not yet known. */
export type PremiumAccess = Partial<Record<PremiumAccessKey, boolean | undefined>>;

/** The addresses that carry a lock: only those whose page answered "no access". */
export function lockedMenuHrefs(access: PremiumAccess): string[] {
  return PREMIUM_MENU_ENTRIES.filter((entry) => access[entry.access] === false).map(
    (entry) => entry.href,
  );
}
