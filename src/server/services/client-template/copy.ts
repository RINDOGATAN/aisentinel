// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "Start from another client": copy a programme from one organisation into
 * another, as drafts.
 *
 * Two steps, both built from the same plan so the preview shows exactly what
 * the copy will write:
 *
 *   planClientTemplate()  reads the source, scrubs every text, and returns the
 *                         rows to create, the counts and the flags. Writes nothing.
 *   applyClientTemplate() writes the plan into the target, in the caller's
 *                         transaction, and adds ONE audit entry to the target
 *                         that names nothing about the source.
 *
 * The rules (src/config/client-template.ts): COPIED, never linked. Nothing in
 * a copied row points back to the source (no id, no slug, no name). Approvals,
 * people, dates and history stay behind: policies arrive as drafts, gates as
 * pending, vendor reviews as drafts carrying a "review for this client" note,
 * and each copied system, vendor and the obligations answers carry a mark
 * that keeps their program-path step at "started" until a person edits them.
 */

import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  CLIENT_TEMPLATE_REF,
  TEMPLATE_COPY_KEY,
  TEMPLATE_COPY_NOTE,
  canUseForTemplate,
  effectiveParts,
  templateAuditNote,
  withTemplateCopyMark,
  type CopyPart,
  type TemplateLocale,
} from "@/config/client-template";
import { makeScrubber, type ScrubFlag, type Scrubber } from "@/lib/client-template/scrub";

type Db = PrismaClient | Prisma.TransactionClient;

// ─── Permission ──────────────────────────────────────────────────────────────

/**
 * The permission rule: the signed-in person must be an owner or an admin of
 * BOTH organisations, and they must be different organisations. Checked from
 * the person's own memberships, never from input.
 */
export async function assertTemplatePermission(
  db: Pick<Db, "organizationMember">,
  userId: string,
  sourceOrganizationId: string,
  targetOrganizationId: string | null,
): Promise<void> {
  if (targetOrganizationId && sourceOrganizationId === targetOrganizationId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a different client as the source" });
  }
  const ids = targetOrganizationId ? [sourceOrganizationId, targetOrganizationId] : [sourceOrganizationId];
  const memberships = await db.organizationMember.findMany({
    where: { userId, organizationId: { in: ids } },
    select: { organizationId: true, role: true },
  });
  for (const id of ids) {
    const m = memberships.find((x) => x.organizationId === id);
    if (!m || !canUseForTemplate(m.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only an owner or an admin of both organizations can copy a template",
      });
    }
  }
}

// ─── Plan ────────────────────────────────────────────────────────────────────

export interface FlaggedItem {
  part: CopyPart;
  /** The item's title as it will read in the new client (already scrubbed). */
  title: string;
  flags: ScrubFlag[];
}

export type CopyCounts = Record<CopyPart, number>;

const EMPTY_COUNTS = (): CopyCounts => ({
  policies: 0,
  assessmentTemplates: 0,
  aiSystems: 0,
  oversightGates: 0,
  vendors: 0,
  vendorReviews: 0,
  obligations: 0,
});

interface PolicyRow {
  title: string;
  type: Prisma.AIPolicyCreateInput["type"];
  description: string | null;
  content: string | null;
}
interface TemplateRow {
  name: string;
  type: Prisma.AIAssessmentTemplateCreateInput["type"];
  description: string | null;
  sections: Prisma.InputJsonValue;
  frameworkRef: string | null;
}
interface GateRow {
  gateType: Prisma.OversightGateCreateInput["gateType"];
  description: string | null;
  reviewCadence: string | null;
}
interface SystemRow {
  key: string;
  name: string;
  description: string | null;
  technique: Prisma.AISystemCreateInput["technique"];
  role: Prisma.AISystemCreateInput["role"];
  purpose: string | null;
  processesPersonalData: boolean;
  vendorKey: string | null;
  gates: GateRow[];
}
interface VendorReviewRow {
  title: string;
  findings: string | null;
  responses: Prisma.InputJsonValue | undefined;
  riskScore: number | null;
}
interface VendorRow {
  key: string;
  name: string;
  website: string | null;
  description: string | null;
  riskLevel: Prisma.AIVendorCreateInput["riskLevel"];
  notes: string | null;
  catalogSlug: string | null;
  reviews: VendorReviewRow[];
}
interface ObligationsRow {
  jurisdictions: string[];
  regimes: Record<string, string>;
}

