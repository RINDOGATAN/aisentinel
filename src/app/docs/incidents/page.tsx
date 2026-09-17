// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";
import { TierMarker } from "@/components/governance/risk-tier-badge";
import { TIER_BORDER_L_CLASS, toRiskTier } from "@/config/risk-tier-palette";

export async function generateMetadata() {
  const t = await getTranslations("docs.incidents");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

// Severity borrows the risk-tier palette (coloured left bar and dot, body-colour text).
const severityStyles = [
  { key: "low", tier: "LOW" },
  { key: "medium", tier: "MEDIUM" },
  { key: "high", tier: "HIGH" },
  { key: "critical", tier: "CRITICAL" },
] as const;

const timelineTimes = [
  { time: "09:15", key: "reported" },
  { time: "09:45", key: "assigned" },
  { time: "11:00", key: "rootCause" },
  { time: "14:00", key: "notification" },
  { time: "16:30", key: "mitigation" },
  { time: "18:00", key: "resolved" },
] as const;

export default async function IncidentsDocsPage() {
  const t = await getTranslations("docs.incidents");
  const types = t.raw("types") as string[];
  const lifecycle = t.raw("lifecycle") as string[];
  const reportSteps = t.raw("reportSteps") as { role: string; title: string; description: string }[];

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

      {/* Incident Types */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("typesTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("typesIntro")}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {types.map((type) => (
            <div
              key={type}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              {type}
            </div>
          ))}
        </div>
      </section>

      {/* Incident Lifecycle */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("lifecycleTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("lifecycleIntro")}
        </p>
        <div className="flex flex-wrap gap-3">
          {lifecycle.map((status, i) => (
            <div key={status} className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {status}
              </span>
              {i < lifecycle.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Severity */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("severityTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("severityIntro")}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {severityStyles.map((sev) => (
            <div
              key={sev.key}
              className={`rounded-xl border border-border border-l-4 bg-card text-foreground p-5 ${TIER_BORDER_L_CLASS[toRiskTier(sev.tier)]}`}
            >
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <TierMarker level={sev.tier} />
                {t(`severities.${sev.key}.level`)}
              </h3>
              <p className="text-sm opacity-90 leading-relaxed">{t(`severities.${sev.key}.description`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Art. 73 Notifications */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("art73Title")}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t("art73Intro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">{t("art73.whenTitle")}</h4>
              <p className="text-muted-foreground">
                {t("art73.whenBody")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("art73.timelineTitle")}</h4>
              <p className="text-muted-foreground">
                {t("art73.timelineBody")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("art73.includeTitle")}</h4>
              <p className="text-muted-foreground">
                {t("art73.includeBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Incident Timeline */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("timelineTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("timelineIntro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-sm">
          {timelineTimes.map((entry) => (
            <div key={entry.time} className="flex items-start gap-4">
              <span className="text-muted-foreground whitespace-nowrap font-mono">
                {entry.time}
              </span>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium shrink-0">
                {t(`timeline.${entry.key}.badge`)}
              </span>
              <span className="text-muted-foreground">{t(`timeline.${entry.key}.event`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How to Report */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("reportTitle")}
        </h2>
        <div className="space-y-4">
          {reportSteps.map((item, i) => (
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
