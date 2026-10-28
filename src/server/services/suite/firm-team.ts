// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The firm team of a DPO Central account, applied here.
 *
 * DPO Central keeps the one list (the people of a consultant's firm, each
 * with a role) and pushes it in full to POST /api/suite/firm-team (contract
 * in src/lib/suite-firm-team.ts). Nothing here manages the list: this module
 * keeps a copy (FirmTeamMember, FirmTeamSync) and turns it into ordinary
 * memberships (OrganizationMember with firmTeamMemberId set), which the
 * membership guard then checks as for anyone else.
 *
 * Which organisations a consultant's firm team reaches (the "firm
 * organisations" here), where the consultant is the account with the
 * consultant's e-mail:
 *   (1) organisations where the consultant is an OWNER and which are actively
 *       linked (settings.dpoCentralLink, src/server/services/suite/dpc-link.ts)
 *       to one of the consultant's firm organisations in DPO Central; and
 *   (2) organisations the consultant created (createdById), where the
 *       consultant is the only OWNER. Organisations created before createdById
 *       existed are reached only through (1).
 * Never an organisation that another adviser also owns: one where another
 * OWNER is an AI governance consultant, or is a DPO Central account with a
 * firm team of its own. In (2) any other OWNER rules the organisation out.
 *
 * What is applied: only memberships carrying firmTeamMemberId are created,
 * changed or removed. A membership a person holds in their own right is never
 * touched, and an organisation where the person already has one is skipped.
 * A person who has not signed in here yet gets the memberships at their
 * first sign-in. When the consultant stops being an owner of an organisation,
 * the link goes, or the organisation is co-owned with another adviser, the
 * firm memberships there go.
 *
 * Hosted pilot: as for any other membership, an organisation not on the paid
 * plan is skipped when the person may not join it (one organisation per
 * account, the members ceiling); the next application tries again.
 *
 * Every application recomputes the whole picture for one consultant, so it is
 * idempotent: applying the same list twice changes nothing the second time.
 */

import { OrganizationRole, type Prisma, type PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/suite-plan-state";
import { aiSentinelRoleFor, type FirmTeamPush } from "@/lib/suite-firm-team";
import { readLink } from "@/server/services/suite/dpc-link";
import { assertPilotOrganizationLimit, assertPilotRoom, isPaidPlan } from "@/server/services/pilot/caps";

type Db = PrismaClient | Prisma.TransactionClient;

/** An account counted as another adviser (see the header). */
const ADVISER_USER_TYPE = "AI_GOVERNANCE_CONSULTANT";

export type ApplyCounts = { organizations: number; added: number; updated: number; removed: number };
const ZERO: ApplyCounts = { organizations: 0, added: 0, updated: 0, removed: 0 };

async function userByEmail(db: Db, email: string): Promise<{ id: string; email: string } | null> {
  return db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true },
  });
}

/**
 * The organisations the consultant's firm team reaches here (see the header),
 * given the consultant's firm organisations in DPO Central.
 */
