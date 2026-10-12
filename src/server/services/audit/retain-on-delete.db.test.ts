// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The trail kept on organisation deletion, against a real Postgres.
 *
 * Skipped unless DB_TEST_DATABASE_URL is set, and refused unless it points at
 * localhost: this test writes and deletes rows, and must never touch a hosted
 * database. Run against a throwaway database after `prisma migrate deploy`:
 *   DB_TEST_DATABASE_URL=postgresql://u:p@localhost:5432/db npx vitest run src/server/services/audit/retain-on-delete.db.test.ts
 */
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { retainAnonymisedTrail } from "./retain-on-delete";

const url = process.env.DB_TEST_DATABASE_URL;
const local = !!url && /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);

describe.skipIf(!local)("retainAnonymisedTrail (local Postgres only)", () => {
  const prisma = new PrismaClient({ datasourceUrl: url });
  const tag = `t${Date.now()}`;
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { startsWith: tag } } });
    await prisma.auditLog.deleteMany({ where: { metadata: { path: ["deletedOrganizationId"], string_contains: tag } } });
    await prisma.organization.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("keeps the deleted organisation's trail without personal data, detached; leaves others alone", async () => {
    const user = await prisma.user.create({ data: { email: `${tag}@example.test`, name: "A Person" } });
    const a = await prisma.organization.create({ data: { name: "A", slug: `${tag}-a` } });
    const b = await prisma.organization.create({ data: { name: "B", slug: `${tag}-b` } });

    const personal = { userId: user.id, ipAddress: "192.0.2.1", userAgent: "agent/1" };
    const system = await prisma.auditLog.create({
      data: {
        organizationId: a.id,
        ...personal,
        entityType: "AISystem",
        entityId: `${tag}-sys`,
        action: "UPDATE",
        changes: { name: "Hiring model", notes: `${tag}@example.test asked` },
        metadata: { source: "ui", by: "A Person" },
      },
    });
    const member = await prisma.auditLog.create({
      data: {
        organizationId: a.id,
        ...personal,
        entityType: "OrganizationMember",
        entityId: user.id,
        action: "CREATE",
        changes: { email: `${tag}@example.test`, role: "MEMBER" },
      },
    });
    const scalar = await prisma.auditLog.create({
      data: { organizationId: a.id, ...personal, entityType: "AIPolicy", entityId: `${tag}-pol`, action: "DELETE", changes: "free text" },
    });
    const empty = await prisma.auditLog.create({
      data: { organizationId: a.id, ...personal, entityType: "AIPolicy", entityId: `${tag}-pol2`, action: "CREATE" },
    });
    const tombstone = await prisma.auditLog.create({
      data: { organizationId: a.id, userId: user.id, entityType: "Organization", entityId: a.id, action: "DELETE", changes: { name: "A", slug: a.slug } },
    });
    const other = await prisma.auditLog.create({
      data: { organizationId: b.id, ...personal, entityType: "AISystem", entityId: `${tag}-other`, action: "UPDATE", changes: { name: "Kept" } },
    });

    await prisma.$transaction(async (tx) => {
      const n = await retainAnonymisedTrail(tx, a.id, tombstone.id);
      expect(n).toBe(4);
      await tx.organization.delete({ where: { id: a.id } });
    });

    const rows = await prisma.auditLog.findMany({
      where: { id: { in: [system.id, member.id, scalar.id, empty.id, tombstone.id, other.id] } },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(rows).toHaveLength(6);

    for (const id of [system.id, member.id, scalar.id, empty.id]) {
      const r = byId.get(id)!;
      expect(r.organizationId).toBeNull();
      expect(r.userId).toBeNull();
      expect(r.ipAddress).toBeNull();
      expect(r.userAgent).toBeNull();
      expect(r.metadata).toEqual({ deletedOrganizationId: a.id, personalDataRemoved: true });
      expect(JSON.stringify(r)).not.toContain("example.test");
    }
    expect(byId.get(system.id)).toMatchObject({ entityType: "AISystem", entityId: `${tag}-sys`, action: "UPDATE", changes: { fields: ["name", "notes"] } });
    expect(byId.get(system.id)!.createdAt).toEqual(system.createdAt);
    expect(byId.get(member.id)).toMatchObject({ entityId: "[removed]", changes: { fields: ["email", "role"] } });
    expect(byId.get(scalar.id)!.changes).toEqual({ fields: [] });
    expect(byId.get(empty.id)!.changes).toBeNull();

    // The tombstone is untouched apart from the detachment.
    expect(byId.get(tombstone.id)).toMatchObject({ organizationId: null, userId: user.id, changes: { name: "A", slug: a.slug } });
    // The other organisation's trail is untouched.
    expect(byId.get(other.id)).toMatchObject({ organizationId: b.id, userId: user.id, ipAddress: "192.0.2.1", changes: { name: "Kept" } });

    // No tenant read reaches the detached rows: they carry no organisation.
    expect(await prisma.auditLog.count({ where: { organizationId: a.id } })).toBe(0);
  });
});