export interface ClientTemplatePlan {
  parts: CopyPart[];
  counts: CopyCounts;
  /** What the source holds but the target already has (same title or name): left alone. */
  skipped: CopyCounts;
  flagged: FlaggedItem[];
  /** Times the source's name was replaced with the new client's. */
  replacements: number;
  policies: PolicyRow[];
  templates: TemplateRow[];
  systems: SystemRow[];
  vendors: VendorRow[];
  obligations: ObligationsRow | null;
}

function key(value: string): string {
  return value.trim().toLowerCase();
}

function answered(value: unknown): value is "YES" | "NO" {
  return value === "YES" || value === "NO";
}

function settingsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Read the source and build what would be written. `targetOrganizationId`
 * is null for a client that does not exist yet (the preview before
 * "Copy into a new client"); with one, anything the target already holds
 * under the same title or name is skipped rather than duplicated.
 */
export async function planClientTemplate(
  db: Db,
  input: {
    sourceOrganizationId: string;
    targetOrganizationId: string | null;
    targetName: string;
    parts: readonly CopyPart[];
  },
): Promise<ClientTemplatePlan> {
  const parts = effectiveParts(input.parts);
  const want = (p: CopyPart) => parts.includes(p);
  const src = { organizationId: input.sourceOrganizationId };

  const source = await db.organization.findFirst({
    where: { id: input.sourceOrganizationId },
    select: { name: true, domain: true, operatingJurisdictions: true, settings: true },
  });
  if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });

  const target = input.targetOrganizationId
    ? await db.organization.findFirst({
        where: { id: input.targetOrganizationId },
        select: { operatingJurisdictions: true, settings: true },
      })
    : null;
  const tgt = input.targetOrganizationId ? { organizationId: input.targetOrganizationId } : null;

  const scrubber: Scrubber = makeScrubber({ name: source.name, domain: source.domain }, input.targetName);
  const plan: ClientTemplatePlan = {
    parts,
    counts: EMPTY_COUNTS(),
    skipped: EMPTY_COUNTS(),
    flagged: [],
    replacements: 0,
    policies: [],
    templates: [],
    systems: [],
    vendors: [],
    obligations: null,
  };

  /**
   * Scrub every text of one item. The flags are held back until the item is
   * known to be copied (keep), so a skipped item never appears in the list.
   */
  const scrubItem = <T extends Record<string, unknown>>(part: CopyPart, titleField: keyof T, row: T) => {
    const out = { ...row };
    const flags: ScrubFlag[] = [];
    let replaced = 0;
    for (const [field, value] of Object.entries(row)) {
      if (typeof value === "string") {
        const r = scrubber.scrub(value);
        replaced += r.replaced;
        flags.push(...r.flags);
        (out as Record<string, unknown>)[field] = r.text;
      } else if (value && typeof value === "object") {
        const r = scrubber.scrubJson(value);
        replaced += r.replaced;
        flags.push(...r.flags);
        (out as Record<string, unknown>)[field] = r.value;
      }
    }
    const keep = (title: string = String(out[titleField] ?? "")): T => {
      plan.replacements += replaced;
      if (flags.length > 0) plan.flagged.push({ part, title, flags });
      return out;
    };
    return { out, keep };
  };

  // Policies: title, type and text only. Status, approvals and dates stay behind.
  if (want("policies")) {
    const [rows, existing] = await Promise.all([
      db.aIPolicy.findMany({
        where: { ...src, status: { not: "ARCHIVED" } },
        select: { title: true, type: true, description: true, content: true },
        orderBy: { createdAt: "asc" },
      }),
      tgt ? db.aIPolicy.findMany({ where: tgt, select: { title: true } }) : Promise.resolve([]),
    ]);
    const taken = new Set(existing.map((p) => key(p.title)));
    for (const row of rows) {
      const item = scrubItem("policies", "title", row);
      if (taken.has(key(item.out.title))) {
        plan.skipped.policies += 1;
        continue;
      }
      taken.add(key(item.out.title));
      plan.policies.push(item.keep());
    }
  }

  // Assessment templates: the organisation's own questionnaires (its custom questions).
  if (want("assessmentTemplates")) {
    const [rows, existing] = await Promise.all([
      db.aIAssessmentTemplate.findMany({
        where: { ...src, isSystem: false },
        select: { name: true, type: true, description: true, sections: true, frameworkRef: true },
        orderBy: { createdAt: "asc" },
      }),
      tgt ? db.aIAssessmentTemplate.findMany({ where: tgt, select: { name: true } }) : Promise.resolve([]),
    ]);
    const taken = new Set(existing.map((t) => key(t.name)));
    for (const row of rows) {
      const item = scrubItem("assessmentTemplates", "name", {
        ...row,
        sections: (row.sections ?? []) as Prisma.InputJsonValue,
      });
      if (taken.has(key(item.out.name))) {
        plan.skipped.assessmentTemplates += 1;
        continue;
      }
      taken.add(key(item.out.name));
      plan.templates.push(item.keep());
    }
  }

  // Vendors, with their reviews' findings when chosen. Contacts, contract
  // dates and links to other apps are the client's own and stay behind.
  const vendorKeyById = new Map<string, string>();
  if (want("vendors")) {
    const [rows, existing] = await Promise.all([
      db.aIVendor.findMany({
        where: src,
        select: {
          id: true,
          name: true,
          website: true,
          description: true,
          riskLevel: true,
          notes: true,
          catalogSlug: true,
          assessments: want("vendorReviews")
            ? {
                select: { title: true, findings: true, responses: true, riskScore: true },
                orderBy: { createdAt: "asc" },
              }
            : false,
        },
        orderBy: { createdAt: "asc" },
      }),
      tgt ? db.aIVendor.findMany({ where: tgt, select: { name: true } }) : Promise.resolve([]),
    ]);
    const taken = new Set(existing.map((v) => key(v.name)));
    for (const row of rows) {
      const { id, assessments, ...fields } = row as typeof row & {
        assessments?: { title: string; findings: string | null; responses: unknown; riskScore: number | null }[];
      };
      const item = scrubItem("vendors", "name", fields);
      const clean = item.out;
      vendorKeyById.set(id, key(clean.name));
      if (taken.has(key(clean.name))) {
        plan.skipped.vendors += 1;
        plan.skipped.vendorReviews += assessments?.length ?? 0;
        continue;
      }
      taken.add(key(clean.name));
      item.keep();
      const reviews = (assessments ?? []).map((a) =>
        scrubItem("vendorReviews", "title", {
          title: a.title,
          findings: a.findings,
          responses: (a.responses ?? undefined) as Prisma.InputJsonValue | undefined,
          riskScore: a.riskScore,
        }).keep(),
      );
      plan.vendors.push({ ...clean, key: key(clean.name), reviews });
    }
  }

  // AI systems (only when chosen: they are client-specific), with their gate
  // definitions when chosen. Owners, dates, screening facts, classification
  // and everything recorded against a system stay behind.
  if (want("aiSystems")) {
    const [rows, existing] = await Promise.all([
      db.aISystem.findMany({
        where: src,
        select: {
          name: true,
          description: true,
          technique: true,
          role: true,
          purpose: true,
          processesPersonalData: true,
          vendorId: true,
          vendor: { select: { name: true } },
          oversightGates: want("oversightGates")
            ? { select: { gateType: true, description: true, reviewCadence: true }, orderBy: { createdAt: "asc" } }
            : false,
        },
        orderBy: { createdAt: "asc" },
      }),
      tgt ? db.aISystem.findMany({ where: tgt, select: { name: true } }) : Promise.resolve([]),
    ]);
    const taken = new Set(existing.map((s) => key(s.name)));
    for (const row of rows) {
      const { vendorId, vendor, oversightGates, ...fields } = row as typeof row & {
        vendor: { name: string } | null;
        oversightGates?: GateRow[];
      };
      const item = scrubItem("aiSystems", "name", fields);
      const clean = item.out;
      if (taken.has(key(clean.name))) {
        plan.skipped.aiSystems += 1;
        plan.skipped.oversightGates += oversightGates?.length ?? 0;
        continue;
      }
      taken.add(key(clean.name));
      item.keep();
      // A gate is listed under its system's name: a gate has no title of its own.
      const gates = (oversightGates ?? []).map((g) =>
        scrubItem("oversightGates", "gateType", { ...g }).keep(clean.name),
      );
      // The vendor link is kept by name, so it reaches the copied vendor or
      // one the target already had under that name.
      const vendorKey = vendorId
        ? (vendorKeyById.get(vendorId) ?? (vendor ? key(scrubber.scrub(vendor.name).text) : null))
        : null;
      plan.systems.push({ ...clean, key: key(clean.name), vendorKey, gates });
    }
  }

  // Obligations: jurisdictions (only into a client that has declared none)
  // and the screening answers the target has not given yet.
  if (want("obligations")) {
    const srcRegimes = settingsObject(settingsObject(source.settings).regimes);
    const tgtRegimes = settingsObject(settingsObject(target?.settings).regimes);
    const regimes: Record<string, string> = {};
    for (const [k, v] of Object.entries(srcRegimes)) {
      if (answered(v) && !answered(tgtRegimes[k])) regimes[k] = v;
    }
    const jurisdictions =
      (target?.operatingJurisdictions.length ?? 0) > 0 ? [] : [...source.operatingJurisdictions];
    if (jurisdictions.length > 0 || Object.keys(regimes).length > 0) {
      plan.obligations = { jurisdictions, regimes };
    }
  }

  plan.counts.policies = plan.policies.length;
  plan.counts.assessmentTemplates = plan.templates.length;
  plan.counts.vendors = plan.vendors.length;
  plan.counts.vendorReviews = plan.vendors.reduce((n, v) => n + v.reviews.length, 0);
  plan.counts.aiSystems = plan.systems.length;
  plan.counts.oversightGates = plan.systems.reduce((n, s) => n + s.gates.length, 0);
  plan.counts.obligations = plan.obligations
    ? plan.obligations.jurisdictions.length + Object.keys(plan.obligations.regimes).length
    : 0;
  return plan;
}