export async function firmOrganizationIds(
  db: Db,
  ownerUserId: string,
  dpcOrganizationIds: readonly string[],
): Promise<string[]> {
  const owned = await db.organizationMember.findMany({
    where: { userId: ownerUserId, role: OrganizationRole.OWNER },
    select: {
      organization: {
        select: {
          id: true,
          settings: true,
          createdById: true,
          members: {
            where: { role: OrganizationRole.OWNER },
            select: { userId: true, user: { select: { email: true, userType: true } } },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  // Other owners that are DPO Central accounts with a firm team of their own.
  const otherOwnerEmails = new Set<string>();
  for (const m of owned) {
    for (const o of m.organization.members) {
      const e = normalizeEmail(o.user.email);
      if (o.userId !== ownerUserId && e) otherOwnerEmails.add(e);
    }
  }
  const withTeams = otherOwnerEmails.size
    ? new Set(
        (
          await db.firmTeamSync.findMany({
            where: { ownerEmail: { in: [...otherOwnerEmails] } },
            select: { ownerEmail: true },
          })
        ).map((s) => s.ownerEmail),
      )
    : new Set<string>();

  const ids: string[] = [];
  for (const { organization: org } of owned) {
    const others = org.members.filter((o) => o.userId !== ownerUserId);
    const anotherAdviser = others.some(
      (o) => o.user.userType === ADVISER_USER_TYPE || withTeams.has(normalizeEmail(o.user.email) ?? ""),
    );
    if (anotherAdviser) continue;
    const link = readLink(org.settings);
    const linked = !!link?.active && dpcOrganizationIds.includes(link.dpcOrganizationId);
    const created = org.createdById === ownerUserId && others.length === 0;
    if (linked || created) ids.push(org.id);
  }
  return ids;
}

/** Whether the hosted pilot lets this person join this organisation now. */
async function pilotAllows(db: Db, userId: string, org: { id: string; plan: string | null }): Promise<boolean> {
  if (isPaidPlan(org)) return true;
  try {
    await assertPilotOrganizationLimit(db, userId, "en", org);
    await assertPilotRoom(db as never, org.id, "members", "en");
    return true;
  } catch {
    return false;
  }
}

/**
 * Brings the firm memberships of one consultant in line with the copy of
 * their list and with which organisations it reaches today. Run inside the
 * caller's transaction when there is one.
 */
export async function reconcileFirmTeam(
  db: Db,
  ownerEmailRaw: string,
  opts: { actorUserId?: string | null } = {},
): Promise<ApplyCounts> {
  const ownerEmail = normalizeEmail(ownerEmailRaw);
  if (!ownerEmail) return { ...ZERO };
  const counts: ApplyCounts = { ...ZERO };
  const sync = await db.firmTeamSync.findUnique({ where: { ownerEmail } });
  const rows = await db.firmTeamMember.findMany({ where: { ownerEmail }, orderBy: { createdAt: "asc" } });
  const owner = await userByEmail(db, ownerEmail);
  const target = owner && sync ? await firmOrganizationIds(db, owner.id, sync.dpcOrganizationIds) : [];
  counts.organizations = target.length;
  const targetSet = new Set(target);
  const orgs = target.length
    ? await db.organization.findMany({ where: { id: { in: target } }, select: { id: true, plan: true } })
    : [];
  const actor = opts.actorUserId === undefined ? (owner?.id ?? null) : opts.actorUserId;

  for (const row of rows) {
    const person = await userByEmail(db, row.email);
    const usable = !!person && person.id !== owner?.id;

    // Firm memberships that should no longer be there.
    const current = await db.organizationMember.findMany({
      where: { firmTeamMemberId: row.id },
      select: { id: true, organizationId: true, userId: true },
    });
    for (const m of current) {
      if (usable && m.userId === person!.id && targetSet.has(m.organizationId)) continue;
      await db.organizationMember.delete({ where: { id: m.id } });
      await db.auditLog.create({
        data: {
          organizationId: m.organizationId,
          userId: actor,
          entityType: "OrganizationMember",
          entityId: m.id,
          action: "FIRM_TEAM_REMOVE",
          changes: { email: row.email, firmTeamMemberId: row.id },
          metadata: { source: "dpo-central-firm-team" },
        },
      });
      counts.removed++;
    }
    if (!usable) continue;

    for (const org of orgs) {
      const existing = await db.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId: person!.id } },
        select: { id: true, role: true, firmTeamMemberId: true },
      });
      if (existing) {
        if (existing.firmTeamMemberId === row.id && existing.role !== row.role) {
          await db.organizationMember.update({ where: { id: existing.id }, data: { role: row.role } });
          await db.auditLog.create({
            data: {
              organizationId: org.id,
              userId: actor,
              entityType: "OrganizationMember",
              entityId: existing.id,
              action: "FIRM_TEAM_ROLE",
              changes: { from: existing.role, to: row.role, firmTeamMemberId: row.id },
              metadata: { source: "dpo-central-firm-team" },
            },
          });
          counts.updated++;
        }
        continue;
      }
      if (!(await pilotAllows(db, person!.id, org))) continue;
      const created = await db.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: person!.id,
          role: row.role,
          invitedEmail: row.email,
          invitedAt: new Date(),
          firmTeamMemberId: row.id,
        },
        select: { id: true },
      });
      await db.auditLog.create({
        data: {
          organizationId: org.id,
          userId: actor,
          entityType: "OrganizationMember",
          entityId: created.id,
          action: "FIRM_TEAM_ADD",
          changes: { email: row.email, role: row.role, firmTeamMemberId: row.id },
          metadata: { source: "dpo-central-firm-team" },
        },
      });
      counts.added++;
    }
  }
  return counts;
}

export type ApplyOutcome = { stale: true } | ({ stale: false } & ApplyCounts);

/**
 * Applies a push from DPO Central: the copy of the list is replaced, then the
 * memberships follow. Refused (stale) when a push for the same account with
 * the same or a later sentAt was already applied, so a replayed or overtaken
 * push changes nothing. All or nothing: one transaction.
 */
