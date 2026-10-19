// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Invitations by e-mail, through the real team router over an in-memory fake.
 *
 *   - no role above the inviter's, and only owners and admins invite;
 *   - nothing is sent from a test (or anywhere outside production): the
 *     link is logged and handed back to the inviter;
 *   - the link is stored only as a hash, works once, lapses, and only for
 *     the invited address;
 *   - accepting creates the membership with its role and departments, and
 *     passes any department ownership to the new member;
 *   - an inviter demoted after sending caps the role; one no longer able to
 *     invite voids the invitation.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  function matches(row: Row, where: unknown): boolean {
    if (!where || typeof where !== "object") return true;
    for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
      if (key === "AND") {
        if (!(value as unknown[]).every((c) => matches(row, c))) return false;
      } else if (key === "user") {
        const want = (value as { email?: { equals: string } }).email?.equals?.toLowerCase();
        const user = users.find((u) => u.id === row.userId);
        if (!user || (want && String(user.email).toLowerCase() !== want)) return false;
      } else if (value instanceof Date) {
        if ((row[key] as Date)?.getTime() !== value.getTime()) return false;
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        const op = value as Record<string, unknown>;
        if ("in" in op && !(op.in as unknown[]).includes(row[key])) return false;
        if ("gt" in op && !((row[key] as Date).getTime() > (op.gt as Date).getTime())) return false;
        if ("equals" in op && String(row[key] ?? "").toLowerCase() !== String(op.equals).toLowerCase()) return false;
      } else if ((row[key] ?? null) !== value) {
        return false;
      }
    }
    return true;
  }

  function table() {
    let rows: Row[] = [];
    let seq = 0;
    const t = {
      __set(next: Row[]) {
        rows = next.map((r) => ({ ...r }));
      },
      __rows: () => rows,
      findFirst: async ({ where }: { where?: Row } = {}) => rows.find((r) => matches(r, where)) ?? null,
      findUnique: async ({ where, include, select }: { where: Row; include?: Row; select?: Row }) => {
        const row = rows.find((r) => matches(r, where));
        if (!row) return null;
        return include?.organization || select?.organization
          ? { ...row, organization: orgs.find((o) => o.id === row.organizationId) }
          : row;
      },
      findMany: async ({ where }: { where?: Row } = {}) => rows.filter((r) => matches(r, where)),
      count: async ({ where }: { where?: Row } = {}) => rows.filter((r) => matches(r, where)).length,
      create: async ({ data }: { data: Row }) => {
        const row = { id: `gen-${++seq}`, createdAt: new Date(), acceptedAt: null, revokedAt: null, ...data };
        rows.push(row);
        return row;
      },
      createMany: async ({ data }: { data: Row[] }) => {
        for (const d of data) rows.push({ id: `gen-${++seq}`, ...d });
        return { count: data.length };
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = rows.find((r) => matches(r, where));
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
    };
    return t;
  }

  const orgs = [{ id: "org-a", name: "Org A", operatingJurisdictions: [], pilotFirstSignInAt: null, plan: null }];
  const users: Row[] = [];
  const members = table();
  const db = {
    organizationMember: members,
    organizationInvitation: table(),
    businessUnit: table(),
    businessUnitMember: table(),
    aIPolicy: table(),
    auditLog: table(),
    $transaction: async (fn: unknown) => (typeof fn === "function" ? fn(db) : Promise.all(fn as unknown[])),
  };
  // The org guard looks members up by (organizationId, userId).
  const plainFindUnique = members.findUnique;
  (members as { findUnique: unknown }).findUnique = async (args: { where: Row; include?: Row }) => {
    const key = (args.where as { organizationId_userId?: { organizationId: string; userId: string } })
      .organizationId_userId;
    if (!key) return plainFindUnique(args);
    const m = members.__rows().find((r) => r.organizationId === key.organizationId && r.userId === key.userId);
    return m ? { ...m, organization: orgs[0] } : null;
  };

  function reset() {
    users.length = 0;
    users.push(
      { id: "owner", email: "owner@acme.test" },
      { id: "admin", email: "admin@acme.test" },
      { id: "officer", email: "officer@acme.test" },
      { id: "newbie", email: "New.Person@Acme.test" },
      { id: "stranger", email: "stranger@else.test" },
    );
    members.__set([
      { id: "mem-owner", organizationId: "org-a", userId: "owner", role: "OWNER" },
      { id: "mem-admin", organizationId: "org-a", userId: "admin", role: "ADMIN" },
      { id: "mem-officer", organizationId: "org-a", userId: "officer", role: "AI_OFFICER" },
    ]);
    db.organizationInvitation.__set([]);
    db.businessUnit.__set([
      { id: "dept-hr", organizationId: "org-a", name: "HR", ownerId: null, ownerInvitationId: null },
    ]);
    db.businessUnitMember.__set([]);
    db.aIPolicy.__set([]);
    db.auditLog.__set([]);
  }

  return { db, reset, users };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/server/services/pilot/caps", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/services/pilot/caps")>();
  return { ...original, assertPilotRoom: async () => {}, assertPilotWritable: () => {}, assertPilotOrganizationLimit: async () => {} };
});
const sendSpy = vi.hoisted(() => ({ sent: [] as unknown[] }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: async (m: unknown) => (sendSpy.sent.push(m), { data: { id: "x" }, error: null }) };
  },
}));

