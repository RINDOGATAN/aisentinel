"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, ShieldAlert, Eye, AlertOctagon } from "lucide-react";
import StartupProductPage from "./components/StartupProductPage";
import StartupsHeader from "./components/StartupsHeader";
import StartupsFooter from "./components/StartupsFooter";
import en from "./i18n/en/ai-sentinel-startups.json";
import es from "./i18n/es/ai-sentinel-startups.json";
import authEn from "./i18n/en/startups-auth.json";
import authEs from "./i18n/es/startups-auth.json";

function detectLocale(): "en" | "es" {
  if (typeof window === "undefined") return "en";
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  if (lang === "es" || lang === "en") return lang;
  const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
  if (match?.[1] === "es") return "es";
  return "en";
}

function setLocaleCookie(locale: string) {
  const maxAge = 365 * 24 * 60 * 60;
  const domain = window.location.hostname.endsWith(".todo.law") ? ";domain=.todo.law" : "";
  document.cookie = `locale=${locale};path=/;max-age=${maxAge};SameSite=Lax${domain}`;
}

export default function LandingPage() {
  const [locale, setLocale] = useState<"en" | "es">("en");

  useEffect(() => {
    // SSR-safe mount-only locale detection (URL/cookie are browser-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocale(detectLocale());
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => {
      const next = prev === "en" ? "es" : "en";
      setLocaleCookie(next);
      return next;
    });
  }, []);

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

  const socialProofs = [t("social.s1"), t("social.s2"), t("social.s3")];

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
        heroVideo="/hero-sentinel-bg.mp4"
        callbackUrl="/governance"
      />
      <StartupsFooter t={t} />
    </>
  );
}
