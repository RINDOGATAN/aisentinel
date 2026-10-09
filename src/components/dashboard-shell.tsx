"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import { useState } from "react";
import { Scale, BookOpen, CreditCard, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/lib/organization-context";
import { useUserType } from "@/lib/use-user-type";
import { features } from "@/config/features";
import { brand } from "@/config/brand";
import { OrganizationSetup } from "@/components/governance/organization-setup";
import { PersonaSelector } from "@/components/governance/persona-selector";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { PilotDisclosureScreen } from "@/components/pilot/pilot-disclosure";
import { trpc } from "@/lib/trpc";
import { GuidedLayout } from "@/components/guided/guided-layout";

export function DashboardShell({
  children,
  hostedPilot = false,
  menuCollapsed = false,
}: {
  children: React.ReactNode;
  /** On the hosted pilot the disclosure screen comes before anything else. */
  hostedPilot?: boolean;
  /** The left menu shows icons only (`ais_menu` cookie). */
  menuCollapsed?: boolean;
}) {
  const { organization, organizations, isLoading: orgLoading } = useOrganization();
  const { needsOnboarding, isLoading: userTypeLoading } = useUserType();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const t = useTranslations("nav");

  // The hosted pilot says what it is before anything is entered. Asked only on
  // the pilot; on the kit the query is not issued at all.
  const disclosure = trpc.pilot.disclosure.useQuery(undefined, { enabled: hostedPilot });

  // Full-screen loading gate: prevent chrome from rendering before org is ready
  if (orgLoading || userTypeLoading || (hostedPilot && disclosure.isLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">{t("loading")}</div>
      </div>
    );
  }

  // Step 0: on the hosted pilot, say what we are before they trust us with
  // anything. Ahead of the persona question and of organization setup.
  if (hostedPilot && disclosure.data?.required) {
    return <PilotDisclosureScreen />;
  }

  // Step 1: Show persona selection if user hasn't chosen yet
  if (needsOnboarding) {
    return <PersonaSelector />;
  }

  // Step 2: Show organization setup if user has no organizations
  if (!organization && organizations.length === 0) {
    return <OrganizationSetup />;
  }

  // The one layout: the program path as a left menu (Guided). The Classic
  // top-bar layout was retired on 9 October 2026.
  return (
    <>
      <GuidedLayout
        footer={<DashboardFooter />}
        initialCollapsed={menuCollapsed}
        onFeedback={() => setFeedbackOpen(true)}
      >
        {children}
      </GuidedLayout>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}

/** The footer under every dashboard page: service line, legal links, source offer. */
function DashboardFooter() {
  const t = useTranslations("nav");
  return (
      <footer className="border-t border-border mt-auto py-4">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground space-y-2">
          <p>
            {t.rich("footerService", {
              app: brand.name,
              company: brand.companyName,
              link: (chunks) => (
                <a href={brand.companyWebsite} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  {chunks}
                </a>
              ),
            })}
          </p>
          {/* One row that wraps evenly on narrow viewports: equal gaps, no
              separators that could strand at a line edge, nothing pushed right. */}
          <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0">
            <a href={brand.termsOfUseUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <Scale className="w-3.5 h-3.5" />
              {t("terms")}
            </a>
            <a href={brand.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <BookOpen className="w-3.5 h-3.5" />
              {t("privacy")}
            </a>
            {features.stripeEnabled && (
              <Link href="/governance/billing" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
                <CreditCard className="w-3.5 h-3.5" />
                {t("billing")}
              </Link>
            )}
            <Link href="/docs" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <BookOpen className="w-3.5 h-3.5" />
              {t("docs")}
            </Link>
            <Link href="/docs/security" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <Shield className="w-3.5 h-3.5" />
              {t("security")}
            </Link>
          </div>
          {/* AGPL Appropriate Legal Notices (section 5d) + section 13 source offer:
              the "Source & licence" link below leads to /licenses, which carries
              the Corresponding Source offer to network users. */}
          <p className="text-[11px] text-muted-foreground/80">
            AI Sentinel &middot; AGPL-3.0 &middot; &copy; Rindogatan LLC &middot;{" "}
            <Link href="/licenses" className="underline underline-offset-2 hover:text-foreground transition-colors">
              {t("sourceAndLicence")}
            </Link>
          </p>
        </div>
      </footer>
  );
}
