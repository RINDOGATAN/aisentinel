"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The Guided layout (a preview, off unless chosen): a slim top bar, the
 * program path as a left menu from the `lg` breakpoint, and on smaller
 * screens a one-line stage bar that opens the same path in the side sheet.
 *
 * Only the chrome differs from Classic. The pages, the footer and the
 * feedback dialog are the ones Classic uses (see dashboard-shell.tsx).
 */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LayoutPanelTop,
  LogOut,
  Menu,
  MessageSquareWarning,
  Plus,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useOrganization } from "@/lib/organization-context";
import { useUserType } from "@/lib/use-user-type";
import {
  PORTFOLIO_ADD_HREF,
  PORTFOLIO_HREF,
  accountMode,
  organizationSwitcherView,
} from "@/lib/account-mode";
import { MENU_COOKIE, cookieAssignment } from "@/lib/skin";
import { features } from "@/config/features";
import { cn } from "@/lib/utils";
import { AI_SENTINEL_PATH } from "./path-config";
import { currentStepId, nextStep, overallProgress } from "./path";
import { PathMenu } from "./path-menu";
import { StepBand } from "./step-band";
import { ProgressBar } from "./progress-ring";
import { usePlanState, useProgramPath, useProgramPathRefresh } from "./use-program-path";
import { planDayText } from "./plan-text";
import { useSkin } from "./skin-context";

const OVERVIEW = { href: "/governance", icon: LayoutDashboard };

const BRAND_STYLE = { fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 } as const;

const ROLE_KEYS = {
  OWNER: "roleOwner",
  ADMIN: "roleAdmin",
  AI_OFFICER: "roleAiOfficer",
  MEMBER: "roleMember",
  VIEWER: "roleViewer",
} as const;

export function GuidedLayout({
  children,
  footer,
  initialCollapsed,
  onFeedback,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Read from the `ais_menu` cookie on the server, so the first paint is already right. */
  initialCollapsed: boolean;
  onFeedback: () => void;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const stepId = currentStepId(AI_SENTINEL_PATH, pathname, search);
  const t = useTranslations("guided");
  const tn = useTranslations("nav");
  const statuses = useProgramPath();
  const plan = usePlanState();
  const { organization } = useOrganization();
  useProgramPathRefresh();
  const { userType } = useUserType();
  const [collapsed, setCollapsedState] = useState(initialCollapsed);
  const [sheetOpen, setSheetOpen] = useState(false);

  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    document.cookie = cookieAssignment(MENU_COOKIE, next ? "collapsed" : "open");
  };

  const menuProps = {
    config: AI_SENTINEL_PATH,
    statuses,
    pathname,
    search,
    stripeEnabled: features.stripeEnabled,
    clientMode: accountMode(userType) === "clients",
    t,
    overview: OVERVIEW,
    planLine: planDayText(plan, t),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setSheetOpen(true)}
            >
              <Menu className="w-5 h-5" />
              <span className="sr-only">{tn("openMenu")}</span>
            </Button>
            <Link href="/governance" className="flex shrink-0 items-center">
              <span className="text-lg tracking-tight" style={BRAND_STYLE}>AI SENTINEL</span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              onClick={onFeedback}
              title={tn("feedback")}
            >
              <MessageSquareWarning className="w-4 h-4" />
              <span className="sr-only">{tn("feedback")}</span>
            </Button>
            <LocaleSwitcher />
            <AccountMenu />
          </div>
        </div>
      </header>

      <PhoneStageBar statuses={statuses} onOpen={() => setSheetOpen(true)} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[340px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="text-lg tracking-tight" style={BRAND_STYLE}>AI SENTINEL</span>
            </SheetTitle>
          </SheetHeader>
          <div className="px-3 pb-6 flex flex-col gap-4">
            <OrganizationBlock onNavigate={() => setSheetOpen(false)} />
            <PathMenu {...menuProps} variant="sheet" onNavigate={() => setSheetOpen(false)} />
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 min-h-11 text-base rounded-lg"
              onClick={() => {
                setSheetOpen(false);
                onFeedback();
              }}
            >
              <MessageSquareWarning className="w-5 h-5 shrink-0" />
              {tn("feedback")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 min-w-0">
        {/* The column runs the full height of the page (its border reaches the
            footer); inside it, the panel is exactly one window tall, sticks
            under the header, scrolls on its own, and keeps "Collapse the
            menu" pinned at its foot however far the page is scrolled. */}
        <aside
          className={cn(
            "hidden lg:block shrink-0 self-stretch border-r border-border motion-safe:transition-[width] motion-safe:duration-200",
            collapsed ? "lg:w-[4.5rem]" : "lg:w-72",
          )}
        >
          <div className="sticky top-14 flex h-[calc(100dvh-3.5rem)] flex-col">
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain",
                collapsed ? "px-2 py-3" : "px-3 py-4",
              )}
            >
              {!collapsed && <OrganizationBlock />}
              <div className={collapsed ? "" : "mt-4"}>
                <PathMenu {...menuProps} variant="sidebar" collapsed={collapsed} />
              </div>
            </div>
            <div
              className={cn(
                "shrink-0 border-t border-border bg-background py-2",
                collapsed ? "px-2 flex justify-center" : "px-3",
              )}
            >
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? t("expand") : t("collapse")}
                className={cn(
                  "flex min-h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground motion-safe:transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  collapsed ? "size-11 justify-center px-0" : "w-full",
                )}
              >
                {collapsed ? (
                  <ChevronsRight className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronsLeft className="size-4" aria-hidden="true" />
                )}
                <span className={collapsed ? "sr-only" : ""}>{collapsed ? t("expand") : t("collapse")}</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* min-w-0 so a wide child cannot stretch the page (as in Classic). */}
          <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 min-w-0 flex-1">
            {/* Keyed by the organisation and the address: a "stage complete"
                message lasts for the page it was shown on. */}
            <StepBand
              key={`${organization?.id ?? ""}:${pathname}?${search}`}
              stepId={stepId}
              statuses={statuses}
            />
            {children}
          </main>
          {footer}
        </div>
      </div>
    </div>
  );
}

