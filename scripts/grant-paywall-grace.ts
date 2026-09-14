// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Give every organisation that already uses a paid module a 30-day grace
 * period, on the day hosted billing is switched on.
 *
 * PLANS BY DEFAULT. Without --apply it reads the database, prints what it
 * would write, and writes nothing. With --apply it writes exactly that plan.
 *
 * What it writes, per organisation and module in use (see
 * src/server/services/billing/paywall-grace.ts for the rules):
 *   - a SkillEntitlement with licenseType TRIAL, status ACTIVE, expiresAt =
 *     now + 30 days;
 *   - where the organisation has no billing customer, a Customer for its
 *     owner's e-mail (reused if one exists) and the link to the organisation;
 *   - one audit log entry per organisation.
 * It never overwrites an existing entitlement row and it is safe to run twice.
 *
 * Run it in the same change window as the build that turns Stripe on, not
 * before: until then the gates are bypassed and the countdown would be spent
 * on nothing.
 *
 * Usage:
 *   npx tsx scripts/grant-paywall-grace.ts            # plan only
 *   npx tsx scripts/grant-paywall-grace.ts --apply    # write
 *   npx tsx scripts/grant-paywall-grace.ts --days=45  # a different window
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import {
  GRACE_DAYS,
  GRACE_MODULES,
  planGrace,
  type ExistingRow,
  type OrgForGrace,
} from "../src/server/services/billing/paywall-grace";

const PROGRAM_EXPORTS = ["EXPORT_GOVERNANCE_PROGRAM", "EXPORT_PROGRAM_PACK"];
const IMPACT_EXPORTS = ["EXPORT_UNIFIED_ARTIFACT"];

