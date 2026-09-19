// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Records when the pilot's editing clock starts: the organisation's first
 * sign-in after the pilot went live (src/config/pilot.ts).
 *
 * Two places call in. The sign-in callback stamps every organisation of the
 * account signing in. The organisation middleware stamps an organisation that
 * is opened without one, which covers a session that began before the pilot
 * was deployed and an organisation created after its owner signed in. The
 * write is conditional on the column still being empty, so the first stamp
 * wins and a later one never moves the clock. Off the pilot nothing is
 * written.
 */

import { hostedPilotActive, pilotFirstSignInStamp } from "@/config/pilot";

export interface FirstSignInDb {
  organization: {
    updateMany(args: {
      where: {
        pilotFirstSignInAt: null;
        id?: string;
        members?: { some: { userId: string } };
      };
      data: { pilotFirstSignInAt: Date };
    }): Promise<{ count: number }>;
    findFirst(args: {
      where: { id: string };
      select: { pilotFirstSignInAt: true };
    }): Promise<{ pilotFirstSignInAt: Date | null } | null>;
  };
}

/** Stamp every organisation this account belongs to that has no first sign-in yet. */
export async function recordPilotSignIn(db: FirstSignInDb, userId: string, now: Date = new Date()): Promise<void> {
  if (!hostedPilotActive()) return;
  await db.organization.updateMany({
    where: { pilotFirstSignInAt: null, members: { some: { userId } } },
    data: { pilotFirstSignInAt: pilotFirstSignInStamp(now) },
  });
}

/**
 * The organisation's first sign-in, recording it now if none is recorded.
 * Returns the value the clock should use; null off the pilot.
 */
export async function ensurePilotFirstSignIn(
  db: FirstSignInDb,
  organization: { id: string; pilotFirstSignInAt: Date | null },
  now: Date = new Date(),
): Promise<Date | null> {
  if (!hostedPilotActive()) return organization.pilotFirstSignInAt;
  if (organization.pilotFirstSignInAt) return organization.pilotFirstSignInAt;
  const stamp = pilotFirstSignInStamp(now);
  const { count } = await db.organization.updateMany({
    where: { id: organization.id, pilotFirstSignInAt: null },
    data: { pilotFirstSignInAt: stamp },
  });
  if (count > 0) return stamp;
  // Another request stamped it first; that stamp is the one that counts.
  const row = await db.organization.findFirst({
    where: { id: organization.id },
    select: { pilotFirstSignInAt: true },
  });
  return row?.pilotFirstSignInAt ?? stamp;
}
