// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useLocale, useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";

// The storefront's pricing page, in the reader's language. Premium modules are
// sold for self-hosted installations only; the hosted service is a free pilot.
export const PRICING_URLS = {
  en: "https://www.todo.law/pricing",
  es: "https://www.todo.law/es/precios",
} as const;

export function pricingUrl(locale: string): string {
  return locale === "es" ? PRICING_URLS.es : PRICING_URLS.en;
}

/**
 * The one statement of how the premium modules are offered, used wherever the
 * docs describe them: the sidebar, the premium pages and the docs home.
 * `compact` is the sidebar form; `card` is the form used in page bodies.
 */
export function PremiumNotice({ variant = "card" }: { variant?: "card" | "compact" }) {
  const t = useTranslations("docs.premiumNotice");
  const locale = useLocale();

  const link = (
    <a
      href={pricingUrl(locale)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      {t("seePricing")}
      <ExternalLink className="w-3 h-3" aria-hidden="true" />
      <span className="sr-only">{t("newTab")}</span>
    </a>
  );

  if (variant === "compact") {
    return (
      <div className="px-3 pb-2 text-[11px] leading-snug text-muted-foreground" data-premium-notice="compact">
        <p>{t("hosted")}</p>
        <p>{t("selfHosted")}</p>
        <p className="mt-1">{link}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm" data-premium-notice="card">
      <p className="font-medium text-foreground">{t("title")}</p>
      <ul className="mt-1 space-y-1 text-muted-foreground list-disc pl-5">
        <li>{t("hosted")}</li>
        <li>{t("selfHosted")}</li>
      </ul>
      <p className="mt-2">{link}</p>
    </div>
  );
}
