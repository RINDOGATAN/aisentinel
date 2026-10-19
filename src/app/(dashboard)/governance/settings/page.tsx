"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Briefcase, Globe, Loader2 } from "lucide-react";
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
import { RegimeScreeningCard } from "@/components/governance/regime-screening-card";
import { PILOT_ANCHOR, SCREENING_ANCHOR } from "@/lib/settings-anchors";
import { useAutoSave } from "@/lib/use-auto-save";
import { CARD_HEADER_WITH_STATUS, CardSaveStatus } from "@/components/ui/save-status";
import { Instruction } from "@/components/ui/instruction";
import { AdvancedSection } from "@/components/governance/settings-advanced";
import { ApplicabilityCard } from "@/components/governance/applicability-check";
import { TeamCard } from "@/components/governance/team-card";
import { DepartmentsCard } from "@/components/governance/departments-card";
import { DeleteOrganizationCard } from "@/components/governance/delete-organization-card";
import { LegalHoldCard } from "@/components/governance/legal-hold-card";
import { PilotStatusCard } from "@/components/governance/pilot-status-card";
import { SampleDataCard } from "@/components/governance/worked-example-card";
import { TemplateItemsCard } from "@/components/governance/template-items-card";
import type { JurisdictionId } from "@/config/jurisdictions";
import { StepMarked } from "@/components/guided/settings-step-band";

const personaIcons = {
  BUSINESS_USER: Building2,
  AI_GOVERNANCE_CONSULTANT: Briefcase,
} as const;

