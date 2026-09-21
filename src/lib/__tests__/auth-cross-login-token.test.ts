// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Cross-login, the signed token.
 *
 * Every sibling application holds the same secret, so a good signature says
 * only "a sibling signed this". The provider used to stop there: a token
 * minted for another sibling, or an old one, was accepted for as long as the
 * secret lived. It now also requires HS256, `aud` = this application, `iss`
 * in the CROSS_LOGIN_ISSUERS allow-list (unset or empty refuses everyone),
 * `exp`, and an `iat` no older than two minutes.
 *
 * Tokens are minted here with the same library; no real database is touched.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SignJWT } from "jose";

const prismaMock = vi.hoisted(() => {
  // The provider is registered at module load, from this variable.
  process.env.CROSS_LOGIN_ENABLED = "true";
  return { user: { findUnique: vi.fn(), create: vi.fn() } };
});
vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { authOptions, CROSS_LOGIN_AUDIENCE } from "@/lib/auth";

type Authorize = (
  credentials: Record<string, string> | undefined,
) => Promise<{ id: string; email: string } | null>;

function crossLoginAuthorize(): Authorize {
  const providers = authOptions.providers as unknown as Record<string, unknown>[];
  const provider = providers.find(
    (p) => (p.options as Record<string, unknown> | undefined)?.id === "cross-login",
  );
  if (!provider) throw new Error("cross-login provider not found");
  // `options.authorize` is the configured function; the top-level one is a stub.
  const authorize = (provider.options as Record<string, unknown>).authorize as Authorize;
  if (typeof authorize !== "function") throw new Error("authorize not found on the provider");
  return authorize;
}

const authorize = crossLoginAuthorize();

const SECRET = "a-shared-secret-of-at-least-thirty-two-bytes!";
const ISSUER = "https://sender.example";
const EMAIL = "person@example.test";
const AUDIENCE = CROSS_LOGIN_AUDIENCE ?? "aisentinel";

interface Minted {
  alg?: string;
  audience?: string | null;
  issuer?: string | null;
  issuedSecondsAgo?: number | null;
  expiresIn?: string | null;
  secret?: string;
}

/** A token as the sender should mint it; each option breaks one requirement. */
async function mint(o: Minted = {}) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = new SignJWT({ email: EMAIL, name: "A Person" }).setProtectedHeader({
    alg: o.alg ?? "HS256",
  });
  if (o.audience !== null) jwt.setAudience(o.audience ?? AUDIENCE);
  if (o.issuer !== null) jwt.setIssuer(o.issuer ?? ISSUER);
  if (o.issuedSecondsAgo !== null) jwt.setIssuedAt(now - (o.issuedSecondsAgo ?? 0));
  if (o.expiresIn !== null) jwt.setExpirationTime(o.expiresIn ?? "2m");
  return jwt.sign(new TextEncoder().encode(o.secret ?? SECRET));
}

const attempt = (token: string) => authorize({ token, method: "magic-link" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("CROSS_LOGIN_SECRET", SECRET);
  vi.stubEnv("CROSS_LOGIN_ISSUERS", `https://another-sender.example, ${ISSUER}`);
  prismaMock.user.findUnique.mockResolvedValue({ id: "u1", email: EMAIL, name: "A Person" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("cross-login with a signed token", () => {
  it("signs in on a fresh token minted for this application by a listed sender", async () => {
    await expect(attempt(await mint())).resolves.toEqual({
      id: "u1",
      email: EMAIL,
      name: "A Person",
    });
  });

  it("refuses a token minted for a sibling application", async () => {
    await expect(attempt(await mint({ audience: "another-application" }))).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses a token with no audience", async () => {
    await expect(attempt(await mint({ audience: null }))).resolves.toBeNull();
  });

  it("refuses a token from a sender that is not listed, or that names no sender", async () => {
    await expect(attempt(await mint({ issuer: "https://stranger.example" }))).resolves.toBeNull();
    await expect(attempt(await mint({ issuer: null }))).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses everyone when the issuer list is unset or empty", async () => {
    vi.stubEnv("CROSS_LOGIN_ISSUERS", "");
    await expect(attempt(await mint())).resolves.toBeNull();
    vi.stubEnv("CROSS_LOGIN_ISSUERS", " , ");
    await expect(attempt(await mint())).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses a token with no expiry", async () => {
    await expect(attempt(await mint({ expiresIn: null }))).resolves.toBeNull();
  });

  it("refuses a token with no issue time", async () => {
    await expect(attempt(await mint({ issuedSecondsAgo: null }))).resolves.toBeNull();
  });

  it("refuses an old token even when its own expiry is far away", async () => {
    await expect(
      attempt(await mint({ issuedSecondsAgo: 10 * 60, expiresIn: "30d" })),
    ).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses another algorithm of the same family", async () => {
    await expect(attempt(await mint({ alg: "HS512" }))).resolves.toBeNull();
  });

  it("refuses a well-formed token signed with another secret", async () => {
    await expect(
      attempt(await mint({ secret: "another-secret-of-at-least-thirty-two-bytes!!" })),
    ).resolves.toBeNull();
  });
});
