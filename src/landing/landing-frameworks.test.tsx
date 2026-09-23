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

  it("renders that list on the page", async () => {
    const { default: LandingPage } = await import("./LandingPage");
    const html = renderToStaticMarkup(<LandingPage />);
    for (const k of KEYS) expect(html).toContain(en[k].replace(/&/g, "&amp;"));
  });
});
