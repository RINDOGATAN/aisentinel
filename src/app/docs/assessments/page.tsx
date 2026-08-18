// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.assessments");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const templateDefs = [
  { type: "FRIA", tKey: "fria", premium: false },
  { type: "AI_RISK", tKey: "aiRisk", premium: false },
  { type: "CUSTOM", tKey: "custom", premium: false },
  { type: "CONFORMITY", tKey: "conformity", premium: true },
  { type: "BIAS_FAIRNESS", tKey: "biasFairness", premium: true },
] as const;

const scoringColors = [
  "bg-green-500/10 text-green-400 border-green-500/20",
  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "bg-red-500/10 text-red-400 border-red-500/20",
];

export default async function AssessmentsDocsPage() {
  const t = await getTranslations("docs.assessments");
  const stages = t.raw("stages") as { status: string; description: string }[];
  const scoringLevels = t.raw("scoringLevels") as string[];
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

      {/* Assessment Templates */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("templatesTitle")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templateDefs.map((template) => (
            <div
              key={template.type}
              className="rounded-xl border border-border bg-card p-5 relative"
            >
              {template.premium && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  {t("premiumBadge")}
                </div>
              )}
              <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                {template.type}
              </span>
              <h3 className="font-semibold mb-2">{t(`templates.${template.tKey}.label`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`templates.${template.tKey}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Approval Workflow */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("workflowTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("workflowIntro")}
        </p>
        <div className="flex flex-wrap gap-3">
          {stages.map((stage, i) => (
            <div key={stage.status} className="flex items-center gap-2">
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wider text-primary block mb-1">
                  {t("stageLabel", { number: i + 1 })}
                </span>
                <span className="font-semibold text-sm">{stage.status}</span>
                <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
              </div>
              {i < stages.length - 1 && (
                <span className="text-muted-foreground hidden sm:inline">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Risk Scoring */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("scoringTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("scoringIntro")}
        </p>
        <div className="flex flex-wrap gap-3">
          {scoringLevels.map((level, i) => (
            <span
              key={level}
              className={`px-4 py-2 rounded-full text-sm font-medium border ${scoringColors[i]}`}
            >
              {level}
            </span>
          ))}
        </div>
      </section>

      {/* How to Create */}
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
