// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * signIn callback regression test.
 *
 * P0 removed a backdoor that auto-provisioned membership/entitlements for a
 * hardcoded email domain. The only auto-join that remains is data-driven, and
 * a stored domain is treated as a claim, not as a fact: a user is added as a
 * plain MEMBER *iff*
 *   - exactly one Organization stores the user's email domain, and
 *   - that organization's OWNER has an address at that same domain today, and
 *   - the domain is not a public mail provider.
 * There is no special-casing of any domain, and no entitlement/admin grant.
 *
 * These tests lock that behaviour:
 *   - No matching Organization row  → no membership is created (even for the
 *     previously privileged domain), and sign-in still succeeds.
 *   - A stranger's organization claiming the domain → nobody is joined.
 *   - A public mail domain          → nobody is joined, whoever owns the row.
 *   - Two organizations, one domain → nobody is joined.
 *   - An organization without an owner → nobody is joined.
 *   - A proven claim                → the user is auto-joined as role MEMBER
 *     only (never an elevated role), with an AUTO_JOIN audit entry.
 *   - An existing membership        → no duplicate is created.
 *
 * No real database is touched; `@/lib/prisma` is a vi.fn mock.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  // `findFirst` is what the callback used before the claim was checked. It
  // stays mocked, answering as the old query would, so that these tests fail
  // on the old code instead of passing by accident.
  organization: { findFirst: vi.fn(), findMany: vi.fn() },
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

/** A row as the callback selects it: the stored domain and the oldest owner. */
function claimant(id: string, domain: string, ownerEmail: string | null) {
  return {
    id,
    domain,
    members: ownerEmail === null ? [] : [{ user: { email: ownerEmail } }],
  };
}

/** Both the new read and the old one see these organizations. */
function storedOrganizations(rows: ReturnType<typeof claimant>[]) {
  prismaMock.organization.findMany.mockResolvedValue(rows);
  prismaMock.organization.findFirst.mockResolvedValue(rows[0] ?? null);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.organizationMember.findFirst.mockResolvedValue(null);
  prismaMock.organizationMember.create.mockResolvedValue({});
  prismaMock.auditLog.create.mockResolvedValue({});
});

describe("signIn callback", () => {
  it("does NOT provision anything when no Organization matches the email domain (backdoor domain included)", async () => {
    storedOrganizations([]);

    // privacycloud.com was the removed backdoor domain; it now gets nothing.
    await expect(call("attacker@privacycloud.com")).resolves.toBe(true);

    expect(prismaMock.organization.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.organization.findMany.mock.calls[0][0].where).toEqual({
      domain: { equals: "privacycloud.com", mode: "insensitive" },
    });
    expect(prismaMock.organizationMember.create).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("joins nobody to an organization whose owner is not at the claimed domain", async () => {
    storedOrganizations([claimant("org-stranger", "acme.example", "stranger@elsewhere.example")]);

    await expect(call("new@acme.example", "user-2")).resolves.toBe(true);

    expect(prismaMock.organizationMember.create).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("joins nobody on a public mail domain, even when the owner uses it too", async () => {
    storedOrganizations([claimant("org-webmail", "gmail.com", "owner@gmail.com")]);

    await expect(call("new@gmail.com", "user-2")).resolves.toBe(true);

    expect(prismaMock.organizationMember.create).not.toHaveBeenCalled();
  });

  it("joins nobody where two organizations claim one domain, even if one claim is proven", async () => {
    storedOrganizations([
      claimant("org-old", "acme.example", "owner@acme.example"),
      claimant("org-new", "acme.example", "stranger@elsewhere.example"),
    ]);

    await expect(call("new@acme.example", "user-2")).resolves.toBe(true);

    expect(prismaMock.organizationMember.create).not.toHaveBeenCalled();
    // Oldest first, so the read is the same on every sign-in.
    expect(prismaMock.organization.findMany.mock.calls[0][0].orderBy).toEqual([
      { createdAt: "asc" },
      { id: "asc" },
    ]);
  });

  it("joins nobody to an organization that has no owner", async () => {
    storedOrganizations([claimant("org-ownerless", "acme.example", null)]);

    await expect(call("new@acme.example", "user-2")).resolves.toBe(true);

    expect(prismaMock.organizationMember.create).not.toHaveBeenCalled();
  });

  it("auto-joins as MEMBER only (no elevated role) when the owner proves the domain", async () => {
    storedOrganizations([claimant("org-x", "Acme.Example", "Owner@ACME.example")]);

    await expect(call("new@acme.example", "user-2")).resolves.toBe(true);

    expect(prismaMock.organizationMember.create).toHaveBeenCalledTimes(1);
    const created = prismaMock.organizationMember.create.mock.calls[0][0];
    expect(created.data.role).toBe("MEMBER");
    expect(created.data.organizationId).toBe("org-x");
    expect(created.data.userId).toBe("user-2");
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.auditLog.create.mock.calls[0][0].data.action).toBe("AUTO_JOIN");
  });

  it("does not create a duplicate membership when the user already belongs to the org", async () => {
    storedOrganizations([claimant("org-x", "acme.example", "owner@acme.example")]);
    prismaMock.organizationMember.findFirst.mockResolvedValue({ id: "member-1" });

    await expect(call("existing@acme.example")).resolves.toBe(true);

    expect(prismaMock.organizationMember.create).not.toHaveBeenCalled();
  });

  it("is a no-op and still succeeds when the user has no email", async () => {
    await expect(call(null)).resolves.toBe(true);
    expect(prismaMock.organization.findMany).not.toHaveBeenCalled();
    expect(prismaMock.organization.findFirst).not.toHaveBeenCalled();
  });
});
