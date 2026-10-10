// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The English landing in the format of the Spanish one (October 2026),
 * mirroring src/landing/landing-es.test.tsx:
 *
 *   - the same sections in the same order (the three tools, the videos, the
 *     six stages with the 30/60/90-day plan, the ways to host it), with
 *     English copy of its own under `en.*`, written for law firms and
 *     consultants who run AI governance for their clients and for in-house
 *     teams at small and mid-size companies;
 *   - one subscription for the three tools, said in the tools section;
 *   - five ways to host it, as on the English storefront (cloud, the kit,
 *     the Box, a managed instance, deployment and training on the
 *     customer's servers), and the note that the program can be taken away;
 *   - five videos from public/videos/en/, shown only once recorded: the
 *     section is left out while none is published, and `published` in
 *     src/landing/config/landing-videos.ts must match the files on disk;
 *   - no price, no certification or customer logo, no EU-hosting claim, no
 *     comparison with other tools, no long dash, US spelling, sentence case.
 */

import { describe, it, expect, vi } from "vitest";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LandingSections, { KIT_URL, Videos } from "@/landing/components/LandingSections";
import { LANDING_VIDEOS, type LandingLocale, type LandingVideo } from "@/landing/config/landing-videos";
import en from "@/landing/i18n/en/ai-sentinel-startups.json";
import appEn from "@/i18n/messages/en.json";
import authEn from "@/landing/i18n/en/startups-auth.json";
import authEs from "@/landing/i18n/es/startups-auth.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const EN = en as Record<string, string>;
const tEn = (k: string) => EN[k] ?? k;

const render = (videos?: readonly LandingVideo[]) =>
  renderToStaticMarkup(createElement(LandingSections, { t: tEn, locale: "en", ...(videos ? { videos } : {}) }));

const allPublished = LANDING_VIDEOS.en.map((v) => ({ ...v, published: true }));
const nonePublished = LANDING_VIDEOS.en.map((v) => ({ ...v, published: false }));

// What the English page shows that this round wrote or changed.
const shown = Object.entries(EN).filter(
  ([k]) => k.startsWith("en.") || k.startsWith("hero.") || k.startsWith("cta.") || k.startsWith("header.")
);
const videoText = LANDING_VIDEOS.en.flatMap((v) => [
  [`${v.file}.title`, v.title],
  [`${v.file}.caption`, v.caption],
]) as Array<[string, string]>;

describe("English landing page", () => {
  it("passes the shared sections for both languages", () => {
    const page = read("src/landing/LandingPage.tsx");
    expect(page).toContain("<LandingSections t={t} locale={locale} />");
    expect(page).not.toContain('locale === "es" ? <');
  });

  it("renders the new sections, not the older How it works and Features", async () => {
    const { default: LandingPage } = await import("@/landing/LandingPage");
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html).toContain(EN["en.suite.heading.accent"]);
    expect(html).toContain(EN["en.ways.heading.accent"]);
    expect(html).not.toContain(EN["workflow.heading.prefix"]);
    expect(html).not.toContain(EN["feat.label"]);
  });

  it("suggests a firm address in the English sign-up card; Spanish keeps its own", () => {
    expect((authEn as Record<string, string>)["emailPlaceholder"]).toBe("you@yourfirm.com");
    expect((authEs as Record<string, string>)["emailPlaceholder"]).toBe("tu@empresa.com");
  });

  it("names the audience in the badge and the program in the hero title, in sentence case", () => {
    expect(EN["hero.title.prefix"] + EN["hero.title.accent"] + EN["hero.title.suffix"]).toBe("Your entry point to an AI governance program.");
    expect(EN["hero.title.accent"]).toBe("AI governance program");
    expect(EN["hero.badge"]).toBe("For law firms, privacy consultants and in-house teams");
    // "firms" alone is ambiguous: the audience is law firms and privacy consultants.
    for (const [k, v] of shown) expect(v.replace(/law firms?|Law-Firm-in-a-Box/gi, ""), k).not.toMatch(/\bfirms?\b/i);
    for (const k of ["hero.badge", "hero.cta", "header.cta", "cta.button"]) {
      const words = EN[k].split(" ").slice(1);
      for (const w of words) expect(w, k).not.toMatch(/^[A-Z][a-z]/);
    }
  });
});

