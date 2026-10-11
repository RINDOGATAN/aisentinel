// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The end-of-pilot bar (owner, 11 Oct 2026), which replaced the warning
 * banner. On signed-in pages of the hosted pilot only; nothing for most of
 * the pilot, the end date in the last five days, the read-only line after;
 * never for a paid organisation. The rule is a pure function; the markup is
 * rendered here without the app shell.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  PILOT_END_BAR_DAYS,
  PILOT_PRICING_URL,
  isPaidPlanValue,
  pilotEndBarState,
} from "@/config/pilot";
import { PilotEndBar } from "./pilot-banner";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-20T12:00:00Z");
const at = (days: number) => new Date(NOW.getTime() + days * DAY);
const pilot = (endsAt: Date | null, readOnly = false) => ({ active: true, endsAt, readOnly });

describe("when the bar shows", () => {
  it("is hidden for most of the pilot, shown in the last five days, read-only after", () => {
    expect(PILOT_END_BAR_DAYS).toBe(5);
    expect(pilotEndBarState(pilot(at(14)), NOW)).toBe("hidden");
    expect(pilotEndBarState(pilot(at(5.01)), NOW)).toBe("hidden");
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

  it("is never shown to a paid organisation, in any state", () => {
    for (const status of [pilot(at(2)), pilot(at(-2), true)]) {
      expect(pilotEndBarState({ ...status, paid: true }, NOW)).toBe("hidden");
    }
    expect(isPaidPlanValue("EU_CLOUD")).toBe(true);
    expect(isPaidPlanValue("PILOT")).toBe(false);
    expect(isPaidPlanValue(null)).toBe(false);
    expect(isPaidPlanValue(undefined)).toBe(false);
  });
});

describe("what the bar says", () => {
  const render = (locale: "en" | "es", state: "hidden" | "ending" | "readOnly") =>
    renderToStaticMarkup(
      <PilotEndBar locale={locale} state={state} endsAt={new Date("2026-10-26T09:00:00Z")} />,
    );
  const text = (html: string) => html.replace(/<[^>]+>/g, "");

  it("renders nothing when hidden, in both languages", () => {
    expect(render("en", "hidden")).toBe("");
    expect(render("es", "hidden")).toBe("");
  });

  it("gives the end date and the pricing link in the last five days", () => {
    const en = render("en", "ending");
    expect(en).toContain('data-testid="pilot-end-bar"');
    expect(text(en)).toBe(
      "Your pilot ends on 26 October 2026. Move to the paid plan to keep editing with all your records. See pricing",
    );
    expect(en).toContain(`href="${PILOT_PRICING_URL}"`);
    const es = render("es", "ending");
    expect(text(es)).toBe(
      "Tu piloto termina el 26 de octubre de 2026. Pasa al plan de pago para seguir editando con todos tus registros. Ver precios",
    );
    expect(es).toContain(`href="${PILOT_PRICING_URL}"`);
  });

  it("says the organisation is read-only and exportable once the pilot is over", () => {
    expect(text(render("en", "readOnly"))).toBe(
      "Your pilot has ended: the organisation is read-only and you can export it at any time. See pricing",
    );
    expect(text(render("es", "readOnly"))).toBe(
      "Tu piloto ha terminado: la organización está en solo lectura y puedes exportarla cuando quieras. Ver precios",
    );
    expect(render("es", "readOnly")).toContain(`href="${PILOT_PRICING_URL}"`);
  });

  it("carries none of the old warning texts, no long dash, and says tú", () => {
    expect(PILOT_PRICING_URL).toBe("https://www.todo.law/pricing");
    for (const locale of ["en", "es"] as const) {
      for (const state of ["ending", "readOnly"] as const) {
        const t = text(render(locale, state));
        expect(t).not.toMatch(/Hosted pilot|For real data|managed instance|Run your own instance/i);
        expect(t).not.toMatch(/Piloto alojado|datos reales|instancia gestionada/i);
        expect(t).not.toMatch(/[\u2013\u2014]/);
        expect(t).not.toMatch(/\busted\b/i);
      }
    }
    // No dismiss button: the bar is quiet and only shows when it matters.
    expect(render("en", "ending")).not.toContain("<button");
  });

  it("the pilot sentence stays on the sign-in screen and the Settings card, not in the bar", () => {
    for (const file of [
      "src/app/(auth)/sign-in/sign-in-form.tsx",
      "src/components/governance/pilot-status-card.tsx",
    ]) {
      expect(readFileSync(join(process.cwd(), file), "utf8"), file).toMatch(/<PilotSentenceText\b/);
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
      // the client part that reads the organisation (rendered only by hosted-pilot-banner.tsx)
      "src/components/pilot/pilot-banner.tsx",
    ]);
  });
});

describe("the pilot sentence elsewhere", () => {
  it("the sign-in screen and the Settings card add the editing terms, word for word", () => {
    // These two show PILOT_TERMS beneath the sentence.
    for (const file of [
      "src/app/(auth)/sign-in/sign-in-form.tsx",
      "src/components/governance/pilot-status-card.tsx",
    ]) {
      expect(readFileSync(join(process.cwd(), file), "utf8"), file).toMatch(/PILOT_TERMS\[\w+\]/);
    }
  });

  it("keeps the landing's sign-in box free of the pilot text, as on DPO Central (owner, 11 Oct 2026)", () => {
    for (const file of ["src/landing/LandingPage.tsx", "src/landing/components/StartupProductPage.tsx"]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(/PILOT_TERMS|PILOT_SENTENCE|PilotSentenceText|pilot-signup-notice/);
    }
  });
});
