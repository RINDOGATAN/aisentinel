"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Briefcase } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useUserType } from "@/lib/use-user-type";
import { useOrganization } from "@/lib/organization-context";
import { DeploymentExpertCta } from "@/components/governance/deployment-expert-cta";
import { AiPostureCard } from "@/components/ai/AiPostureCard";

const personaIcons = {
  BUSINESS_USER: Building2,
  AI_GOVERNANCE_CONSULTANT: Briefcase,
} as const;

export default function SettingsPage() {
  const { userType } = useUserType();
  const { data: profile } = trpc.user.getProfile.useQuery();
  const { organization, userRole } = useOrganization();
  const t = useTranslations("settings");

  const Icon = userType ? personaIcons[userType as keyof typeof personaIcons] : null;
  const personaTitle = userType === "BUSINESS_USER" ? t("personaBusinessUser") : userType === "AI_GOVERNANCE_CONSULTANT" ? t("personaConsultant") : null;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profileTitle")}</CardTitle>
          <CardDescription>{t("profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("labelName")}</span>
            <span>{profile?.name ?? "\u2014"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("labelEmail")}</span>
            <span>{profile?.email ?? "\u2014"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Account Type (read-only) */}
      {personaTitle && Icon && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("accountTypeTitle")}</CardTitle>
            <CardDescription>
              {t("accountTypeDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-3 rounded-lg border border-primary bg-primary/5">
              <div className="p-2 rounded-lg shrink-0 bg-primary/10 text-primary">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{personaTitle}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-organization AI posture (off by default — no AI calls until enabled) */}
      {organization && (
        <AiPostureCard
          organizationId={organization.id}
          isAdmin={userRole !== null && ["OWNER", "ADMIN"].includes(userRole)}
        />
      )}

      <DeploymentExpertCta />
    </div>
  );
}
