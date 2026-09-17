// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { frameworksData, underReviewCount } from "@/lib/frameworks/model";

const MESSAGES = { en, es } as const;
type Locale = keyof typeof MESSAGES;
const current: { locale: Locale } = { locale: "en" };

// Server pages read translations through next-intl/server; answer from the
// same message files, in the locale under test.
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) =>
    createTranslator({ locale: current.locale, messages: MESSAGES[current.locale], namespace: namespace as never }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  usePathname: () => "/docs/frameworks",
  useSearchParams: () => new URLSearchParams(),
}));
// The docs home counts catalogue rows; no database here.
vi.mock("@/lib/prisma", () => ({
  default: {
    vendorCatalog: { count: async () => 865 },
    shadowAITool: { count: async () => 89 },
  },
}));

async function render(locale: Locale, page: () => ReactElement | Promise<ReactElement>) {
  current.locale = locale;
  const element = await page();
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="UTC">
      {element}
    </NextIntlClientProvider>,
  );
}

const pages = {
  overview: async () => (await import("./page")).default(),
  table: async () => (await import("./table/page")).default(),
  compare: async () =>
    (await import("./compare/page")).default({ searchParams: Promise.resolve({ f: "eu-ai-act,texas" }) }),
  selector: async () => (await import("./selector/page")).default(),
};

describe("frameworks docs pages", () => {
  for (const locale of ["en", "es"] as const) {
    const t = MESSAGES[locale].docs.frameworks;

    for (const [name, page] of Object.entries(pages)) {
      it(`${name} renders in ${locale} with the as-of date and the disclaimer`, async () => {
        const html = await render(locale, page);
        expect(html).toContain(t.disclaimer);
        expect(html).toContain(`dateTime="${frameworksData.asOf}"`);
        expect(html).toContain(locale === "es" ? "septiembre de 2026" : "September 16, 2026");
        // The Spanish pages say once that the framework content is in English.
        expect(html.split(MESSAGES.es.docs.frameworks.contentInEnglish).length - 1).toBe(locale === "es" ? 1 : 0);
        for (const view of Object.values(t.views).slice(0, 4)) expect(html).toContain(view);
      });
    }

    it(`the wheel in ${locale} has a named, focusable cell for every framework and dimension`, async () => {
      const html = await render(locale, pages.overview);
      const cells = html.match(/<path[^>]*role="button"[^>]*>/g) ?? [];
      expect(cells).toHaveLength(frameworksData.frameworks.length * frameworksData.rings.length);
      // Roving focus: exactly one cell is in the tab order, every other one can take focus.
      expect(cells.filter((c) => c.includes('tabindex="0"'))).toHaveLength(1);
      expect(cells.filter((c) => c.includes('tabindex="-1"'))).toHaveLength(cells.length - 1);
      const f = frameworksData.frameworks[0];
      const r = frameworksData.rings[0];
      const name = t.wheel.cell
        .replace("{framework}", f.short)
        .replace("{dimension}", r.label)
        .replace("{depth}", String(f.cells[r.id].depth));
      expect(html).toContain(`aria-label="${name}"`);
      expect(html.match(/data-hatch="true"/g) ?? []).toHaveLength(underReviewCount());
      expect(cells.filter((c) => c.includes('data-review="true"'))).toHaveLength(underReviewCount());
      // Numbered slice key for narrow screens.
      expect(html).toContain(`aria-label="${t.wheel.sliceKey}"`);
    });
  }

  it("never shows a summary for a cell under review", async () => {
    const html = await render("en", pages.table);
    for (const f of frameworksData.frameworks) {
      for (const c of Object.values(f.cells)) {
        if (c.source?.status === "to verify") expect(html).not.toContain(escape(c.summary));
      }
    }
    expect(html).toContain("Under review");
  });

  it("compare preselects the frameworks named in the address", async () => {
    const html = await render("en", pages.compare);
    const head = html.slice(html.indexOf("<thead"), html.indexOf("</thead>"));
    expect(head).toContain("EU AI Act (Regulation (EU) 2024/1689)");
    expect(head).toContain("Texas Responsible Artificial Intelligence Governance Act");
    expect(html).toContain('href="/docs/cross-border"');
  });

  it("the selector asks for a jurisdiction first and lists its rules", async () => {
    const html = await render("es", pages.selector);
    expect(html).toContain(MESSAGES.es.docs.frameworks.selector.needJurisdiction);
    expect(html).toContain(MESSAGES.es.docs.frameworks.selector.whyTitle);
    expect(html).toContain("Jurisdicciones");
  });
});

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

describe("refreshed docs pages", () => {
  const PRICING = { en: "https://www.todo.law/pricing", es: "https://www.todo.law/es/precios" };

  for (const locale of ["en", "es"] as const) {
    const n = MESSAGES[locale].docs.premiumNotice;

    for (const [name, load] of Object.entries({
      home: async () => (await import("../page")).default(),
      shadowAi: async () => (await import("../shadow-ai/page")).default(),
      vendorCatalog: async () => (await import("../vendor-catalog/page")).default(),
      conformity: async () => (await import("../conformity-assessment/page")).default(),
      biasFairness: async () => (await import("../bias-fairness/page")).default(),
      whatsNew: async () => (await import("../whats-new/page")).default(),
    })) {
      it(`${name} carries the premium notice in ${locale}`, async () => {
        const html = await render(locale, load);
        expect(html).toContain(n.hosted);
        expect(html).toContain(n.selfHosted);
        expect(html).toContain(`href="${PRICING[locale]}" target="_blank" rel="noopener noreferrer"`);
        expect(html).not.toMatch(/Stripe|subscription|suscripción|\/mo\b|9 a month/i);
      });
    }

    it(`compliance lists all eight frameworks and the counted figures in ${locale}`, async () => {
      const html = await render(locale, async () => (await import("../compliance/page")).default());
      const fw = MESSAGES[locale].docs.compliance.frameworks;
      for (const k of Object.keys(fw) as (keyof typeof fw)[]) expect(html).toContain(fw[k].name);
      expect(html).toContain(" 115 ");
      expect(html).toContain(" 130 ");
      expect(html).not.toContain(" 41 ");
      for (const v of ["34", "64", "17"]) expect(html).toContain(`>${v}</p>`);
    });

    it(`roles no longer mention billing in ${locale}`, async () => {
      const html = await render(locale, async () => (await import("../roles/page")).default());
      expect(html).not.toMatch(/billing|facturaci/i);
      expect(html).toContain(MESSAGES[locale].docs.roles.matrix.deleteOrganization);
    });
  }
});

describe("wide tables scroll inside their own box", () => {
  for (const name of ["table", "compare"] as const) {
    it(`the ${name} page keeps min-w-0 from the page wrapper to the scroll box`, async () => {
      const html = await render("en", pages[name]);
      expect(html.startsWith('<div class="space-y-8 min-w-0">')).toBe(true);
      const box = html.match(/<div class="([^"]*)"><table[^>]*data-testid="frameworks-/)?.[1] ?? "";
      for (const c of ["overflow-auto", "min-w-0", "max-w-full"]) expect(box.split(" ")).toContain(c);
    });
  }
});
