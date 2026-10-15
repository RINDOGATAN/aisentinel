// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot's editing window belongs to the account, not only to the
 * organisation.
 *
 * The clock is read from the organisation (`Organization.pilotFirstSignInAt`,
 * src/server/services/pilot/first-sign-in.ts). Without more, an account could
 * restart it by leaving its organisation, through deletion or by being
 * removed, and creating a new one. So the account keeps the earliest window
 * start of any organisation it has left (`User.pilotTrialStartedAt`), and a
 * new organisation it creates starts from that date. The window is used once
 * per account; deleting, leaving or recreating an organisation never restarts
 * or extends it.
 *
 * Every member of an organisation keeps its start when they leave, whatever
 * their role: roles can be changed while the window is open, so carrying it
 * only for owners would leave the restart open to an owner who first
 * demotes themself.
 *
 * Off the pilot nothing is read or written.
 */

import { hostedPilotActive } from "@/config/pilot";

export interface AccountTrialDb {
  user: {
    findUnique(args: {
      where: { id: string };
      select: { pilotTrialStartedAt: true };
    }): Promise<{ pilotTrialStartedAt: Date | null } | null>;
    updateMany(args: {
      where: {
        id: { in: string[] };
        OR: [{ pilotTrialStartedAt: null }, { pilotTrialStartedAt: { gt: Date } }];
      };
      data: { pilotTrialStartedAt: Date };
    }): Promise<{ count: number }>;
  };
  organizationMember: {
    findMany(args: {
      where: { organizationId: string };
      select: { userId: true };
    }): Promise<{ userId: string }[]>;
  };
}

/**
 * The window start a new organisation created by this account inherits:
 * the earliest start among the organisations the account has left, or null
 * when it has never left one (the organisation then starts its own clock at
 * its first sign-in, as before).
 */
export async function inheritedPilotStart(db: AccountTrialDb, userId: string): Promise<Date | null> {
  if (!hostedPilotActive()) return null;
  const user = await db.user.findUnique({ where: { id: userId }, select: { pilotTrialStartedAt: true } });
  return user?.pilotTrialStartedAt ?? null;
}

/**
 * Before accounts leave an organisation, record its window start on them,
 * keeping the earlier date when one is already recorded. Nothing is written
 * when the organisation's clock has not started.
 */
export async function keepPilotStartOnAccounts(
  db: AccountTrialDb,
  organization: { pilotFirstSignInAt: Date | null },
  userIds: string[],
): Promise<void> {
  if (!hostedPilotActive()) return;
  const start = organization.pilotFirstSignInAt;
  if (!start || userIds.length === 0) return;
  await db.user.updateMany({
    where: {
      id: { in: userIds },
      OR: [{ pilotTrialStartedAt: null }, { pilotTrialStartedAt: { gt: start } }],
    },
    data: { pilotTrialStartedAt: start },
  });
}

/** keepPilotStartOnAccounts for every member, before the organisation is deleted. */
export async function keepPilotStartOnAllMembers(
  db: AccountTrialDb,
  organization: { id: string; pilotFirstSignInAt: Date | null },
): Promise<void> {
  if (!hostedPilotActive()) return;
  if (!organization.pilotFirstSignInAt) return;
  const members = await db.organizationMember.findMany({
    where: { organizationId: organization.id },
    select: { userId: true },
  });
  await keepPilotStartOnAccounts(
    db,
    organization,
    members.map((m) => m.userId),
  );
}