// ─── Apply ───────────────────────────────────────────────────────────────────

export interface AppliedTemplate {
  counts: CopyCounts;
  /** Items that carry a flag, by their id in the new client, for the follow-up list. */
  flagged: (FlaggedItem & { id: string | null })[];
}

/**
 * Write the plan into the target. Call inside a transaction: the caller also
 * checks the pilot ceilings there, so a refused copy leaves nothing behind.
 */
export async function applyClientTemplate(
  db: Db,
  plan: ClientTemplatePlan,
  input: { targetOrganizationId: string; userId: string; locale: TemplateLocale; now?: Date },
): Promise<AppliedTemplate> {
  const now = input.now ?? new Date();
  const organizationId = input.targetOrganizationId;
  const note = TEMPLATE_COPY_NOTE[input.locale];
  const ids = new Map<string, string>(); // "<part>:<title>" -> new id
  const idKey = (part: CopyPart, title: string) => `${part}:${title}`;

  for (const p of plan.policies) {
    const policy = await db.aIPolicy.create({
      data: {
        organizationId,
        title: p.title,
        type: p.type,
        description: p.description,
        content: p.content,
        status: "DRAFT",
        createdBy: input.userId,
        provenance: "AUTO_TEMPLATE",
        sourceRef: CLIENT_TEMPLATE_REF,
      },
      select: { id: true },
    });
    ids.set(idKey("policies", p.title), policy.id);
    if (p.content) {
      await db.aIPolicyVersion.create({
        data: { policyId: policy.id, version: 1, content: p.content, changeNotes: note, createdBy: input.userId },
      });
    }
  }

  for (const t of plan.templates) {
    const template = await db.aIAssessmentTemplate.create({
      data: {
        organizationId,
        name: t.name,
        type: t.type,
        description: t.description,
        sections: t.sections,
        frameworkRef: t.frameworkRef,
        isSystem: false,
      },
      select: { id: true },
    });
    ids.set(idKey("assessmentTemplates", t.name), template.id);
  }

  const vendorIdByKey = new Map<string, string>();
  for (const v of plan.vendors) {
    const vendor = await db.aIVendor.create({
      data: {
        organizationId,
        name: v.name,
        website: v.website,
        description: v.description,
        riskLevel: v.riskLevel,
        notes: v.notes,
        catalogSlug: v.catalogSlug,
        status: "UNDER_REVIEW",
        metadata: withTemplateCopyMark(null, now) as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    vendorIdByKey.set(v.key, vendor.id);
    ids.set(idKey("vendors", v.name), vendor.id);
    for (const r of v.reviews) {
      await db.aIVendorAssessment.create({
        data: {
          organizationId,
          vendorId: vendor.id,
          title: r.title,
          status: "DRAFT",
          riskScore: r.riskScore,
          responses: r.responses,
          findings: r.findings ? `${note}\n\n${r.findings}` : note,
        },
        select: { id: true },
      });
      // A review is opened from its vendor's page.
      ids.set(idKey("vendorReviews", r.title), vendor.id);
    }
  }

  // Systems can point at a vendor the target already had under the same name.
  const wantedVendorKeys = plan.systems
    .map((s) => s.vendorKey)
    .filter((k): k is string => !!k && !vendorIdByKey.has(k));
  if (wantedVendorKeys.length > 0) {
    const existing = await db.aIVendor.findMany({ where: { organizationId }, select: { id: true, name: true } });
    for (const v of existing) if (!vendorIdByKey.has(key(v.name))) vendorIdByKey.set(key(v.name), v.id);
  }

  for (const s of plan.systems) {
    const system = await db.aISystem.create({
      data: {
        organizationId,
        name: s.name,
        description: s.description,
        technique: s.technique,
        role: s.role,
        purpose: s.purpose,
        processesPersonalData: s.processesPersonalData,
        status: "DRAFT",
        vendorId: s.vendorKey ? (vendorIdByKey.get(s.vendorKey) ?? null) : null,
        metadata: withTemplateCopyMark(null, now) as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    ids.set(idKey("aiSystems", s.name), system.id);
    for (const g of s.gates) {
      const gate = await db.oversightGate.create({
        data: {
          organizationId,
          aiSystemId: system.id,
          gateType: g.gateType,
          description: g.description,
          reviewCadence: g.reviewCadence,
          status: "PENDING",
          provenance: "AUTO_TEMPLATE",
          sourceRef: CLIENT_TEMPLATE_REF,
        },
        select: { id: true },
      });
      if (!ids.has(idKey("oversightGates", s.name))) ids.set(idKey("oversightGates", s.name), gate.id);
    }
  }

  if (plan.obligations) {
    const org = await db.organization.findFirst({
      where: { id: organizationId },
      select: { settings: true, operatingJurisdictions: true },
    });
    const settings = settingsObject(org?.settings);
    const regimes = { ...settingsObject(settings.regimes), ...plan.obligations.regimes };
    await db.organization.update({
      where: { id: organizationId },
      data: {
        ...(plan.obligations.jurisdictions.length > 0 && (org?.operatingJurisdictions.length ?? 0) === 0
          ? { operatingJurisdictions: plan.obligations.jurisdictions as never }
          : {}),
        settings: {
          ...settings,
          regimes,
          [TEMPLATE_COPY_KEY]: { pending: true, copiedAt: now.toISOString() },
        } as Prisma.InputJsonValue,
      },
    });
  }

  // The one record of the copy: dated, with counts, and nothing about the source.
  await db.auditLog.create({
    data: {
      organizationId,
      userId: input.userId,
      entityType: "Organization",
      entityId: organizationId,
      action: "CREATE_FROM_TEMPLATE",
      changes: { note: templateAuditNote(now), counts: { ...plan.counts } },
    },
  });

  return {
    counts: plan.counts,
    flagged: plan.flagged.map((f) => ({ ...f, id: ids.get(idKey(f.part, f.title)) ?? null })),
  };
}
