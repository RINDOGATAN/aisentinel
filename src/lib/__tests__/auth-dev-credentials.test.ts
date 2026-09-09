// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The local sign-in provider's environment guard.
 *
 * This provider creates an account for any email typed into it, with no
 * credential of any kind. That is deliberate for a self-hosted install behind
 * a firewall, and it means the environment check in `authorize` is the only
 * thing keeping it off a cloud deployment. It used to sit behind a workspace
 * passphrase as well; with that removed, this guard stands alone, so it is
 * worth locking down.
 *
 * The check is read at call time rather than at module load, so a deployment
 * cannot be talked into enabling it by importing the module differently.
 * These tests exercise it the same way: stub the environment, then call.
 *
 * No real database is touched.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

// The provider is only assembled when the feature flag is on, and that flag is
// read at module load. Forcing it here isolates the runtime guard, which is
// what these tests are about.
vi.mock("@/config/features", () => ({
  features: { devAuthEnabled: true, googleAuthEnabled: false, emailAuthEnabled: false },
}));

import { authOptions } from "@/lib/auth";

type Authorize = (
  credentials: Record<string, string> | undefined,
) => Promise<{ id: string; email: string } | null>;

function devCredentialsAuthorize(): Authorize {
  const providers = authOptions.providers as unknown as Record<string, unknown>[];
  const provider =
    providers.find(
      (p) => (p.options as Record<string, unknown> | undefined)?.id === "dev-credentials",
    ) ?? providers.find((p) => p.type === "credentials");
  if (!provider) throw new Error("dev-credentials provider not found");
  // NextAuth puts the configured function on `options.authorize`; the
  // top-level `authorize` is its own stub, which returns null synchronously.
  // Taking the wrong one would make every test below pass without ever
  // reaching the guard.
  const authorize = (provider.options as Record<string, unknown>).authorize as Authorize;
  if (typeof authorize !== "function") throw new Error("authorize not found on the provider");
  return authorize;
}

const authorize = devCredentialsAuthorize();

beforeEach(() => {
  vi.clearAllMocks();
  // Silence the provider's own console.error on a blocked attempt.
  vi.spyOn(console, "error").mockImplementation(() => {});
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.create.mockResolvedValue({ id: "u1", email: "someone@example.test" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("local sign-in: the environment guard", () => {
  it("refuses on the cloud deployment, even with local auth switched on", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LOCAL_AUTH_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "development");

    await expect(authorize({ email: "anyone@example.test" })).resolves.toBeNull();
    // It must bail before touching the database, not after.
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("refuses in a production build that has not opted into local auth", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LOCAL_AUTH_ENABLED", "");

    await expect(authorize({ email: "anyone@example.test" })).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses in production when the flag is anything other than the literal 'true'", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "production");
    for (const value of ["false", "1", "TRUE", "yes", " true "]) {
      vi.stubEnv("NEXT_PUBLIC_LOCAL_AUTH_ENABLED", value);
      await expect(
        authorize({ email: "anyone@example.test" }),
        `flag value ${JSON.stringify(value)} must not enable local sign-in`,
      ).resolves.toBeNull();
    }
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("allows the self-hosted posture: a production build that opted in", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LOCAL_AUTH_ENABLED", "true");

    await expect(authorize({ email: "owner@firm.test" })).resolves.toEqual(
      expect.objectContaining({ id: "u1" }),
    );
    expect(prismaMock.user.findUnique).toHaveBeenCalled();
  });

  it("allows local development", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_LOCAL_AUTH_ENABLED", "");

    await expect(authorize({ email: "dev@firm.test" })).resolves.toEqual(
      expect.objectContaining({ id: "u1" }),
    );
  });
});

describe("local sign-in: what it does once past the guard", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "development");
  });

  it("needs an email, and creates nothing without one", async () => {
    await expect(authorize({ email: "" })).resolves.toBeNull();
    await expect(authorize(undefined)).resolves.toBeNull();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("creates an account for an email it has never seen", async () => {
    // Documented deliberately: there is no credential. This is why the self-host
    // README says the port must never face the internet.
    await authorize({ email: "stranger@example.test" });
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "stranger@example.test" }),
      }),
    );
  });

  it("reuses an existing account rather than creating a second one", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing", email: "known@firm.test" });
    await expect(authorize({ email: "known@firm.test" })).resolves.toEqual(
      expect.objectContaining({ id: "existing" }),
    );
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