function parseArgs(argv: string[]) {
  const apply = argv.includes("--apply");
  const daysArg = argv.find((a) => a.startsWith("--days="));
  const days = daysArg ? Number(daysArg.slice("--days=".length)) : GRACE_DAYS;
  const unknown = argv.filter((a) => a !== "--apply" && !a.startsWith("--days="));
  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(" ")}`);
  return { apply, days };
}

async function usedSkillIds(prisma: PrismaClient, organizationId: string): Promise<string[]> {
  const [conformity, bias, shadow, catalogVendors, impactExports, programExports, boardReports] =
    await Promise.all([
      prisma.aIAssessment.count({ where: { organizationId, type: "CONFORMITY" } }),
      prisma.aIAssessment.count({ where: { organizationId, type: "BIAS_FAIRNESS" } }),
      prisma.shadowAIReport.count({ where: { organizationId } }),
      prisma.aIVendor.count({ where: { organizationId, catalogSlug: { not: null } } }),
      prisma.auditLog.count({ where: { organizationId, action: { in: IMPACT_EXPORTS } } }),
      prisma.auditLog.count({ where: { organizationId, action: { in: PROGRAM_EXPORTS } } }),
      prisma.boardReport.count({ where: { organizationId } }),
    ]);

  const used: string[] = [];
  if (conformity) used.push("com.todolaw.aisentinel.conformity");
  if (bias) used.push("com.todolaw.aisentinel.bias-fairness");
  if (shadow) used.push("com.todolaw.aisentinel.shadow-ai");
  if (catalogVendors) used.push("com.todolaw.aisentinel.vendor-catalog");
  if (impactExports) used.push("com.todolaw.aisentinel.impact-assessment");
  if (programExports || boardReports) used.push("com.todolaw.aisentinel.program-report");
  return used;
}

async function rowsFor(prisma: PrismaClient, customerId: string): Promise<ExistingRow[]> {
  const rows = await prisma.skillEntitlement.findMany({
    where: { customerId },
    select: { licenseType: true, status: true, expiresAt: true, skillPackage: { select: { skillId: true } } },
  });
  return rows.map((r) => ({
    skillId: r.skillPackage.skillId,
    licenseType: r.licenseType,
    status: r.status,
    expiresAt: r.expiresAt,
  }));
}

async function load(prisma: PrismaClient): Promise<OrgForGrace[]> {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      members: {
        where: { role: "OWNER" },
        orderBy: { joinedAt: "asc" },
        select: { user: { select: { email: true, name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const result: OrgForGrace[] = [];
  for (const org of orgs) {
    const links = await prisma.customerOrganization.findMany({
      where: { organizationId: org.id },
      select: { customerId: true },
    });
    const ownerUser = org.members.map((m) => m.user).find((u) => !!u.email);
    const owner = ownerUser?.email ? { email: ownerUser.email, name: ownerUser.name } : null;
    const ownerCustomerRow =
      !links.length && owner
        ? await prisma.customer.findUnique({ where: { email: owner.email }, select: { id: true } })
        : null;

    result.push({
      organizationId: org.id,
      organizationName: org.name,
      usedSkillIds: await usedSkillIds(prisma, org.id),
      linkedCustomers: await Promise.all(
        links.map(async (l) => ({ customerId: l.customerId, rows: await rowsFor(prisma, l.customerId) })),
      ),
      owner,
      ownerCustomer: ownerCustomerRow
        ? { customerId: ownerCustomerRow.id, rows: await rowsFor(prisma, ownerCustomerRow.id) }
        : null,
    });
  }
  return result;
}

async function main() {
  if (!process.env.ais_DATABASE_URL) {
    throw new Error("ais_DATABASE_URL is not set.");
  }
  const { apply, days } = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const packages = await prisma.skillPackage.findMany({
      where: { skillId: { in: GRACE_MODULES.map((m) => m.skillId) } },
      select: { id: true, skillId: true },
    });
    const packageId = new Map(packages.map((p) => [p.skillId, p.id]));
    const missing = GRACE_MODULES.filter((m) => !packageId.has(m.skillId)).map((m) => m.skillId);
    if (missing.length) {
      throw new Error(`Skill packages not seeded: ${missing.join(", ")}. Run the base seed first.`);
    }

    const now = new Date();
    const plan = planGrace(await load(prisma), now, days);

    console.log(`${apply ? "APPLYING" : "PLAN ONLY (nothing written; pass --apply to write)"}`);
    console.log(`Grace: ${days} days, expires ${plan.expiresAt.toISOString()}`);
    for (const org of plan.organizations) {
      const who = org.customer ? ` [customer: ${org.customer.kind}]` : "";
      console.log(`- ${org.organizationName} (${org.organizationId})${who}`);
      if (org.skipReason) console.log(`    skipped: ${org.skipReason}`);
      for (const skillId of org.grant) console.log(`    grant  ${skillId}`);
      for (const s of org.skipped) console.log(`    keep   ${s.skillId}: ${s.reason}`);
    }
    console.log(JSON.stringify(plan.totals));

    if (!apply) return;

    for (const org of plan.organizations) {
      if (!org.customer) continue;
      const choice = org.customer;

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        let customerId: string;
        if (choice.kind === "create") {
          const customer = await tx.customer.upsert({
            where: { email: choice.email },
            update: {},
            create: { email: choice.email, name: choice.name, type: "SAAS" },
          });
          customerId = customer.id;
        } else {
          customerId = choice.customerId;
        }

        if (choice.kind !== "linked") {
          await tx.customerOrganization.upsert({
            where: { customerId_organizationId: { customerId, organizationId: org.organizationId } },
            update: {},
            create: { customerId, organizationId: org.organizationId },
          });
        }

        // Empty for an organisation that only shares another's grant.
        const created = await tx.skillEntitlement.createMany({
          data: org.grant.map((skillId) => ({
            customerId,
            skillPackageId: packageId.get(skillId)!,
            licenseType: "TRIAL" as const,
            status: "ACTIVE" as const,
            expiresAt: plan.expiresAt,
          })),
          skipDuplicates: true,
        });

        await tx.auditLog.create({
          data: {
            organizationId: org.organizationId,
            entityType: "SkillEntitlement",
            entityId: customerId,
            action: "GRANT_PAYWALL_GRACE",
            changes: {
              skillIds: org.grant,
              written: created.count,
              days,
              expiresAt: plan.expiresAt.toISOString(),
            },
          },
        });
      });
    }
    console.log("Applied.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
