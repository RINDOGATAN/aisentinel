// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.conformity");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ConformityAssessmentDocsPage() {
  const t = await getTranslations("docs.conformity");
  const whoItems = t.raw("whoItems") as { title: string; description: string }[];
  const coversItems = t.raw("coversItems") as { area: string; description: string }[];
  const howSteps = t.raw("howSteps") as { title: string; description: string }[];

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

      {/* What is a Conformity Assessment */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("whatTitle")}
        </h2>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t("whatP1")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t("whatP2")}
          </p>
        </div>
      </section>

      {/* Who needs it */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("whoTitle")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {whoItems.map((item) => (
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

      {/* What the template covers */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("coversTitle")}
        </h2>
        <div className="space-y-4">
          {coversItems.map((item) => (
            <div
              key={item.area}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold mb-1">{item.area}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works in AI SENTINEL */}
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
    </div>
  );
}
