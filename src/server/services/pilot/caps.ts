// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot's caps, enforced.
 *
 * Every rule lives in src/config/pilot.ts; this module is the one place that
 * reads the database to apply them. Off the hosted pilot (the kit, local
 * development) every function here is a no-op that allows, so the callers
 * need no branch of their own.
 *
 * Reads are never refused: a read-only organisation can open everything and
 * export everything. Only the write procedures and the create paths call in.
 */

import { TRPCError } from "@trpc/server";
import {
  PILOT_CEILINGS,
  PILOT_CEILING_KEYS,
  PILOT_RUN_URL,
  hostedPilotActive,
  pilotCeilingMessage,
  pilotClock,
  pilotExportUrl,
  pilotOneOrganizationMessage,
  pilotReadOnlyMessage,
  type PilotCeilingKey,
  type PilotLocale,
} from "@/config/pilot";

type CountArgs = { where: { organizationId: string } };
type Counter = { count(args: CountArgs): Promise<number> };

/** The delegates the ceilings count on. PrismaClient and a transaction client both fit. */
export interface PilotDb {
  aISystem: Counter;
  aIVendor: Counter;
  aIAssessment: Counter;
  aIIncident: Counter;
  aIPolicy: Counter;
  oversightGate: Counter;
  threatModel: Counter;
  shadowAIReport: Counter;
  regulatoryProceeding: Counter;
  boardReport: Counter;
  organizationMember: Counter;
}

const DELEGATE: Record<PilotCeilingKey, keyof PilotDb> = {
  systems: "aISystem",
  vendors: "aIVendor",
  assessments: "aIAssessment",
  incidents: "aIIncident",
  policies: "aIPolicy",
  oversightGates: "oversightGate",
  threatModels: "threatModel",
  shadowAiReports: "shadowAIReport",
  proceedings: "regulatoryProceeding",
  boardReports: "boardReport",
  members: "organizationMember",
};

export interface PilotOrganization {
  id: string;
  createdAt: Date;
}

export interface PilotCeilingStatus {
  key: PilotCeilingKey;
  used: number;
  max: number;
}

export type PilotStatus =
  | { active: false }
  | {
      active: true;
      startedAt: Date;
      endsAt: Date;
      daysLeft: number;
      readOnly: boolean;
      /** Always true: a read-only organisation still exports everything. */
      exportsAllowed: true;
      exportUrl: string;
      runUrl: string;
      ceilings: PilotCeilingStatus[];
    };

/** The language for a message the server writes back, from the locale cookie. */
export function pilotLocale(getCookie?: (name: string) => string | undefined): PilotLocale {
  return getCookie?.("locale") === "es" ? "es" : "en";
}

export async function pilotUsed(db: PilotDb, organizationId: string, key: PilotCeilingKey): Promise<number> {
  return db[DELEGATE[key]].count({ where: { organizationId } });
}

/** Counters and clock for one organisation; `{ active: false }` off the pilot. */
export async function getPilotStatus(
  db: PilotDb,
  organization: PilotOrganization,
  now: Date = new Date(),
): Promise<PilotStatus> {
  if (!hostedPilotActive()) return { active: false };
  const clock = pilotClock(organization.createdAt, now);
  const ceilings = await Promise.all(
    PILOT_CEILING_KEYS.map(async (key) => ({
      key,
      used: await pilotUsed(db, organization.id, key),
      max: PILOT_CEILINGS[key],
    })),
  );
  return {
    active: true,
    ...clock,
    exportsAllowed: true,
    exportUrl: pilotExportUrl(organization.id),
    runUrl: PILOT_RUN_URL,
    ceilings,
  };
}

/**
 * The ninety-day switch. Throws FORBIDDEN once the organisation is read-only.
 * Pure apart from the clock: the organisation row already carries what it
 * needs, so the write middleware can call it without another query.
 */
export function assertPilotWritable(
  organization: PilotOrganization,
  locale: PilotLocale,
  now: Date = new Date(),
): void {
  if (!hostedPilotActive()) return;
  const clock = pilotClock(organization.createdAt, now);
  if (!clock.readOnly) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: pilotReadOnlyMessage(locale, pilotExportUrl(organization.id)),
  });
}

/** The error a create path throws when a ceiling is reached. */
export function pilotCeilingError(
  organizationId: string,
  key: PilotCeilingKey,
  locale: PilotLocale,
): TRPCError {
  return new TRPCError({
    code: "FORBIDDEN",
    message: pilotCeilingMessage(locale, key, pilotExportUrl(organizationId)),
  });
}

/**
 * How many more records of this kind the organisation may create. Infinity
 * off the pilot, so bulk creators can loop without a branch.
 */
export async function pilotRemaining(
  db: PilotDb,
  organizationId: string,
  key: PilotCeilingKey,
): Promise<number> {
  if (!hostedPilotActive()) return Infinity;
  const used = await pilotUsed(db, organizationId, key);
  return Math.max(0, PILOT_CEILINGS[key] - used);
}

/**
 * The records ceiling. Throws FORBIDDEN when creating `adding` more records
 * of this kind would pass the ceiling. Called before the create, so a refused
 * request writes nothing.
 */
export async function assertPilotRoom(
  db: PilotDb,
  organizationId: string,
  key: PilotCeilingKey,
  locale: PilotLocale,
  adding = 1,
): Promise<void> {
  if (!hostedPilotActive()) return;
  if (adding <= 0) return;
  const remaining = await pilotRemaining(db, organizationId, key);
  if (adding > remaining) throw pilotCeilingError(organizationId, key, locale);
}

/**
 * The ceiling checked after a bulk create, inside its transaction: the wizard
 * creates systems, vendors, gates and policies in one transaction, so a
 * throw here rolls the whole run back and nothing is left half-built.
 */
export async function assertPilotWithinCeilings(
  db: PilotDb,
  organizationId: string,
  locale: PilotLocale,
  keys: readonly PilotCeilingKey[] = PILOT_CEILING_KEYS,
): Promise<void> {
  if (!hostedPilotActive()) return;
  for (const key of keys) {
    const used = await pilotUsed(db, organizationId, key);
    if (used > PILOT_CEILINGS[key]) throw pilotCeilingError(organizationId, key, locale);
  }
}

/**
 * One organisation per account. Throws FORBIDDEN when the account already
 * belongs to an organisation, whether it created it or was added to it.
 */
export async function assertPilotOrganizationLimit(
  db: { organizationMember: { count(args: { where: { userId: string } }): Promise<number> } },
  userId: string,
  locale: PilotLocale,
): Promise<void> {
  if (!hostedPilotActive()) return;
  const memberships = await db.organizationMember.count({ where: { userId } });
  if (memberships > 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: pilotOneOrganizationMessage(locale) });
  }
}
