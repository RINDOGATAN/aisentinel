// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Cross-login, the Google branch.
 *
 * A Google access token says who the person is. It does not say which
 * application the person granted it to. The provider used to accept any valid
 * token, so a token a person gave to any other website opened their account
 * here. It now asks Google's tokeninfo endpoint and requires:
 *   - `aud` (or `azp`) in the CROSS_LOGIN_GOOGLE_CLIENT_IDS allow-list
 *     (unset or empty refuses everyone), and
 *   - `email_verified`.
 *
 * No request leaves the test: `fetch` is a stub. No real database is touched.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const prismaMock = vi.hoisted(() => {
  // The provider is registered at module load, from this variable.
  process.env.CROSS_LOGIN_ENABLED = "true";
  return { user: { findUnique: vi.fn(), create: vi.fn() } };
});
vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { authOptions } from "@/lib/auth";

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

const OUR_CLIENT = "our-client.apps.googleusercontent.com";
const EMAIL = "person@example.test";

/** Stubs Google: tokeninfo answers `info`, userinfo answers the same address. */
function stubGoogle(info: Record<string, unknown> | null) {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const href = String(url);
    if (href.includes("tokeninfo")) {
      if (!info) return { ok: false, status: 400, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => info };
    }
    return { ok: true, status: 200, json: async () => ({ email: EMAIL, name: "A Person" }) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  prismaMock.user.findUnique.mockResolvedValue({ id: "u1", email: EMAIL, name: "A Person" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("cross-login with a Google token", () => {
  it("refuses a valid token that was issued to another application", async () => {
    vi.stubEnv("CROSS_LOGIN_GOOGLE_CLIENT_IDS", OUR_CLIENT);
    stubGoogle({
      aud: "someone-else.apps.googleusercontent.com",
      azp: "someone-else.apps.googleusercontent.com",
      email: EMAIL,
      email_verified: "true",
    });

    await expect(authorize({ token: "t", method: "google" })).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("refuses everyone when the allow-list is unset, and asks Google nothing", async () => {
    const fetchMock = stubGoogle({ aud: OUR_CLIENT, email: EMAIL, email_verified: "true" });

    await expect(authorize({ token: "t", method: "google" })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses everyone when the allow-list is empty", async () => {
    vi.stubEnv("CROSS_LOGIN_GOOGLE_CLIENT_IDS", " , ");
    stubGoogle({ aud: OUR_CLIENT, email: EMAIL, email_verified: "true" });

    await expect(authorize({ token: "t", method: "google" })).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses an address Google has not verified", async () => {
    vi.stubEnv("CROSS_LOGIN_GOOGLE_CLIENT_IDS", OUR_CLIENT);
    stubGoogle({ aud: OUR_CLIENT, email: EMAIL, email_verified: "false" });

    await expect(authorize({ token: "t", method: "google" })).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses when tokeninfo rejects the token", async () => {
    vi.stubEnv("CROSS_LOGIN_GOOGLE_CLIENT_IDS", OUR_CLIENT);
    stubGoogle(null);

    await expect(authorize({ token: "t", method: "google" })).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("signs in a verified address on a token issued to a listed client", async () => {
    vi.stubEnv("CROSS_LOGIN_GOOGLE_CLIENT_IDS", `another-client, ${OUR_CLIENT}`);
    stubGoogle({ aud: OUR_CLIENT, azp: OUR_CLIENT, email: EMAIL, email_verified: "true" });

    await expect(authorize({ token: "t", method: "google" })).resolves.toEqual({
      id: "u1",
      email: EMAIL,
      name: "A Person",
    });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: EMAIL } });
  });
});
