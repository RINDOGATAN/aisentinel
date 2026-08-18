// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.shadowAi");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ShadowAIDocsPage() {
  const t = await getTranslations("docs.shadowAi");
  const whyItems = t.raw("whyItems") as { title: string; description: string }[];
  const vsVendorItems = t.raw("vsVendorItems") as string[];
  const vsShadowItems = t.raw("vsShadowItems") as string[];
  const howSteps = t.raw("howSteps") as { title: string; description: string }[];
  const statusStages = t.raw("statusStages") as { status: string; description: string }[];

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="inline-block px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-4">
          {t("premiumBadge")}
        </div>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          {t("intro")}
        </p>
      </section>

      {/* What is Shadow AI */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("whatTitle")}</h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t("whatP1")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t("whatP2")}
          </p>
        </div>
      </section>

      {/* Why it matters */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("whyTitle")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {whyItems.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Shadow AI vs Vendor Risk */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("vsTitle")}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t("vsIntro")}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-3 text-primary">{t("vsVendorTitle")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {vsVendorItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-3 text-primary">{t("vsShadowTitle")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {vsShadowItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("howTitle")}</h2>
        <div className="space-y-4">
          {howSteps.map((item, i) => (
            <div
              key={item.title}
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

      {/* Status Workflow */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("statusTitle")}</h2>
        <div className="flex flex-wrap gap-3">
          {statusStages.map((stage, i) => (
            <div key={stage.status} className="flex items-center gap-2">
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <span className="font-semibold text-sm">{stage.status}</span>
                <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
              </div>
              {i < statusStages.length - 1 && (
                <span className="text-muted-foreground hidden sm:inline">→</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
