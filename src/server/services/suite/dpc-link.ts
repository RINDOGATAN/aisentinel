// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The link between an AI Sentinel organisation and a DPO Central
 * organisation ("Start from DPO Central").
 *
 * DPO Central starts every call: AI Sentinel has no credentials for DPO
 * Central, while DPO Central already holds this application's import key and
 * the identity secret (src/lib/import-auth.ts, src/lib/import-identity.ts).
 *
 *   link    a person who is owner or administrator of both organisations
 *           picks, in DPO Central, the DPO Central organisation to start
 *           from. DPO Central sends the organisation's details and declared
 *           laws, its AI-capable vendors and its AI systems (each with the
 *           data, people and legal bases of the processing that uses it, and
 *           where its DPIA stands). Everything lands here as an imported
 *           draft for confirmation.
 *   sync    DPO Central calls on a schedule: what is new there arrives here as
 *           a draft; what was created here goes back as a draft there. A
 *           record that disappears on one side is never deleted on the other:
 *           it gets a note instead.
 *   unlink  either side. Imported records stay; the sync stops.
 *
 * The link lives in Organization.settings.dpoCentralLink (no migration). The
 * imported data stays as the customer wrote it in DPO Central; labels around
 * it are this application's own translations.
 */

import type { Jurisdiction, Prisma, PrismaClient } from "@prisma/client";
import { mapRole, mapTechnique } from "@/lib/dpc-import-mapping";
import { nextSystemNumber } from "@/server/services/ai-system/number";
import { pilotRemaining } from "@/server/services/pilot/caps";

/** Roles that may create or remove a link, on either side. */
export const LINK_ROLES: readonly string[] = ["OWNER", "ADMIN"];

export interface DpcLinkLaw {
  code: string;
  /** DPO Central's region, e.g. "EU", "ES", "UK", "US-CA". */
  region: string;
}

export interface DpcLinkOrganization {
  id: string;
  name: string;
  country?: string | null;
  laws: DpcLinkLaw[];
}

export interface DpcLinkVendor {
  dpcId: string;
  name: string;
  website?: string | null;
  description?: string | null;
  catalogSlug?: string | null;
}

export type DpiaState = "approved" | "in_progress" | "due" | "none";

/** A DPO Central code with its label in both languages, so this side can show it in the reader's language. */
export interface LabelledCode {
  code: string;
  en: string;
  es: string;
}

export interface DpcLinkProcessing {
  activities: { id: string; name: string }[];
  dataCategories: LabelledCode[];
  /** As the customer wrote them in DPO Central. */
  dataSubjects: string[];
  legalBases: LabelledCode[];
}

export interface DpcLinkSystem {
  dpcId: string;
  name: string;
  description?: string | null;
  purpose?: string | null;
  riskLevel?: string | null;
  category?: string | null;
  modelType?: string | null;
  provider?: string | null;
  deployer?: string | null;
  aiCapabilities?: string[];
  aiTechniques?: string[];
  euAiActRole?: string | null;
  vendorDpcId?: string | null;
  vendorName?: string | null;
  /** The AI Sentinel record it already maps to, when DPO Central knows it. */
  aisId?: string | null;
  processing: DpcLinkProcessing;
  dpia: { state: DpiaState; url: string | null };
}

export interface DpoCentralLink {
  active: boolean;
  dpcOrganizationId: string;
  dpcOrganizationName: string;
  dpcCountry: string | null;
  linkedAt: string;
  linkedByUserId: string;
  linkedByEmail: string;
  unlinkedAt?: string | null;
  lastSyncAt?: string | null;
  counts?: { systems: number; vendors: number };
}

type Db = PrismaClient | Prisma.TransactionClient;

function settingsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

/** The link stored on an organisation, or null. */
export function readLink(settings: unknown): DpoCentralLink | null {
  const raw = settingsObject(settings).dpoCentralLink;
  if (!raw || typeof raw !== "object") return null;
  const link = raw as Partial<DpoCentralLink>;
  if (typeof link.dpcOrganizationId !== "string" || !link.dpcOrganizationId) return null;
  return {
    active: link.active === true,
    dpcOrganizationId: link.dpcOrganizationId,
    dpcOrganizationName: String(link.dpcOrganizationName ?? ""),
    dpcCountry: typeof link.dpcCountry === "string" ? link.dpcCountry : null,
    linkedAt: String(link.linkedAt ?? ""),
    linkedByUserId: String(link.linkedByUserId ?? ""),
    linkedByEmail: String(link.linkedByEmail ?? ""),
    unlinkedAt: link.unlinkedAt ?? null,
    lastSyncAt: link.lastSyncAt ?? null,
    counts: link.counts,
  };
}

