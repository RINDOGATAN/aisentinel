// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Invitations to join an organization by e-mail.
 *
 * A colleague can be invited before they have an account. The invitation keeps
 * the role and the departments they will have, and a department can name them
 * as owner or deputy owner while it is pending.
 *
 * The link's safety:
 *   - the secret in the link is 32 random bytes; only its SHA-256 is stored;
 *   - it lapses after INVITATION_TTL_DAYS and can be withdrawn;
 *   - it is spent once: acceptance marks it with a conditional update inside
 *     the same transaction that creates the membership, so two clicks (or two
 *     tabs) can never both succeed;
 *   - only the signed-in account with the invited address can accept it, so a
 *     forwarded link is useless to anyone else;
 *   - the role can never be above the inviter's, when sent and again when
 *     accepted (an inviter demoted in the meantime caps it).
 *
 * The e-mail goes through the same service as the sign-in links (Resend).
 * Outside production, or with no mail service configured, nothing is sent:
 * the link is written to the server log and returned to the inviter to copy.
 */

import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { TRPCError } from "@trpc/server";
import type { OrganizationRole, PrismaClient } from "@prisma/client";
import { brand } from "@/config/brand";
import { logger } from "@/lib/logger";
import { mailFrom } from "@/lib/mail-from";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { isScopeExemptRole } from "@/server/services/business-units/scope";
import type { PilotLocale } from "@/config/pilot";
import { assertPilotOrganizationLimit, assertPilotRoom } from "@/server/services/pilot/caps";

export const INVITATION_TTL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** OWNER > ADMIN > AI_OFFICER > MEMBER > VIEWER. */
export const ROLE_RANK: Record<OrganizationRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  AI_OFFICER: 3,
  MEMBER: 2,
  VIEWER: 1,
};

/** Roles that may invite colleagues and manage invitations. */
export const INVITER_ROLES: readonly OrganizationRole[] = ["OWNER", "ADMIN"];

export function canInvite(role: string): boolean {
  return (INVITER_ROLES as readonly string[]).includes(role);
}

/** Whether a person with `inviterRole` may give `role`: never above their own. */
export function canGrantRole(inviterRole: OrganizationRole, role: OrganizationRole): boolean {
  return canInvite(inviterRole) && ROLE_RANK[role] <= ROLE_RANK[inviterRole];
}

/** The lower of two roles. */
export function lowerRole(a: OrganizationRole, b: OrganizationRole): OrganizationRole {
  return ROLE_RANK[a] <= ROLE_RANK[b] ? a : b;
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInvitationToken(token) };
}

export function invitationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * DAY_MS);
}

export type InvitationState = "pending" | "expired" | "accepted" | "revoked";

