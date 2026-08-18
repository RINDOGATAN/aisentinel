// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.aiRegistry");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AIRegistryDocsPage() {
  const t = await getTranslations("docs.aiRegistry");
  const lifecycle = t.raw("lifecycle") as string[];
  const recordGroups = t.raw("recordGroups") as { title: string; items: string[] }[];
  const modelCols = t.raw("modelCols") as { title: string; items: string[] }[];
  const euRoles = t.raw("euRoles") as { role: string; description: string }[];
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

      {/* System Status Lifecycle */}
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

      {/* AI System Fields */}
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

      {/* AI Models */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("modelsTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("modelsIntro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            {modelCols.map((col) => (
              <div key={col.title}>
                <h4 className="font-medium mb-2">{col.title}</h4>
                <ul className="space-y-1 text-muted-foreground">
                  {col.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EU AI Act Roles */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("euRolesTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("euRolesIntro")}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {euRoles.map((item) => (
            <div key={item.role} className="rounded-xl border border-border bg-card p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-primary">
                {item.role}
              </span>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Register */}
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
