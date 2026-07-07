"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Brain,
  Briefcase,
  ShieldAlert,
  ClipboardCheck,
  Scale,
  Eye,
  AlertTriangle,
  Search,
  LogOut,
  User,
  Menu,
  BookOpen,
  Lock,
  LayoutDashboard,
  Building2,
  ScrollText,
  ChevronDown,
  CreditCard,
  Database,
  MessageSquareWarning,
  Settings,
  Shield,
  Sparkles,
  Code,
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

function buildNavGroups(isConsultant: boolean, t: (key: string) => string) {
  return [
    {
      label: t("getStarted"),
      icon: Sparkles,
      items: [
        { href: "/governance/quickstart", label: t("quickStart"), icon: Sparkles },
      ],
    },
    ...(isConsultant
      ? [{
          label: t("consulting"),
          icon: Briefcase,
          items: [
            { href: "/governance/clients", label: t("myClients"), icon: Briefcase },
          ],
        }]
      : []),
    {
      label: t("aiSystemsGroup"),
      icon: Brain,
      items: [
        { href: "/governance/ai-registry", label: t("aiRegistry"), icon: Brain },
        { href: "/governance/risk-classification", label: t("riskClassification"), icon: ShieldAlert },
      ],
    },
    {
      label: t("governanceGroup"),
      icon: Scale,
      items: [
        { href: "/governance/assessments", label: t("assessments"), icon: ClipboardCheck },
        { href: "/governance/oversight", label: t("oversight"), icon: Eye },
        { href: "/governance/compliance", label: t("compliance"), icon: Scale },
        { href: "/governance/policies", label: t("policies"), icon: ScrollText },
      ],
    },
    {
      label: t("operationsGroup"),
      icon: AlertTriangle,
      items: [
        { href: "/governance/incidents", label: t("incidents"), icon: AlertTriangle },
        { href: "/governance/vendors", label: t("vendors"), icon: Building2 },
        { href: "/governance/vendor-catalog", label: t("vendorCatalog"), icon: Database, premium: true },
        { href: "/governance/shadow-ai", label: t("shadowAi"), icon: Search, premium: true },
        ...(features.expertDirectoryEnabled
          ? [{ href: "/governance/experts", label: t("findAiExpert"), icon: Search }]
          : []),
        // Billing is the hosted (Stripe) tier: hide the menu entry when the
        // store is off (sovereign posture), same pattern as expert directory.
        ...(features.stripeEnabled
          ? [{ href: "/governance/billing", label: t("billing"), icon: CreditCard }]
          : []),
      ],
    },
  ];
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { organization, organizations, isLoading: orgLoading, userRole } = useOrganization();
  const { needsOnboarding, isConsultant, isLoading: userTypeLoading } = useUserType();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const t = useTranslations("nav");

  const navGroups = buildNavGroups(isConsultant, t);

  // Full-screen loading gate: prevent chrome from rendering before org is ready
  if (orgLoading || userTypeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  // Step 1: Show persona selection if user hasn't chosen yet
  if (needsOnboarding) {
    return <PersonaSelector />;
  }

  // Step 2: Show organization setup if user has no organizations
  if (!organization && organizations.length === 0) {
    return <OrganizationSetup />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Open menu</span>
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
                    <div key={group.label} className="mb-2">
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
                              {item.premium && features.stripeEnabled && (
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

          <nav className="hidden md:flex items-center gap-1">
            {navGroups.map((group) => {
              const GroupIcon = group.icon;
              const isGroupActive = group.items.some(
                (item) => pathname === item.href || pathname.startsWith(item.href + "/")
              );

              return (
                <DropdownMenu key={group.label}>
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
                      <span className="hidden lg:inline">{group.label}</span>
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
                            {item.premium && features.stripeEnabled && <Lock className="w-3 h-3 ml-auto text-muted-foreground" />}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFeedbackOpen(true)}
              title={t("feedback")}
            >
              <MessageSquareWarning className="w-4 h-4" />
            </Button>
            <Link href="/governance/settings">
              <Button
                variant="ghost"
                size="icon"
                title={t("settings")}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="hidden lg:inline max-w-[150px] truncate">{session?.user?.email}</span>
              {userRole && (
                <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  userRole === "VIEWER"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary"
                }`}>
                  {userRole === "AI_OFFICER" ? "AI Officer" : userRole.charAt(0) + userRole.slice(1).toLowerCase()}
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

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {children}
      </main>

      <footer className="border-t border-border mt-auto py-4">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground space-y-2">
          <p>{brand.name} is a <a href={brand.companyWebsite} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">{brand.companyName}</a> service.</p>
          <div className="flex items-center justify-center gap-1">
            <a href={brand.termsOfUseUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <Scale className="w-3.5 h-3.5" />
              {t("terms")}
            </a>
            <span className="text-border">&middot;</span>
            <a href={brand.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <BookOpen className="w-3.5 h-3.5" />
              {t("privacy")}
            </a>
            {features.stripeEnabled && (
              <>
                <span className="text-border">&middot;</span>
                <Link href="/governance/billing" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
                  <CreditCard className="w-3.5 h-3.5" />
                  {t("billing")}
                </Link>
              </>
            )}
            <span className="text-border">&middot;</span>
            <Link href="/docs" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <BookOpen className="w-3.5 h-3.5" />
              {t("docs")}
            </Link>
            <span className="text-border">&middot;</span>
            <Link href="/docs/security" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
              <Shield className="w-3.5 h-3.5" />
              {t("security")}
            </Link>
            {/* AGPL section 13: offer the Corresponding Source to network users. */}
            {brand.sourceUrl && (
              <>
                <span className="text-border">&middot;</span>
                <a href={brand.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors">
                  <Code className="w-3.5 h-3.5" />
                  {t("sourceCode")}
                </a>
              </>
            )}
          </div>
          {/* AGPL Appropriate Legal Notices (section 5d) + section 13 source offer. */}
          <p className="text-[11px] text-muted-foreground/80">
            AI Sentinel &middot; AGPL-3.0 &middot; &copy; Rindogatan LLC &middot;{" "}
            <Link href="/licenses" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Source &amp; licence
            </Link>
          </p>
        </div>
      </footer>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
