// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sparkles, ArrowRight } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("docs.whatsNew");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

interface ReleaseItem {
  title: string;
  body: string;
}

interface Release {
  version: string;
  date: string;
  headline: string;
  summary: string;
  items: ReleaseItem[];
}

export default async function WhatsNewPage() {
  const t = await getTranslations("docs.whatsNew");
  const releases = t.raw("releases") as Release[];

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4 flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-primary" />
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">{t("intro")}</p>
      </section>

      {/* Releases, newest first */}
      {releases.map((release, index) => (
        <section key={release.version}>
          <div className="flex flex-wrap items-baseline gap-3 mb-2">
            <h2 className="text-2xl font-display tracking-tight">{release.headline}</h2>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
              {release.version}
            </span>
            <span className="text-xs text-muted-foreground">{release.date}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-6">
            {release.summary}
          </p>
          <div className="space-y-3">
            {release.items.map((item) => (
              <div
                key={item.title}
                className={[
                  "rounded-xl border bg-card p-5",
                  index === 0 ? "border-border" : "border-border/60",
                ].join(" ")}
              >
                <h3 className="font-semibold mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Pending legal review — stated plainly, never in a footnote. */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">{t("pendingTitle")}</h2>
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{t("pendingBody")}</p>
        </div>
      </section>

      {/* Where to see it */}
      <section>
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-6">
          <h2 className="text-xl font-display tracking-tight mb-2">{t("ctaTitle")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t("ctaBody")}</p>
          <Link
            href="/docs/cross-border"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            {t("ctaLink")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
