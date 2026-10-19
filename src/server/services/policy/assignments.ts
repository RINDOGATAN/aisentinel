// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A policy's owner and department: who answers for it and which part of the
 * organization it belongs to.
 *
 * The owner is stored as a member id plus the name to show, so a person
 * outside the team can be named in free text. The department is a
 * BusinessUnit id. Neither is a foreign key: both are checked against the
 * organization on every write (validatePolicyAssignment) and resolved on every
 * read, so a member who leaves or a department that is deleted simply stops
 * resolving and the stored name is shown instead.
 */

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "organizationMember" | "businessUnit">;

export interface PolicyAssignmentInput {
  ownerMemberId?: string | null;
  ownerName?: string | null;
  departmentId?: string | null;
}

/**
 * Check the member and the department belong to the organization, and return
 * the values to store. A chosen member's current name replaces a blank
 * ownerName. Fields left undefined are left out (no change).
 */
export async function validatePolicyAssignment(
  db: Db,
  organizationId: string,
  input: PolicyAssignmentInput,
): Promise<{ ownerMemberId?: string | null; ownerName?: string | null; departmentId?: string | null }> {
  const out: { ownerMemberId?: string | null; ownerName?: string | null; departmentId?: string | null } = {};

  if (input.ownerMemberId !== undefined) {
    if (input.ownerMemberId) {
      const member = await db.organizationMember.findFirst({
        where: { id: input.ownerMemberId, organizationId },
        select: { id: true, user: { select: { name: true, email: true } } },
      });
      if (!member) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown member" });
      out.ownerMemberId = member.id;
      out.ownerName = input.ownerName?.trim() || member.user.name || member.user.email || null;
    } else {
      out.ownerMemberId = null;
      if (input.ownerName !== undefined) out.ownerName = input.ownerName?.trim() || null;
    }
  } else if (input.ownerName !== undefined) {
    out.ownerName = input.ownerName?.trim() || null;
  }

  if (input.departmentId !== undefined) {
    if (input.departmentId) {
      const unit = await db.businessUnit.findFirst({
        where: { id: input.departmentId, organizationId },
        select: { id: true },
      });
      if (!unit) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown department" });
      out.departmentId = unit.id;
    } else {
      out.departmentId = null;
    }
  }

  return out;
}

export interface ResolvedAssignment {
  ownerName: string | null;
  /** True when the owner is a current member of the organization. */
  ownerIsMember: boolean;
  departmentName: string | null;
}

/** Owner and department names for a set of policies, in two queries. */
export async function resolvePolicyAssignments<
  P extends { id: string; ownerMemberId: string | null; ownerName: string | null; departmentId: string | null },
>(db: Db, organizationId: string, policies: P[]): Promise<Map<string, ResolvedAssignment>> {
  const memberIds = [...new Set(policies.map((p) => p.ownerMemberId).filter((x): x is string => !!x))];
  const departmentIds = [...new Set(policies.map((p) => p.departmentId).filter((x): x is string => !!x))];

  const [members, departments] = await Promise.all([
    memberIds.length
      ? db.organizationMember.findMany({
          where: { organizationId, id: { in: memberIds } },
          select: { id: true, user: { select: { name: true, email: true } } },
        })
      : Promise.resolve([] as Array<{ id: string; user: { name: string | null; email: string | null } }>),
    departmentIds.length
      ? db.businessUnit.findMany({
          where: { organizationId, id: { in: departmentIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([] as Array<{ id: string; name: string }>),
  ]);
  const memberName = new Map(members.map((m) => [m.id, m.user.name || m.user.email || null]));
  const departmentName = new Map(departments.map((d) => [d.id, d.name]));

  const out = new Map<string, ResolvedAssignment>();
  for (const p of policies) {
    const isMember = !!p.ownerMemberId && memberName.has(p.ownerMemberId);
    out.set(p.id, {
      // The stored name wins: it is what was chosen, and survives a departure.
      ownerName: p.ownerName || (isMember ? memberName.get(p.ownerMemberId!) ?? null : null),
      ownerIsMember: isMember,
      departmentName: p.departmentId ? departmentName.get(p.departmentId) ?? null : null,
    });
  }
  return out;
}