describe("English sections", () => {
  const html = render(allPublished);

  it("render the four sections in order, with every key translated", () => {
    const order = ["Three tools", "See how it", "Six stages", "You choose <"].map((s) => html.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).not.toMatch(/>en\.[a-z]/);
    expect(html).toContain("AI Sentinel at a glance");
  });

  it("put AI Sentinel at the centre, linked to DPO Central and VendorWatch", () => {
    const i = (s: string) => html.indexOf(s);
    expect(i("DPO Central")).toBeLessThan(i(EN["en.suite.link.dpc"]));
    expect(i(EN["en.suite.link.dpc"])).toBeLessThan(i(">AI Sentinel<"));
    expect(i(">AI Sentinel<")).toBeLessThan(i(EN["en.suite.link.vw"]));
    expect(i(EN["en.suite.link.vw"])).toBeLessThan(i(">VendorWatch<"));
  });

  it("say that one subscription covers all three tools", () => {
    expect(EN["en.suite.heading.prefix"] + EN["en.suite.heading.accent"]).toBe("Three tools, one subscription");
    expect(EN["en.suite.sub"]).toMatch(/One subscription covers all three: DPO Central, AI Sentinel and VendorWatch/);
  });

  it("name only the laws and frameworks the product covers", () => {
    const text = EN["en.suite.ais.b2"];
    for (const name of ["EU AI Act", "US state AI laws", "NIST AI RMF", "ISO/IEC 42001"]) expect(text).toContain(name);
    expect(EN["en.suite.ais.b4"]).toContain("AIUC-1");
    // The state laws the product carries (src/config/regimes, the ADMT seed).
    expect(EN["hero.subtitle"]).toMatch(/California, Colorado, Texas and Washington/);
  });

  it("show the six stages of the Guided path and the 30/60/90-day plan", () => {
    const stages = (appEn as { guided: { stages: Record<string, string> } }).guided.stages;
    const names = ["setup", "people", "inventory", "assess", "controls", "monitor"].map((k) => stages[k]);
    names.forEach((name, n) => expect(EN[`en.stages.s${n + 1}.title`]).toBe(name));
    expect(html).toContain(EN["en.stages.plan.title"]);
    for (const p of [1, 2, 3]) expect(html).toContain(EN[`en.stages.plan.p${p}.days`]);
  });

  it("show no price, certification, customer logo, comparison or EU-hosting claim", () => {
    for (const [k, v] of [...shown, ...videoText]) {
      expect(v, k).not.toMatch(/\$|€|\bEUR\b|\bUSD\b|\/mo\b|per month|a year/i);
      expect(v, k).not.toMatch(/\bSOC ?2?\b|certified|HIPAA/i);
      expect(v, k).not.toMatch(/\bEU[- ]hosted|hosted in (the )?(EU|Europe)|in the EU\b|EU cloud|European (cloud|servers)/i);
      expect(v, k).not.toMatch(/\bthe (first|only)\b|\b(leading|best|unrivaled|world-class|revolutionary|cheaper|unlike)\b/i);
      expect(v, k).not.toMatch(/\benterprise\b/i);
      expect(v, k).not.toMatch(/\bexecute\b/i);
    }
    expect(html).not.toMatch(/<img/);
    expect(html).not.toContain("customer-logos-heading");
  });

  it("say the starting-point positioning calmly, at most twice", () => {
    const all = shown.map(([, v]) => v).join(" ");
    expect(all.match(/grows with you|take your program with you/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(all.match(/grows with you|take your program with you|larger platform/g)?.length ?? 0).toBeLessThanOrEqual(3);
  });

  it("use no long dash, US spelling and no word about how the videos were made", () => {
    for (const [k, v] of [...shown, ...videoText]) {
      expect(v, k).not.toMatch(/[–—]|--/);
      expect(v, k).not.toMatch(/programme|organisation|catalogue|licence/i);
      expect(v, k).not.toMatch(/subtitle|no sound|silent|recorded|made-up|fictional|generated/i);
    }
  });

  it("offer five ways, as on the English storefront", () => {
    const titles = [1, 2, 3, 4, 5].map((n) => EN[`en.ways.w${n}.title`]);
    expect(titles).toEqual([
      "TODO.LAW cloud",
      "The self-install kit",
      "TODO.LAW hardware",
      "A managed instance",
      "Deployment and training on your servers",
    ]);
    expect(EN["en.ways.w6.title"]).toBeUndefined();
    for (const t of titles) expect(html).toContain(t);
    expect(EN["en.ways.label"]).toBe("Guarantees and hosting");
    expect(EN["en.ways.heading.prefix"] + EN["en.ways.heading.accent"]).toBe("You choose where it lives");
    expect(EN["en.ways.sub"]).toMatch(/take your program with you at any time/);
    expect(EN["en.ways.w2.desc"]).toMatch(/Open source/);
    expect(EN["en.ways.w2.desc"]).toMatch(/Docker/);
    expect(EN["en.ways.w3.desc"]).toMatch(/Law-Firm-in-a-Box™/);
  });

  it("ask by email for the Box, the managed instance and the deployment, and link the kit", () => {
    expect(html.match(/href="mailto:[^"]+"/g)).toHaveLength(3);
    expect(html).toContain(`href="${KIT_URL}"`);
    expect(html.match(/<article class="[^"]*paper-card/g)).toHaveLength(5);
  });

  it("play five videos only on request, muted, with a poster, two formats and English captions", () => {
    const videos = html.match(/<video[\s\S]*?<\/video>/g) ?? [];
    expect(videos).toHaveLength(5);
    for (const v of videos) {
      expect(v).not.toMatch(/autoplay/i);
      expect(v).toMatch(/preload="none"/);
      expect(v).toMatch(/muted/);
      expect(v).toMatch(/playsinline/i);
      expect(v).toMatch(/controls/);
      expect(v).toMatch(/poster="\/videos\/en\/[^"]+\.png"/);
      expect(v).toMatch(/<source src="\/videos\/en\/[^"]+\.webm" type="video\/webm"/);
      expect(v).toMatch(/<source src="\/videos\/en\/[^"]+\.mp4" type="video\/mp4"/);
      expect(v).toMatch(/<track[^>]*kind="captions"[^>]*srclang="en"/i);
      // Subtitles are burned into the picture: the track must be offered but never on by default.
      expect(v).not.toMatch(/<track[^>]*\sdefault/i);
      expect(v).not.toMatch(/\/videos\/es\//);
    }
  });

  it("list the five English videos with the agreed titles and captions", () => {
    expect(LANDING_VIDEOS.en.map((v) => v.file)).toEqual(LANDING_VIDEOS.es.map((v) => v.file));
    expect(LANDING_VIDEOS.en.map((v) => [v.title, v.caption])).toEqual([
      ["Your AI governance program in minutes", "Your organization, where you operate and a template for your sector to start from."],
      ["Which AI laws apply to you", "A few questions about how you use AI decide which rules apply and from when."],
      ["Classify the risk of each AI system", "You choose each system's risk level and record the reason."],
      ["Evidence for your AI agents, in order", "Each AI agent against AIUC-1, with its evidence and its readiness for audit."],
      ["Your 30, 60 and 90-day plan", "Where you are in the plan and what comes next in each area."],
    ]);
  });

  it("leave the video section out while no English video is published", () => {
    const none = render(nonePublished);
    expect(none).not.toContain("See how it");
    expect(none).not.toMatch(/<video/);
    expect(none.indexOf("Three tools")).toBeLessThan(none.indexOf("Six stages"));
    expect(renderToStaticMarkup(createElement(Videos, { t: tEn, locale: "en", videos: nonePublished }))).toBe("");
  });

  it("show a published video alone, with its own title", () => {
    const one = render(LANDING_VIDEOS.en.map((v, i) => ({ ...v, published: i === 2 })));
    expect(one.match(/<video/g)).toHaveLength(1);
    expect(one).toContain("/videos/en/03-clasificacion-riesgo.png");
    expect(one).toContain(LANDING_VIDEOS.en[2].title);
  });
});

describe("landing video configuration", () => {
  it("publishes a video exactly when its four files are in public/videos/<locale>/", () => {
    for (const locale of Object.keys(LANDING_VIDEOS) as LandingLocale[]) {
      for (const { file, published } of LANDING_VIDEOS[locale]) {
        const present = ["png", "webm", "mp4", "vtt"].every((ext) =>
          existsSync(path.join(ROOT, "public/videos", locale, `${file}.${ext}`))
        );
        expect(published, `${locale}/${file}`).toBe(present);
      }
    }
  });

  it("has a title and caption for every configured video", () => {
    for (const locale of Object.keys(LANDING_VIDEOS) as LandingLocale[]) {
      for (const v of LANDING_VIDEOS[locale]) {
        expect(v.title.trim(), `${locale}/${v.file}`).not.toBe("");
        expect(v.caption.trim(), `${locale}/${v.file}`).not.toBe("");
      }
    }
  });
});
