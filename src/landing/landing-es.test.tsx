// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The public landing after the October 2026 round, after DPO Central's:
 *
 *   - the header carries the designer logo (the shared BrandMark) and no
 *     product pill; the footer carries "a TODO.LAW product";
 *   - the hero's left column shows the badge, the title and the welcome line
 *     only (the summary lives in the sign-up card);
 *   - the Spanish page replaces "How it works" and "Features" with its own
 *     sections (the English page has done the same since the English round,
 *     tests/landing-en.test.tsx);
 *   - the Spanish copy offers exactly the three ways the storefront offers in
 *     Spain (no hardware, no installer kit, no open code), claims no hosting
 *     location, shows no price, says "tú" and never "ejecutar" for software;
 *   - the videos come from a config, play only on request, and the section
 *     is absent while the list is empty;
 *   - customer logos render nothing while the configured list is empty, and
 *     the list ships empty (logos only with written consent).
 */

import { describe, it, expect, vi } from "vitest";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CustomerLogos from "./components/CustomerLogos";
import LandingSections, { Videos } from "./components/LandingSections";
import { CUSTOMER_LOGOS } from "./config/customer-logos";
import { LANDING_VIDEOS_ES } from "./config/landing-videos";
import es from "./i18n/es/ai-sentinel-startups.json";
import en from "./i18n/en/ai-sentinel-startups.json";
import authEs from "./i18n/es/startups-auth.json";
import authEn from "./i18n/en/startups-auth.json";
import appEs from "@/i18n/messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const ES = es as Record<string, string>;
const EN = en as Record<string, string>;
const tEs = (k: string) => ES[k] ?? k;
const esOnly = Object.entries(ES).filter(([k]) => k.startsWith("es."));

const SAMPLE_VIDEOS = [
  { file: "01-sample", title: "Título uno", caption: "Pie uno", published: true },
  { file: "02-sample", title: "Título dos", caption: "Pie dos", published: true },
];

