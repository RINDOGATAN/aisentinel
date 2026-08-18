// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.compliance");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const frameworkKeys = ["euAiAct", "nist", "iso"] as const;

const statusStyles = [
  { key: "compliant", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  { key: "partiallyCompliant", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { key: "nonCompliant", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  { key: "notApplicable", color: "bg-muted text-muted-foreground border-border" },
  { key: "notAssessed", color: "bg-muted text-muted-foreground border-border" },
] as const;

export default async function ComplianceDocsPage() {
  const t = await getTranslations("docs.compliance");
  const trackingItems = t.raw("matrixTracking") as string[];
  const exportItems = t.raw("matrixExport") as string[];
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

      {/* Frameworks */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("frameworksTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("frameworksIntro")}
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {frameworkKeys.map((key) => (
            <div key={key} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-lg font-semibold mb-2 text-primary">{t(`frameworks.${key}.name`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {t(`frameworks.${key}.description`)}
              </p>
              <span className="text-xs text-muted-foreground">{t(`frameworks.${key}.items`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance Statuses */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("statusesTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("statusesIntro")}
        </p>
        <div className="flex flex-wrap gap-3">
          {statusStyles.map((item) => (
            <span
              key={item.key}
              className={`px-4 py-2 rounded-full text-sm font-medium border ${item.color}`}
            >
              {t(`statuses.${item.key}`)}
            </span>
          ))}
        </div>
      </section>

      {/* Compliance Matrix */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("matrixTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("matrixIntro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">{t("matrixTrackingTitle")}</h4>
              <ul className="space-y-1 text-muted-foreground">
                {trackingItems.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("matrixExportTitle")}</h4>
              <ul className="space-y-1 text-muted-foreground">
                {exportItems.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Framework Mapping */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("crossTitle")}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t("crossIntro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              {t.rich("crossBody1", {
                s: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })}
            </p>
            <p>
              {t("crossBody2")}
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-2xl font-display text-primary">28</p>
              <p className="text-xs text-muted-foreground">{t("crossStats.equivalent")}</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-display">12</p>
              <p className="text-xs text-muted-foreground">{t("crossStats.partial")}</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-display">1</p>
              <p className="text-xs text-muted-foreground">{t("crossStats.related")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Auto-Generated Compliance Snapshot */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("snapshotTitle")}
        </h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t("snapshotBody1")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("snapshotBody2")}
          </p>
        </div>
      </section>

      {/* How to Map Compliance */}
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
