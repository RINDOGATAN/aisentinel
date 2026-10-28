"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Team: who belongs to the organization and with which role. A program is run
 * by several people (an AI officer who approves, members who document, viewers
 * who read), so building one alone and in minutes still needs a way to bring
 * the others in.
 *
 * Colleagues are invited by e-mail: they need no account beforehand. The
 * invitation keeps their role and departments until they accept it, and they
 * can be named as a department owner meanwhile.
 *
 * Permissions mirror the server (organization and team routers): owners and
 * admins invite and remove members, nobody gives a role above their own, only
 * owners change roles, and the last owner can be neither demoted nor removed.
 *
 * People who come from a DPO Central firm team are listed apart, one group
 * per consultant, without controls: that team is managed in DPO Central only,
 * and the server refuses changes to those memberships here.
 */

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Loader2, RotateCw, Send, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useUnsavedChangesWarning } from "@/lib/use-unsaved-changes";
import { blockedEmailMessage, isBlockedAccountEmail } from "@/lib/email-policy";
import { departmentNames } from "@/lib/department-tree";
import { DepartmentMultiSelect } from "./department-multi-select";
import { splitFirmMembers } from "@/lib/firm-members";
import { brand } from "@/config/brand";

const ROLES = ["OWNER", "ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"] as const;
type Role = (typeof ROLES)[number];
const ROLE_KEY: Record<Role, string> = {
  OWNER: "roleOwner",
  ADMIN: "roleAdmin",
  AI_OFFICER: "roleAiOfficer",
  MEMBER: "roleMember",
  VIEWER: "roleViewer",
};
const RANK: Record<Role, number> = { OWNER: 5, ADMIN: 4, AI_OFFICER: 3, MEMBER: 2, VIEWER: 1 };
/** Roles that always see the whole organization (no departments to choose). */
const WHOLE_ORG_ROLES: readonly Role[] = ["OWNER", "ADMIN"];

/** The roles a person with `role` may give: never above their own. */
export function grantableRoles(role: Role | null): Role[] {
  if (role !== "OWNER" && role !== "ADMIN") return [];
  return ROLES.filter((r) => RANK[r] <= RANK[role]);
}