/**
 * Top of the menu: the organisation. In client mode, the client's name opens
 * a switcher with every client, the portfolio and the add flow.
 */
function OrganizationBlock({ onNavigate }: { onNavigate?: () => void }) {
  const { organization, organizations, setOrganization } = useOrganization();
  const { userType } = useUserType();
  const switcher = organizationSwitcherView(userType);
  const t = useTranslations("guided");

  if (!switcher.show) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
        <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 truncate text-sm font-medium">{organization?.name}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-secondary motion-safe:transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[11px] text-muted-foreground">{t("switchClient")}</span>
              <span className="truncate text-sm font-medium">{organization?.name}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[240px]">
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => setOrganization(org)}
              className={org.id === organization?.id ? "bg-primary/10 text-primary" : ""}
            >
              {org.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={PORTFOLIO_ADD_HREF} onClick={onNavigate} className="flex items-center gap-2">
              <Plus className="size-4" />
              {t("addOrganization")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Link
        href={PORTFOLIO_HREF}
        onClick={onNavigate}
        className="flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground motion-safe:transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Briefcase className="size-4 shrink-0" aria-hidden="true" />
        {t("allClients")}
      </Link>
    </div>
  );
}

/** The account: who is signed in, the way back to Classic, sign out. */
function AccountMenu() {
  const { data: session } = useSession();
  const { userRole } = useOrganization();
  const { setSkin } = useSkin();
  const t = useTranslations("guided");
  const tn = useTranslations("nav");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t("account")}>
          <User className="w-4 h-4" />
          <span className="sr-only">{t("account")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[240px]">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="truncate text-sm font-normal">{session?.user?.email}</span>
          {userRole && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-primary">
              {tn(ROLE_KEYS[userRole])}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Settings is in "Library and tools"; one place for it. */}
        <DropdownMenuItem onClick={() => setSkin("classic")} className="flex items-center gap-2">
          <LayoutPanelTop className="size-4" />
          {t("layout.useClassic")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await fetch("/api/auth/cross-logout", { method: "POST" });
            window.location.href = "/sign-in";
          }}
          className="flex items-center gap-2"
        >
          <LogOut className="size-4" />
          {tn("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Below `lg`: one line under the header, "Stage 3 of 6 · Inventory" and a
 * thin bar. The stage shown is the one holding the next step. Tapping it
 * opens the path in the side sheet. Always the same height, so the page does
 * not move when progress arrives.
 */
function PhoneStageBar({
  statuses,
  onOpen,
}: {
  statuses: ReturnType<typeof useProgramPath>;
  onOpen: () => void;
}) {
  const t = useTranslations("guided");
  const total = AI_SENTINEL_PATH.stages.length;
  const next = statuses ? nextStep(AI_SENTINEL_PATH, statuses) : null;
  const overall = statuses ? overallProgress(AI_SENTINEL_PATH, statuses) : null;

  const label = !statuses
    ? t("loading")
    : next
      ? t("phoneBar", {
          number: next.stageIndex + 1,
          total,
          stage: t(`stages.${next.stage.id}`),
        })
      : t("phoneBarDone");

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label}. ${t("phoneBarOpen")}`}
      className="lg:hidden sticky top-14 z-40 flex min-h-11 w-full flex-col justify-center gap-1.5 border-b border-border bg-background/95 px-4 sm:px-6 py-2 text-left backdrop-blur supports-[backdrop-filter]:bg-background/60 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex items-center justify-between gap-2 text-xs">
        <span className={cn("min-w-0 truncate", statuses ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </span>
        <ChevronDown className="size-3.5 shrink-0 -rotate-90 text-muted-foreground" aria-hidden="true" />
      </span>
      <ProgressBar value={overall?.done ?? null} total={overall?.total ?? 0} />
    </button>
  );
}
