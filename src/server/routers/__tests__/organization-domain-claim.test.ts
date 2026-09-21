// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The domain claim on organization.create, through the real router.
 *
 * An organisation's domain decides who is joined to it at sign-in. It used to
 * be a free string: any account could claim any domain. It is now kept only
 * when it equals the domain of the creator's own address, read from the
 * account record, and is not a public mail provider. Anything else: the
 * organisation is created WITHOUT a domain, never refused.
 *
 * `organization` has no update procedure that writes `domain`; the last test
 * reads the router source so that one added later cannot skip the rule unseen.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const organizations: Row[] = [];
  const users: Row[] = [];
  const db = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        users.find((u) => u.id === where.id) ?? null,
    },
    organization: {
      findMany: async () => organizations.map((o) => ({ slug: o.slug })),
      create: async ({ data }: { data: Row }) => {
        const { members: _members, ...rest } = data;
        const org = { id: `org-${organizations.length + 1}`, ...rest };
        organizations.push(org);
        return { ...org, members: [] };
      },
    },
    organizationMember: { count: async () => 0 },
    auditLog: { create: async () => ({}) },
  };
  return { db, organizations, users };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { createInnerTRPCContext } from "@/server/trpc";
import { organizationRouter } from "@/server/routers/governance/organization";

function callerFor(id: string, sessionEmail: string) {
  const session = {
    user: { id, email: sessionEmail, name: id },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return organizationRouter.createCaller(
    createInnerTRPCContext({ session, getCookie: () => undefined }),
  );
}

beforeEach(() => {
  H.organizations.length = 0;
  H.users.length = 0;
  H.users.push(
    { id: "stranger", email: "stranger@elsewhere.example" },
    { id: "employee", email: "Someone@Acme.Example" },
    { id: "webmail", email: "person@gmail.com" },
  );
});

describe("organization.create: the domain claim", () => {
  it("a stranger claiming a domain that is not theirs gets the organisation, without the domain", async () => {
    const org = await callerFor("stranger", "stranger@elsewhere.example").create({
      name: "Collector",
      slug: "collector",
      domain: "acme.example",
    });
    expect(org.id).toBeTruthy();
    expect(H.organizations[0].domain).toBeNull();
  });

  it("the address in the session is not proof: the account record decides", async () => {
    // A session that states an address at the claimed domain, on an account
    // whose recorded address is elsewhere.
    await callerFor("stranger", "stranger@acme.example").create({
      name: "Collector",
      slug: "collector",
      domain: "acme.example",
    });
    expect(H.organizations[0].domain).toBeNull();
  });

  it("a public mail provider is never stored, even for a person who does use it", async () => {
    await callerFor("webmail", "person@gmail.com").create({
      name: "Household",
      slug: "household",
      domain: "gmail.com",
    });
    expect(H.organizations[0].domain).toBeNull();
  });

  it("the creator's own domain is kept, lower-cased", async () => {
    await callerFor("employee", "Someone@Acme.Example").create({
      name: "Acme",
      slug: "acme",
      domain: " ACME.example ",
    });
    expect(H.organizations[0].domain).toBe("acme.example");
  });

  it("no domain asked for: created without one, as before", async () => {
    await callerFor("employee", "Someone@Acme.Example").create({ name: "Acme", slug: "acme" });
    expect(H.organizations[0].domain).toBeNull();
  });

  it("no other line of the router writes `domain`", () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/routers/governance/organization.ts"),
      "utf8",
    );
    const writes = source.split("\n").filter((line) => /^\s*domain\b\s*[:,]/.test(line));
    // The zod input, and the shorthand in the create data fed by claimableDomain.
    expect(writes.map((l) => l.trim())).toEqual(["domain: z.string().optional(),", "domain,"]);
    expect(source).toContain("const domain = claimableDomain(input.domain, creator?.email);");
  });
});
