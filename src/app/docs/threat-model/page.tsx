// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Threat modelling, explained for the person who will actually run it.
 *
 * Written to be read in five minutes and used the same afternoon: the loop,
 * the five capability questions, what comes back, and what "tested" has to
 * mean before it counts as evidence.
 */

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Crosshair, ListChecks, ShieldCheck, Scale, Timer } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("docs.threatModel");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const LOOP_ICONS = [Crosshair, ListChecks, Scale, ShieldCheck, Timer];

export default async function ThreatModelDocsPage() {
  const t = await getTranslations("docs.threatModel");
  const loop = t.raw("loop") as { step: string; body: string }[];
  const questions = t.raw("questions") as { name: string; body: string }[];
  const layers = t.raw("layers") as { name: string; body: string }[];
  const states = t.raw("states") as { name: string; body: string }[];
  const examples = t.raw("examples") as { name: string; body: string }[];

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">{t("title")}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">{t("intro")}</p>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mt-4">
          {t("intro2")}
        </p>
      </section>

      {/* The loop, as five numbered cards */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("loopTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {loop.map((item, i) => {
            const Icon = LOOP_ICONS[i] ?? Crosshair;
            return (
              <div key={item.step} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-display text-primary/40">{i + 1}</span>
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{item.step}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* What you are asked */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-3">{t("mapTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-6">
          {t("mapIntro")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {questions.map((q) => (
            <div key={q.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1">{q.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{q.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What comes back */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-3">{t("backTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-6">
          {t("backIntro")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {examples.map((e) => (
            <div key={e.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1">{e.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{e.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The five layers */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-3">{t("layersTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-6">
          {t("layersIntro")}
        </p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {layers.map((layer) => (
            <div key={layer.name} className="p-4 flex flex-col sm:flex-row gap-2 sm:gap-6">
              <span className="text-sm font-semibold text-primary w-28 shrink-0">
                {layer.name}
              </span>
              <span className="text-sm text-muted-foreground leading-relaxed">{layer.body}</span>
            </div>
          ))}
        </div>
      </section>

      {/* What "tested" means */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-3">{t("testedTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-6">
          {t("testedIntro")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {states.map((s) => (
            <div key={s.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-1">{s.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The join with compliance */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-3">{t("registerTitle")}</h2>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-3 max-w-3xl">
          <p className="text-sm leading-relaxed">{t("registerBody1")}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("registerBody2")}</p>
        </div>
      </section>

      {/* Start */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("startTitle")}</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/governance/threat-model/new"
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium"
          >
            {t("startCta")}
          </Link>
          <Link
            href="/governance/quickstart"
            className="rounded-lg border border-border px-4 py-2.5 text-sm"
          >
            {t("startWizard")}
          </Link>
          <Link href="/docs/how-it-fits" className="rounded-lg border border-border px-4 py-2.5 text-sm">
            {t("startFits")}
          </Link>
        </div>
      </section>
    </div>
  );
}