export function TeamCard({
  organizationId,
  currentRole,
  currentUserId,
}: {
  organizationId: string;
  currentRole: Role | null;
  currentUserId: string | null;
}) {
  const t = useTranslations("team");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [departments, setDepartments] = useState<string[]>([]);
  // Set when the e-mail policy refuses the address; shown under the field.
  const [refused, setRefused] = useState(false);
  // The link to pass on by hand when no e-mail could be sent.
  const [manualLink, setManualLink] = useState<{ email: string; link: string } | null>(null);
  // An address typed but not added yet is lost on leaving: warn first.
  useUnsavedChangesWarning(email.trim() !== "");

  const isOwner = currentRole === "OWNER";
  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";
  const grantable = grantableRoles(currentRole);

  const { data: org } = trpc.organization.getById.useQuery({ organizationId });
  const { own: members, firmGroups } = splitFirmMembers(org?.members ?? []);
  const allMembers = org?.members ?? [];
  const currentEmail = allMembers.find((m) => m.userId === currentUserId)?.user.email?.toLowerCase() ?? null;
  const { data: invitations } = trpc.team.invitations.useQuery({ organizationId }, { enabled: canManage });
  const { data: scopeData } = trpc.businessUnit.listForScope.useQuery({ organizationId }, { enabled: canManage });
  const allDepartments = scopeData?.departments ?? [];

  const refresh = async () => {
    await Promise.all([
      utils.organization.getById.invalidate({ organizationId }),
      utils.team.invitations.invalidate({ organizationId }),
      utils.team.people.invalidate({ organizationId }),
      utils.businessUnit.manage.invalidate({ organizationId }),
    ]);
  };

  const afterSend = (to: string, result: { link: string | null }) => {
    if (result.link) {
      setManualLink({ email: to, link: result.link });
    } else {
      setManualLink(null);
      toast.success(t("invited", { email: to }));
    }
  };

  const invite = trpc.team.invite.useMutation({
    onSuccess: async (result, vars) => {
      afterSend(vars.email.trim().toLowerCase(), result);
      setEmail("");
      setDepartments([]);
      await refresh();
    },
    onError: (err) => toast.error(err.data?.code === "CONFLICT" ? t("alreadyMember") : err.message),
  });
  const resend = trpc.team.resend.useMutation({
    onSuccess: async (result, vars) => {
      const to = invitations?.find((i) => i.id === vars.id)?.email ?? "";
      if (result.link) setManualLink({ email: to, link: result.link });
      else toast.success(t("resent"));
      await refresh();
    },
    onError: (err) => toast.error(err.message),
  });
  const revoke = trpc.team.revoke.useMutation({
    onSuccess: async () => {
      toast.success(t("withdrawn"));
      await refresh();
    },
    onError: (err) => toast.error(err.message),
  });
  const update = trpc.organization.updateMember.useMutation({
    onSuccess: async () => {
      toast.success(t("updated"));
      await refresh();
    },
    onError: (err) => toast.error(err.message),
  });
  const remove = trpc.organization.removeMember.useMutation({
    onSuccess: async () => {
      toast.success(t("removed"));
      await refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const dateFormat = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const showDepartments = allDepartments.length > 0 && !WHOLE_ORG_ROLES.includes(role);

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("copied"));
    } catch {
      // The link stays selectable in the field.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {members.map((m) => {
            const memberRole = m.role as Role;
            const isSelf = m.userId === currentUserId;
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-3 p-2 rounded border border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.user.name ?? m.user.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>
                {isOwner && !isSelf ? (
                  <Select
                    value={memberRole}
                    onValueChange={(v) =>
                      update.mutate({ organizationId, memberId: m.id, role: v as Role })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-40 h-8 text-xs" aria-label={t("roleLabel")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {tn(ROLE_KEY[r])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">{tn(ROLE_KEY[memberRole])}</span>
                )}
                {canManage && !isSelf && (isOwner || memberRole !== "OWNER") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("remove")}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ organizationId, memberId: m.id })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {firmGroups.map((g) => {
          const mine = currentEmail === g.ownerEmail;
          const ownerName =
            allMembers.find((m) => m.user.email?.toLowerCase() === g.ownerEmail)?.user.name ?? g.ownerEmail;
          return (
            <div key={g.ownerEmail} className="space-y-2" data-testid="firm-group">
              <p className="text-sm font-medium">
                {mine ? t("firmGroupOwner") : t("firmGroup", { name: ownerName })}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="firm-managed">
                {!mine
                  ? t("firmManaged", { name: ownerName })
                  : brand.dpoCentralUrl
                    ? t.rich("firmManagedOwner", {
                        link: (chunks) => (
                          <a
                            href={`${brand.dpoCentralUrl}/privacy/settings#firm-team`}
                            className="text-primary underline underline-offset-4"
                          >
                            {chunks}
                          </a>
                        ),
                      })
                    : t("firmManagedOwnerNoLink")}
              </p>
              {g.members.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-3 p-2 rounded border border-border">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.user.name ?? m.user.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{tn(ROLE_KEY[m.role as Role])}</span>
                </div>
              ))}
            </div>
          );
        })}

        {canManage && invitations && invitations.length > 0 && (
          <div className="space-y-2" data-testid="pending-invitations">
            <p className="text-sm font-medium">{t("pendingTitle")}</p>
            {invitations.map((inv) => {
              const names = departmentNames(allDepartments, inv.businessUnitIds);
              return (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center gap-3 p-2 rounded border border-dashed border-border"
                  data-testid="pending-invitation"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium break-all">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {tn(ROLE_KEY[inv.role as Role])}
                      {names.length > 0 ? ` · ${names.join(", ")}` : ""}
                      {" · "}
                      {inv.expired ? t("expiredChip") : t("expires", { date: dateFormat.format(new Date(inv.expiresAt)) })}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {inv.expired ? t("expiredChip") : t("pendingChip")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("resend")}
                    title={t("resend")}
                    disabled={resend.isPending}
                    onClick={() => resend.mutate({ organizationId, id: inv.id, locale: locale === "es" ? "es" : "en" })}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("withdraw")}
                    title={t("withdraw")}
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate({ organizationId, id: inv.id })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {canManage && (
          <div className="space-y-2">
            <label htmlFor="team-invite-email" className="text-sm font-medium">
              {t("inviteLabel")}
            </label>
            <div className="flex flex-col lg:flex-row gap-2">
              <Input
                id="team-invite-email"
                type="email"
                value={email}
                placeholder={t("emailPlaceholder")}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setRefused(false);
                }}
                aria-describedby={refused ? "team-invite-refused team-invite-help" : "team-invite-help"}
              />
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="w-full lg:w-44" aria-label={t("roleLabel")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {grantable.map((r) => (
                    <SelectItem key={r} value={r}>
                      {tn(ROLE_KEY[r])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showDepartments && (
                <DepartmentMultiSelect
                  departments={allDepartments}
                  value={departments}
                  onChange={setDepartments}
                  ariaLabel={t("departmentsLabel")}
                  className="lg:w-48"
                  testId="invite-departments"
                />
              )}
              <Button
                disabled={!email.trim() || invite.isPending}
                onClick={() => {
                  if (isBlockedAccountEmail(email)) {
                    setRefused(true);
                    return;
                  }
                  invite.mutate({
                    organizationId,
                    email: email.trim(),
                    role,
                    businessUnitIds: showDepartments ? departments : [],
                    locale: locale === "es" ? "es" : "en",
                  });
                }}
              >
                {invite.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                {t("add")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="invite-role-help">
              <span className="font-medium text-foreground">{tn(ROLE_KEY[role])}:</span> {t(`roleHelp.${role}`)}
            </p>
            {refused && (
              <p id="team-invite-refused" data-testid="email-not-accepted" className="text-sm text-destructive">
                {blockedEmailMessage(locale)}
              </p>
            )}
            <p id="team-invite-help" className="text-xs text-muted-foreground">{t("addHint")}</p>
            {manualLink && (
              <div className="space-y-2 rounded border border-border p-3" data-testid="invite-manual-link">
                <p className="text-sm">{t("notSent", { email: manualLink.email })}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input readOnly value={manualLink.link} onFocus={(e) => e.currentTarget.select()} aria-label={t("copy")} />
                  <Button variant="outline" className="gap-1.5" onClick={() => void copyLink(manualLink.link)}>
                    <Copy className="w-4 h-4" />
                    {t("copy")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <RoleLegend />
      </CardContent>
    </Card>
  );
}

/** What each role can do, in the usual words, with the way to the full page. */
function RoleLegend() {
  const t = useTranslations("team");
  const tn = useTranslations("nav");
  return (
    <div className="space-y-1.5 border-t border-border pt-3" data-testid="role-legend">
      <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {ROLES.map((r) => (
          <div key={r} className="contents">
            <dt className="font-medium">{tn(ROLE_KEY[r])}</dt>
            <dd className="text-muted-foreground mb-1 sm:mb-0">{t(`roleHelp.${r}`)}</dd>
          </div>
        ))}
      </dl>
      <Link href="/docs/roles" className="inline-block text-sm text-primary hover:underline underline-offset-4">
        {t("rolesLink")}
      </Link>
    </div>
  );
}
