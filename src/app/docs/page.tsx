// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import {
  Brain,
  ShieldAlert,
  ClipboardCheck,
  Eye,
  AlertTriangle,
  Scale,
  Building2,
  ScrollText,
  Search,
  BookMarked,
  FileCheck,
  Activity,
  Megaphone,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import prisma from "@/lib/prisma";
import { features } from "@/config/features";

export async function generateMetadata() {
  const t = await getTranslations("docs.home");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

// Catalog sizes are read from the database rather than hardcoded: both grow on
// every vendor.watch sync, and stale literals here previously understated them
// by hundreds of entries. Revalidate hourly so docs traffic does not hit the DB
// on every view.
export const revalidate = 3600;

async function getCatalogCounts() {
  try {
    const [vendors, tools] = await Promise.all([
      prisma.vendorCatalog.count(),
      prisma.shadowAITool.count(),
    ]);
    return { vendors, tools };
  } catch {
    // Docs must render even when the database is unreachable.
    return { vendors: null, tools: null };
  }
}

// Rounded down to the nearest 50 so the copy reads as a claim about scale
// rather than a number that is wrong the moment the next sync lands.
function approx(n: number | null) {
  if (!n) return null;
  return `${Math.floor(n / 50) * 50}+`;
}

const moduleItems = [
  { href: "/docs/ai-registry", icon: Brain, tKey: "aiRegistry" },
  { href: "/docs/risk-classification", icon: ShieldAlert, tKey: "riskClassification" },
  { href: "/docs/assessments", icon: ClipboardCheck, tKey: "assessments" },
  { href: "/docs/oversight", icon: Eye, tKey: "oversight" },
  { href: "/docs/incidents", icon: AlertTriangle, tKey: "incidents" },
  { href: "/docs/transparency", icon: Megaphone, tKey: "transparency" },
  { href: "/docs/compliance", icon: Scale, tKey: "compliance" },
  { href: "/docs/vendors", icon: Building2, tKey: "vendors" },
  { href: "/docs/policies", icon: ScrollText, tKey: "policies" },
] as const;

const premiumItems = [
  { href: "/docs/shadow-ai", icon: Search, tKey: "shadowAi" },
  { href: "/docs/vendor-catalog", icon: BookMarked, tKey: "vendorCatalog" },
  { href: "/docs/conformity-assessment", icon: FileCheck, tKey: "conformity" },
  { href: "/docs/bias-fairness", icon: Activity, tKey: "biasFairness" },
] as const;

const alsoItems = [
  { href: "/governance/quickstart", tKey: "quickstart" },
  { href: "/governance/settings", tKey: "aiPosture" },
  { href: "/governance/skills", tKey: "skills" },
  { href: "/governance/clients", tKey: "clients" },
] as const;

export default async function DocsPage() {
  const t = await getTranslations("docs.home");
  const counts = await getCatalogCounts();
  const allFree = features.allSkillsFree;

  const quickStartSteps = t.raw("quickStartSteps") as {
    title: string;
    description: string;
  }[];
  const roles = t.raw("roles") as { name: string; description: string }[];
  const coreItems = t.raw("licensing.coreItems") as string[];

  const premiumValues: Record<string, Record<string, string | number>> = {
    shadowAi: { count: counts.tools ?? "60+" },
    vendorCatalog: { count: approx(counts.vendors) ?? "800+" },
  };

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          AI SENTINEL
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          {t("heroIntro")}
        </p>
      </section>

      {/* Quick Start */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("quickStartTitle")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {quickStartSteps.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5 flex gap-4"
            >
              <div className="text-2xl font-display text-primary/40 shrink-0">
                {i + 1}
              </div>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* User Roles */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("rolesTitle")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div
              key={role.name}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold mb-1">{role.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {role.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("modulesTitle")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {moduleItems.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="rounded-xl border border-border bg-card p-5 flex gap-4 group hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                    {t(`modules.${mod.tKey}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`modules.${mod.tKey}.description`)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Premium Modules */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-2">
          {allFree ? t("premiumTitleFree") : t("premiumTitleLocked")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {allFree
            ? t("premiumIntroFree")
            : t.rich("premiumIntroLocked", {
                link: (chunks) => (
                  <Link href="/governance/skills" className="text-primary hover:underline">
                    {chunks}
                  </Link>
                ),
              })}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {premiumItems.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="rounded-xl border border-border bg-card p-5 flex gap-4 group hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {t(`premiumModules.${mod.tKey}.title`)}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                      {allFree ? t("badgeIncluded") : t("badgeLicensed")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`premiumModules.${mod.tKey}.description`, premiumValues[mod.tKey])}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features without a dedicated guide yet */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-2">
          {t("alsoTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t("alsoIntro")}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {alsoItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-border bg-card p-5 group hover:border-primary/30 transition-colors"
            >
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {t(`also.${item.tKey}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`also.${item.tKey}.description`)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Licensing */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("licensingTitle")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              AGPL-3.0
            </div>
            <h3 className="text-lg font-semibold mb-3">{t("licensing.coreTitle")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {coreItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="inline-block px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-4">
              {t("licensing.commercialBadge")}
            </div>
            <h3 className="text-lg font-semibold mb-3">{t("licensing.premiumTitle")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("licensing.commercialConformity")}</li>
              <li>{t("licensing.commercialBiasFairness")}</li>
              <li>{t("licensing.commercialShadowAi", { count: counts.tools ?? "60+" })}</li>
              <li>{t("licensing.commercialVendorCatalog")}</li>
            </ul>
            {allFree && (
              <p className="mt-4 text-xs text-muted-foreground">
                {t("licensing.allFreeNote")}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
