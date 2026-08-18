// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.oversight");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const decisionStyles = [
  { key: "approve", badge: "bg-green-500/10 text-green-400" },
  { key: "reject", badge: "bg-red-500/10 text-red-400" },
  { key: "defer", badge: "bg-yellow-500/10 text-yellow-400" },
] as const;

export default async function OversightDocsPage() {
  const t = await getTranslations("docs.oversight");
  const gateTypes = t.raw("gateTypes") as { type: string; description: string }[];
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

      {/* Gate Types */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("gateTypesTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("gateTypesIntro")}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {gateTypes.map((gate) => (
            <div key={gate.type} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-2 text-primary">{gate.type}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {gate.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Decision Logging */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("decisionTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("decisionIntro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            {decisionStyles.map((d) => (
              <div key={d.key}>
                <span className={`inline-block px-2.5 py-1 rounded-full ${d.badge} text-xs font-medium mb-2`}>
                  {t(`decisions.${d.key}.label`)}
                </span>
                <p className="text-muted-foreground">
                  {t(`decisions.${d.key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Set Up */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">
          {t("setupTitle")}
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
