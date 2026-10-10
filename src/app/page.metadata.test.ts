// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The landing's title and description follow the language it shows: `?lang=` first, then
 * the `locale` cookie (last value wins). English keeps the layout's metadata unchanged;
 * Spanish returns its own title, description, Open Graph and Twitter copy. The landing
 * also sets document.title when the visitor toggles the language.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

let cookieHeader: string | null = null;

vi.mock("next/headers", () => ({
  headers: async () => new Headers(cookieHeader ? { cookie: cookieHeader } : {}),
}));
vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

const { generateMetadata } = await import("./page");
const { SEO } = await import("@/config/seo");

const meta = (search: Record<string, string | string[]> = {}) => generateMetadata({ searchParams: Promise.resolve(search) });

beforeEach(() => {
  cookieHeader = null;
});

describe("landing metadata", () => {
  it("leaves the English metadata to the layout, unchanged", async () => {
    expect(await meta()).toEqual({});
    cookieHeader = "locale=en";
    expect(await meta()).toEqual({});
    expect(await meta({ lang: "en" })).toEqual({});
    const layout = readFileSync(path.join(__dirname, "layout.tsx"), "utf8");
    expect(layout).toContain("const seoTitle = SEO.en.title;");
    expect(SEO.en.title).toBe("AI SENTINEL: AI governance software for the EU AI Act, NIST AI RMF, ISO 42001, AIUC-1 and five more frameworks");
    expect(SEO.en.description).toMatch(/^Open-source AI governance platform\. .* a complete program in minutes\.$/);
  });

  it("returns Spanish for the cookie, and for ?lang=es", async () => {
    cookieHeader = "locale=es";
    const fromCookie = await meta();
    expect(fromCookie.title).toBe(SEO.es.title);
    expect(fromCookie.description).toBe(SEO.es.description);
    expect(fromCookie.openGraph).toMatchObject({ title: SEO.es.title, description: SEO.es.description, locale: "es_ES" });
    expect(fromCookie.twitter).toMatchObject({ title: SEO.es.title, description: SEO.es.description });

    cookieHeader = null;
    expect((await meta({ lang: "es" })).title).toBe(SEO.es.title);
  });

  it("lets ?lang= win over the cookie, and the last cookie value win over an earlier one", async () => {
    cookieHeader = "locale=es";
    expect(await meta({ lang: "en" })).toEqual({});
    cookieHeader = "locale=en";
    expect((await meta({ lang: "es" })).title).toBe(SEO.es.title);
    cookieHeader = "locale=en; locale=es";
    expect((await meta()).title).toBe(SEO.es.title);
    cookieHeader = "locale=es; locale=en";
    expect(await meta()).toEqual({});
  });

  it("writes the Spanish title and description in plain, true Castilian", () => {
    expect(SEO.es.title).toBe(
      "AI SENTINEL: software de gobernanza de la IA para el Reglamento de IA, NIST AI RMF, ISO 42001, AIUC-1 y cinco marcos más"
    );
    for (const s of [SEO.es.title, SEO.es.description]) {
      expect(s).not.toMatch(/[–—]|ejecut(?!iv)|\busted\b|vosotr|código abierto|hardware|\bkit\b|[$€]/i);
    }
    // Nine frameworks, the same nine as the English description.
    for (const name of ["Reglamento de IA", "RGPD", "NIST AI RMF", "ISO/IEC 42001", "AIUC-1", "California", "Colorado", "Texas", "Washington"]) {
      expect(SEO.es.description).toContain(name);
    }
    expect(SEO.es.description).toContain("nueve marcos");
  });

  it("updates the tab title when the landing's language changes", () => {
    const landing = readFileSync(path.join(__dirname, "../landing/LandingPage.tsx"), "utf8");
    expect(landing).toMatch(/document\.title = SEO\[locale\]\.title;/);
  });
});
