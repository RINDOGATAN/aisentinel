// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The pilot bar. On signed-in pages of
 * the hosted pilot only; for the whole pilot the free window, its end date
 * and the Cloud Plan's price in the reader's currency (closable for the
 * session); "Free until {date}" for a pilot begun before the shorter window;
 * the stronger end wording in the last five days; the read-only line after;
 * never for a paid organization. The rule is a pure function; the markup is
 * rendered here without the app shell.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  PILOT_BAR_PRICING_URL,
  PILOT_END_BAR_COPY,
  PILOT_END_BAR_DAYS,
  PILOT_PRICING_URL,
  isPaidPlanValue,
  isTransitionPilot,
  pilotEndBarState,
} from "@/config/pilot";
import { PilotEndBar } from "./pilot-banner";
import { ChargeCurrencyProvider } from "@/components/charge-currency";
import type { Currency } from "@/lib/currency";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-20T12:00:00Z");
const at = (days: number) => new Date(NOW.getTime() + days * DAY);
const pilot = (endsAt: Date | null, readOnly = false) => ({ active: true, endsAt, readOnly });

describe("when the bar shows", () => {
  it("shows the trial for the whole pilot, the end wording in the last five days, read-only after", () => {
    expect(PILOT_END_BAR_DAYS).toBe(5);
    expect(pilotEndBarState(pilot(at(15)), NOW)).toBe("trial");
    expect(pilotEndBarState(pilot(at(14)), NOW)).toBe("trial");
    expect(pilotEndBarState(pilot(at(5.01)), NOW)).toBe("trial");
    expect(pilotEndBarState(pilot(at(5)), NOW)).toBe("ending");
    expect(pilotEndBarState(pilot(at(0.1)), NOW)).toBe("ending");
    expect(pilotEndBarState(pilot(at(-1), true), NOW)).toBe("readOnly");
    // The end has passed even if the status was fetched just before it.
    expect(pilotEndBarState(pilot(at(-0.01)), NOW)).toBe("readOnly");
  });

  it("is hidden off the pilot, while loading and with no end date", () => {
    expect(pilotEndBarState({ active: false }, NOW)).toBe("hidden");
    expect(pilotEndBarState(undefined, NOW)).toBe("hidden");
    expect(pilotEndBarState(pilot(null), NOW)).toBe("hidden");
  });

  it("is never shown to a paid organization, in any state", () => {
    for (const status of [pilot(at(12)), pilot(at(2)), pilot(at(-2), true)]) {
      expect(pilotEndBarState({ ...status, paid: true }, NOW)).toBe("hidden");
    }
    expect(isPaidPlanValue("EU_CLOUD")).toBe(true);
    expect(isPaidPlanValue("PILOT")).toBe(false);
    expect(isPaidPlanValue(null)).toBe(false);
    expect(isPaidPlanValue(undefined)).toBe(false);
  });
});

