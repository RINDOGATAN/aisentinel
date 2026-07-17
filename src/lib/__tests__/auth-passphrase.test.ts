// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Workspace passphrase gate on the local (dev-credentials) provider.
 *
 * WORKSPACE_PASSPHRASE is read at authorize() call time (runtime env, never
 * baked). These tests lock the contract:
 *   - unset/empty/whitespace env → exactly the old behaviour (no passphrase
 *     needed — existing installs are never locked out);
 *   - set → sign-in requires the exact passphrase; wrong or missing → null.
 *
 * No real database: `@/lib/prisma` is a vi.fn mock.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const prismaMock = vi.hoisted(() => {
  // The provider only exists when local auth is enabled; features.ts reads
  // the env at module load, so set it before @/lib/auth is imported.
  process.env.NEXT_PUBLIC_LOCAL_AUTH_ENABLED = "true";
  return {
    user: { findUnique: vi.fn(), create: vi.fn() },
  };
});

vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { authOptions } from "@/lib/auth";

type Authorize = (
  credentials: Record<string, string> | undefined
) => Promise<{ email: string } | null>;
type Provider = {
  id?: string;
  authorize?: Authorize;
  credentials?: Record<string, unknown>;
  options?: { id?: string; authorize?: Authorize; credentials?: Record<string, unknown> };
};
const provider = (authOptions.providers as Provider[]).find(
  (p) => p.id === "dev-credentials" || p.options?.id === "dev-credentials"
);
const credentialsMap = provider?.options?.credentials ?? provider?.credentials;
const authorize = (provider?.options?.authorize ?? provider?.authorize) as Authorize;

const USER = { id: "u1", email: "partner@firm.example", name: "partner" };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue(USER);
  delete process.env.WORKSPACE_PASSPHRASE;
});

afterEach(() => {
  delete process.env.WORKSPACE_PASSPHRASE;
});

describe("dev-credentials authorize — workspace passphrase gate", () => {
  it("is registered with a passphrase field in its credentials map", () => {
    expect(provider).toBeDefined();
    expect(credentialsMap).toHaveProperty("passphrase");
  });

  it("signs in without a passphrase when the env is unset (existing installs)", async () => {
    await expect(authorize({ email: USER.email })).resolves.toMatchObject({ email: USER.email });
  });

  it("treats an empty/whitespace env as unset", async () => {
    process.env.WORKSPACE_PASSPHRASE = "   ";
    await expect(authorize({ email: USER.email })).resolves.toMatchObject({ email: USER.email });
  });

  it("requires the passphrase when the env is set", async () => {
    process.env.WORKSPACE_PASSPHRASE = "correct horse";
    await expect(authorize({ email: USER.email })).resolves.toBeNull();
    await expect(authorize({ email: USER.email, passphrase: "wrong" })).resolves.toBeNull();
    await expect(
      authorize({ email: USER.email, passphrase: "correct horse" })
    ).resolves.toMatchObject({ email: USER.email });
  });

  it("reads the env at call time, not at import time", async () => {
    await expect(authorize({ email: USER.email })).resolves.toMatchObject({ email: USER.email });
    process.env.WORKSPACE_PASSPHRASE = "set-later";
    await expect(authorize({ email: USER.email })).resolves.toBeNull();
    await expect(
      authorize({ email: USER.email, passphrase: "set-later" })
    ).resolves.toMatchObject({ email: USER.email });
  });
});
