"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Team: who belongs to the organization and with which role. A program is run
 * by several people (an AI officer who approves, members who document, viewers
 * who read), so building one alone and in minutes still needs a way to bring
 * the others in.
 *
 * Permissions mirror the server (organization router): owners and admins add
 * and remove members, only owners change roles or grant ownership, and the
 * last owner can be neither demoted nor removed.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus, Users } from "lucide-react";
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

const ROLES = ["OWNER", "ADMIN", "AI_OFFICER", "MEMBER", "VIEWER"] as const;
type Role = (typeof ROLES)[number];
const ROLE_KEY: Record<Role, string> = {
  OWNER: "roleOwner",
  ADMIN: "roleAdmin",
  AI_OFFICER: "roleAiOfficer",
  MEMBER: "roleMember",
  VIEWER: "roleViewer",
};

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
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");

  const isOwner = currentRole === "OWNER";
  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";

  const { data: org } = trpc.organization.getById.useQuery({ organizationId });
  const members = org?.members ?? [];

  const refresh = () => utils.organization.getById.invalidate({ organizationId });

  const add = trpc.organization.addMember.useMutation({
    onSuccess: async () => {
      toast.success(t("added"));
      setEmail("");
      await refresh();
    },
    onError: (err) => toast.error(err.data?.code === "NOT_FOUND" ? t("notFound") : err.message),
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

  const grantable = ROLES.filter((r) => isOwner || r !== "OWNER");

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
                    <SelectTrigger className="w-40 h-8 text-xs">
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

        {canManage && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                value={email}
                placeholder={t("emailPlaceholder")}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="sm:w-44">
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
              <Button
                disabled={!email.trim() || add.isPending}
                onClick={() => add.mutate({ organizationId, email: email.trim(), role })}
              >
                {add.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-1.5" />
                )}
                {t("add")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("addHint")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
