// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.vendors");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const riskStyles = [
  { key: "critical", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  { key: "high", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { key: "medium", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { key: "low", color: "bg-green-500/10 text-green-400 border-green-500/20" },
] as const;

export default async function VendorsDocsPage() {
  const t = await getTranslations("docs.vendors");
  const statusFlow = t.raw("statusFlow") as string[];
  const recordGroups = t.raw("recordGroups") as { title: string; items: string[] }[];
  const steps = t.raw("steps") as { role: string; title: string; description: string }[];

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

      {/* Risk Levels */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("riskTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("riskIntro")}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskStyles.map((risk) => (
            <div key={risk.key} className={`rounded-xl border p-4 ${risk.color}`}>
              <h3 className="font-semibold mb-1">{t(`riskLevels.${risk.key}.level`)}</h3>
              <p className="text-xs opacity-80">{t(`riskLevels.${risk.key}.description`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vendor Status */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("statusTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("statusIntro")}
        </p>
        <div className="flex flex-wrap gap-3">
          {statusFlow.map((status, i) => (
            <div key={status} className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {status}
              </span>
              {i < statusFlow.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Vendor Record */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("recordTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("recordIntro")}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {recordGroups.map((group) => (
            <div key={group.title} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-3">{group.title}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-primary mt-1">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* AI Vendor Catalog */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("catalogTitle")}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium align-middle">
            {t("catalogPremium")}
          </span>
        </h2>
        <p className="text-muted-foreground mb-6">
          {t("catalogIntro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">{t("catalogSearchTitle")}</h4>
              <p className="text-muted-foreground">
                {t("catalogSearchBody")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("catalogAutofillTitle")}</h4>
              <p className="text-muted-foreground">
                {t("catalogAutofillBody")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("catalogRegisterTitle")}</h4>
              <p className="text-muted-foreground">
                {t("catalogRegisterBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Add */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("howTitle")}
        </h2>
        <div className="space-y-4">
          {steps.map((item, i) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5 flex gap-4">
              <div className="text-2xl font-display text-primary/40 shrink-0">
                {i + 1}
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mr-2">
                    {item.role}
                  </span>
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
