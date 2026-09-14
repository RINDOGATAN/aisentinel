// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The grace period for organisations that already use a paid module on the
 * day hosted billing is switched on.
 *
 * Turning Stripe on turns the free bypass off in the same build, so without
 * this every existing organisation would lose its modules on the next request.
 * The grace is a real entitlement row per module in use: `licenseType: TRIAL`,
 * `status: ACTIVE`, `expiresAt` = today + 30 days. The gates already honour
 * `expiresAt`, so no gate changes and the grace ends by itself.
 *
 * This module decides WHAT to write. scripts/grant-paywall-grace.ts reads the
 * database, calls planGrace, prints the plan, and writes only with --apply.
 *
 * Conservative throughout: an existing entitlement row of any kind is never
 * overwritten (a suspended subscription is not an invitation to a free month),
 * and an organisation linked to more than one customer is skipped rather than
 * guessed at, because every gate resolves that link with findFirst.
 *
 * Pure: no Prisma, no Next.
 */

import type { EntitlementStatus, LicenseType } from "@prisma/client";

export const GRACE_DAYS = 30;

/**
 * "In use" means the organisation has written data with the module, not that
 * someone opened its page. Each entry names the evidence the script counts.
 */
export const GRACE_MODULES = [
  { skillId: "com.todolaw.aisentinel.conformity", evidence: "an assessment of type CONFORMITY" },
  { skillId: "com.todolaw.aisentinel.bias-fairness", evidence: "an assessment of type BIAS_FAIRNESS" },
  { skillId: "com.todolaw.aisentinel.shadow-ai", evidence: "a shadow AI report" },
  { skillId: "com.todolaw.aisentinel.vendor-catalog", evidence: "a vendor added from the catalogue" },
  { skillId: "com.todolaw.aisentinel.impact-assessment", evidence: "an impact assessment document exported" },
  { skillId: "com.todolaw.aisentinel.program-report", evidence: "a board report, or a program report or pack exported" },
] as const;

export type GraceSkillId = (typeof GRACE_MODULES)[number]["skillId"];

export interface ExistingRow {
  skillId: string;
  licenseType: LicenseType;
  status: EntitlementStatus;
  expiresAt: Date | null;
}

export interface OrgForGrace {
  organizationId: string;
  organizationName: string;
  /** Modules the organisation has written data with. */
  usedSkillIds: string[];
  /** Customers already linked to the organisation, with their entitlement rows. */
  linkedCustomers: { customerId: string; rows: ExistingRow[] }[];
  /** The earliest-joined owner with an e-mail address, if any. */
  owner: { email: string; name: string | null } | null;
  /** A Customer that already exists for the owner's e-mail, if any, with its rows. */
  ownerCustomer: { customerId: string; rows: ExistingRow[] } | null;
}

export type CustomerChoice =
  | { kind: "linked"; customerId: string }
  | { kind: "link-existing"; customerId: string }
  | { kind: "create"; email: string; name: string };

export interface OrgGracePlan {
  organizationId: string;
  organizationName: string;
  customer: CustomerChoice | null;
  grant: string[];
  skipped: { skillId: string; reason: string }[];
  /** Set when nothing at all is done for the organisation, and why. */
  skipReason?: string;
}

export interface GracePlan {
  expiresAt: Date;
  organizations: OrgGracePlan[];
  totals: { organizations: number; grants: number; customersToCreate: number; skippedOrganizations: number };
}

export function graceExpiry(now: Date, days: number = GRACE_DAYS): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function planGrace(orgs: OrgForGrace[], now: Date, days: number = GRACE_DAYS): GracePlan {
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error(`Grace days must be a whole number from 1 to 365, got ${days}`);
  }
  const known = new Set<string>(GRACE_MODULES.map((m) => m.skillId));
  // One customer may be linked to several organisations and rows are per
  // customer, so a module granted once covers all of them.
  const plannedFor = new Map<string, Set<string>>();
  const organizations: OrgGracePlan[] = [];

  for (const org of orgs) {
    const used = [...new Set(org.usedSkillIds)].filter((id) => known.has(id));
    const base = { organizationId: org.organizationId, organizationName: org.organizationName };

    if (!used.length) continue;

    let customer: CustomerChoice;
    let rows: ExistingRow[];

    if (org.linkedCustomers.length > 1) {
      organizations.push({
        ...base,
        customer: null,
        grant: [],
        skipped: [],
        skipReason: `linked to ${org.linkedCustomers.length} customers; resolve the duplicate link first`,
      });
      continue;
    } else if (org.linkedCustomers.length === 1) {
      customer = { kind: "linked", customerId: org.linkedCustomers[0].customerId };
      rows = org.linkedCustomers[0].rows;
    } else if (org.ownerCustomer) {
      customer = { kind: "link-existing", customerId: org.ownerCustomer.customerId };
      rows = org.ownerCustomer.rows;
    } else if (org.owner) {
      customer = { kind: "create", email: org.owner.email, name: org.owner.name || org.owner.email };
      rows = [];
    } else {
      organizations.push({
        ...base,
        customer: null,
        grant: [],
        skipped: [],
        skipReason: "no owner with an e-mail address to hold the grace entitlement",
      });
      continue;
    }

    const customerKey = customer.kind === "create" ? `email:${customer.email.toLowerCase()}` : customer.customerId;
    const planned = plannedFor.get(customerKey) ?? new Set<string>();
    plannedFor.set(customerKey, planned);

    const grant: string[] = [];
    const skipped: { skillId: string; reason: string }[] = [];
    let sharesAGrant = false;
    for (const skillId of used) {
      const row = rows.find((r) => r.skillId === skillId);
      if (row) {
        skipped.push({ skillId, reason: `already has a ${row.licenseType} ${row.status} row; never overwritten` });
      } else if (planned.has(skillId)) {
        skipped.push({ skillId, reason: "granted to the same customer through another organisation" });
        sharesAGrant = true;
      } else {
        grant.push(skillId);
        planned.add(skillId);
      }
    }

    // The gates reach entitlements through the organisation's customer link,
    // so an organisation sharing another's grant still needs its own link.
    const needsCustomer = grant.length > 0 || (sharesAGrant && customer.kind !== "linked");
    organizations.push({ ...base, customer: needsCustomer ? customer : null, grant, skipped });
  }

  // Two organisations whose owner shares an e-mail must not create the same customer twice.
  const creates = new Set(
    organizations
      .filter((o) => o.customer?.kind === "create")
      .map((o) => (o.customer as { email: string }).email.toLowerCase()),
  );

  return {
    expiresAt: graceExpiry(now, days),
    organizations,
    totals: {
      organizations: organizations.filter((o) => o.grant.length).length,
      grants: organizations.reduce((n, o) => n + o.grant.length, 0),
      customersToCreate: creates.size,
      skippedOrganizations: organizations.filter((o) => o.skipReason).length,
    },
  };
}