export function invitationState(
  inv: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now: Date = new Date(),
): InvitationState {
  if (inv.acceptedAt) return "accepted";
  if (inv.revokedAt) return "revoked";
  if (inv.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

/** The departments an invitation will apply: none for a role that always sees the whole organization. */
export function departmentsForRole(role: OrganizationRole, businessUnitIds: string[]): string[] {
  return isScopeExemptRole(role) ? [] : [...new Set(businessUnitIds)];
}

function appBaseUrl(): string {
  const raw = (process.env.NEXTAUTH_URL ?? "").trim() || brand.siteUrl;
  return raw.replace(/\/+$/, "");
}

export function invitationUrl(token: string): string {
  return `${appBaseUrl()}/invite/${encodeURIComponent(token)}`;
}

// ---------------------------------------------------------------------------
// The e-mail
// ---------------------------------------------------------------------------

type EmailStrings = typeof en.team.inviteEmail;
const EMAIL_STRINGS: Record<PilotLocale, EmailStrings> = {
  en: en.team.inviteEmail,
  es: es.team.inviteEmail,
};
const ROLE_LABELS: Record<PilotLocale, Record<OrganizationRole, string>> = {
  en: {
    OWNER: en.nav.roleOwner,
    ADMIN: en.nav.roleAdmin,
    AI_OFFICER: en.nav.roleAiOfficer,
    MEMBER: en.nav.roleMember,
    VIEWER: en.nav.roleViewer,
  },
  es: {
    OWNER: es.nav.roleOwner,
    ADMIN: es.nav.roleAdmin,
    AI_OFFICER: es.nav.roleAiOfficer,
    MEMBER: es.nav.roleMember,
    VIEWER: es.nav.roleViewer,
  },
};

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface InvitationEmail {
  subject: string;
  text: string;
  html: string;
}

export function buildInvitationEmail(args: {
  locale: PilotLocale;
  organizationName: string;
  inviterName: string;
  role: OrganizationRole;
  url: string;
  expiresAt: Date;
}): InvitationEmail {
  const s = EMAIL_STRINGS[args.locale];
  const date = new Intl.DateTimeFormat(args.locale === "es" ? "es-ES" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(args.expiresAt);
  const values = {
    app: brand.emailName,
    organization: args.organizationName,
    inviter: args.inviterName,
    role: ROLE_LABELS[args.locale][args.role],
    date,
  };
  const subject = fill(s.subject, values);
  const lead = fill(s.lead, values);
  const button = fill(s.button, values);
  const expiry = fill(s.expiry, values);
  const ignore = fill(s.ignore, values);
  const text = `${lead}\n\n${button}: ${args.url}\n\n${expiry}\n${ignore}\n`;
  const e = escapeHtml;
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: ${brand.colors.background}; border-radius: 12px; overflow: hidden;">
      <div style="padding: 24px 24px 16px; border-bottom: 1px solid #2a2a2a;">
        <span style="font-size: 20px; font-weight: 700; color: #ffffff;">${e(brand.emailName)}</span>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #e5e5e5; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">${e(lead)}</p>
        <a href="${e(args.url)}" style="display: inline-block; background: ${brand.colors.primary}; color: ${brand.colors.primaryForeground}; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 24px;">${e(button)}</a>
        <p style="color: #a6a6a6; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">${e(expiry)}</p>
        <p style="color: #a6a6a6; font-size: 13px; line-height: 1.5; margin: 8px 0 0;">${e(ignore)}</p>
      </div>
    </div>
  `;
  return { subject, text, html };
}

/** Whether invitation e-mails are really sent here: production with a mail service. */
export function invitationMailEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production" && !!(env.RESEND_API_KEY ?? "").trim();
}

/**
 * Send the invitation. Returns whether it was sent; when it was not (local
 * development, a test, or no mail service), the link is logged so it can be
 * copied, and the caller hands it to the inviter.
 */
export async function sendInvitationEmail(to: string, email: InvitationEmail, url: string): Promise<boolean> {
  if (!invitationMailEnabled()) {
    logger.info("Invitation e-mail not sent (no mail service here); link logged instead", {
      to,
      subject: email.subject,
      url,
    });
    return false;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: mailFrom(),
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (result.error) {
      logger.error("Invitation e-mail refused by the mail service", result.error.message);
      return false;
    }
    return true;
  } catch (error) {
    logger.error("Failed to send the invitation e-mail", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Acceptance
// ---------------------------------------------------------------------------

const MESSAGES: Record<PilotLocale, Record<"invalid" | "used" | "expired" | "otherAddress" | "inviterGone", string>> = {
  en: en.invite.errors,
  es: es.invite.errors,
};

function refuse(code: "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST", key: keyof (typeof MESSAGES)["en"], locale: PilotLocale): never {
  throw new TRPCError({ code, message: MESSAGES[locale][key], cause: new Error(`invite:${key}`) });
}

/** The invitation behind a link, and whether this account can accept it. */
export async function previewInvitation(
  prisma: PrismaClient,
  args: { token: string; userEmail: string | null | undefined; now?: Date },
) {
  const inv = await prisma.organizationInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(args.token) },
    select: {
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      organization: { select: { name: true } },
    },
  });
  if (!inv) return null;
  return {
    organizationName: inv.organization.name,
    role: inv.role,
    state: invitationState(inv, args.now),
    expiresAt: inv.expiresAt,
    forThisAccount: !!args.userEmail && normaliseEmail(args.userEmail) === inv.email,
  };
}

/**
 * Accept an invitation for the signed-in account. Spends the link and creates
 * the membership (with its departments, and any department ownership the
 * invitation held) in one transaction.
 */
export async function acceptInvitation(
  prisma: PrismaClient,
  args: { token: string; userId: string; userEmail: string | null | undefined; locale: PilotLocale; now?: Date },
): Promise<{ organizationId: string; memberId: string; role: OrganizationRole }> {
  const now = args.now ?? new Date();
  const inv = await prisma.organizationInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(args.token) },
    include: { organization: { select: { id: true, plan: true } } },
  });
  if (!inv) refuse("NOT_FOUND", "invalid", args.locale);
  const state = invitationState(inv, now);
  if (state === "accepted" || state === "revoked") refuse("BAD_REQUEST", "used", args.locale);
  if (state === "expired") refuse("BAD_REQUEST", "expired", args.locale);
  if (!args.userEmail || normaliseEmail(args.userEmail) !== inv.email) {
    refuse("FORBIDDEN", "otherAddress", args.locale);
  }

  // The inviter must still be able to invite; a role above theirs today is capped.
  const inviter = inv.invitedById
    ? await prisma.organizationMember.findFirst({
        where: { organizationId: inv.organizationId, userId: inv.invitedById },
        select: { role: true },
      })
    : null;
  if (!inviter || !canInvite(inviter.role)) refuse("FORBIDDEN", "inviterGone", args.locale);
  const role = lowerRole(inv.role, inviter.role);

  const existing = await prisma.organizationMember.findFirst({
    where: { organizationId: inv.organizationId, userId: args.userId },
    select: { id: true, role: true },
  });
  if (!existing) {
    await assertPilotOrganizationLimit(prisma, args.userId, args.locale, inv.organization);
    await assertPilotRoom(prisma, inv.organizationId, "members", args.locale);
  }

  // Only departments that still exist in this organization.
  const wanted = departmentsForRole(role, inv.businessUnitIds ?? []);
  const departments = wanted.length
    ? (
        await prisma.businessUnit.findMany({
          where: { organizationId: inv.organizationId, id: { in: wanted } },
          select: { id: true },
        })
      ).map((d) => d.id)
    : [];

  return prisma.$transaction(async (tx) => {
    // Spend the link: only one acceptance can match this condition.
    const spent = await tx.organizationInvitation.updateMany({
      where: { id: inv.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { acceptedAt: now },
    });
    if (spent.count !== 1) refuse("BAD_REQUEST", "used", args.locale);

    let memberId: string;
    let finalRole: OrganizationRole;
    if (existing) {
      // Already a member (for example joined by the e-mail domain): the
      // invitation can raise the role to the one offered, never lower it.
      memberId = existing.id;
      finalRole = ROLE_RANK[role] > ROLE_RANK[existing.role] ? role : existing.role;
      if (finalRole !== existing.role) {
        await tx.organizationMember.update({ where: { id: existing.id }, data: { role: finalRole } });
      }
    } else {
      const member = await tx.organizationMember.create({
        data: {
          organizationId: inv.organizationId,
          userId: args.userId,
          role,
          invitedEmail: inv.email,
          invitedAt: inv.createdAt,
        },
        select: { id: true },
      });
      memberId = member.id;
      finalRole = role;
      if (departments.length > 0) {
        await tx.businessUnitMember.createMany({
          data: departments.map((businessUnitId) => ({ businessUnitId, memberId })),
          skipDuplicates: true,
        });
      }
    }

    // Department ownership held by the invitation passes to the member.
    await tx.businessUnit.updateMany({
      where: { organizationId: inv.organizationId, ownerInvitationId: inv.id },
      data: { ownerId: memberId, ownerInvitationId: null },
    });
    await tx.businessUnit.updateMany({
      where: { organizationId: inv.organizationId, deputyInvitationId: inv.id },
      data: { deputyOwnerId: memberId, deputyInvitationId: null },
    });
    // Policies whose owner was named by this address are linked to the member
    // (the stored name is cleared so the member's own name is shown).
    await tx.aIPolicy.updateMany({
      where: {
        organizationId: inv.organizationId,
        ownerMemberId: null,
        ownerName: { equals: inv.email, mode: "insensitive" },
      },
      data: { ownerMemberId: memberId, ownerName: null },
    });
    await tx.organizationInvitation.updateMany({
      where: { id: inv.id },
      data: { acceptedMemberId: memberId },
    });
    await tx.auditLog.create({
      data: {
        organizationId: inv.organizationId,
        userId: args.userId,
        entityType: "OrganizationInvitation",
        entityId: inv.id,
        action: "ACCEPT",
        changes: { memberId, role: finalRole, businessUnitIds: existing ? [] : departments },
      },
    });
    return { organizationId: inv.organizationId, memberId, role: finalRole };
  });
}
