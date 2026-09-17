"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { brand } from "@/config/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  Brain,
  ShieldAlert,
  ClipboardCheck,
  Eye,
  AlertTriangle,
  Scale,
  Megaphone,
  Building2,
  ScrollText,
  BookOpen,
  Menu,
  X,
  Search,
  BookMarked,
  FileCheck,
  Activity,
  Shield,
  Users,
  Globe2,
  Sparkles,
  CircleDot,
  Table2,
  Columns3,
  ListChecks,
} from "lucide-react";
import { useState } from "react";
import { PremiumNotice } from "@/components/docs/premium-notice";

type SidebarItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  group?: "frameworks" | "premium";
};

const sidebarItems: SidebarItem[] = [
  { href: "/docs", labelKey: "gettingStarted", icon: BookOpen, exact: true },
  { href: "/docs/ai-registry", labelKey: "aiRegistry", icon: Brain },
  { href: "/docs/risk-classification", labelKey: "riskClassification", icon: ShieldAlert },
  { href: "/docs/assessments", labelKey: "assessments", icon: ClipboardCheck },
  { href: "/docs/oversight", labelKey: "oversight", icon: Eye },
  { href: "/docs/incidents", labelKey: "incidents", icon: AlertTriangle },
  { href: "/docs/transparency", labelKey: "transparency", icon: Megaphone },
  { href: "/docs/cross-border", labelKey: "crossBorder", icon: Globe2 },
  { href: "/docs/compliance", labelKey: "compliance", icon: Scale },
  { href: "/docs/vendors", labelKey: "vendors", icon: Building2 },
  { href: "/docs/policies", labelKey: "policies", icon: ScrollText },
  { href: "/docs/frameworks", labelKey: "frameworksOverview", icon: CircleDot, exact: true, group: "frameworks" },
  { href: "/docs/frameworks/table", labelKey: "frameworksTable", icon: Table2, group: "frameworks" },
  { href: "/docs/frameworks/compare", labelKey: "frameworksCompare", icon: Columns3, group: "frameworks" },
  { href: "/docs/frameworks/selector", labelKey: "frameworksSelector", icon: ListChecks, group: "frameworks" },
  { href: "/docs/shadow-ai", labelKey: "shadowAi", icon: Search, group: "premium" },
  { href: "/docs/vendor-catalog", labelKey: "vendorCatalog", icon: BookMarked, group: "premium" },
  { href: "/docs/conformity-assessment", labelKey: "conformity", icon: FileCheck, group: "premium" },
  { href: "/docs/bias-fairness", labelKey: "biasFairness", icon: Activity, group: "premium" },
  { href: "/docs/roles", labelKey: "roles", icon: Users },
  { href: "/docs/security", labelKey: "security", icon: Shield },
  { href: "/docs/whats-new", labelKey: "whatsNew", icon: Sparkles },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useTranslations("docs.layout");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-negative.svg" alt="TODO.LAW" style={{ height: "28px", width: "auto" }} />
              <span className="text-lg tracking-tight" style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 }}>AI SENTINEL</span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/docs"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t("headerDocs")}
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("headerSignIn")}
            </Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 py-8">
          {/* Sidebar */}
          <aside
            className={`md:col-span-1 ${
              sidebarOpen ? "block" : "hidden"
            } md:block`}
          >
            <nav className="sticky top-20 space-y-1">
              {sidebarItems.map((item, i) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                const startsGroup =
                  item.group && (i === 0 || sidebarItems[i - 1].group !== item.group);

                return (
                  <div key={item.href}>
                    {startsGroup && (
                      <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        {t(item.group === "premium" ? "premiumLabel" : "frameworksLabel")}
                      </div>
                    )}
                    {startsGroup && item.group === "premium" && <PremiumNotice variant="compact" />}
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-primary/15 text-primary border border-primary/20 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {t(`nav.${item.labelKey}`)}
                    </Link>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <main className="md:col-span-4 min-w-0">{children}</main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-4">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground space-y-2">
          <p>
            {t.rich("footer.service", {
              app: brand.name,
              company: brand.companyName,
              link: (chunks) => (
                <a
                  href={brand.companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
          {/* One row that wraps evenly on narrow viewports: equal gaps, no
              separators that could strand at a line edge, nothing pushed right. */}
          <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0">
            <a
              href={brand.privacyPolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors"
            >
              {t("footer.privacyPolicy")}
            </a>
            <a
              href={brand.termsOfUseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors"
            >
              {t("footer.termsOfService")}
            </a>
            <Link
              href="/docs"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors"
            >
              {t("footer.howItWorks")}
            </Link>
            <Link
              href="/docs/security"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors"
            >
              {t("footer.security")}
            </Link>
            {/* AGPL section 13: offer the Corresponding Source to network users.
                Kept here because this shell has no "Source & licence" line. */}
            {brand.sourceUrl && (
              <a
                href={brand.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:text-foreground hover:bg-secondary transition-colors"
              >
                {t("footer.sourceCode")}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
