// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import en from "./i18n/en/ai-sentinel-startups.json";
import es from "./i18n/es/ai-sentinel-startups.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// The landing page lists the frameworks twice: in the hero and in the
// "one matrix" value card. Both name AIUC-1, in both languages.
const KEYS = ["hero.subtitle", "value.v4.title", "value.v4.desc"] as const;

describe("landing page frameworks list", () => {
  it("names AIUC-1, the certification standard for AI agents, in both languages", () => {
    expect(en["hero.subtitle"]).toContain("nine frameworks");
    expect(en["hero.subtitle"]).toContain("AIUC-1 (the certification standard for AI agents)");
    expect(en["value.v4.desc"]).toContain("AIUC-1");
    expect(es["hero.subtitle"]).toContain("nueve marcos");
    expect(es["hero.subtitle"]).toContain("AIUC-1 (la norma de certificación para agentes de IA)");
    expect(es["value.v4.desc"]).toContain("AIUC-1, la norma de certificación para agentes de IA");
    for (const dict of [en, es]) {
      const text = KEYS.map((k) => dict[k]).join(" ");
      expect(text).not.toMatch(/[–—]/);
      expect(text).not.toMatch(/\b(eight|ocho)\b/i);
    }
  });

  // Since the October 2026 hero trim the hero's left column carries the
  // welcome line, and the sign-up card the subtitle's first sentence; the
  // full list stays in the "one matrix" card.
  it("renders the list in the value card and the summary in the sign-up card", async () => {
    const { default: LandingPage } = await import("./LandingPage");
    const html = renderToStaticMarkup(<LandingPage />);
    for (const k of ["value.v4.title", "value.v4.desc"] as const) {
      expect(html).toContain(en[k].replace(/&/g, "&amp;"));
    }
    // The sign-up card carries its own line (hero.card, both languages since 10 Oct 2026).
    expect(html).toContain(en["hero.card"]);
    expect(html).toContain(en["hero.subtitle"].split(":")[0]);
  });
});

// A Spanish browser saw English for a moment before the switch (owner, 10 Oct 2026):
// the server now renders in the language it decided, so the first HTML is already Spanish.
describe("the first render", () => {
  it("is in Spanish when the server decided Spanish, and in English otherwise", async () => {
    const { default: LandingPage } = await import("./LandingPage");
    const esHtml = renderToStaticMarkup(<LandingPage initialLocale="es" />);
    expect(esHtml).toContain(es["hero.cta"]);
    expect(esHtml).toContain(es["hero.subtitle"].split(":")[0]);
    expect(esHtml).not.toContain(en["hero.subtitle"].split(":")[0]);
    const enHtml = renderToStaticMarkup(<LandingPage />);
    expect(enHtml).toContain(en["hero.subtitle"].split(":")[0]);
  });
});
