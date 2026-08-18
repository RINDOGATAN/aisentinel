// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("docs.policies");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const versionEntries = [
  { version: "v3.0", date: "2026-02-20", author: "Maria G." },
  { version: "v2.0", date: "2026-01-15", author: "Jan K." },
  { version: "v1.0", date: "2025-12-01", author: "Maria G." },
] as const;

export default async function PoliciesDocsPage() {
  const t = await getTranslations("docs.policies");
  const types = t.raw("types") as { type: string; description: string }[];
  const workflowFlow = t.raw("workflowFlow") as string[];
  const versionNotes = t.raw("versionNotes") as string[];
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

      {/* Policy Types */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("typesTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("typesIntro")}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {types.map((policy) => (
            <div key={policy.type} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-sm mb-1">{policy.type}</h3>
              <p className="text-xs text-muted-foreground">{policy.description}</p>
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
          {workflowFlow.map((status, i) => (
            <div key={status} className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {status}
              </span>
              {i < workflowFlow.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Version History */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("versionsTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("versionsIntro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-sm">
          {versionEntries.map((entry, i) => (
            <div key={entry.version} className="flex items-start gap-4">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium font-mono shrink-0">
                {entry.version}
              </span>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-0.5">
                  <span>{entry.date}</span>
                  <span>·</span>
                  <span>{entry.author}</span>
                </div>
                <p className="text-muted-foreground">{versionNotes[i]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* System Linking */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("linkingTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("linkingIntro")}
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">{t("linkingFromPolicyTitle")}</h4>
              <p className="text-muted-foreground">
                {t("linkingFromPolicyBody")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t("linkingFromSystemTitle")}</h4>
              <p className="text-muted-foreground">
                {t("linkingFromSystemBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Create */}
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
