// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { frameworksData, underReviewCount } from "@/lib/frameworks/model";
import { DepthLegend } from "./depth";

export type FrameworksView = "overview" | "table" | "compare" | "selector";

export const FRAMEWORKS_VIEWS: { view: FrameworksView; href: string }[] = [
  { view: "overview", href: "/docs/frameworks" },
  { view: "table", href: "/docs/frameworks/table" },
  { view: "compare", href: "/docs/frameworks/compare" },
  { view: "selector", href: "/docs/frameworks/selector" },
];

/** Title, the as-of date and the disclaimer, then links between the four views. */
export function FrameworksHeader({ active, showMethod = false }: { active: FrameworksView; showMethod?: boolean }) {
  const t = useTranslations("docs.frameworks");
  const format = useFormatter();
  const locale = useLocale();
  const data = frameworksData;
  const asOf = format.dateTime(new Date(`${data.asOf}T12:00:00Z`), { dateStyle: "long", timeZone: "UTC" });

  return (
    <section className="space-y-4">
      <h1 className="text-3xl sm:text-4xl font-display tracking-tight">
        {active === "overview" ? t("title") : `${t("title")}: ${t(`views.${active}`)}`}
      </h1>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-primary">
          <time dateTime={data.asOf}>{t("asOf", { date: asOf })}</time>
        </span>
        <strong className="font-semibold">{t("disclaimer")}</strong>
      </p>
      {locale === "es" && (
        <p className="text-sm text-muted-foreground" data-content-language-note>
          {t("contentInEnglish")}
        </p>
      )}
      {showMethod && (
        <>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">{t("intro")}</p>
          <p className="text-sm text-muted-foreground max-w-3xl">
            {t("stats", {
              frameworks: data.frameworks.length,
              rings: data.rings.length,
              cells: data.frameworks.length * data.rings.length,
              review: underReviewCount(data),
            })}{" "}
            {t("method")}
          </p>
        </>
      )}
      <nav aria-label={t("views.label")} className="flex flex-wrap gap-1 border-b border-border">
        {FRAMEWORKS_VIEWS.map(({ view, href }) => {
          const current = view === active;
          return (
            <Link
              key={view}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`-mb-px rounded-t-md border px-3 py-2 text-sm transition-colors ${
                current
                  ? "border-border border-b-background bg-background font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`views.${view}`)}
            </Link>
          );
        })}
      </nav>
      <DepthLegend />
    </section>
  );
}

export function FrameworksFooter() {
  const t = useTranslations("docs.frameworks");
  return (
    <p className="border-t border-border pt-4 text-xs text-muted-foreground">
      <strong className="text-foreground">{t("disclaimer")}</strong> {t("footerNote")}
    </p>
  );
}
