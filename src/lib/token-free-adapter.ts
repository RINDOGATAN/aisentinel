// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The NextAuth database adapter, minus the OAuth tokens.
 *
 * Sessions are JWTs and nothing in the application reads the provider's
 * access, refresh or id token after sign-in, so storing them in the Account
 * row is only exposure. The account link itself (provider + account id) is
 * kept: that is what sign-in needs. Same rule as DPO Central.
 */

import type { NextAuthOptions } from "next-auth";

type Adapter = NonNullable<NextAuthOptions["adapter"]>;

/** The OAuth token fields that are never stored. */
export const STRIPPED_ACCOUNT_FIELDS = ["access_token", "refresh_token", "id_token"] as const;

export function withoutStoredTokens<T extends Record<string, unknown>>(account: T): Omit<T, (typeof STRIPPED_ACCOUNT_FIELDS)[number]> {
  const { access_token, refresh_token, id_token, ...rest } = account;
  return rest;
}

export function tokenFreeAdapter(base: Adapter): Adapter {
  return {
    ...base,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    linkAccount: async (account: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await base.linkAccount!(withoutStoredTokens(account) as any);
    },
  };
}
