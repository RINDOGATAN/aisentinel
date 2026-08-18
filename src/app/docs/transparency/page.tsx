// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.transparency");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TransparencyDocsPage() {
  const t = await getTranslations("docs.transparency");
  const obligations = t.raw("obligations") as {
    article: string;
    actorLabel: string;
    title: string;
    description: string;
  }[];
  const statuses = t.raw("statuses") as { name: string; description: string }[];
  const workingSteps = t.raw("workingSteps") as { step: string; body: string }[];

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

      {/* Applicability */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("applicabilityTitle")}</h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t.rich("applicabilityBody1", {
              strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              em: (chunks) => <em>{chunks}</em>,
            })}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("applicabilityBody2")}
          </p>
        </div>
      </section>

      {/* The four obligations */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("obligationsTitle")}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t("obligationsIntro")}
        </p>
        <div className="space-y-4">
          {obligations.map((o) => (
            <div key={o.article} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {o.article}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                  {o.actorLabel}
                </span>
                <h3 className="font-semibold">{o.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {o.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Statuses */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("statusesTitle")}</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {statuses.map((s) => (
            <div key={s.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-2 text-primary">{s.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How to use it */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("workingTitle")}</h2>
        <ol className="space-y-4">
          {workingSteps.map((s, i) => (
            <li key={s.step} className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold mb-1">{s.step}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Caveat */}
      <section>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">{t("scopeTitle")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("scopeBody")}
          </p>
        </div>
      </section>
    </div>
  );
}