describe("what the bar says", () => {
  // The signed-in layout provides the charge currency; here an EU request
  // for the Spanish bar and a US request for the English one, unless given.
  const render = (
    locale: "en" | "es",
    state: "hidden" | "trial" | "ending" | "readOnly",
    transition = false,
    currency: Currency = locale === "es" ? "EUR" : "USD",
  ) =>
    renderToStaticMarkup(
      <ChargeCurrencyProvider currency={currency}>
        <PilotEndBar locale={locale} state={state} endsAt={new Date("2026-10-26T09:00:00Z")} transition={transition} />
      </ChargeCurrencyProvider>,
    );
  const text = (html: string) => html.replace(/<[^>]+>/g, "");

  it("renders nothing when hidden, in both languages", () => {
    expect(render("en", "hidden")).toBe("");
    expect(render("es", "hidden")).toBe("");
  });

  it("gives the free window, the end date and the Cloud Plan's price for the whole pilot, one currency per language", () => {
    const en = render("en", "trial");
    expect(en).toContain('data-state="trial"');
    expect(text(en)).toBe(
      "Free for 15 days, until 26 October 2026. Then export your program or keep going on the Cloud Plan: $179 a month or $1,800 a year. See pricing",
    );
    expect(en).toContain('href="/?lang=en#pricing"');
    expect(text(en)).not.toMatch(/€|\bEUR\b|\bEU\b/);
    const es = render("es", "trial");
    expect(text(es)).toBe(
      "Gratis durante 15 días, hasta el 26 de octubre de 2026. Después, exporta tu programa o sigue con el Plan nube UE: 179 € al mes o 1.800 € al año. Ver precios",
    );
    expect(es).toContain('href="/?lang=es#precios"');
    expect(text(es)).not.toMatch(/\$|\bUSD\b/);
    // The trial bar can be closed for the session.
    expect(en).toContain('data-testid="pilot-end-bar-dismiss"');
    expect(en).toContain('aria-label="Close"');
    expect(es).toContain('aria-label="Cerrar"');
  });

  it("tells a pilot begun before the shorter window its real end date, without '15 days'", () => {
    expect(text(render("en", "trial", true))).toBe(
      "Free until 26 October 2026. Then export your program or keep going on the Cloud Plan: $179 a month or $1,800 a year. See pricing",
    );
    expect(text(render("es", "trial", true))).toBe(
      "Gratis hasta el 26 de octubre de 2026. Después, exporta tu programa o sigue con el Plan nube UE: 179 € al mes o 1.800 € al año. Ver precios",
    );
    expect(isTransitionPilot(new Date("2026-10-01T00:00:00Z"))).toBe(true);
    expect(isTransitionPilot("2026-10-11T23:59:59Z")).toBe(true);
    expect(isTransitionPilot(new Date("2026-10-12T00:00:00Z"))).toBe(false);
    expect(isTransitionPilot(null)).toBe(false);
  });

  it("never says the dollar and euro prices are the same", () => {
    const all = [render("en", "trial"), render("es", "trial"), render("en", "trial", true), render("es", "trial", true)]
      .map(text)
      .join(" | ");
    expect(all).not.toMatch(/same price|mismo precio|equivalent|equivalente/i);
    for (const line of [text(render("en", "trial")), text(render("es", "trial"))]) {
      expect(/\$/.test(line) && /€/.test(line)).toBe(false);
    }
    expect(Object.keys(PILOT_END_BAR_COPY)).toEqual(["en", "es"]);
  });

  it("states the price in the charge currency, whatever the language", () => {
    const en = PILOT_END_BAR_COPY.en;
    const es = PILOT_END_BAR_COPY.es;
    expect(en.trial(15, "26 October 2026", "EUR")).toBe(
      "Free for 15 days, until 26 October 2026. Then export your program or keep going on the Cloud Plan: €179 a month or €1,800 a year.",
    );
    expect(en.trialTransition("26 October 2026", "EUR")).toContain("Cloud Plan: €179 a month or €1,800 a year.");
    expect(en.trial(15, "26 October 2026", "USD")).toBe(en.trial(15, "26 October 2026"));
    expect(es.trial(15, "26 de octubre de 2026", "USD")).toContain("Plan nube UE: 179 US$ al mes o 1.800 US$ al año.");
    expect(es.trial(15, "26 de octubre de 2026", "EUR")).toContain("Plan nube UE: 179 € al mes o 1.800 € al año.");
    expect(es.trialTransition("26 de octubre de 2026", "USD")).toContain("179 US$ al mes o 1.800 US$ al año.");
    // The Spanish bar outside the EU and the English bar in the EU.
    expect(text(render("es", "trial", false, "USD"))).toContain("179 US$ al mes o 1.800 US$ al año");
    expect(text(render("es", "trial", false, "USD"))).not.toMatch(/€/);
    expect(text(render("en", "trial", false, "EUR"))).toContain("€179 a month or €1,800 a year");
    expect(text(render("en", "trial", false, "EUR"))).not.toMatch(/\$/);
  });

  it("gives the end date and the pricing link in the last five days", () => {
    const en = render("en", "ending");
    expect(en).toContain('data-testid="pilot-end-bar"');
    expect(text(en)).toBe(
      "Your pilot ends on 26 October 2026. Move to the paid plan to keep editing with all your records. See pricing",
    );
    expect(en).toContain(`href="${PILOT_BAR_PRICING_URL.en}"`);
    const es = render("es", "ending");
    expect(text(es)).toBe(
      "Tu piloto termina el 26 de octubre de 2026. Pasa al plan de pago para seguir editando con todos tus registros. Ver precios",
    );
    expect(es).toContain(`href="${PILOT_BAR_PRICING_URL.es}"`);
  });

  it("says the organization is read-only and exportable once the pilot is over", () => {
    expect(text(render("en", "readOnly"))).toBe(
      "Your pilot has ended: the organization is read-only and you can export it at any time. See pricing",
    );
    expect(text(render("es", "readOnly"))).toBe(
      "Tu piloto ha terminado: la organización está en solo lectura y puedes exportarla cuando quieras. Ver precios",
    );
    expect(render("es", "readOnly")).toContain(`href="${PILOT_BAR_PRICING_URL.es}"`);
  });

  it("carries none of the old warning texts, no long dash, and says tú", () => {
    expect(PILOT_PRICING_URL).toEqual({ en: "https://www.todo.law/pricing", es: "https://www.todo.law/es/precios" });
    for (const locale of ["en", "es"] as const) {
      for (const state of ["trial", "ending", "readOnly"] as const) {
        const t = text(render(locale, state));
        expect(t).not.toMatch(/Hosted pilot|For real data|managed instance|Run your own instance/i);
        expect(t).not.toMatch(/Piloto alojado|datos reales|instancia gestionada/i);
        expect(t).not.toMatch(/[\u2013\u2014]/);
        expect(t).not.toMatch(/\busted\b/i);
      }
    }
    // The stronger bars cannot be closed.
    expect(render("en", "ending")).not.toContain("<button");
    expect(render("en", "readOnly")).not.toContain("<button");
  });

  it("the old pilot sentence is gone from the sign-in screen, the Settings card and the bar", () => {
    for (const file of [
      "src/app/(auth)/sign-in/sign-in-form.tsx",
      "src/components/governance/pilot-status-card.tsx",
    ]) {
      expect(readFileSync(join(process.cwd(), file), "utf8"), file).not.toMatch(/PilotSentenceText|PILOT_SENTENCE/);
    }
    const bar = readFileSync(join(process.cwd(), "src/components/pilot/pilot-banner.tsx"), "utf8");
    expect(bar).not.toMatch(/PilotSentenceText|PILOT_SENTENCE/);
  });
});

