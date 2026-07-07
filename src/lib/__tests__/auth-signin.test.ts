// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * signIn callback regression test.
 *
 * P0 removed a backdoor that auto-provisioned membership/entitlements for a
 * hardcoded email domain. The only auto-join that remains is strictly
 * data-driven: a user is added as a plain MEMBER *iff* an Organization row
 * already exists whose `domain` equals the user's email domain. There is no
 * special-casing of any domain, and no entitlement/admin grant of any kind.
 *
 * These tests lock that behaviour:
 *   - No matching Organization row  → no membership is created (even for the
 *     previously privileged domain), and sign-in still succeeds.
 *   - A matching Organization row   → the user is auto-joined as role MEMBER
 *     only (never an elevated role), with an AUTO_JOIN audit entry.
 *   - An existing membership        → no duplicate is created.
 *
 * No real database is touched; `@/lib/prisma` is a vi.fn mock.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  organization: { findFirst: vi.fn() },
  organizationMember: { findFirst: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { authOptions } from "@/lib/auth";

type SignIn = NonNullable<NonNullable<typeof authOptions.callbacks>["signIn"]>;
const signIn = authOptions.callbacks!.signIn as SignIn;

function call(email: string | null, id = "user-1") {
  // Only `user` is read by the callback; the other params are unused.
  return signIn({
    user: { id, email } as unknown as Parameters<SignIn>[0]["user"],
  } as unknown as Parameters<SignIn>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signIn callback", () => {
  it("does NOT provision anything when no Organization matches the email domain (backdoor domain included)", async () => {
    prismaMock.organization.findFirst.mockResolvedValue(null);

    // privacycloud.com was the removed backdoor domain; it now gets nothing.
    await expect(call("attacker@privacycloud.com")).resolves.toBe(true);

    expect(prismaMock.organization.findFirst).toHaveBeenCalledWith({
      where: { domain: "privacycloud.com" },
    });
    expect(prismaMock.organizationMember.create).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("auto-joins as MEMBER only (no elevated role) when an Organization domain matches", async () => {
    prismaMock.organization.findFirst.mockResolvedValue({ id: "org-x" });
    prismaMock.organizationMember.findFirst.mockResolvedValue(null);
    prismaMock.organizationMember.create.mockResolvedValue({});
    prismaMock.auditLog.create.mockResolvedValue({});

    await expect(call("new@acme.example", "user-2")).resolves.toBe(true);

    expect(prismaMock.organizationMember.create).toHaveBeenCalledTimes(1);
    const created = prismaMock.organizationMember.create.mock.calls[0][0];
    expect(created.data.role).toBe("MEMBER");
    expect(created.data.organizationId).toBe("org-x");
    expect(created.data.userId).toBe("user-2");
  });

  it("does not create a duplicate membership when the user already belongs to the org", async () => {
    prismaMock.organization.findFirst.mockResolvedValue({ id: "org-x" });
    prismaMock.organizationMember.findFirst.mockResolvedValue({ id: "member-1" });

    await expect(call("existing@acme.example")).resolves.toBe(true);

    expect(prismaMock.organizationMember.create).not.toHaveBeenCalled();
  });

  it("is a no-op and still succeeds when the user has no email", async () => {
    await expect(call(null)).resolves.toBe(true);
    expect(prismaMock.organization.findFirst).not.toHaveBeenCalled();
  });
});
