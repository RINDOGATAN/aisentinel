import { describe, expect, it, vi } from "vitest";
import type { NextAuthOptions } from "next-auth";
import { tokenFreeAdapter, withoutStoredTokens } from "./token-free-adapter";

const account = {
  userId: "u1",
  type: "oauth",
  provider: "google",
  providerAccountId: "123",
  access_token: "at",
  refresh_token: "rt",
  id_token: "it",
  expires_at: 1,
  token_type: "Bearer",
  scope: "openid email",
};

describe("withoutStoredTokens", () => {
  it("drops the three token fields and keeps the link", () => {
    const out = withoutStoredTokens(account);
    expect(out).not.toHaveProperty("access_token");
    expect(out).not.toHaveProperty("refresh_token");
    expect(out).not.toHaveProperty("id_token");
    expect(out).toMatchObject({ provider: "google", providerAccountId: "123", userId: "u1" });
  });
});

describe("tokenFreeAdapter", () => {
  it("passes the account to the base adapter without tokens", async () => {
    const linkAccount = vi.fn().mockResolvedValue(undefined);
    const getUser = vi.fn();
    const base = { linkAccount, getUser } as unknown as NonNullable<NextAuthOptions["adapter"]>;
    const adapter = tokenFreeAdapter(base);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await adapter.linkAccount!(account as any);
    const stored = linkAccount.mock.calls[0][0];
    expect(stored.access_token).toBeUndefined();
    expect(stored.refresh_token).toBeUndefined();
    expect(stored.id_token).toBeUndefined();
    expect(stored.providerAccountId).toBe("123");
    expect(adapter.getUser).toBe(getUser);
  });
});