export async function applyFirmTeamPush(db: PrismaClient, push: FirmTeamPush): Promise<ApplyOutcome> {
  const sentAt = new Date(push.sentAt);
  return db.$transaction(
    async (tx) => {
      // The conditional update takes the account's row lock, so two pushes
      // for one account apply one after the other, and the later one wins.
      const moved = await tx.firmTeamSync.updateMany({
        where: { ownerEmail: push.ownerEmail, lastAppliedAt: { lt: sentAt } },
        data: { lastAppliedAt: sentAt, dpcOrganizationIds: push.firmOrganizationIds },
      });
      if (moved.count === 0) {
        const existing = await tx.firmTeamSync.findUnique({ where: { ownerEmail: push.ownerEmail } });
        if (existing) return { stale: true as const };
        await tx.firmTeamSync.create({
          data: { ownerEmail: push.ownerEmail, lastAppliedAt: sentAt, dpcOrganizationIds: push.firmOrganizationIds },
        });
      }

      const wanted = new Map<string, { role: OrganizationRole; state: string }>();
      for (const m of push.members) {
        const role = aiSentinelRoleFor(m.role);
        if (role) wanted.set(m.email, { role: role as OrganizationRole, state: m.state });
      }
      const rows = await tx.firmTeamMember.findMany({ where: { ownerEmail: push.ownerEmail } });
      const owner = await userByEmail(tx, push.ownerEmail);
      let removed = 0;
      for (const row of rows) {
        if (wanted.has(row.email)) continue;
        // Out of the list: its memberships go with it (recorded one by one;
        // the foreign key's cascade would remove them anyway).
        const memberships = await tx.organizationMember.findMany({
          where: { firmTeamMemberId: row.id },
          select: { id: true, organizationId: true },
        });
        for (const m of memberships) {
          await tx.auditLog.create({
            data: {
              organizationId: m.organizationId,
              userId: owner?.id ?? null,
              entityType: "OrganizationMember",
              entityId: m.id,
              action: "FIRM_TEAM_REMOVE",
              changes: { email: row.email, firmTeamMemberId: row.id },
              metadata: { source: "dpo-central-firm-team" },
            },
          });
        }
        await tx.organizationMember.deleteMany({ where: { firmTeamMemberId: row.id } });
        await tx.firmTeamMember.delete({ where: { id: row.id } });
        removed += memberships.length;
      }
      for (const [email, w] of wanted) {
        await tx.firmTeamMember.upsert({
          where: { ownerEmail_email: { ownerEmail: push.ownerEmail, email } },
          create: { ownerEmail: push.ownerEmail, email, role: w.role, state: w.state },
          update: { role: w.role, state: w.state },
        });
      }
      const counts = await reconcileFirmTeam(tx, push.ownerEmail);
      return { stale: false as const, ...counts, removed: counts.removed + removed };
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
}

/** Runs reconcileFirmTeam for each account in its own transaction. Never throws. */
async function reconcileOwners(db: PrismaClient, ownerEmails: Iterable<string>, actorUserId?: string | null) {
  let added = 0;
  for (const ownerEmail of new Set(ownerEmails)) {
    try {
      const c = await db.$transaction((tx) => reconcileFirmTeam(tx, ownerEmail, { actorUserId }), {
        timeout: 30_000,
        maxWait: 10_000,
      });
      added += c.added;
    } catch (error) {
      logger.error("Applying a firm team failed", error instanceof Error ? error : undefined);
    }
  }
  return added;
}

/**
 * At sign-in: the firm teams this address belongs to reach the person now,
 * and, when the person is a consultant with a firm team, it is applied again.
 * Never throws.
 */
export async function applyFirmTeamsAtSignIn(
  db: PrismaClient,
  userId: string,
  email: string | null | undefined,
): Promise<number> {
  try {
    const address = normalizeEmail(email);
    if (!address) return 0;
    const [asMember, asOwner] = await Promise.all([
      db.firmTeamMember.findMany({ where: { email: address }, select: { ownerEmail: true } }),
      db.firmTeamSync.findUnique({ where: { ownerEmail: address }, select: { ownerEmail: true } }),
    ]);
    const owners = asMember.map((r) => r.ownerEmail);
    if (asOwner) owners.push(asOwner.ownerEmail);
    if (owners.length === 0) return 0;
    return await reconcileOwners(db, owners, userId);
  } catch (error) {
    logger.error("Applying firm teams at sign-in failed", error instanceof Error ? error : undefined);
    return 0;
  }
}

/**
 * Something changed in one organisation that can change which firm teams
 * reach it: an owner added, demoted or removed, the DPO Central link created
 * or removed, or the organisation just created. Every consultant concerned
 * (its owners, and those whose firm team is in it) is applied again.
 * Never throws.
 */
export async function reapplyFirmTeamsForOrganization(
  db: PrismaClient,
  organizationId: string,
  actorUserId?: string | null,
): Promise<void> {
  try {
    const [owners, firmRows] = await Promise.all([
      db.organizationMember.findMany({
        where: { organizationId, role: OrganizationRole.OWNER },
        select: { user: { select: { email: true } } },
      }),
      db.organizationMember.findMany({
        where: { organizationId, firmTeamMemberId: { not: null } },
        select: { firmTeamMember: { select: { ownerEmail: true } } },
      }),
    ]);
    const emails = new Set<string>();
    for (const o of owners) {
      const e = normalizeEmail(o.user.email);
      if (e) emails.add(e);
    }
    for (const r of firmRows) if (r.firmTeamMember) emails.add(r.firmTeamMember.ownerEmail);
    if (emails.size === 0) return;
    const withTeams = await db.firmTeamSync.findMany({
      where: { ownerEmail: { in: [...emails] } },
      select: { ownerEmail: true },
    });
    // A firm row whose consultant has no copy any more is applied too, so it goes.
    const concerned = new Set(withTeams.map((s) => s.ownerEmail));
    for (const r of firmRows) if (r.firmTeamMember) concerned.add(r.firmTeamMember.ownerEmail);
    await reconcileOwners(db, concerned, actorUserId);
  } catch (error) {
    logger.error("Re-applying firm teams for an organisation failed", error instanceof Error ? error : undefined, {
      organizationId,
    });
  }
}