/** When an owner or administrator set aside the dashboard's "Start from DPO Central" offer, or null. */
export function readOfferDismissedAt(settings: unknown): string | null {
  const v = settingsObject(settings).dpoCentralOfferDismissedAt;
  return typeof v === "string" && v ? v : null;
}

/** The settings with the offer set aside at `at` (everything else kept). */
export function withOfferDismissed(settings: unknown, at: string): Prisma.InputJsonValue {
  const next = settingsObject(settings);
  next.dpoCentralOfferDismissedAt = at;
  return next as Prisma.InputJsonValue;
}

function withLink(settings: unknown, link: DpoCentralLink): Prisma.InputJsonValue {
  const next = settingsObject(settings);
  next.dpoCentralLink = link as unknown as Prisma.InputJsonValue;
  return next as Prisma.InputJsonValue;
}

/**
 * DPO Central's declared laws, as AI Sentinel jurisdictions. A law this
 * application has no jurisdiction for (for example a US state it does not
 * cover yet) is left out rather than guessed.
 */
export function jurisdictionsFromLaws(laws: DpcLinkLaw[]): Jurisdiction[] {
  const byRegion: Record<string, Jurisdiction> = {
    EU: "EU",
    UK: "UK",
    CH: "SWITZERLAND",
    "US-CA": "US_CA",
    "US-CO": "US_CO",
    "US-CT": "US_CT",
    "US-IL": "US_IL",
    "US-NY": "US_NY",
    "US-TX": "US_TX",
    "US-UT": "US_UT",
    "US-VA": "US_VA",
    "US-WA": "US_WA",
    BR: "BRAZIL",
    CA: "CANADA",
    CN: "CHINA",
    JP: "JAPAN",
    KR: "SOUTH_KOREA",
    AU: "AUSTRALIA",
    IN: "INDIA",
  };
  // EU member states' national laws (Spain's LOPDGDD, for example) sit under
  // the EU regime here.
  const EU_STATES = new Set([
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
    "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  ]);
  const out = new Set<Jurisdiction>();
  for (const law of laws) {
    const region = String(law.region ?? "").toUpperCase();
    if (law.code === "EU_AI_ACT" || EU_STATES.has(region)) {
      out.add("EU");
      continue;
    }
    const j = byRegion[region];
    if (j) out.add(j);
  }
  return [...out];
}

/** Whether `email` is owner or administrator of `organizationId` here. */
export async function linkMembership(
  db: Db,
  email: string,
  organizationId: string,
): Promise<{ userId: string; role: string; organizationName: string; settings: unknown } | null> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return null;
  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: user.id } },
    include: { organization: { select: { name: true, settings: true } } },
  });
  if (!membership) return null;
  return {
    userId: user.id,
    role: membership.role,
    organizationName: membership.organization.name,
    settings: membership.organization.settings,
  };
}

