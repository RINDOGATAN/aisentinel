// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";
import {
  Crown,
  ShieldCheck,
  Gavel,
  Users,
  Eye,
  Check,
  X,
} from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("docs.roles");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const roleStyles = [
  {
    key: "OWNER",
    tKey: "owner",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    key: "ADMIN",
    tKey: "admin",
    icon: ShieldCheck,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    key: "AI_OFFICER",
    tKey: "aiOfficer",
    icon: Gavel,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    key: "MEMBER",
    tKey: "member",
    icon: Users,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
  },
  {
    key: "VIEWER",
    tKey: "viewer",
    icon: Eye,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    border: "border-gray-400/20",
  },
] as const;

const permissionMatrix = [
  { key: "viewRecords", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: true, VIEWER: true },
  { key: "createEdit", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: true, VIEWER: false },
  { key: "deleteRecords", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: true, VIEWER: false },
  { key: "approveAssessments", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: false, VIEWER: false },
  { key: "publishPolicies", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: false, VIEWER: false },
  { key: "oversightDecisions", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: false, VIEWER: false },
  { key: "inviteMembers", OWNER: true, ADMIN: true, AI_OFFICER: false, MEMBER: false, VIEWER: false },
  { key: "changeRoles", OWNER: true, ADMIN: false, AI_OFFICER: false, MEMBER: false, VIEWER: false },
  { key: "manageBilling", OWNER: true, ADMIN: false, AI_OFFICER: false, MEMBER: false, VIEWER: false },
] as const;

const assignCards = [
  { titleKey: "creatorTitle", bodyKey: "creatorBody", roleColor: "text-amber-400" },
  { titleKey: "invitedTitle", bodyKey: "invitedBody", roleColor: "text-violet-400" },
  { titleKey: "viewerTitle", bodyKey: "viewerBody", roleColor: "text-gray-400" },
  { titleKey: "changesTitle", bodyKey: "changesBody", roleColor: "text-amber-400" },
] as const;

export default async function RolesDocsPage() {
  const t = await getTranslations("docs.roles");
  const roles = roleStyles.map((style) => ({
    ...style,
    name: t(`roles.${style.tKey}.name`),
    summary: t(`roles.${style.tKey}.summary`),
    capabilities: t.raw(`roles.${style.tKey}.capabilities`) as string[],
  }));

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          {t("intro")}
        </p>
      </section>

      {/* Role Hierarchy */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("hierarchyTitle")}</h2>
        <div className="flex flex-col items-center gap-0">
          {roles.map((role, i) => {
            const Icon = role.icon;
            return (
              <div key={role.key} className="w-full max-w-xl">
                <div
                  className={`rounded-xl border ${role.border} bg-card p-5 flex items-start gap-4 relative`}
                  style={{ marginLeft: `${i * 16}px` }}
                >
                  <div className={`w-10 h-10 rounded-lg ${role.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${role.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{role.name}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${role.bg} ${role.color}`}>
                        {role.key === "AI_OFFICER" ? "AI Officer" : role.key}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{role.summary}</p>
                  </div>
                </div>
                {i < roles.length - 1 && (
                  <div className="flex justify-center py-1" style={{ marginLeft: `${i * 16 + 20}px` }}>
                    <div className="w-px h-4 bg-border" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          {t("hierarchyNote")}
        </p>
      </section>

      {/* What Each Role Can Do */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("capabilitiesTitle")}</h2>
        <div className="grid gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div key={role.key} className={`rounded-xl border ${role.border} bg-card p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${role.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${role.color}`} />
                  </div>
                  <h3 className="font-semibold">{role.name}</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {role.capabilities.map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${role.color}`} />
                      {cap}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Permissions Matrix */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("matrixTitle")}</h2>
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground">{t("matrixAction")}</th>
                {roles.map((r) => (
                  <th key={r.key} className="p-3 text-center font-medium whitespace-nowrap">
                    <span className={r.color}>{r.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted-foreground">{t(`matrix.${row.key}`)}</td>
                  {roles.map((r) => (
                    <td key={r.key} className="p-3 text-center">
                      {row[r.key as keyof typeof row] ? (
                        <Check className="w-4 h-4 text-emerald-400 inline-block" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/30 inline-block" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Default Role */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("assignTitle")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {assignCards.map((card) => (
            <div key={card.titleKey} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-2">{t(`assign.${card.titleKey}`)}</h3>
              <p className="text-sm text-muted-foreground">
                {t.rich(`assign.${card.bodyKey}`, {
                  role: (chunks) => (
                    <span className={`${card.roleColor} font-medium`}>{chunks}</span>
                  ),
                })}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Server-Side Enforcement */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("enforcementTitle")}</h2>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("enforcementBody")}
          </p>
        </div>
      </section>
    </div>
  );
}
