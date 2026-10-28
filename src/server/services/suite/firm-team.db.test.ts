// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The DPO Central firm team applied here, against a real Postgres, through
 * the real endpoint and routers: which organisations are reached (linked,
 * created by the consultant, never co-owned with another adviser, never
 * another consultant's), memberships of a person's own never touched,
 * removal limited to firm rows, idempotence, replayed and older pushes
 * refused, first sign-in, the server refusing changes to firm rows, and the
 * firm rows leaving when the consultant stops being an owner or the link goes.
 *
 * Skipped unless SEED_TEST_DATABASE_URL is set, and refused unless it points
 * at localhost: this test writes and deletes rows. Run against a throwaway
 * database after `prisma migrate deploy`:
 *   SEED_TEST_DATABASE_URL=postgresql://u:p@localhost:5432/db npx vitest run src/server/services/suite/firm-team.db.test.ts
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  const url = process.env.SEED_TEST_DATABASE_URL;
  const local = !!url && /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
  return { url, local };
});

vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const client = new PrismaClient({ datasourceUrl: H.local ? H.url : "postgresql://x@127.0.0.1:1/none" });
  return { default: client, prisma: client };
});
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import prisma from "@/lib/prisma";
import { signFirmTeamPush } from "@/lib/suite-firm-team";
import { signSuiteRequest } from "@/lib/suite-plan-state";
import { POST } from "@/app/api/suite/firm-team/route";
import { applyFirmTeamsAtSignIn } from "./firm-team";
import { removeLink } from "./dpc-link";
import { createInnerTRPCContext } from "@/server/trpc";
import { organizationRouter } from "@/server/routers/governance/organization";

const SECRET = "local-test-secret";
const tag = `ft${Date.now()}`;
const email = (n: string) => `${tag}-${n}@example.test`;
const DPC_FIRM = `${tag}-dpc-firm`;
const DPC_OTHER = `${tag}-dpc-other`;

type Ids = Record<string, string>;
const users: Ids = {};
const orgs: Ids = {};
let clock = Date.parse("2026-10-27T10:00:00Z");

function linkSettings(dpcOrganizationId: string) {
  return {
    dpoCentralLink: {
      active: true,
      dpcOrganizationId,
      dpcOrganizationName: "Client in DPO Central",
      dpcCountry: null,
      linkedAt: new Date().toISOString(),
      linkedByUserId: "x",
      linkedByEmail: "x",
    },
  };
}

async function addOrg(key: string, owners: string[], extra: { settings?: object; createdBy?: string } = {}) {
  const org = await prisma.organization.create({
    data: {
      name: key,
      slug: `${tag}-${key}`.toLowerCase(),
      settings: extra.settings ?? {},
      createdById: extra.createdBy ? users[extra.createdBy] : null,
      members: { create: owners.map((o) => ({ userId: users[o], role: "OWNER" as const })) },
    },
  });
  orgs[key] = org.id;
}

function body(members: Array<{ email: string; role: string; state?: string }>, opts: { at?: number; ids?: string[] } = {}) {
  clock += 1000;
  return JSON.stringify({
    version: 1,
    sentAt: new Date(opts.at ?? clock).toISOString(),
    ownerEmail: email("cons").toUpperCase(),
    firmOrganizationIds: opts.ids ?? [DPC_FIRM],
    members: members.map((m) => ({ state: "accepted", ...m })),
  });
}

function request(raw: string, sig?: string) {
  return new Request("http://localhost/api/suite/firm-team", {
    method: "POST",
    headers: { "x-suite-signature": sig ?? signFirmTeamPush(SECRET, Math.floor(Date.now() / 1000), raw) },
    body: raw,
  });
}

async function push(members: Array<{ email: string; role: string; state?: string }>, opts: { ids?: string[] } = {}) {
  const res = await POST(request(body(members, opts)));
  return { status: res.status, json: await res.json() };
}

async function firmRows(personKey: string) {
  const rows = await prisma.organizationMember.findMany({
    where: { userId: users[personKey], organizationId: { in: Object.values(orgs) } },
    select: { organizationId: true, role: true, firmTeamMemberId: true },
  });
  const name = (id: string) => Object.entries(orgs).find(([, v]) => v === id)?.[0];
  return rows
    .map((r) => ({ org: name(r.organizationId)!, role: r.role, firm: r.firmTeamMemberId ? "firm" : "own" }))
    .sort((a, b) => a.org.localeCompare(b.org));
}

