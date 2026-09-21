// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The import routes, through their real handlers, against an in-memory fake.
 *
 * One shared key lets a sibling application act on an account by stating its
 * email. The routes used to take the account's first membership in no defined
 * order, never looked at the role (a viewer's address permitted writes) and
 * wrote no audit entry. They now:
 *   - act on the organisation the sender names, which must be the account's;
 *   - refuse a write for an account with several organisations and none named;
 *   - refuse a write for a role that may not write, or that is unknown;
 *   - write one audit entry per record created.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const users: Row[] = [];
  const memberships: Row[] = [];
  const organizations: Row[] = [];
  const systems: Row[] = [];
  const vendors: Row[] = [];
  const audit: Row[] = [];

  const db = {
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => {
        const user = users.find((u) => u.email === where.email);
        if (!user) return null;
        const own = memberships
          .filter((m) => m.userId === user.id)
          // The fake honours the ordering the resolver asks for.
          .sort((a, b) => (a.joinedAt as number) - (b.joinedAt as number))
          .map((m) => ({ ...m, organization: organizations.find((o) => o.id === m.organizationId) }));
        return { ...user, organizationMemberships: own };
      },
    },
    aISystem: {
      findFirst: async () => null,
      count: async () => 0,
      create: async ({ data }: { data: Row }) => {
        const row = { id: `sys-${systems.length + 1}`, ...data };
        systems.push(row);
        return row;
      },
    },
    aIVendor: {
      findFirst: async () => null,
      count: async () => 0,
      create: async ({ data }: { data: Row }) => {
        const row = { id: `ven-${vendors.length + 1}`, ...data };
        vendors.push(row);
        return row;
      },
    },
    auditLog: {
      createMany: async ({ data }: { data: Row[] }) => {
        audit.push(...data);
        return { count: data.length };
      },
    },
  };
  return { db, users, memberships, organizations, systems, vendors, audit };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));

import { POST as importSystems } from "@/app/api/import/dpc-ai-systems/route";
import { POST as importVendors } from "@/app/api/import/portfolio-vendors/route";
import { __resetRateLimitStore } from "@/lib/rate-limit";

const KEY = "test-import-key";

function post(path: string, body: unknown, key: string = KEY) {
  return new Request(`http://localhost/api/import/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify(body),
  });
}

const oneSystem = [{ name: "Screening model", dpoCentralSystemId: "dpc-1" }];
const oneVendor = [{ name: "A vendor" }];

beforeEach(() => {
  for (const list of [H.users, H.memberships, H.organizations, H.systems, H.vendors, H.audit]) {
    list.length = 0;
  }
  __resetRateLimitStore();
  vi.stubEnv("VW_IMPORT_API_KEYS", KEY);
  vi.spyOn(console, "error").mockImplementation(() => {});

  H.organizations.push({ id: "org-a", name: "Org A" }, { id: "org-b", name: "Org B" });
  H.users.push(
    { id: "u-member", email: "member@a.example" },
    { id: "u-viewer", email: "viewer@a.example" },
    { id: "u-odd", email: "odd@a.example" },
    { id: "u-two", email: "two@a.example" },
  );
  H.memberships.push(
    { userId: "u-member", organizationId: "org-a", role: "MEMBER", joinedAt: 1 },
    { userId: "u-viewer", organizationId: "org-a", role: "VIEWER", joinedAt: 1 },
    { userId: "u-odd", organizationId: "org-a", role: "SOMETHING_NEW", joinedAt: 1 },
    // Stored newest first, so "the first row" is not the oldest membership.
    { userId: "u-two", organizationId: "org-b", role: "ADMIN", joinedAt: 2 },
    { userId: "u-two", organizationId: "org-a", role: "ADMIN", joinedAt: 1 },
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("import routes: who may write, and where", () => {
  it("a viewer's address does not permit a write", async () => {
    const res = await importSystems(
      post("dpc-ai-systems", { userEmail: "viewer@a.example", systems: oneSystem }),
    );
    expect(res.status).toBe(403);
    expect(H.systems).toHaveLength(0);

    const vendorsRes = await importVendors(
      post("portfolio-vendors", { userEmail: "viewer@a.example", vendors: oneVendor }),
    );
    expect(vendorsRes.status).toBe(403);
    expect(H.vendors).toHaveLength(0);
  });

  it("a role this product does not know is refused", async () => {
    const res = await importSystems(
      post("dpc-ai-systems", { userEmail: "odd@a.example", systems: oneSystem }),
    );
    expect(res.status).toBe(403);
    expect(H.systems).toHaveLength(0);
  });

  it("an account with two organisations and none named is refused, not guessed", async () => {
    const res = await importSystems(
      post("dpc-ai-systems", { userEmail: "two@a.example", systems: oneSystem }),
    );
    expect(res.status).toBe(409);
    expect(H.systems).toHaveLength(0);
  });

  it("naming an organisation the account does not belong to is refused", async () => {
    const res = await importSystems(
      post("dpc-ai-systems", {
        userEmail: "member@a.example",
        organizationId: "org-b",
        systems: oneSystem,
      }),
    );
    expect(res.status).toBe(404);
    expect(H.systems).toHaveLength(0);
  });

  it("the named organisation is the one written to", async () => {
    const res = await importSystems(
      post("dpc-ai-systems", {
        userEmail: "two@a.example",
        organizationId: "org-b",
        systems: oneSystem,
      }),
    );
    expect(res.status).toBe(200);
    expect(H.systems).toHaveLength(1);
    expect(H.systems[0].organizationId).toBe("org-b");
  });

  it("a member with one organisation still imports as before, and the write is audited", async () => {
    const res = await importSystems(
      post("dpc-ai-systems", { userEmail: "member@a.example", systems: oneSystem }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ exported: 1, orgName: "Org A" });
    expect(H.audit).toHaveLength(1);
    expect(H.audit[0]).toMatchObject({
      organizationId: "org-a",
      userId: "u-member",
      entityType: "AISystem",
      entityId: "sys-1",
      action: "CREATE",
    });

    const vendorsRes = await importVendors(
      post("portfolio-vendors", { userEmail: "member@a.example", vendors: oneVendor }),
    );
    expect(vendorsRes.status).toBe(200);
    expect(H.audit).toHaveLength(2);
    expect(H.audit[1]).toMatchObject({ entityType: "AIVendor", entityId: "ven-1", action: "CREATE" });
  });

  it("the shared key is still required", async () => {
    const res = await importSystems(
      post("dpc-ai-systems", { userEmail: "member@a.example", systems: oneSystem }, "wrong-key"),
    );
    expect(res.status).toBe(401);
    expect(H.systems).toHaveLength(0);
  });
});