import { createInnerTRPCContext } from "@/server/trpc";
import { teamRouter } from "@/server/routers/governance/team";
import {
  buildInvitationEmail,
  canGrantRole,
  hashInvitationToken,
  invitationMailEnabled,
  invitationState,
  lowerRole,
} from "@/server/services/team/invitations";

function caller(userId: string) {
  const email = String(H.users.find((u) => u.id === userId)?.email);
  const session = {
    user: { id: userId, email, name: userId },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return teamRouter.createCaller(createInnerTRPCContext({ session, getCookie: () => undefined }));
}

/** The secret from the link handed back to the inviter. */
const tokenOf = (link: string | null) => decodeURIComponent(String(link).split("/invite/")[1]);

beforeEach(() => {
  H.reset();
  sendSpy.sent.length = 0;
});

describe("the role rule", () => {
  it("never above the inviter's, and only owners and admins invite", () => {
    expect(canGrantRole("OWNER", "OWNER")).toBe(true);
    expect(canGrantRole("ADMIN", "OWNER")).toBe(false);
    expect(canGrantRole("ADMIN", "ADMIN")).toBe(true);
    expect(canGrantRole("ADMIN", "VIEWER")).toBe(true);
    expect(canGrantRole("AI_OFFICER", "VIEWER")).toBe(false);
    expect(lowerRole("OWNER", "ADMIN")).toBe("ADMIN");
  });

  it("refuses an admin inviting an owner, and an AI officer inviting at all", async () => {
    await expect(
      caller("admin").invite({ organizationId: "org-a", email: "x@acme.test", role: "OWNER" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller("officer").invite({ organizationId: "org-a", email: "x@acme.test", role: "VIEWER" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(H.db.organizationInvitation.__rows()).toHaveLength(0);
  });
});

describe("sending", () => {
  it("sends nothing from a test, logs the link and hands it back", async () => {
    expect(invitationMailEnabled()).toBe(false);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await caller("owner").invite({
      organizationId: "org-a",
      email: " New.Person@Acme.test ",
      role: "AI_OFFICER",
      businessUnitIds: ["dept-hr"],
    });
    expect(sendSpy.sent).toHaveLength(0);
    expect(result.sent).toBe(false);
    expect(result.link).toMatch(/\/invite\/[A-Za-z0-9_-]{40,}$/);
    expect(log).toHaveBeenCalled();
    log.mockRestore();

    const [row] = H.db.organizationInvitation.__rows();
    expect(row.email).toBe("new.person@acme.test");
    expect(row.role).toBe("AI_OFFICER");
    expect(row.businessUnitIds).toEqual(["dept-hr"]);
    // Only the hash of the secret is stored.
    expect(row.tokenHash).toBe(hashInvitationToken(tokenOf(result.link)));
    expect(JSON.stringify(row)).not.toContain(tokenOf(result.link));
  });

  it("refuses a person who is already a member", async () => {
    await expect(
      caller("owner").invite({ organizationId: "org-a", email: "ADMIN@acme.test", role: "MEMBER" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("drops departments for a role that always sees the whole organization", async () => {
    await caller("owner").invite({ organizationId: "org-a", email: "a@acme.test", role: "ADMIN", businessUnitIds: ["dept-hr"] });
    expect(H.db.organizationInvitation.__rows()[0].businessUnitIds).toEqual([]);
  });

  it("a second invitation to the same address replaces the first link", async () => {
    const first = await caller("owner").invite({ organizationId: "org-a", email: "new.person@acme.test", role: "MEMBER" });
    const second = await caller("owner").invite({ organizationId: "org-a", email: "new.person@acme.test", role: "VIEWER" });
    expect(H.db.organizationInvitation.__rows()).toHaveLength(1);
    await expect(caller("newbie").accept({ token: tokenOf(first.link) })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller("newbie").accept({ token: tokenOf(second.link) })).resolves.toMatchObject({ role: "VIEWER" });
  });
});

describe("accepting", () => {
  async function invite(role: "MEMBER" | "AI_OFFICER" | "ADMIN" = "MEMBER", by = "owner") {
    const result = await caller(by).invite({
      organizationId: "org-a",
      email: "new.person@acme.test",
      role,
      businessUnitIds: role === "ADMIN" ? [] : ["dept-hr"],
    });
    return tokenOf(result.link);
  }

  it("creates the membership with its role and departments, and passes ownership on", async () => {
    const token = await invite("AI_OFFICER");
    const invitationId = H.db.organizationInvitation.__rows()[0].id;
    // A pending invitee named as the department's owner.
    H.db.businessUnit.__rows()[0].ownerInvitationId = invitationId;
    // A policy whose owner was named by the invited address.
    H.db.aIPolicy.__set([{ id: "pol-1", organizationId: "org-a", ownerMemberId: null, ownerName: "new.person@acme.test" }]);

    const preview = await caller("newbie").preview({ token });
    expect(preview).toMatchObject({ organizationName: "Org A", role: "AI_OFFICER", state: "pending", forThisAccount: true });

    const result = await caller("newbie").accept({ token });
    expect(result).toMatchObject({ organizationId: "org-a", role: "AI_OFFICER" });
    const member = H.db.organizationMember.__rows().find((m) => m.userId === "newbie");
    expect(member).toMatchObject({ role: "AI_OFFICER" });
    expect(H.db.businessUnitMember.__rows()).toEqual([
      expect.objectContaining({ memberId: member!.id, businessUnitId: "dept-hr" }),
    ]);
    expect(H.db.businessUnit.__rows()[0]).toMatchObject({ ownerId: member!.id, ownerInvitationId: null });
    expect(H.db.aIPolicy.__rows()[0]).toMatchObject({ ownerMemberId: member!.id, ownerName: null });
  });

  it("spends the link once", async () => {
    const token = await invite();
    await caller("newbie").accept({ token });
    await expect(caller("newbie").accept({ token })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(H.db.organizationMember.__rows().filter((m) => m.userId === "newbie")).toHaveLength(1);
  });

  it("works only for the invited address", async () => {
    const token = await invite();
    expect(await caller("stranger").preview({ token })).toMatchObject({ forThisAccount: false });
    await expect(caller("stranger").accept({ token })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(H.db.organizationMember.__rows().some((m) => m.userId === "stranger")).toBe(false);
  });

  it("lapses at its expiry and stops when withdrawn", async () => {
    const token = await invite();
    const row = H.db.organizationInvitation.__rows()[0];
    row.expiresAt = new Date(Date.now() - 1000);
    await expect(caller("newbie").accept({ token })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const fresh = await invite();
    await caller("owner").revoke({ organizationId: "org-a", id: String(row.id) });
    await expect(caller("newbie").accept({ token: fresh })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("caps the role at the inviter's role today", async () => {
    const sent = await caller("owner").invite({ organizationId: "org-a", email: "new.person@acme.test", role: "OWNER" });
    // A second owner exists, and the inviting owner is made an admin.
    H.db.organizationMember.__rows().find((m) => m.userId === "owner")!.role = "ADMIN";
    await expect(caller("newbie").accept({ token: tokenOf(sent.link) })).resolves.toMatchObject({ role: "ADMIN" });
  });

  it("voids the invitation when the inviter can no longer invite", async () => {
    const token = await invite("MEMBER", "admin");
    H.db.organizationMember.__rows().find((m) => m.userId === "admin")!.role = "AI_OFFICER";
    await expect(caller("newbie").accept({ token })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("an unknown link is refused", async () => {
    await expect(caller("newbie").accept({ token: "x".repeat(43) })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await caller("newbie").preview({ token: "x".repeat(43) })).toBeNull();
  });
});

describe("the e-mail", () => {
  it("names the organization, the role and the date, escapes HTML, and has no long dash", () => {
    for (const locale of ["en", "es"] as const) {
      const mail = buildInvitationEmail({
        locale,
        organizationName: "Acme <script>",
        inviterName: "Ana",
        role: "AI_OFFICER",
        url: "https://example.test/invite/abc",
        expiresAt: new Date("2026-10-26T12:00:00Z"),
      });
      expect(mail.subject).toContain("Acme <script>");
      expect(mail.html).not.toContain("<script>");
      expect(mail.html).toContain("Acme &lt;script&gt;");
      expect(mail.text).toContain("https://example.test/invite/abc");
      expect(mail.text).toContain(locale === "es" ? "Responsable de IA" : "AI Officer");
      expect(mail.text).toContain("2026");
      expect(`${mail.subject}${mail.text}`).not.toMatch(/—|--/);
    }
  });

  it("states in order: pending, expired, accepted, revoked", () => {
    const base = { acceptedAt: null, revokedAt: null, expiresAt: new Date(Date.now() + 1000) };
    expect(invitationState(base)).toBe("pending");
    expect(invitationState({ ...base, expiresAt: new Date(0) })).toBe("expired");
    expect(invitationState({ ...base, acceptedAt: new Date() })).toBe("accepted");
    expect(invitationState({ ...base, revokedAt: new Date() })).toBe("revoked");
  });
});
