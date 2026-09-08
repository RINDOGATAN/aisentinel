// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Globe2, Layers, FileText, Bot, AlertTriangle } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("docs.crossBorder");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function CrossBorderDocsPage() {
  const t = await getTranslations("docs.crossBorder");
  const tw = await getTranslations("docs.whatsNew");
  const whatsNewLabel = tw("title");
  const regimes = t.raw("regimes") as { name: string; detail: string; count: string }[];
  const scopeStates = t.raw("scopeStates") as { name: string; description: string }[];
  const artifacts = t.raw("artifacts") as { name: string; description: string }[];
  const agenticExamples = t.raw("agenticExamples") as { name: string; description: string }[];
  const startSteps = t.raw("startSteps") as { step: string; body: string }[];

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">{t("title")}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">{t("intro")}</p>
      </section>

      {/* Architecture */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6 flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          {t("architectureTitle")}
        </h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {(["architectureBody1", "architectureBody2", "architectureBody3"] as const).map((key) => (
            <p key={key} className="text-sm text-muted-foreground leading-relaxed">
              {t.rich(key, {
                strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })}
            </p>
          ))}
        </div>
      </section>

      {/* The regimes */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6 flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-primary" />
          {t("regimesTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {regimes.map((regime) => (
            <div key={regime.name} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h3 className="font-semibold">{regime.name}</h3>
                <span className="text-xs text-primary shrink-0">{regime.count}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{regime.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Scope */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("scopeTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-5">{t("scopeBody")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {scopeStates.map((state) => (
            <div key={state.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1.5">{state.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{state.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reuse */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("reuseTitle")}</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{t("reuseBody")}</p>
        </div>
      </section>

      {/* Artifacts */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {t("artifactsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-5">{t("artifactsBody")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {artifacts.map((artifact) => (
            <div key={artifact.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1.5">{artifact.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{artifact.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gaps */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          {t("gapsTitle")}
        </h2>
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{t("gapsBody")}</p>
        </div>
      </section>

      {/* Agentic */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6 flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          {t("agenticTitle")}
        </h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 mb-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{t("agenticBody1")}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("agenticBody2")}</p>
        </div>
        <div className="space-y-3">
          {agenticExamples.map((example) => (
            <div key={example.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1.5">{example.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{example.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Getting started */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("startTitle")}</h2>
        <div className="space-y-3">
          {startSteps.map((step, i) => (
            <div key={step.step} className="rounded-xl border border-border bg-card p-5 flex gap-4">
              <div className="text-2xl font-display text-primary/40 shrink-0">{i + 1}</div>
              <div>
                <h3 className="font-semibold mb-1">{step.step}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-6 space-y-3">
        <p className="text-sm text-muted-foreground">{t("reviewNote")}</p>
        <Link href="/docs/whats-new" className="text-sm text-primary hover:underline">
          {whatsNewLabel}
        </Link>
      </section>
    </div>
  );
}