describe("the bar shows only once a person is signed in", () => {
  const APP = join(process.cwd(), "src/app");
  const MOUNT = /<HostedPilotBanner\b|<OrganizationPilotEndBar\b|<PilotEndBar\b/;

  /** Every layout Next.js wraps a page in: its own folder's, then each parent's up to src/app. */
  function layoutsOf(pageFile: string): string[] {
    const layouts: string[] = [];
    let dir = dirname(join(APP, pageFile));
    while (dir.startsWith(APP)) {
      const layout = join(dir, "layout.tsx");
      if (existsSync(layout)) layouts.push(layout);
      if (dir === APP) break;
      dir = dirname(dir);
    }
    return layouts;
  }
  const mounts = (file: string) => MOUNT.test(readFileSync(file, "utf8"));

  it.each([
    ["the landing page", "page.tsx"],
    ["a documentation page", "docs/how-it-fits/page.tsx"],
    ["the sign-in screen", "(auth)/sign-in/page.tsx"],
  ])("is absent from %s: neither the page nor any layout above it mounts it", (_, page) => {
    expect(existsSync(join(APP, page)), page).toBe(true);
    for (const file of [join(APP, page), ...layoutsOf(page)]) {
      expect(mounts(file), relative(process.cwd(), file)).toBe(false);
    }
  });

  it("is present in the signed-in layout, which wraps every dashboard page", () => {
    const layouts = layoutsOf("(dashboard)/governance/page.tsx").filter(mounts);
    expect(layouts.map((f) => relative(APP, f))).toEqual(["(dashboard)/layout.tsx"]);
  });

  it("is mounted nowhere else in the app, and nothing reserves space for it", () => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
          const source = readFileSync(path, "utf8");
          if (MOUNT.test(source)) found.push(relative(process.cwd(), path));
          // The old body class made the landing page's fixed header start lower.
          expect(source, path).not.toContain("has-pilot-banner");
        }
      }
    };
    walk(join(process.cwd(), "src"));
    expect(found.sort()).toEqual([
      "src/app/(dashboard)/layout.tsx",
      "src/components/pilot/hosted-pilot-banner.tsx",
      // the client part that reads the organization (rendered only by hosted-pilot-banner.tsx)
      "src/components/pilot/pilot-banner.tsx",
    ]);
  });
});

describe("the pilot sentence elsewhere", () => {
  it("the sign-in screen and the Settings card state the editing terms, word for word", () => {
    // The sign-in screen shows only the terms line; the old sentence is gone.
    const signIn = readFileSync(join(process.cwd(), "src/app/(auth)/sign-in/sign-in-form.tsx"), "utf8");
    expect(signIn).toMatch(/PILOT_SIGN_IN_LINE\[\w+\]/);
    expect(signIn).not.toMatch(/PILOT_SENTENCE|PilotSentenceText/);
    const card = readFileSync(join(process.cwd(), "src/components/governance/pilot-status-card.tsx"), "utf8");
    expect(card).toMatch(/PILOT_TERMS\[\w+\]/);
    expect(card).not.toMatch(/PILOT_SENTENCE|PilotSentenceText|PILOT_RUN_URL/);
  });

  it("keeps the landing's sign-in box free of the pilot text, as on DPO Central", () => {
    for (const file of ["src/landing/LandingPage.tsx", "src/landing/components/StartupProductPage.tsx"]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(/PILOT_TERMS|PILOT_SENTENCE|PilotSentenceText|pilot-signup-notice/);
    }
  });
});
