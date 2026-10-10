// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The safeguards guide on the landing's hosting section ("You choose where it lives" /
 * "Tú eliges dónde se aloja"), ported from the storefront's Run page:
 *
 *   - after the ways boxes, closed by default, opening in place (no dialog, no route);
 *   - six questions of real, labelled radio buttons; the result announced in one polite
 *     status; a quiet phone bar that does not announce; the matching box marked;
 *   - Spanish: three ways, and no kit, hardware, Box, Docker, "ejecut" or price anywhere,
 *     whatever is answered; English: all five ways.
 *
 * The test environment has no DOM, so each case renders the section at a given moment
 * (`initialGuide`) with renderToStaticMarkup; the browser check covers the clicks.
 */

import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LandingSections from "./components/LandingSections";
import { COPY, QUESTIONS, optionsFor, type Answers, type Locale } from "./config/safeguards";
import en from "./i18n/en/ai-sentinel-startups.json";
import es from "./i18n/es/ai-sentinel-startups.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const DICT: Record<Locale, Record<string, string>> = { en, es };

function render(locale: Locale, guide?: { open: boolean; answers: Answers }) {
  const t = (k: string) => DICT[locale][k] ?? k;
  return renderToStaticMarkup(createElement(LandingSections, { t, locale, videos: [], initialGuide: guide }));
}

/** The guide's own markup. */
const guideOf = (html: string) => html.slice(html.indexOf('data-testid="safeguards-guide"'));
/** The ways boxes, in order, and which ones carry the guide's mark. */
const boxes = (html: string) => html.match(/<article class="[^"]*paper-card[^"]*" id="[a-z]{2}-way-\d"/g) ?? [];
const marked = (html: string) => boxes(html).filter((b) => b.includes("!border-accent")).map((b) => b.match(/way-(\d)/)![1]);
const radios = (html: string) => (html.match(/<input type="radio"/g) ?? []).length;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

/** Every single answer a visitor in this market can give, one at a time, plus a few combinations. */
function everyAnswer(locale: Locale): Answers[] {
  const one = QUESTIONS.flatMap((q) => optionsFor(q, locale).map((o) => ({ [q.id]: o.value }) as Answers));
  const all = Object.fromEntries(QUESTIONS.map((q) => [q.id, optionsFor(q, locale).at(-1)!.value])) as Answers;
  return [...one, all, { loc: "servers", it: "no", data: "real" }, { ai: "local", it: "no" }, { loc: "office", it: "no" }];
}

describe.each(["es", "en"] as Locale[])("safeguards guide (%s)", (locale) => {
  const c = COPY[locale];

  it("sits after the ways boxes, closed, with a toggle that controls the panel", () => {
    const html = render(locale);
    const g = guideOf(html);
    expect(html.indexOf(DICT[locale][`${locale}.ways.heading.accent`])).toBeLessThan(html.indexOf('data-testid="safeguards-guide"'));
    expect(html.lastIndexOf("<article")).toBeLessThan(html.indexOf('data-testid="safeguards-guide"'));
    expect(g).toContain(c.heading);
    expect(g).toContain(c.lead);
    expect(g).toMatch(new RegExp(`<button type="button"[^>]*aria-expanded="false"[^>]*aria-controls="[^"]+"[^>]*>${c.open}<`));
    expect(radios(g)).toBe(0);
    expect(g).not.toContain('role="status"');
    expect(html).not.toMatch(/role="dialog"|aria-modal/);
    expect(marked(html)).toEqual([]);
  });

  it("opens in place: six labelled questions, an empty status, no bar yet", () => {
    const html = render(locale, { open: true, answers: {} });
    const g = guideOf(html);
    expect(g).toMatch(new RegExp(`aria-expanded="true"[^>]*aria-controls="([^"]+)"[\\s\\S]*id="\\1"`));
    expect(g).toContain(`aria-label="${c.formLegend}"`);
    expect(g.match(/<fieldset/g)).toHaveLength(6);
    expect(g.match(/<legend/g)).toHaveLength(6);
    expect(radios(g)).toBe(QUESTIONS.reduce((n, q) => n + optionsFor(q, locale).length, 0));
    // Every radio has a label pointing at it.
    for (const id of g.match(/<input type="radio" id="([^"]+)"/g)!.map((s) => s.match(/id="([^"]+)"/)![1])) {
      expect(g).toContain(`for="${id}"`);
    }
    // Question 6 keeps ISO 27001 as the example, with its hint tied to the group.
    expect(text(g)).toContain(c.questions.cert.label);
    expect(g).toMatch(/<fieldset[^>]*aria-describedby="[^"]+-cert-hint"/);
    expect(g.match(/role="status"/g)).toHaveLength(1);
    expect(g).toMatch(/role="status" aria-live="polite" aria-atomic="true"/);
    expect(text(g)).toContain(c.empty);
    expect(g).not.toContain('data-testid="safeguards-bar"');
    expect(text(g)).toContain(c.whyP);
    expect(g).not.toMatch(/classifier|clasificador/i);
  });

  it("announces the result, marks the matching box, and keeps a quiet phone bar", () => {
    const html = render(locale, { open: true, answers: { data: "special" } });
    const g = guideOf(html);
    const managed = locale === "es" ? "2" : "4";
    const name = DICT[locale][`${locale}.ways.w${managed}.title`];
    const status = g.match(/<div role="status"[\s\S]*?<\/div>/)![0];
    expect(text(status)).toContain(name);
    expect(marked(html)).toEqual([managed]);
    expect(text(g)).toContain(c.summaries.managed!);
    // The bar: phones and tablets only, sticky, not live, linking to the result card.
    const bar = g.match(/<div data-testid="safeguards-bar"[^>]*>[\s\S]*?<\/a><\/div>/)![0];
    expect(bar).toMatch(/class="[^"]*\blg:hidden\b[^"]*\bsticky\b/);
    expect(bar).not.toMatch(/aria-live|role="status"/);
    expect(text(bar)).toContain(name);
    const target = bar.match(/href="#([^"]+)"/)![1];
    expect(g).toMatch(new RegExp(`id="${target}" tabindex="-1"[^>]*>\\s*<div role="status"`));
    // The result links to the box it marks.
    expect(g).toContain(`href="#${locale}-way-${managed}"`);
  });

  it("states no prices and no long dashes, whatever is answered", () => {
    for (const answers of everyAnswer(locale)) {
      const g = text(guideOf(render(locale, { open: true, answers })));
      expect(g).not.toMatch(/[$€]|[–—]/);
      expect(g).not.toMatch(/\bEU[- ]hosted|hosted in (the )?(EU|Europe)|alojad[oa]s? en (la )?(UE|Unión Europea|Europa)/i);
    }
  });
});

