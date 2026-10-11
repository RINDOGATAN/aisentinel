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
 *
 * An organisation on the paid EU cloud plan (Organization.plan = EU_CLOUD,
 * set by scripts/set-org-plan.ts or by the automatic upgrade after a
 * confirmed payment) is not on the pilot: no ceiling, no editing window and
 * no one-organisation rule for joining it. The pilot clock is still
 * recorded, so an organisation returned to PILOT finds its window where it
 * was. Anything unknown (no plan, null, an organisation not found, a test
 * double without the organisations model) counts as the pilot: the caps then
 * apply, never the reverse.
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

/**
 * The plan that lifts the pilot's caps (Prisma enum OrganizationPlan). An
 * internal name: the same plan, and the same limits lifted, whichever currency
 * was paid (the EUR plan or the USD plan).
 */
export const PAID_PLAN = "EU_CLOUD" as const;

/** The plan field as the caps read it; absent or null counts as the pilot. */
export type PlanOrg = { plan?: string | null };

/** True for an organisation on the paid EU cloud plan. */
export function isPaidPlan(org: PlanOrg | null | undefined): boolean {
  return org?.plan === PAID_PLAN;
}

/** The organisations delegate, optional so test doubles without it count as the pilot. */
export type PlanLookupDb = {
  organization?: {
    findUnique(args: {
      where: { id: string };
      select: { plan: true };
    }): Promise<{ plan: string | null } | null>;
  };
};

/** Reads the organisation's plan; anything unknown counts as the pilot. */
export async function organizationOnPaidPlan(db: PlanLookupDb, organizationId: string): Promise<boolean> {
  if (!db.organization?.findUnique) return false;
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { plan: true } });
  return isPaidPlan(org);
}

type CountArgs = { where: { organizationId: string } };
type Counter = { count(args: CountArgs): Promise<number> };

/** The delegates the ceilings count on. PrismaClient and a transaction client both fit. */
export interface PilotDb extends PlanLookupDb {
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

const DELEGATE: Record<PilotCeilingKey, Exclude<keyof PilotDb, "organization">> = {
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
  /** Start of the editing clock; null until the first sign-in is recorded. */
  pilotFirstSignInAt: Date | null;
  /** The hosted plan; EU_CLOUD lifts every cap. Absent or null: the pilot. */
  plan?: string | null;
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
  if (isPaidPlan(organization)) return { active: false };
  const clock = pilotClock(organization.pilotFirstSignInAt, now);
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
 * The editing-window switch. Throws FORBIDDEN once the organisation is read-only.
 * Pure apart from the clock: the organisation row already carries what it
 * needs, so the write middleware can call it without another query.
 */
export function assertPilotWritable(
  organization: PilotOrganization,
  locale: PilotLocale,
  now: Date = new Date(),
): void {
  if (!hostedPilotActive()) return;
  if (isPaidPlan(organization)) return;
  const clock = pilotClock(organization.pilotFirstSignInAt, now);
  if (!clock.readOnly) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: pilotReadOnlyMessage(locale, pilotExportUrl(organization.id)),
    cause: new PilotLimitReached(organization.id, PILOT_EDITING_DAYS_LIMIT),
  });
}

/** The fixed name the audit row gives the editing-window limit; the ceilings use their keys. */
export const PILOT_EDITING_DAYS_LIMIT = "editing_days";

export type PilotLimitName = PilotCeilingKey | typeof PILOT_EDITING_DAYS_LIMIT;

/**
 * The cause carried by a refusal at a limit an organisation has reached, so
 * the tRPC layer can record it once the refusal is on its way back (see
 * recordPilotLimits in src/server/trpc.ts). Carries an id and a fixed name,
 * nothing a person typed.
 */
export class PilotLimitReached extends Error {
  constructor(
    readonly organizationId: string,
    readonly limit: PilotLimitName,
  ) {
    super(`pilot limit reached: ${limit}`);
    this.name = "PilotLimitReached";
  }
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
    cause: new PilotLimitReached(organizationId, key),
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
  if (await organizationOnPaidPlan(db, organizationId)) return Infinity;
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
  if (await organizationOnPaidPlan(db, organizationId)) return;
  for (const key of keys) {
    const used = await pilotUsed(db, organizationId, key);
    if (used > PILOT_CEILINGS[key]) throw pilotCeilingError(organizationId, key, locale);
  }
}

/**
 * One organisation per account. Throws FORBIDDEN when the account already
 * belongs to an organisation, whether it created it or was added to it.
 * `joining` is the organisation the account is being added to: when it is on
 * the paid plan the rule does not apply. Creating an organisation passes
 * none, so the rule still applies there (a new organisation starts on the
 * pilot).
 */
export async function assertPilotOrganizationLimit(
  db: { organizationMember: { count(args: { where: { userId: string } }): Promise<number> } },
  userId: string,
  locale: PilotLocale,
  joining?: PlanOrg,
): Promise<void> {
  if (!hostedPilotActive()) return;
  if (isPaidPlan(joining)) return;
  const memberships = await db.organizationMember.count({ where: { userId } });
  if (memberships > 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: pilotOneOrganizationMessage(locale) });
  }
}
