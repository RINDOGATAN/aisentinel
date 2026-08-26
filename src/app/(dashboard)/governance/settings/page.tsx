"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Briefcase, Globe, Loader2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useUserType } from "@/lib/use-user-type";
import { useOrganization } from "@/lib/organization-context";
import { DeploymentExpertCta } from "@/components/governance/deployment-expert-cta";
import { AiPostureCard } from "@/components/ai/AiPostureCard";
import { JurisdictionPicker } from "@/components/governance/jurisdiction-picker";
import { CaliforniaScreeningCard } from "@/components/governance/california-screening-card";
import type { JurisdictionId } from "@/config/jurisdictions";

const personaIcons = {
  BUSINESS_USER: Building2,
  AI_GOVERNANCE_CONSULTANT: Briefcase,
} as const;

export default function SettingsPage() {
  const { userType } = useUserType();
  const { data: profile } = trpc.user.getProfile.useQuery();
  const { organization, userRole, canWrite } = useOrganization();
  const t = useTranslations("settings");
  const tj = useTranslations("jurisdictions");
  const tc = useTranslations("common");

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

      {/* Operating jurisdictions — drives which regulatory regimes apply */}
      {organization && (
        <JurisdictionCard
          organizationId={organization.id}
          canWrite={canWrite}
          tj={tj}
          tc={tc}
        />
      )}

      {/* California CCPA screening. Self-gating on a declared California nexus;
          it is what lets the ADMT resolver leave COVERED_BUSINESS_NOT_ASSESSED,
          so without it the whole California framework stays unreachable. */}
      {organization && (
        <CaliforniaScreeningCard
          organizationId={organization.id}
          canWrite={canWrite}
        />
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

/**
 * Where the organization operates. Until this is answered, regulatory scoping
 * can only say "we can't tell yet" — so an undeclared org gets an explicit
 * prompt rather than a silently empty state.
 */
function JurisdictionCard({
  organizationId,
  canWrite,
  tj,
  tc,
}: {
  organizationId: string;
  canWrite: boolean;
  tj: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}) {
  const utils = trpc.useUtils();
  const { data: org } = trpc.organization.getById.useQuery({ organizationId });

  // Null means "untouched — show whatever the server has". Deriving rather
  // than syncing state into an effect keeps the two from fighting after a save.
  const [edited, setEdited] = useState<JurisdictionId[] | null>(null);
  const saved = (org?.operatingJurisdictions ?? []) as JurisdictionId[];
  const selection = edited ?? saved;
  const dirty = edited !== null;

  const save = trpc.organization.setJurisdictions.useMutation({
    onSuccess: () => {
      setEdited(null);
      toast.success(tj("saved"));
      void utils.organization.getById.invalidate();
      void utils.organization.getDashboardStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const declared = (org?.operatingJurisdictions?.length ?? 0) > 0;
  const reviewedAt = org?.jurisdictionsReviewedAt
    ? new Date(org.jurisdictionsReviewedAt).toISOString().slice(0, 10)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          {tj("title")}
        </CardTitle>
        <CardDescription>{tj("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!declared && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{tj("undeclaredHint")}</p>
          </div>
        )}

        <JurisdictionPicker
          value={selection}
          onChange={setEdited}
          disabled={!canWrite || save.isPending}
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {reviewedAt ? tj("reviewedOn", { date: reviewedAt }) : tj("neverReviewed")}
          </p>
          {canWrite && (
            <Button
              size="sm"
              disabled={!dirty || save.isPending}
              onClick={() =>
                save.mutate({ organizationId, jurisdictions: selection })
              }
            >
              {save.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              {tc("save")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
