// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Business units (departments) within an organization.
 *
 * The consultant asked to separate the registry by department ("Can I separate
 * by dept. because I'm the IT manager or in-house counsel?"). A department is a
 * light structure: a name, an optional parent (one level of nesting), an owning
 * member, and the members who are limited to it. Systems point at a department;
 * nothing is required to, so an organization that never creates one is unchanged.
 *
 * Department scope only ever narrows what a member sees, on top of the org guard
 * (see src/server/services/business-units/scope.ts). Managing departments and
 * member limits is an OWNER/ADMIN/AI_OFFICER action; reading the list, so a
 * person can filter or switch to "my department", is open to any member.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure } from "../../trpc";
import { isScopeExemptRole, loadBusinessUnitScope } from "../../services/business-units/scope";
import { OWNER_FIELDS, ownerColumns, type OwnerInput } from "../../services/business-units/owners";

const MANAGE_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

function assertManage(role: string) {
  if (!MANAGE_ROLES.includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only owners, admins and AI officers can manage departments.",
    });
  }
}

export const businessUnitRouter = createTRPCRouter({
  /**
   * The departments a person can filter or switch by, and which of them this
   * member is limited to (null means the whole organization). Open to any member
   * so the filter dropdown and the "for my department" switch can be drawn.
   */
  listForScope: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [departments, scope] = await Promise.all([
        ctx.prisma.businessUnit.findMany({
          where: { organizationId: ctx.organization.id },
          orderBy: { name: "asc" },
          select: { id: true, name: true, parentId: true },
        }),
        loadBusinessUnitScope(ctx.prisma, ctx.membership),
      ]);
      return {
        departments,
        myBusinessUnitIds: scope.all ? null : scope.businessUnitIds,
      };
    }),

  /**
   * Everything the settings card needs: each department with its system and
   * member counts and owner, plus every member with the departments they are
   * limited to. Management roles only — it lists members and their scopes.
   */
  manage: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      assertManage(ctx.membership.role);
      const orgId = ctx.organization.id;

      const [departments, systemCounts, memberRows, members] = await Promise.all([
        ctx.prisma.businessUnit.findMany({
          where: { organizationId: orgId },
          orderBy: { name: "asc" },
          include: {
            owner: { select: { id: true, user: { select: { name: true, email: true } } } },
            deputyOwner: { select: { id: true, user: { select: { name: true, email: true } } } },
            ownerInvitation: { select: { id: true, email: true, acceptedAt: true, revokedAt: true } },
            deputyInvitation: { select: { id: true, email: true, acceptedAt: true, revokedAt: true } },
            _count: { select: { members: true } },
          },
        }),
        ctx.prisma.aISystem.groupBy({
          by: ["businessUnitId"],
          where: { organizationId: orgId, businessUnitId: { not: null } },
          _count: { _all: true },
        }),
        ctx.prisma.businessUnitMember.findMany({
          where: { businessUnit: { organizationId: orgId } },
          select: { businessUnitId: true, memberId: true },
        }),
        ctx.prisma.organizationMember.findMany({
          where: { organizationId: orgId },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          select: {
            id: true,
            role: true,
            user: { select: { name: true, email: true } },
          },
        }),
      ]);

      const systemCountBy = new Map<string, number>();
      for (const row of systemCounts) {
        if (row.businessUnitId) systemCountBy.set(row.businessUnitId, row._count._all);
      }
      const scopesByMember = new Map<string, string[]>();
      for (const row of memberRows) {
        const list = scopesByMember.get(row.memberId) ?? [];
        list.push(row.businessUnitId);
        scopesByMember.set(row.memberId, list);
      }

      return {
        departments: departments.map((d) => {
          const ownerInvite = openInvitation(d.ownerInvitation);
          const deputyInvite = openInvitation(d.deputyInvitation);
          return {
            id: d.id,
            name: d.name,
            parentId: d.parentId,
            ownerId: d.ownerId,
            ownerInvitationId: ownerInvite?.id ?? null,
            ownerName: d.owner?.user.name ?? d.owner?.user.email ?? ownerInvite?.email ?? null,
            ownerPending: !d.owner && !!ownerInvite,
            deputyOwnerId: d.deputyOwnerId,
            deputyInvitationId: deputyInvite?.id ?? null,
            deputyName: d.deputyOwner?.user.name ?? d.deputyOwner?.user.email ?? deputyInvite?.email ?? null,
            deputyPending: !d.deputyOwner && !!deputyInvite,
            systemCount: systemCountBy.get(d.id) ?? 0,
            memberCount: d._count.members,
          };
        }),
        members: members.map((m) => ({
          id: m.id,
          role: m.role,
          name: m.user.name,
          email: m.user.email,
          // An exempt role's stored limit is ignored, so none is shown.
          businessUnitIds: isScopeExemptRole(m.role) ? [] : (scopesByMember.get(m.id) ?? []),
          // Why this person's access cannot be changed here, if it cannot.
          locked:
            m.id === ctx.membership.id
              ? ("self" as const)
              : isScopeExemptRole(m.role)
                ? ("role" as const)
                : null,
        })),
      };
    }),

  create: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().trim().min(1).max(120),
        parentId: z.string().nullable().optional(),
        ...OWNER_FIELDS,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertManage(ctx.membership.role);
      await assertParentInOrg(ctx.prisma, ctx.organization.id, input.parentId ?? null, null);
      const owners = await resolveOwners(ctx.prisma, ctx.organization.id, input);

      const created = await ctx.prisma.businessUnit.create({
        data: {
          organizationId: ctx.organization.id,
          name: input.name,
          parentId: input.parentId ?? null,
          ownerId: null,
          ownerInvitationId: null,
          deputyOwnerId: null,
          deputyInvitationId: null,
          ...owners,
        },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "BusinessUnit",
          entityId: created.id,
          action: "CREATE",
          changes: { name: input.name, parentId: input.parentId ?? null },
        },
      });

      return created;
    }),

  update: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        name: z.string().trim().min(1).max(120).optional(),
        parentId: z.string().nullable().optional(),
        ...OWNER_FIELDS,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertManage(ctx.membership.role);
      const existing = await ctx.prisma.businessUnit.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });

      if (input.parentId !== undefined) {
        // A department can never be its own parent (a one-level tree, so this is
        // the only cycle possible).
        if (input.parentId === input.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A department cannot be its own parent." });
        }
        await assertParentInOrg(ctx.prisma, ctx.organization.id, input.parentId, input.id);
      }
      const owners = await resolveOwners(ctx.prisma, ctx.organization.id, input);

      const data: Record<string, unknown> = { ...owners };
      if (input.name !== undefined) data.name = input.name;
      if (input.parentId !== undefined) data.parentId = input.parentId;

      await ctx.prisma.businessUnit.updateMany({
        where: { id: input.id, organizationId: ctx.organization.id },
        data: data as never,
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "BusinessUnit",
          entityId: input.id,
          action: "UPDATE",
          changes: data as Prisma.InputJsonValue,
        },
      });

      return { ok: true };
    }),

  remove: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertManage(ctx.membership.role);
      const existing = await ctx.prisma.businessUnit.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        select: { id: true, name: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });

      // Systems keep their record and lose the department (SetNull); member
      // limits and child links for this department are removed by cascade /
      // SetNull. Nothing about a system's registration is deleted with it.
      await ctx.prisma.businessUnit.deleteMany({
        where: { id: input.id, organizationId: ctx.organization.id },
      });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "BusinessUnit",
          entityId: input.id,
          action: "DELETE",
          changes: { name: existing.name },
        },
      });

      return { deleted: true };
    }),

  /**
   * Set the departments a member is limited to. An empty list clears the limit,
   * returning the member to the whole organization (the default).
   *
   * Nobody changes their own access (a limit on oneself hides one's own new
   * records), and owners and admins always see the whole organization.
   */
  setMemberDepartments: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        memberId: z.string(),
        businessUnitIds: z.array(z.string()).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertManage(ctx.membership.role);

      const member = await ctx.prisma.organizationMember.findFirst({
        where: { id: input.memberId, organizationId: ctx.organization.id },
        select: { id: true, role: true },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if (member.id === ctx.membership.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot change your own department access.",
        });
      }
      if (isScopeExemptRole(member.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Owners and admins always see the whole organization.",
        });
      }

      // Every requested department must belong to this organization, so a limit
      // can never point at another organization's department.
      const requested = [...new Set(input.businessUnitIds)];
      if (requested.length > 0) {
        const valid = await ctx.prisma.businessUnit.count({
          where: { organizationId: ctx.organization.id, id: { in: requested } },
        });
        if (valid !== requested.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown department in the list." });
        }
      }

      await ctx.prisma.$transaction([
        ctx.prisma.businessUnitMember.deleteMany({ where: { memberId: input.memberId } }),
        ...(requested.length > 0
          ? [
              ctx.prisma.businessUnitMember.createMany({
                data: requested.map((businessUnitId) => ({ businessUnitId, memberId: input.memberId })),
                skipDuplicates: true,
              }),
            ]
          : []),
      ]);

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "OrganizationMember",
          entityId: input.memberId,
          action: "UPDATE",
          changes: { businessUnitIds: requested, scope: "department-limit" },
        },
      });

      return { ok: true };
    }),
});

