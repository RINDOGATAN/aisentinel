// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.riskClassification");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const tierStyles = [
  { key: "unacceptable", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  { key: "high", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { key: "limited", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { key: "minimal", color: "bg-green-500/10 text-green-400 border-green-500/20" },
] as const;

export default async function RiskClassificationDocsPage() {
  const t = await getTranslations("docs.riskClassification");
  const annexCategories = t.raw("annexCategories") as string[];
  const historyEntries = t.raw("historyEntries") as {
    date: string;
    author: string;
    from: string;
    to: string;
    note: string;
  }[];
  const steps = t.raw("steps") as { title: string; description: string }[];

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

      {/* Risk Tiers */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("tiersTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("tiersIntro")}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {tierStyles.map((tier) => (
            <div
              key={tier.key}
              className={`rounded-xl border p-5 ${tier.color}`}
            >
              <h3 className="text-lg font-semibold mb-2">{t(`tiers.${tier.key}.level`)}</h3>
              <p className="text-sm opacity-90 leading-relaxed mb-3">{t(`tiers.${tier.key}.description`)}</p>
              <p className="text-xs opacity-70">
                <span className="font-medium">{t("examplesLabel")}</span> {t(`tiers.${tier.key}.examples`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Annex III Categories */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("annexTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("annexIntro")}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {annexCategories.map((category) => (
            <div
              key={category}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              {category}
            </div>
          ))}
        </div>
      </section>

      {/* Classification History */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("historyTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("historyIntro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-4 text-sm">
            {historyEntries.map((entry, i) => (
              <div key={i} className="flex gap-4 items-start">
                <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                  {entry.date}
                </span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-muted-foreground">{entry.author}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{entry.from}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-primary">{entry.to}</span>
                  </div>
                  <p className="text-muted-foreground">{entry.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Classify */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("howToTitle")}
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
                    {t("howToRole")}
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
