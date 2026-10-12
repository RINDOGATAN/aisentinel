"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, ShieldAlert, Eye, AlertOctagon } from "lucide-react";
import StartupProductPage from "./components/StartupProductPage";
import StartupsHeader from "./components/StartupsHeader";
import StartupsFooter from "./components/StartupsFooter";
import LandingSections from "./components/LandingSections";
import en from "./i18n/en/ai-sentinel-startups.json";
import es from "./i18n/es/ai-sentinel-startups.json";
import authEn from "./i18n/en/startups-auth.json";
import authEs from "./i18n/es/startups-auth.json";
import { localeCookieValues, normalizeLocaleCookie, writeLocaleCookie } from "@/lib/locale-cookie";
import { SEO } from "@/config/seo";
import type { Currency } from "@/lib/currency";

/**
 * The language in the browser, by the server's rule (src/lib/landing-locale.ts):
 * `?lang=`, then the cookie when there is one, otherwise the language the server
 * rendered in (it read Accept-Language), so a first visit never switches.
 */
function detectLocale(rendered: "en" | "es"): "en" | "es" {
  if (typeof window === "undefined") return rendered;
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  // Collapse duplicate cookies first; a ?lang= link shows that language
  // without recording it, since only the toggle is a visitor's choice.
  const fromCookie = normalizeLocaleCookie();
  if (lang === "es" || lang === "en") return lang;
  return localeCookieValues(document.cookie).length > 0 ? fromCookie : rendered;
}

/**
 * `currency` is the visitor's, decided on the server from the geo header
 * (src/lib/currency.ts); the pricing block shows euros on the Spanish page whatever it is.
 */
export default function LandingPage({
  initialLocale = "en",
  currency = "USD",
}: {
  initialLocale?: "en" | "es";
  currency?: Currency;
}) {
  // The server decided the language (src/app/page.tsx), so the first paint is already in it.
  const [locale, setLocale] = useState<"en" | "es">(initialLocale);

  useEffect(() => {
    // Normally the same as the server's; differs only if the page came from a cache.
    const detected = detectLocale(initialLocale);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (detected !== initialLocale) setLocale(detected);
  }, [initialLocale]);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => {
      const next = prev === "en" ? "es" : "en";
      writeLocaleCookie(next);
      return next;
    });
  }, []);

  // `?lang=` and the toggle can differ from the language the server rendered
  // with; <html lang> and the tab title follow the text shown (the server
  // already picks the title from `?lang=` and the cookie, src/app/page.tsx).
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = SEO[locale].title;
  }, [locale]);

  const dict = locale === "es" ? es : en;
  const authDict = locale === "es" ? authEs : authEn;
  const t = (key: string) => (dict as Record<string, string>)[key] ?? key;
  const tAuth = (key: string) => (authDict as Record<string, string>)[key] ?? key;

  const features = [
    {
      id: "registry",
      icon: ClipboardList,
      title: t("feat.registry.title"),
      headline: t("feat.registry.headline"),
      description: t("feat.registry.desc"),
      highlights: [t("feat.registry.h1"), t("feat.registry.h2"), t("feat.registry.h3"), t("feat.registry.h4")],
    },
    {
      id: "risk",
      icon: ShieldAlert,
      title: t("feat.risk.title"),
      headline: t("feat.risk.headline"),
      description: t("feat.risk.desc"),
      highlights: [t("feat.risk.h1"), t("feat.risk.h2"), t("feat.risk.h3"), t("feat.risk.h4")],
    },
    {
      id: "oversight",
      icon: Eye,
      title: t("feat.oversight.title"),
      headline: t("feat.oversight.headline"),
      description: t("feat.oversight.desc"),
      highlights: [t("feat.oversight.h1"), t("feat.oversight.h2"), t("feat.oversight.h3"), t("feat.oversight.h4")],
    },
    {
      id: "incidents",
      icon: AlertOctagon,
      title: t("feat.incidents.title"),
      headline: t("feat.incidents.headline"),
      description: t("feat.incidents.desc"),
      highlights: [t("feat.incidents.h1"), t("feat.incidents.h2"), t("feat.incidents.h3"), t("feat.incidents.h4")],
    },
  ];

  const workflowSteps = [1, 2, 3, 4, 5].map((n) => ({
    title: t(`workflow.s${n}.title`),
    desc: t(`workflow.s${n}.desc`),
  }));

  const valueProps = [1, 2, 3, 4].map((n) => ({
    title: t(`value.v${n}.title`),
    desc: t(`value.v${n}.desc`),
  }));

  const socialProofs = [t("social.s1"), t("social.s2"), t("social.s3"), t("social.s4")];

  return (
    <>
      <StartupsHeader
        t={t}
        locale={locale}
        onLocaleToggle={toggleLocale}
        onSignup={() => window.location.href = "/sign-in"}
      />
      <StartupProductPage
        t={t}
        tAuth={tAuth}
        features={features}
        workflowSteps={workflowSteps}
        valueProps={valueProps}
        socialProofs={socialProofs}
        heroVideo="/hero-sentinel-bg-720.mp4"
        heroPoster="/hero-sentinel-poster.jpg"
        callbackUrl="/governance"
        middle={<LandingSections t={t} locale={locale} currency={currency} />}
        plain
        docsLocale={locale}
      />
      <StartupsFooter t={t} locale={locale} />
    </>
  );
}