/** A parent department must exist in the org and not be a child itself. */
async function assertParentInOrg(
  prisma: PrismaClient,
  organizationId: string,
  parentId: string | null,
  selfId: string | null,
) {
  if (!parentId) return;
  const parent = await prisma.businessUnit.findFirst({
    where: { id: parentId, organizationId },
    select: { id: true, parentId: true },
  });
  if (!parent) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown parent department." });
  // One level of nesting only: the parent must be a top-level department.
  if (parent.parentId && parent.id !== selfId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Departments nest one level only." });
  }
}

async function resolveOwners(prisma: PrismaClient, organizationId: string, input: OwnerInput) {
  const out = ownerColumns(input);
  for (const memberId of [out.ownerId, out.deputyOwnerId]) {
    if (!memberId) continue;
    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
      select: { id: true },
    });
    if (!member) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown owner." });
  }
  for (const invitationId of [out.ownerInvitationId, out.deputyInvitationId]) {
    if (!invitationId) continue;
    const invitation = await prisma.organizationInvitation.findFirst({
      where: { id: invitationId, organizationId, acceptedAt: null, revokedAt: null },
      select: { id: true },
    });
    if (!invitation) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown owner." });
  }
  return out;
}

/** An invitation still open (not accepted, not withdrawn), or null. */
function openInvitation<T extends { acceptedAt: Date | null; revokedAt: Date | null }>(inv: T | null): T | null {
  return inv && !inv.acceptedAt && !inv.revokedAt ? inv : null;
}