/** The organisations where `email` may create a link, with their link state. */
export async function linkableOrganizations(db: Db, email: string) {
  const user = await db.user.findUnique({
    where: { email },
    include: {
      organizationMemberships: {
        include: { organization: { select: { id: true, name: true, settings: true } } },
        orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!user) return [];
  return user.organizationMemberships
    .filter((m) => LINK_ROLES.includes(m.role))
    .map((m) => {
      const link = readLink(m.organization.settings);
      return {
        id: m.organization.id,
        name: m.organization.name,
        linkedTo: link?.active ? link.dpcOrganizationId : null,
      };
    });
}

const VENDOR_SOURCE = (dpcId: string) => `dpocentral:vendor:${dpcId}`;
const SYSTEM_SOURCE = (dpcId: string) => `dpocentral:system:${dpcId}`;

/** Upsert one DPO Central vendor as an imported draft. Returns its id here. */
async function upsertVendor(
  db: Db,
  organizationId: string,
  v: DpcLinkVendor,
  knownSlugs: Set<string>,
): Promise<{ id: string; created: boolean } | null> {
  const existing = await db.aIVendor.findFirst({
    where: {
      organizationId,
      OR: [{ dpoCentralVendorId: v.dpcId }, { name: { equals: v.name, mode: "insensitive" } }],
    },
    select: { id: true, dpoCentralVendorId: true },
  });
  if (existing) {
    if (!existing.dpoCentralVendorId) {
      await db.aIVendor.update({ where: { id: existing.id }, data: { dpoCentralVendorId: v.dpcId } });
    }
    return { id: existing.id, created: false };
  }
  if ((await pilotRemaining(db as PrismaClient, organizationId, "vendors")) <= 0) return null;
  const slug = v.catalogSlug && knownSlugs.has(v.catalogSlug) ? v.catalogSlug : null;
  const created = await db.aIVendor.create({
    data: {
      organizationId,
      name: v.name,
      website: v.website ?? null,
      description: v.description ?? null,
      status: "UNDER_REVIEW",
      dpoCentralVendorId: v.dpcId,
      catalogSlug: slug,
      provenance: "IMPORTED",
      sourceRef: VENDOR_SOURCE(v.dpcId),
      metadata: { importedFrom: "dpocentral", dpoCentralVendorId: v.dpcId },
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

function dpoCentralBlock(s: DpcLinkSystem) {
  return {
    activities: s.processing.activities.slice(0, 50),
    dataCategories: s.processing.dataCategories.slice(0, 50),
    dataSubjects: s.processing.dataSubjects.slice(0, 50),
    legalBases: s.processing.legalBases.slice(0, 20),
    dpia: s.dpia,
  };
}

/** Upsert one DPO Central AI system as an imported draft. */
async function upsertSystem(
  db: Db,
  organizationId: string,
  s: DpcLinkSystem,
  vendorIds: Map<string, string>,
): Promise<{ id: string; created: boolean } | null> {
  const existing = await db.aISystem.findFirst({
    where: {
      organizationId,
      OR: [
        ...(s.aisId ? [{ id: s.aisId }] : []),
        { metadata: { path: ["dpoCentralSystemId"], equals: s.dpcId } },
        { sourceRef: SYSTEM_SOURCE(s.dpcId) },
      ],
    },
    select: { id: true, metadata: true, confirmedAt: true },
  });
  const block = dpoCentralBlock(s);
  if (existing) {
    // The DPO Central facts are refreshed on the record; what a person has
    // written here is never overwritten.
    const meta = settingsObject(existing.metadata);
    meta.dpoCentralSystemId = s.dpcId;
    meta.dpoCentral = block as unknown;
    delete meta.suiteNote;
    await db.aISystem.update({
      where: { id: existing.id },
      data: { metadata: meta as Prisma.InputJsonValue },
    });
    return { id: existing.id, created: false };
  }
  if ((await pilotRemaining(db as PrismaClient, organizationId, "systems")) <= 0) return null;
  const vendorId = s.vendorDpcId ? vendorIds.get(s.vendorDpcId) ?? null : null;
  const created = await db.aISystem.create({
    data: {
      organizationId,
      number: await nextSystemNumber(db as PrismaClient, organizationId),
      name: s.name,
      description: s.description ?? null,
      purpose: s.purpose ?? null,
      technique: mapTechnique(s.modelType ?? null, s.aiTechniques ?? []),
      role: mapRole(s.euAiActRole ?? null),
      status: "DRAFT",
      processesPersonalData: s.processing.dataCategories.length > 0,
      dpoCentralVendorId: s.vendorDpcId ?? null,
      vendorId,
      provenance: "IMPORTED",
      sourceRef: SYSTEM_SOURCE(s.dpcId),
      metadata: {
        importedFrom: "dpocentral",
        dpoCentralSystemId: s.dpcId,
        riskLevel: s.riskLevel ?? null,
        category: s.category ?? null,
        provider: s.provider ?? null,
        deployer: s.deployer ?? null,
        vendorName: s.vendorName ?? null,
        aiCapabilities: s.aiCapabilities ?? [],
        aiTechniques: s.aiTechniques ?? [],
        euAiActRole: s.euAiActRole ?? null,
        dpoCentral: block,
      } as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

export interface ImportResult {
  vendors: { dpcId: string; aisId: string }[];
  systems: { dpcId: string; aisId: string }[];
  createdVendors: number;
  createdSystems: number;
  skipped: number;
}

/** Bring DPO Central's vendors and systems in, as drafts. Idempotent. */
export async function importFromDpoCentral(
  db: Db,
  organizationId: string,
  userId: string | null,
  vendors: DpcLinkVendor[],
  systems: DpcLinkSystem[],
): Promise<ImportResult> {
  const result: ImportResult = { vendors: [], systems: [], createdVendors: 0, createdSystems: 0, skipped: 0 };
  const slugs = vendors.map((v) => v.catalogSlug).filter((s): s is string => !!s);
  const known = slugs.length
    ? await db.vendorCatalog.findMany({ where: { slug: { in: slugs } }, select: { slug: true } })
    : [];
  const knownSlugs = new Set(known.map((k) => k.slug));
  const vendorIds = new Map<string, string>();
  const audit: Prisma.AuditLogCreateManyInput[] = [];

  for (const v of vendors.slice(0, 200)) {
    if (!v.dpcId || !v.name) continue;
    const row = await upsertVendor(db, organizationId, v, knownSlugs);
    if (!row) {
      result.skipped++;
      continue;
    }
    vendorIds.set(v.dpcId, row.id);
    result.vendors.push({ dpcId: v.dpcId, aisId: row.id });
    if (row.created) {
      result.createdVendors++;
      audit.push({
        organizationId,
        userId,
        entityType: "AIVendor",
        entityId: row.id,
        action: "CREATE",
        changes: { name: v.name, status: "UNDER_REVIEW" },
        metadata: { source: "suite-link", importedFrom: "dpocentral" },
      });
    }
  }
  for (const s of systems.slice(0, 200)) {
    if (!s.dpcId || !s.name) continue;
    const row = await upsertSystem(db, organizationId, s, vendorIds);
    if (!row) {
      result.skipped++;
      continue;
    }
    result.systems.push({ dpcId: s.dpcId, aisId: row.id });
    if (row.created) {
      result.createdSystems++;
      audit.push({
        organizationId,
        userId,
        entityType: "AISystem",
        entityId: row.id,
        action: "CREATE",
        changes: { name: s.name, status: "DRAFT" },
        metadata: { source: "suite-link", importedFrom: "dpocentral" },
      });
    }
  }
  if (audit.length) await db.auditLog.createMany({ data: audit });
  return result;
}

/** Create (or refresh) the link and import. Caller has checked the roles. */
export async function createLink(
  db: PrismaClient,
  args: {
    organizationId: string;
    userId: string;
    email: string;
    settings: unknown;
    dpc: DpcLinkOrganization;
    vendors: DpcLinkVendor[];
    systems: DpcLinkSystem[];
  },
) {
  const existing = readLink(args.settings);
  if (existing?.active && existing.dpcOrganizationId !== args.dpc.id) {
    return { ok: false as const, status: 409, error: "This organization is already linked to another DPO Central organization" };
  }
  const result = await importFromDpoCentral(db, args.organizationId, args.userId, args.vendors, args.systems);

  // Declared laws: added to what is already declared here, never removed.
  const jurisdictions = jurisdictionsFromLaws(args.dpc.laws);
  const org = await db.organization.findUnique({
    where: { id: args.organizationId },
    select: { operatingJurisdictions: true, settings: true },
  });
  const merged = [...new Set([...(org?.operatingJurisdictions ?? []), ...jurisdictions])];

  const now = new Date().toISOString();
  const link: DpoCentralLink = {
    active: true,
    dpcOrganizationId: args.dpc.id,
    dpcOrganizationName: args.dpc.name.slice(0, 200),
    dpcCountry: args.dpc.country ?? null,
    linkedAt: existing?.active ? existing.linkedAt : now,
    linkedByUserId: args.userId,
    linkedByEmail: args.email,
    unlinkedAt: null,
    lastSyncAt: now,
    counts: { systems: result.systems.length, vendors: result.vendors.length },
  };
  await db.organization.update({
    where: { id: args.organizationId },
    data: {
      operatingJurisdictions: merged,
      settings: withLink(org?.settings ?? args.settings, link),
    },
  });
  await db.auditLog.create({
    data: {
      organizationId: args.organizationId,
      userId: args.userId,
      entityType: "Organization",
      entityId: args.organizationId,
      action: existing?.active ? "SUITE_LINK_REFRESHED" : "SUITE_LINK_CREATED",
      changes: {
        dpcOrganizationId: args.dpc.id,
        systems: result.systems.length,
        vendors: result.vendors.length,
        jurisdictionsAdded: jurisdictions.filter((j) => !(org?.operatingJurisdictions ?? []).includes(j)),
      },
      metadata: { source: "suite-link" },
    },
  });
  return { ok: true as const, link, result };
}

/** Stop the sync. Imported records stay. */
export async function removeLink(
  db: PrismaClient,
  organizationId: string,
  userId: string | null,
  origin: "aisentinel" | "dpocentral",
) {
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { settings: true } });
  const link = readLink(org?.settings);
  if (!link || !link.active) return { changed: false };
  const next: DpoCentralLink = { ...link, active: false, unlinkedAt: new Date().toISOString() };
  await db.organization.update({ where: { id: organizationId }, data: { settings: withLink(org?.settings, next) } });
  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      entityType: "Organization",
      entityId: organizationId,
      action: "SUITE_LINK_REMOVED",
      changes: { dpcOrganizationId: link.dpcOrganizationId, origin },
      metadata: { source: "suite-link" },
    },
  });
  return { changed: true };
}

export interface AisOutboundSystem {
  aisId: string;
  name: string;
  description: string | null;
  purpose: string | null;
  vendorAisId: string | null;
  vendorName: string | null;
}

export interface AisOutboundVendor {
  aisId: string;
  name: string;
  website: string | null;
  description: string | null;
  catalogSlug: string | null;
}

/**
 * One sync round, called by DPO Central. Brings DPO Central's records in,
 * marks those it no longer has, and returns what was created here for DPO
 * Central to take as drafts, with the ids of records here that DPO Central
 * holds copies of, so it can note any that disappeared.
 */
export async function syncRound(
  db: PrismaClient,
  args: {
    organizationId: string;
    vendors: DpcLinkVendor[];
    systems: DpcLinkSystem[];
    /** AI Sentinel ids DPO Central holds copies of. */
    knownAisSystemIds: string[];
    knownAisVendorIds: string[];
  },
) {
  const imported = await importFromDpoCentral(db, args.organizationId, null, args.vendors, args.systems);

  // Records that came from DPO Central and are no longer there get a note.
  const presentDpcSystemIds = new Set(args.systems.map((s) => s.dpcId));
  const fromDpc = await db.aISystem.findMany({
    where: { organizationId: args.organizationId, metadata: { path: ["importedFrom"], equals: "dpocentral" } },
    select: { id: true, metadata: true },
  });
  const now = new Date().toISOString();
  for (const row of fromDpc) {
    const meta = settingsObject(row.metadata);
    const dpcId = typeof meta.dpoCentralSystemId === "string" ? meta.dpoCentralSystemId : null;
    if (!dpcId || presentDpcSystemIds.has(dpcId) || meta.suiteNote) continue;
    meta.suiteNote = { kind: "removedInDpoCentral", at: now };
    await db.aISystem.update({ where: { id: row.id }, data: { metadata: meta as Prisma.InputJsonValue } });
  }

  // What was created here and is not a copy of a DPO Central record.
  const ownSystems = await db.aISystem.findMany({
    where: {
      organizationId: args.organizationId,
      NOT: { metadata: { path: ["importedFrom"], equals: "dpocentral" } },
      status: { not: "RETIRED" },
    },
    select: { id: true, name: true, description: true, purpose: true, vendorId: true, vendor: { select: { name: true } } },
    take: 500,
  });
  const ownVendors = await db.aIVendor.findMany({
    where: { organizationId: args.organizationId, dpoCentralVendorId: null },
    select: { id: true, name: true, website: true, description: true, catalogSlug: true },
    take: 500,
  });
  const presentSystemIds = new Set(
    (
      await db.aISystem.findMany({
        where: { organizationId: args.organizationId, id: { in: args.knownAisSystemIds.slice(0, 1000) } },
        select: { id: true },
      })
    ).map((r) => r.id),
  );
  const presentVendorIds = new Set(
    (
      await db.aIVendor.findMany({
        where: { organizationId: args.organizationId, id: { in: args.knownAisVendorIds.slice(0, 1000) } },
        select: { id: true },
      })
    ).map((r) => r.id),
  );

  const org = await db.organization.findUnique({ where: { id: args.organizationId }, select: { settings: true } });
  const link = readLink(org?.settings);
  if (link) {
    await db.organization.update({
      where: { id: args.organizationId },
      data: { settings: withLink(org?.settings, { ...link, lastSyncAt: now }) },
    });
  }

  const systems: AisOutboundSystem[] = ownSystems.map((s) => ({
    aisId: s.id,
    name: s.name,
    description: s.description,
    purpose: s.purpose,
    vendorAisId: s.vendorId,
    vendorName: s.vendor?.name ?? null,
  }));
  const vendors: AisOutboundVendor[] = ownVendors.map((v) => ({
    aisId: v.id,
    name: v.name,
    website: v.website,
    description: v.description,
    catalogSlug: v.catalogSlug,
  }));
  return {
    mapped: { systems: imported.systems, vendors: imported.vendors },
    created: { systems: imported.createdSystems, vendors: imported.createdVendors },
    aisSystems: systems,
    aisVendors: vendors,
    presentAisSystemIds: [...presentSystemIds],
    presentAisVendorIds: [...presentVendorIds],
  };
}