function caller(userKey: string) {
  const session = {
    user: { id: users[userKey], email: email(userKey), name: userKey },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return organizationRouter.createCaller(createInnerTRPCContext({ session, getCookie: () => undefined }));
}

describe.skipIf(!H.local)("DPO Central firm team applied here (local Postgres only)", () => {
  beforeAll(async () => {
    vi.stubEnv("SUITE_FIRM_TEAM", "on");
    vi.stubEnv("PLAN_SYNC_SECRET", SECRET);
    for (const [k, type] of [
      ["cons", "AI_GOVERNANCE_CONSULTANT"],
      ["cons2", "AI_GOVERNANCE_CONSULTANT"],
      ["client", "BUSINESS_USER"],
      ["staff", null],
      ["indep", null],
    ] as const) {
      const u = await prisma.user.create({ data: { email: email(k), name: k, userType: type } });
      users[k] = u.id;
    }
    await addOrg("linked", ["cons"], { settings: linkSettings(DPC_FIRM) }); // before createdById: link only
    await addOrg("linkedOther", ["cons"], { settings: linkSettings(DPC_OTHER) }); // linked to a non-firm org
    await addOrg("created", ["cons"], { createdBy: "cons" });
    await addOrg("createdCoOwned", ["cons", "client"], { createdBy: "cons" }); // rule 2 needs the only owner
    await addOrg("linkedWithAdviser", ["cons", "cons2"], { settings: linkSettings(DPC_FIRM) });
    await addOrg("linkedWithClient", ["cons", "client"], { settings: linkSettings(DPC_FIRM) });
    await addOrg("anotherConsultants", ["cons2"], { createdBy: "cons2", settings: linkSettings(DPC_FIRM) });
    await addOrg("old", ["cons"]); // neither linked nor created-by
    // A membership of the person's own, and a client administrator.
    await prisma.organizationMember.create({ data: { organizationId: orgs.linked, userId: users.indep, role: "VIEWER" } });
    await prisma.organizationMember.create({ data: { organizationId: orgs.linked, userId: users.client, role: "ADMIN" } });
  });

  afterEach(() => undefined);

  afterAll(async () => {
    const ids = Object.values(orgs);
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: ids } } });
    await prisma.organization.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.firmTeamMember.deleteMany({ where: { ownerEmail: { startsWith: tag } } });
    await prisma.firmTeamSync.deleteMany({ where: { ownerEmail: { startsWith: tag } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: Object.values(users) } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it("refuses a bad, expired or other-endpoint signature, and a malformed push", async () => {
    const raw = body([{ email: email("staff"), role: "MEMBER" }]);
    const now = Math.floor(Date.now() / 1000);
    expect((await POST(request(raw, signFirmTeamPush("wrong", now, raw)))).status).toBe(401);
    expect((await POST(request(raw, signFirmTeamPush(SECRET, now - 301, raw)))).status).toBe(401);
    expect((await POST(request(raw, signSuiteRequest(SECRET, now, raw)))).status).toBe(401);
    expect((await POST(request(raw, "")))).toHaveProperty("status", 401);
    const owner = body([{ email: email("staff"), role: "OWNER" }]);
    expect((await POST(request(owner))).status).toBe(400);
    expect(await prisma.firmTeamSync.count({ where: { ownerEmail: email("cons") } })).toBe(0);
  });

  it("reaches the linked and created organisations only, never touching a membership of the person's own", async () => {
    const res = await push([
      { email: email("staff"), role: "PRIVACY_OFFICER" },
      { email: email("indep"), role: "MEMBER" },
      { email: email("late"), role: "VIEWER", state: "pending" },
    ]);
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ applied: true, organizations: 3 });
    expect(await firmRows("staff")).toEqual([
      { org: "created", role: "AI_OFFICER", firm: "firm" },
      { org: "linked", role: "AI_OFFICER", firm: "firm" },
      { org: "linkedWithClient", role: "AI_OFFICER", firm: "firm" },
    ]);
    expect(await firmRows("indep")).toEqual([
      { org: "created", role: "MEMBER", firm: "firm" },
      { org: "linked", role: "VIEWER", firm: "own" },
      { org: "linkedWithClient", role: "MEMBER", firm: "firm" },
    ]);
    expect(await prisma.firmTeamMember.count({ where: { ownerEmail: email("cons") } })).toBe(3);
  });

  it("refuses a replayed push and one older than the last applied", async () => {
    const raw = body([{ email: email("staff"), role: "ADMIN" }]);
    expect((await POST(request(raw))).status).toBe(200);
    expect((await POST(request(raw))).status).toBe(409); // the same push again
    const older = body([], { at: clock - 5000 });
    expect((await POST(request(older))).status).toBe(409);
    expect(await firmRows("staff")).toEqual([
      { org: "created", role: "ADMIN", firm: "firm" },
      { org: "linked", role: "ADMIN", firm: "firm" },
      { org: "linkedWithClient", role: "ADMIN", firm: "firm" },
    ]);
  });

  it("is idempotent, and a role change reaches the firm rows only", async () => {
    const list = [
      { email: email("staff"), role: "PRIVACY_OFFICER" },
      { email: email("indep"), role: "MEMBER" },
      { email: email("late"), role: "VIEWER", state: "pending" },
    ];
    await push(list);
    const again = await push(list);
    expect(again.json).toMatchObject({ added: 0, updated: 0, removed: 0 });
    await push(list.map((m) => (m.email === email("indep") ? { ...m, role: "ADMIN" } : m)));
    expect(await firmRows("indep")).toEqual([
      { org: "created", role: "ADMIN", firm: "firm" },
      { org: "linked", role: "VIEWER", firm: "own" },
      { org: "linkedWithClient", role: "ADMIN", firm: "firm" },
    ]);
  });

  it("gives a person invited before signing up the memberships at their first sign-in", async () => {
    const late = await prisma.user.create({ data: { email: email("late"), name: "late" } });
    users.late = late.id;
    expect(await firmRows("late")).toEqual([]);
    expect(await applyFirmTeamsAtSignIn(prisma, late.id, email("late"))).toBe(3);
    expect((await firmRows("late")).map((r) => [r.org, r.role])).toEqual([
      ["created", "VIEWER"],
      ["linked", "VIEWER"],
      ["linkedWithClient", "VIEWER"],
    ]);
  });

  it("the server refuses changes to firm rows, for the client and for the consultant", async () => {
    const row = await prisma.organizationMember.findFirstOrThrow({
      where: { organizationId: orgs.linked, userId: users.staff },
    });
    await expect(
      caller("client").removeMember({ organizationId: orgs.linked, memberId: row.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller("cons").updateMember({ organizationId: orgs.linked, memberId: row.id, role: "VIEWER" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    // A membership of the person's own is still managed here.
    const own = await prisma.organizationMember.findFirstOrThrow({
      where: { organizationId: orgs.linked, userId: users.indep },
    });
    await caller("cons").updateMember({ organizationId: orgs.linked, memberId: own.id, role: "MEMBER" });
  });

  it("a new organisation the consultant creates records its creator and gets the firm team", async () => {
    const created = await caller("cons").create({ name: "New client", slug: `${tag}-new` });
    orgs.newClient = created.id;
    const row = await prisma.organization.findUniqueOrThrow({ where: { id: created.id }, select: { createdById: true } });
    expect(row.createdById).toBe(users.cons);
    expect((await firmRows("staff")).map((r) => r.org)).toContain("newClient");
    // Another consultant's new organisation gets none of it.
    const other = await caller("cons2").create({ name: "Other", slug: `${tag}-other` });
    orgs.otherNew = other.id;
    expect((await firmRows("staff")).map((r) => r.org)).not.toContain("otherNew");
  });

  it("the firm rows leave when the consultant stops being an owner", async () => {
    const consRow = await prisma.organizationMember.findFirstOrThrow({
      where: { organizationId: orgs.linkedWithClient, userId: users.cons },
    });
    await caller("client").updateMember({ organizationId: orgs.linkedWithClient, memberId: consRow.id, role: "ADMIN" });
    expect((await firmRows("staff")).map((r) => r.org)).not.toContain("linkedWithClient");
    expect(
      await prisma.organizationMember.count({ where: { organizationId: orgs.linkedWithClient, firmTeamMemberId: { not: null } } }),
    ).toBe(0);
  });

  it("the firm rows leave when the DPO Central link is removed", async () => {
    await removeLink(prisma, orgs.linked, users.cons, "aisentinel");
    expect((await firmRows("staff")).map((r) => r.org)).not.toContain("linked");
    expect(await firmRows("indep")).toContainEqual({ org: "linked", role: "MEMBER", firm: "own" });
  });

  it("removing a person from the list removes only their firm rows", async () => {
    await push([{ email: email("staff"), role: "PRIVACY_OFFICER" }]);
    expect((await firmRows("indep")).filter((r) => r.firm === "firm")).toEqual([]);
    expect(await firmRows("indep")).toEqual([{ org: "linked", role: "MEMBER", firm: "own" }]);
    expect(await firmRows("late")).toEqual([]);
    expect((await firmRows("staff")).length).toBeGreaterThan(0);
    // An empty list removes the rest.
    await push([]);
    expect(await firmRows("staff")).toEqual([]);
  });

  it("is a 404 with the switch off", async () => {
    vi.stubEnv("SUITE_FIRM_TEAM", "");
    const res = await POST(request(body([])));
    expect(res.status).toBe(404);
    vi.stubEnv("SUITE_FIRM_TEAM", "on");
  });
});
