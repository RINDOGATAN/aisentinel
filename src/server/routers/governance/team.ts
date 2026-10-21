// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Team invitations and the list of people who can be named as an owner.
 *
 * Owners and admins invite colleagues by e-mail, with a role no higher than
 * their own and, optionally, the departments the person will be limited to.
 * The rules for the link itself live in src/server/services/team/invitations.ts.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationRole } from "@prisma/client";
import { createTRPCRouter, organizationProcedure, orgWriteProcedure, protectedProcedure } from "../../trpc";
import { assertPilotRoom, pilotLocale } from "../../services/pilot/caps";
import { blockedEmailMessage, BLOCKED_EMAIL_MESSAGE_KEY, isBlockedAccountEmail } from "@/lib/email-policy";
import {
  acceptInvitation,
  buildInvitationEmail,
  canGrantRole,
  canInvite,
  departmentsForRole,
  invitationExpiry,
  invitationState,
  invitationUrl,
  newInvitationToken,
  normaliseEmail,
  previewInvitation,
  sendInvitationEmail,
} from "../../services/team/invitations";

function assertInviter(role: string) {
  if (!canInvite(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and admins can invite colleagues." });
  }
}

export const teamRouter = createTRPCRouter({
  /** Pending and lapsed invitations (not the accepted or withdrawn ones). */
  invitations: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      assertInviter(ctx.membership.role);
      const rows = await ctx.prisma.organizationInvitation.findMany({
        where: { organizationId: ctx.organization.id, acceptedAt: null, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, role: true, businessUnitIds: true, expiresAt: true, createdAt: true, acceptedAt: true, revokedAt: true },
      });
      const now = new Date();
      return rows.map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role,
        businessUnitIds: r.businessUnitIds ?? [],
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
        expired: invitationState(r, now) === "expired",
      }));
    }),

  /**
   * Everyone who can be named as an owner: members, and people invited who
   * have not joined yet. Open to any member, like the member list itself.
   */
  people: organizationProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [members, invitations] = await Promise.all([
        ctx.prisma.organizationMember.findMany({
          where: { organizationId: ctx.organization.id },
          orderBy: { joinedAt: "asc" },
          select: { id: true, user: { select: { name: true, email: true } } },
        }),
        ctx.prisma.organizationInvitation.findMany({
          where: {
            organizationId: ctx.organization.id,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "asc" },
          select: { id: true, email: true },
        }),
      ]);
      return [
        ...members.map((m) => ({
          kind: "member" as const,
          id: m.id,
          name: m.user.name ?? m.user.email,
          email: m.user.email,
        })),
        ...invitations.map((i) => ({ kind: "invitation" as const, id: i.id, name: i.email, email: i.email })),
      ];
    }),

  invite: orgWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.string().trim().email().max(320),
        role: z.nativeEnum(OrganizationRole).default(OrganizationRole.MEMBER),
        businessUnitIds: z.array(z.string()).max(50).default([]),
        locale: z.enum(["en", "es"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertInviter(ctx.membership.role);
      const locale = input.locale ?? pilotLocale(ctx.getCookie);
      if (!canGrantRole(ctx.membership.role, input.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot give a role above your own." });
      }
      if (isBlockedAccountEmail(input.email)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: blockedEmailMessage(locale),
          cause: new Error(BLOCKED_EMAIL_MESSAGE_KEY),
        });
      }
      const email = normaliseEmail(input.email);
      await assertPilotRoom(ctx.prisma, ctx.organization.id, "members", locale);

      const already = await ctx.prisma.organizationMember.findFirst({
        where: { organizationId: ctx.organization.id, user: { email: { equals: email, mode: "insensitive" } } },
        select: { id: true },
      });
      if (already) {
        throw new TRPCError({ code: "CONFLICT", message: "This person is already a member of the organization." });
      }

      const businessUnitIds = departmentsForRole(input.role, input.businessUnitIds);
      if (businessUnitIds.length > 0) {
        const valid = await ctx.prisma.businessUnit.count({
          where: { organizationId: ctx.organization.id, id: { in: businessUnitIds } },
        });
        if (valid !== businessUnitIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown department in the list." });
        }
      }

      const { token, tokenHash } = newInvitationToken();
      const expiresAt = invitationExpiry();
      // One open invitation per address: a new one replaces the old link.
      const open = await ctx.prisma.organizationInvitation.findFirst({
        where: { organizationId: ctx.organization.id, email, acceptedAt: null, revokedAt: null },
        select: { id: true },
      });
      const data = { role: input.role, businessUnitIds, tokenHash, expiresAt, invitedById: ctx.session.user.id };
      const invitation = open
        ? await ctx.prisma.organizationInvitation.update({ where: { id: open.id }, data, select: { id: true } })
        : await ctx.prisma.organizationInvitation.create({
            data: { organizationId: ctx.organization.id, email, ...data },
            select: { id: true },
          });

      const sent = await sendInvite(ctx, { token, email, role: input.role, expiresAt, locale });

      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "OrganizationInvitation",
          entityId: invitation.id,
          action: "CREATE",
          changes: { role: input.role, businessUnitIds, emailSent: sent.sent },
        },
      });

      return { id: invitation.id, ...sent };
    }),

  /** A new link and a new expiry, sent again. The old link stops working. */
  resend: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string(), locale: z.enum(["en", "es"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      assertInviter(ctx.membership.role);
      const locale = input.locale ?? pilotLocale(ctx.getCookie);
      const inv = await ctx.prisma.organizationInvitation.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id, acceptedAt: null, revokedAt: null },
        select: { id: true, email: true, role: true },
      });
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
      if (!canGrantRole(ctx.membership.role, inv.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot give a role above your own." });
      }
      const { token, tokenHash } = newInvitationToken();
      const expiresAt = invitationExpiry();
      await ctx.prisma.organizationInvitation.updateMany({
        where: { id: inv.id, organizationId: ctx.organization.id },
        data: { tokenHash, expiresAt, invitedById: ctx.session.user.id },
      });
      const sent = await sendInvite(ctx, { token, email: inv.email, role: inv.role, expiresAt, locale });
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "OrganizationInvitation",
          entityId: inv.id,
          action: "UPDATE",
          changes: { resent: true, emailSent: sent.sent },
        },
      });
      return { id: inv.id, ...sent };
    }),

  /** Withdraw an invitation; its link stops working and any ownership it held is cleared. */
  revoke: orgWriteProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertInviter(ctx.membership.role);
      const done = await ctx.prisma.organizationInvitation.updateMany({
        where: { id: input.id, organizationId: ctx.organization.id, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (done.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
      await ctx.prisma.businessUnit.updateMany({
        where: { organizationId: ctx.organization.id, ownerInvitationId: input.id },
        data: { ownerInvitationId: null },
      });
      await ctx.prisma.businessUnit.updateMany({
        where: { organizationId: ctx.organization.id, deputyInvitationId: input.id },
        data: { deputyInvitationId: null },
      });
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          entityType: "OrganizationInvitation",
          entityId: input.id,
          action: "DELETE",
          changes: { revoked: true },
        },
      });
      return { ok: true };
    }),

  /** What the invitation link offers, for the signed-in visitor of /invite/[token]. */
  preview: protectedProcedure
    .input(z.object({ token: z.string().min(16).max(128) }))
    .query(async ({ ctx, input }) => {
      return previewInvitation(ctx.prisma, { token: input.token, userEmail: ctx.session.user.email });
    }),

  accept: protectedProcedure
    .input(z.object({ token: z.string().min(16).max(128) }))
    .mutation(async ({ ctx, input }) => {
      return acceptInvitation(ctx.prisma, {
        token: input.token,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        locale: pilotLocale(ctx.getCookie),
      });
    }),
});

async function sendInvite(
  ctx: {
    organization: { name: string };
    session: { user: { name?: string | null; email?: string | null } };
  },
  args: { token: string; email: string; role: OrganizationRole; expiresAt: Date; locale: "en" | "es" },
): Promise<{ sent: boolean; link: string | null }> {
  const url = invitationUrl(args.token);
  const message = buildInvitationEmail({
    locale: args.locale,
    organizationName: ctx.organization.name,
    inviterName: ctx.session.user.name || ctx.session.user.email || "",
    role: args.role,
    url,
    expiresAt: args.expiresAt,
  });
  const sent = await sendInvitationEmail(args.email, message, url);
  // The link goes back to the inviter only when no e-mail left, so they can
  // pass it on themselves; it still works only for the invited address.
  return { sent, link: sent ? null : url };
}
