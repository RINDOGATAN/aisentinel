"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Scale,
  LogOut,
  User,
  Menu,
  BookOpen,
  Lock,
  LayoutDashboard,
  ChevronDown,
  CreditCard,
  MessageSquareWarning,
  Settings,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/lib/organization-context";
import { useUserType } from "@/lib/use-user-type";
import { features } from "@/config/features";
import { brand } from "@/config/brand";
import { OrganizationSetup } from "@/components/governance/organization-setup";
import { PersonaSelector } from "@/components/governance/persona-selector";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { buildNavGroups } from "@/components/nav-groups";
import { PilotDisclosureScreen } from "@/components/pilot/pilot-disclosure";
import { trpc } from "@/lib/trpc";
import type { Skin } from "@/lib/skin";
import { SkinProvider } from "@/components/guided/skin-context";
import { GuidedLayout } from "@/components/guided/guided-layout";

export function DashboardShell({
  children,
  hostedPilot = false,
  skin = "classic",
  menuCollapsed = false,
}: {
  children: React.ReactNode;
  /** On the hosted pilot every module is open, so no lock is ever shown. */
  hostedPilot?: boolean;
  /** The layout chosen in the `ais_skin` cookie (src/lib/skin.ts). Classic unless chosen. */
  skin?: Skin;
  /** Guided only: the left menu shows icons only (`ais_menu` cookie). */
  menuCollapsed?: boolean;
}) {
  const showLocks = !features.allSkillsFree && !hostedPilot;
  const { data: session } = useSession();
  const pathname = usePathname();
  const { organization, organizations, isLoading: orgLoading, userRole } = useOrganization();
  const { needsOnboarding, isLoading: userTypeLoading } = useUserType();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const t = useTranslations("nav");

  // The hosted pilot says what it is before anything is entered. Asked only on
  // the pilot; on the kit the query is not issued at all.
  const disclosure = trpc.pilot.disclosure.useQuery(undefined, { enabled: hostedPilot });

  const navGroups = buildNavGroups(t, { stripeEnabled: features.stripeEnabled });

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

  // Guided (a preview, chosen per browser): the program path as a left menu.
  // The pages, the footer and the feedback dialog are the same as Classic.
  if (skin === "guided") {
    return (
      <SkinProvider skin="guided">
        <GuidedLayout
          footer={<DashboardFooter />}
          initialCollapsed={menuCollapsed}
          onFeedback={() => setFeedbackOpen(true)}
        >
          {children}
        </GuidedLayout>
        <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      </SkinProvider>
    );
  }

  return (
    <SkinProvider skin="classic">
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          {/* The logo block never shrinks and the menus between it and the
              right-hand controls may only clip, so nothing can slide over the
              logo at any width. Labels appear from xl (1280 px), the address
              from 2xl, which keeps both languages inside the bar. */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">{t("openMenu")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <span className="text-lg tracking-tight" style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 }}>AI SENTINEL</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-0.5">
                  {/* Dashboard link */}
                  <Link
                    href="/governance"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-3 min-h-[48px] text-base rounded-lg ${
                        pathname === "/governance"
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : ""
                      }`}
                    >
                      <LayoutDashboard className="w-5 h-5 shrink-0" />
                      {t("dashboard")}
                    </Button>
                  </Link>

                  <div className="h-px bg-border my-2" />

                  {/* Grouped nav items */}
                  {navGroups.map((group) => (
                    <div key={group.key} className="mb-2">
                      <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </p>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                          >
                            <Button
                              variant="ghost"
                              className={`w-full justify-start gap-3 min-h-[48px] text-base rounded-lg ${
                                isActive
                                  ? "bg-primary/15 text-primary border border-primary/20"
                                  : ""
                              }`}
                            >
                              <Icon className="w-5 h-5 shrink-0" />
                              {item.label}
                              {item.premium && showLocks && (
                                <Lock className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
                              )}
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                  <div className="h-px bg-border my-2" />
                  <Link
                    href="/governance/settings"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-3 min-h-[48px] text-base rounded-lg ${
                        pathname === "/governance/settings"
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : ""
                      }`}
                    >
                      <Settings className="w-5 h-5 shrink-0" />
                      {t("settings")}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 min-h-[48px] text-base rounded-lg"
                    onClick={() => { setMobileNavOpen(false); setFeedbackOpen(true); }}
                  >
                    <MessageSquareWarning className="w-5 h-5 shrink-0" />
                    {t("feedback")}
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/governance" className="flex items-center shrink-0">
              <span className="text-lg tracking-tight" style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 }}>AI SENTINEL</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1 min-w-0 overflow-hidden">
            {navGroups.map((group) => {
              const GroupIcon = group.icon;
              const isGroupActive = group.items.some(
                (item) => pathname === item.href || pathname.startsWith(item.href + "/")
              );

              return (
                <DropdownMenu key={group.key}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-1.5 ${
                        isGroupActive
                          ? "bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 hover:text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <GroupIcon className="w-4 h-4" />
                      <span className="hidden xl:inline whitespace-nowrap">{group.label}</span>
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">{group.label}</DropdownMenuLabel>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-2 ${
                              isActive ? "bg-primary/10 text-primary" : ""
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                            {item.premium && showLocks && <Lock className="w-3 h-3 ml-auto text-muted-foreground" />}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* On phones, feedback and settings are in the side menu. */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              onClick={() => setFeedbackOpen(true)}
              title={t("feedback")}
            >
              <MessageSquareWarning className="w-4 h-4" />
            </Button>
            <Link href="/governance/settings" className="hidden sm:inline-flex">
              <Button
                variant="ghost"
                size="icon"
                title={t("settings")}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="hidden 2xl:inline max-w-[150px] truncate">{session?.user?.email}</span>
              {userRole && (
                <span className={`text-[10px] font-medium uppercase tracking-wider whitespace-nowrap px-1.5 py-0.5 rounded ${
                  userRole === "VIEWER"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary"
                }`}>
                  {t(
                    (
                      {
                        OWNER: "roleOwner",
                        ADMIN: "roleAdmin",
                        AI_OFFICER: "roleAiOfficer",
                        MEMBER: "roleMember",
                        VIEWER: "roleViewer",
                      } as const
                    )[userRole]
                  )}
                </span>
              )}
            </div>
            <LocaleSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await fetch("/api/auth/cross-logout", { method: "POST" });
                window.location.href = "/sign-in";
              }}
              title={t("signOut")}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* min-w-0 so a wide child inside a future flex or grid ancestor cannot
          stretch the page; the page itself never scrolls sideways, only the
          boxes that hold a table or a diagram do. */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-6 min-w-0">
        {children}
      </main>

      <DashboardFooter />

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
    </SkinProvider>
  );
}

/** The footer both layouts share: service line, legal links, source offer. */
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