function flatten(obj: unknown, prefix = ""): Array<[string, string]> {
  if (typeof obj === "string") return [[prefix, obj]];
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      flatten(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [];
}

describe("landing header and footer", () => {
  it("uses the shared designer logo and no product pill", () => {
    const header = read("src/landing/components/StartupsHeader.tsx");
    expect(header).toContain('from "@/components/brand-mark"');
    expect(header).not.toContain("header.badge");
    expect(ES["header.badge"]).toBeUndefined();
    expect(EN["header.badge"]).toBeUndefined();
    expect(read("src/components/brand-mark.tsx")).toContain("/logo-negative.svg");
  });

  it("says the product is a TODO.LAW product, in the footer, in both languages", () => {
    expect(EN["footer.productOf"]).toBe("a TODO.LAW product");
    expect(ES["footer.productOf"]).toBe("un producto de TODO.LAW");
    expect(read("src/landing/components/StartupsFooter.tsx")).toContain('t("footer.productOf")');
  });
});

describe("landing hero", () => {
  it("shows the welcome line, not the subtitle, in the left column", () => {
    const page = read("src/landing/components/StartupProductPage.tsx");
    expect(page).toContain('t("hero.welcome")');
    // hero.subtitle is used once: its first sentence, in the sign-up card.
    expect(page.match(/t\("hero\.subtitle"\)/g)).toHaveLength(1);
    expect(page).toContain('t("hero.subtitle").split(".")[0]');
  });

  it("leaves no hard-coded English in the sign-up card", () => {
    const page = read("src/landing/components/StartupProductPage.tsx");
    expect(page).not.toMatch(/setError\("[A-Za-z]/);
    expect(page).not.toContain("Continue with Google");
    expect(page).not.toContain('placeholder="');
    for (const k of Object.keys(authEn)) expect((authEs as Record<string, string>)[k], k).toBeTruthy();
  });
});

describe("Spanish sections", () => {
  const withVideos = renderToStaticMarkup(createElement(LandingSections, { t: tEs, locale: "es", videos: SAMPLE_VIDEOS }));
  const asShipped = renderToStaticMarkup(createElement(LandingSections, { t: tEs, locale: "es" }));

  it("render in order, with every key translated", () => {
    const order = ["Tres herramientas", "Descubre cómo", "Seis etapas", "Tú eliges"].map((s) => withVideos.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(withVideos).not.toMatch(/>es\.[a-z]/);
  });

  it("put AI Sentinel at the centre, linked to DPO Central and VendorWatch", () => {
    const i = (s: string) => withVideos.indexOf(s);
    expect(i("DPO Central")).toBeLessThan(i(ES["es.suite.link.dpc"]));
    expect(i(ES["es.suite.link.dpc"])).toBeLessThan(i(">AI Sentinel<"));
    expect(i(">AI Sentinel<")).toBeLessThan(i(ES["es.suite.link.vw"]));
    expect(i(ES["es.suite.link.vw"])).toBeLessThan(i(">VendorWatch<"));
  });

  it("show the six stages of the Guided path and the 30/60/90-day plan", () => {
    const stages = (appEs as { guided: { stages: Record<string, string> } }).guided.stages;
    const names = ["setup", "people", "inventory", "assess", "controls", "monitor"].map((k) => stages[k]);
    names.forEach((name, n) => expect(ES[`es.stages.s${n + 1}.title`]).toBe(name));
    expect(asShipped).toContain(ES["es.stages.plan.title"]);
    for (const p of [1, 2, 3]) expect(asShipped).toContain(ES[`es.stages.plan.p${p}.days`]);
  });

  it("show no price, no superlative and no unprovable claim", () => {
    for (const [k, v] of esOnly) {
      expect(v, k).not.toMatch(/€|\$|\bEUR\b|\b\d{2,3}\s?(al mes|al año)\b/);
      expect(v, k).not.toMatch(/\b(primer[oa]?|únic[oa]s?|nadie|líder(es)?|mejor(es)?)\b/i);
    }
  });

  it("offer exactly the three ways sold in Spain: cloud pilot, managed instance, own servers with training", () => {
    expect(asShipped.match(/<article class="paper-card/g)).toHaveLength(3);
    expect(ES["es.ways.w1.desc"]).toMatch(/piloto gratuito y con límites/);
    expect(ES["es.ways.w2.desc"]).toMatch(/instancia aislada/);
    expect(ES["es.ways.w3.desc"]).toMatch(/servidores de tu organización/);
    expect(ES["es.ways.w3.desc"]).toMatch(/formamos a tu equipo/);
    expect(asShipped.match(/href="mailto:[^"]+"/g)).toHaveLength(2);
  });

  it("never offer hardware, the installer kit, Docker or open code in Spanish", () => {
    for (const [k, v] of Object.entries(ES)) {
      expect(v, k).not.toMatch(/hardware|docker|\bkit\b|código abierto|tus propios equipos/i);
    }
  });

  it("claim no hosting location (the production database is not in the EU yet)", () => {
    for (const [k, v] of [...Object.entries(ES), ...Object.entries(EN)]) {
      expect(v, k).not.toMatch(
        /(alojad[oa]s?|datos|nube|servidor(es)?|aloja(mos)?) (en|de) (la )?(UE|Unión Europea|Europa)|in the EU|EU[- ]hosted|hosted in (the )?(EU|Europe)/i
      );
    }
  });

  it("show no videos section while the list is empty, and the list's files all exist", () => {
    expect(renderToStaticMarkup(createElement(Videos, { t: tEs, videos: [] }))).toBe("");
    if (LANDING_VIDEOS_ES.length === 0) expect(asShipped).not.toContain("<video");
    for (const v of LANDING_VIDEOS_ES) {
      for (const ext of ["mp4", "webm", "png", "vtt"]) {
        expect(existsSync(path.join(ROOT, "public/videos/es", `${v.file}.${ext}`)), `${v.file}.${ext}`).toBe(true);
      }
      expect(v.title.trim(), v.file).not.toBe("");
    }
  });

  it("play videos only on request, muted, with a poster, two formats and Spanish captions", () => {
    const videos = withVideos.match(/<video[\s\S]*?<\/video>/g) ?? [];
    expect(videos).toHaveLength(SAMPLE_VIDEOS.length);
    for (const v of videos) {
      expect(v).not.toMatch(/autoplay/i);
      expect(v).toMatch(/preload="none"/);
      expect(v).toMatch(/muted/);
      expect(v).toMatch(/playsinline/i);
      expect(v).toMatch(/controls/);
      expect(v).toMatch(/poster="\/videos\/es\/[^"]+\.png"/);
      expect(v).toMatch(/<source src="\/videos\/es\/[^"]+\.webm" type="video\/webm"/);
      expect(v).toMatch(/<source src="\/videos\/es\/[^"]+\.mp4" type="video\/mp4"/);
      expect(v).toMatch(/<track[^>]*kind="captions"[^>]*srclang="es"/i);
      // Subtitles are burned into the picture: the track must be offered but never on by default.
      expect(v).not.toMatch(/<track[^>]*\sdefault/i);
    }
  });

  it("do not describe the videos' format to the visitor", () => {
    expect(ES["es.videos.sub"]).toBe("AI Sentinel a vista de pájaro");
    expect(ES["es.videos.sub"]).not.toMatch(/cortos|sin sonido|subtítulos|inventados/i);
  });

  it("ship the five recorded videos, with titles and captions that follow the copy rules", () => {
    expect(LANDING_VIDEOS_ES.map((v) => v.file)).toEqual([
      "01-inicio-rapido",
      "02-aplicabilidad",
      "03-clasificacion-riesgo",
      "04-evidencias",
      "05-plan-30-60-90",
    ]);
    for (const v of LANDING_VIDEOS_ES) {
      for (const text of [v.title, v.caption]) {
        expect(text, v.file).not.toMatch(/[–—]|ejecut(?!iv)|\busted\b|vosotr|sin sonido|inventad|subtítul/i);
        expect(text.trim(), v.file).not.toBe("");
      }
    }
    const html = renderToStaticMarkup(createElement(LandingSections, { t: tEs, locale: "es" }));
    expect(html.match(/<video/g)).toHaveLength(5);
  });
});

describe("English landing", () => {
  // Since October 2026 the English page has the same sections, with its own
  // copy (tests/landing-en.test.tsx); it never shows the Spanish text.
  it("shows the shared sections in English, not the Spanish copy", async () => {
    const { default: LandingPage } = await import("./LandingPage");
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html).toContain(EN["en.suite.heading.prefix"]);
    expect(html).not.toContain(EN["feat.label"]);
    expect(html).not.toContain(ES["es.suite.heading.prefix"]);
  });
});

describe("landing copy rules", () => {
  const bundles: Array<[string, Record<string, string>]> = [
    ["es", ES],
    ["en", EN],
    ["auth-es", authEs as Record<string, string>],
    ["auth-en", authEn as Record<string, string>],
  ];

  it("use no long dashes", () => {
    for (const [name, dict] of bundles) {
      for (const [k, v] of Object.entries(dict)) expect(v, `${name}:${k}`).not.toMatch(/[–—]/);
    }
  });

  it("address the reader as tú in Spanish, never usted or vosotros", () => {
    const formal =
      /\b(usted(es)?|vosotr[oa]s|vuestr[oa]s?|podéis|tenéis|queréis|sois|estáis|continúe|inténtelo|acepte|seleccione|introduzca|haga clic|ha recibido)\b/i;
    for (const [name, dict] of bundles.filter(([n]) => n.endsWith("es"))) {
      for (const [k, v] of Object.entries(dict)) expect(v, `${name}:${k}`).not.toMatch(formal);
    }
    const signIn = (appEs as { signIn: Record<string, string> }).signIn;
    for (const [k, v] of Object.entries(signIn)) expect(v, `signIn.${k}`).not.toMatch(formal);
  });

  it("never say ejecutar for software in Spanish (ejecutivo is fine)", () => {
    const strings: Array<[string, string]> = [
      ...Object.entries(ES),
      ...Object.entries(authEs as Record<string, string>),
      ...flatten(appEs),
    ];
    for (const [k, v] of strings) expect(v, k).not.toMatch(/ejecut(?!iv)/i);
  });
});

describe("customer logos", () => {
  it("ship with an empty list", () => {
    expect(CUSTOMER_LOGOS).toEqual([]);
  });

  it("render nothing while the list is empty", () => {
    expect(renderToStaticMarkup(createElement(CustomerLogos, { t: tEs }))).toBe("");
  });

  it("render a labelled row once a logo is configured", () => {
    const html = renderToStaticMarkup(
      createElement(CustomerLogos, { t: tEs, logos: [{ name: "Example", src: "/x.svg" }] })
    );
    expect(html).toContain('alt="Example"');
    expect(html).toContain(ES["es.logos.label"]);
  });
});