export default function SettingsPage() {
  const { userType, refreshSession } = useUserType();
  const { data: profile } = trpc.user.getProfile.useQuery();
  const { organization, userRole, canWrite } = useOrganization();
  const t = useTranslations("settings");
  const tj = useTranslations("jurisdictions");

  const Icon = userType ? personaIcons[userType as keyof typeof personaIcons] : null;
  const personaTitle = userType === "BUSINESS_USER" ? t("personaBusinessUser") : userType === "AI_GOVERNANCE_CONSULTANT" ? t("personaConsultant") : null;
  const otherPersona = userType === "BUSINESS_USER" ? "AI_GOVERNANCE_CONSULTANT" : "BUSINESS_USER";
  const otherPersonaTitle = otherPersona === "BUSINESS_USER" ? t("personaBusinessUser") : t("personaConsultant");
  const setUserType = trpc.user.setUserType.useMutation({
    onSuccess: async () => {
      await refreshSession();
      toast.success(t("switched"));
    },
    onError: (err) => toast.error(err.message),
  });

  const profileCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("profileTitle")}</CardTitle>
        <CardDescription>{t("profileDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{t("labelName")}</span>
          <span className="min-w-0 truncate">{profile?.name ?? "\u2014"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{t("labelEmail")}</span>
          <span className="min-w-0 truncate">{profile?.email ?? "\u2014"}</span>
        </div>
      </CardContent>
    </Card>
  );

  const accountTypeCard = personaTitle && Icon && (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("accountTypeTitle")}</CardTitle>
        <CardDescription>{t("accountTypeDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg border border-primary bg-primary/5">
          <div className="p-2 rounded-lg shrink-0 bg-primary/10 text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{personaTitle}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-auto min-h-8 max-w-full whitespace-normal text-left"
            disabled={setUserType.isPending}
            onClick={() => setUserType.mutate({ userType: otherPersona })}
          >
            {setUserType.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {t("switchTo", { persona: otherPersonaTitle })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // The order follows the path: where the organisation operates and the
  // answers that decide which laws apply (step 1), then the team and its
  // departments. Everything else waits under "Advanced".
  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Operating jurisdictions — drives which regulatory regimes apply */}
      {organization && (
        <StepMarked check="placesDeclared">
          <JurisdictionCard organizationId={organization.id} canWrite={canWrite} tj={tj} />
        </StepMarked>
      )}

      {/* The quick start's applicability check, editable here at any time:
          which laws and frameworks apply, and why. */}
      {organization && (
        <StepMarked check="screeningApplicability">
          <ApplicabilityCard organizationId={organization.id} canWrite={canWrite} />
        </StepMarked>
      )}

      {/* California CCPA screening. Self-gating on a declared California nexus;
          it is what lets the ADMT resolver leave COVERED_BUSINESS_NOT_ASSESSED,
          so without it the whole California framework stays unreachable. */}
      {/* Linked from the obligations step, which asks for these answers. */}
      <div id={SCREENING_ANCHOR} className="scroll-mt-24" aria-hidden="true" />
      {organization && (
        <StepMarked check="screeningCalifornia">
          <CaliforniaScreeningCard organizationId={organization.id} canWrite={canWrite} />
        </StepMarked>
      )}

      {/* Cross-border regime screening: GDPR, Colorado, Texas and Washington.
          Each question self-gates on a declared jurisdiction that turns on it,
          so a purely European organization is never asked about Washington
          health carriers. */}
      {organization && (
        <StepMarked check="screeningRegimes">
          <RegimeScreeningCard organizationId={organization.id} canWrite={canWrite} />
        </StepMarked>
      )}

      {/* Team: members and roles */}
      {organization && (
        <TeamCard
          organizationId={organization.id}
          currentRole={userRole}
          currentUserId={profile?.id ?? null}
        />
      )}

      {/* Departments (business units): create them, assign owners, and limit a
          member to one or more. Managed by owners, admins and AI officers. */}
      {organization && userRole !== null && ["OWNER", "ADMIN", "AI_OFFICER"].includes(userRole) && (
        <DepartmentsCard organizationId={organization.id} />
      )}

      <AdvancedSection title={t("advancedTitle")} description={t("advancedDescription")}>
        {profileCard}

        {/* Account type: one organization, or several client organizations */}
        {accountTypeCard}

        {/* Hosted pilot only: day counter, ceilings, the two ways out. Renders nothing on the kit. */}
        {organization && (
          <div id={PILOT_ANCHOR} className="scroll-mt-24">
            <PilotStatusCard organizationId={organization.id} />
          </div>
        )}

        {/* The worked example's own removal. Renders nothing when there is none. */}
        {organization && <SampleDataCard organizationId={organization.id} />}

        {/* Remove unedited template-created items. Renders nothing when there are none. */}
        {organization && <TemplateItemsCard organizationId={organization.id} />}

        {/* Per-organization AI posture (off by default — no AI calls until enabled) */}
        {organization && (
          <AiPostureCard
            organizationId={organization.id}
            isAdmin={userRole !== null && ["OWNER", "ADMIN"].includes(userRole)}
          />
        )}

        {/* Preservation before deletion: a hold refuses every delete in scope. */}
        {organization && <LegalHoldCard organizationId={organization.id} userRole={userRole} />}

        <DeploymentExpertCta />
        {/* Owners only: permanent deletion */}
        {organization && userRole === "OWNER" && (
          <DeleteOrganizationCard organizationId={organization.id} organizationName={organization.name} />
        )}
      </AdvancedSection>
    </div>
  );
}

/**
 * Where the organization operates. Until this is answered, regulatory scoping
 * can only say "we can't tell yet" — so an undeclared org gets an explicit
 * prompt rather than a silently empty state.
 *
 * Each tick saves on its own (a quick run of ticks is sent as one request),
 * with the "Saved" mark beside the title.
 */
function JurisdictionCard({
  organizationId,
  canWrite,
  tj,
}: {
  organizationId: string;
  canWrite: boolean;
  tj: ReturnType<typeof useTranslations>;
}) {
  const utils = trpc.useUtils();
  const { data: org } = trpc.organization.getById.useQuery({ organizationId });

  // Null means "untouched — show whatever the server has". The edit is kept
  // after it saves (the server then holds the same value), so a tick made
  // while the previous one is on its way is never shown undone.
  const [edited, setEdited] = useState<JurisdictionId[] | null>(null);
  const saved = (org?.operatingJurisdictions ?? []) as JurisdictionId[];
  const selection = edited ?? saved;

  const save = trpc.organization.setJurisdictions.useMutation({
    onSuccess: () => {
      void utils.organization.getById.invalidate();
      void utils.organization.getDashboardStats.invalidate();
      void utils.programPath.status.invalidate();
    },
  });
  const autosave = useAutoSave<JurisdictionId[]>(
    (jurisdictions) => save.mutateAsync({ organizationId, jurisdictions }),
    { delayMs: 500, onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) },
  );

  const declared = (org?.operatingJurisdictions?.length ?? 0) > 0;
  const reviewedAt = org?.jurisdictionsReviewedAt
    ? new Date(org.jurisdictionsReviewedAt).toISOString().slice(0, 10)
    : null;

  return (
    <Card data-testid="settings-jurisdictions">
      <CardHeader className={CARD_HEADER_WITH_STATUS}>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          {tj("title")}
        </CardTitle>
        {canWrite && (
          <CardSaveStatus status={autosave.status} onRetry={autosave.retry} testId="jurisdictions-save-status" />
        )}
        <CardDescription>{tj("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!declared && <Instruction tone="attention">{tj("undeclaredHint")}</Instruction>}

        <JurisdictionPicker
          value={selection}
          onChange={(next) => {
            setEdited(next);
            autosave.push(next);
          }}
          disabled={!canWrite}
        />

        <p className="text-xs text-muted-foreground">
          {reviewedAt ? tj("reviewedOn", { date: reviewedAt }) : tj("neverReviewed")}
        </p>
      </CardContent>
    </Card>
  );
}