describe("safeguards guide, Spanish only", () => {
  const bad = /\bkit\b|hardware|\bBox\b|Docker|Instalador local|ejecut|\$/i;

  it("shows three ways, and no kit, hardware, 'ejecut' or '$' anywhere, with any answer chosen", () => {
    const closed = render("es");
    expect(boxes(closed)).toHaveLength(3);
    expect(text(closed)).not.toMatch(bad);
    expect(radios(guideOf(render("es", { open: true, answers: {} })))).toBe(
      QUESTIONS.reduce((n, q) => n + optionsFor(q, "es").length, 0)
    );
    for (const answers of everyAnswer("es")) {
      const html = render("es", { open: true, answers });
      expect(text(html), JSON.stringify(answers)).not.toMatch(bad);
      expect(marked(html).length).toBe(1);
      expect(["1", "2", "3"]).toContain(marked(html)[0]);
    }
  });

  it("does not offer 'inside our office'", () => {
    const g = text(guideOf(render("es", { open: true, answers: {} })));
    expect(g).toContain(COPY.es.questions.loc.options.servers);
    expect(g).not.toContain("Inside our office");
  });

  it("recommends the deployment box for one's own servers", () => {
    const html = render("es", { open: true, answers: { loc: "servers" } });
    expect(marked(html)).toEqual(["3"]);
    expect(text(guideOf(html))).toContain(es["es.ways.w3.title"]);
  });
});

describe("safeguards guide, English only", () => {
  it("shows the five ways and offers all of them", () => {
    const html = render("en", { open: true, answers: {} });
    expect(boxes(html)).toHaveLength(5);
    expect(text(guideOf(html))).toContain(COPY.en.questions.loc.options.office);
    const cases: [Answers, string][] = [
      [{ loc: "any" }, "1"],
      [{ loc: "servers", it: "yes" }, "2"],
      [{ loc: "office", it: "no" }, "3"],
      [{ data: "real" }, "4"],
      [{ loc: "servers", it: "no" }, "5"],
    ];
    for (const [answers, n] of cases) {
      const h = render("en", { open: true, answers });
      expect(marked(h), JSON.stringify(answers)).toEqual([n]);
      const status = guideOf(h).match(/<div role="status"[\s\S]*?<\/div>/)![0];
      expect(text(status)).toContain(en[`en.ways.w${n}.title` as keyof typeof en]);
    }
  });

  it("says the cloud pilot is hosted in the EU and the AI provider may be outside it", () => {
    const g = text(guideOf(render("en", { open: true, answers: { loc: "any" } })));
    expect(g).toContain("Hosted by us in the EU");
    expect(g).toContain("external AI provider set up on the service, which may be outside the EU");
    expect(g).not.toContain("United States");
  });
});
