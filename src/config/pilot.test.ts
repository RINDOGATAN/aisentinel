// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  HOSTED_COOKIE_DOMAIN,
  PILOT_CEILINGS,
  PILOT_CEILING_KEYS,
  PILOT_CEILING_LABELS,
  PILOT_EDIT_DAYS,
  PILOT_EDIT_DAYS_BEFORE_SHORTENING,
  PILOT_WINDOW_SHORTENED_AT,
  pilotEndsAt,
  PILOT_LIVE_FROM,
  PILOT_MANAGED_URL,
  PILOT_RUN_URL,
  PILOT_PRICING_URL,
  PILOT_SIGN_IN_LINE,
  PILOT_TERMS,
  pilotFirstSignInStamp,
  hostedPilotActive,
  pilotCeilingMessage,
  pilotClock,
  pilotExportUrl,
  pilotOneOrganizationMessage,
  pilotReadOnlyMessage,
  resolveCookieDomain,
} from "./pilot";

/** The deployments this product actually has. */
const HOSTED_PRODUCTION = { VERCEL: "1", VERCEL_ENV: "production" };
const HOSTED_PREVIEW = { VERCEL: "1", VERCEL_ENV: "preview" };
const KIT = {
  NEXT_PUBLIC_STRIPE_ENABLED: "false",
  NEXT_PUBLIC_ALL_SKILLS_FREE: "true",
  NEXT_PUBLIC_LOCAL_AUTH_ENABLED: "true",
};
const LOCAL_DEV = { NODE_ENV: "development" };

describe("recognising the hosted pilot", () => {
  it("is on for the hosted production deployment", () => {
    expect(hostedPilotActive(HOSTED_PRODUCTION)).toBe(true);
  });

  it("is on wherever the session cookie is scoped to the hosted domain", () => {
    // A preview on the platform defaults to the hosted cookie domain, the
    // same way the auth guards treat it.
    expect(hostedPilotActive(HOSTED_PREVIEW)).toBe(true);
    expect(hostedPilotActive({ AUTH_COOKIE_DOMAIN: HOSTED_COOKIE_DOMAIN })).toBe(true);
  });

  it("is off for the kit and for local development", () => {
    expect(hostedPilotActive(KIT)).toBe(false);
    expect(hostedPilotActive(LOCAL_DEV)).toBe(false);
    expect(hostedPilotActive({})).toBe(false);
  });

  it("is off on the platform when the cookie is made host-only and the environment is not production", () => {
    expect(hostedPilotActive({ VERCEL: "1", VERCEL_ENV: "preview", AUTH_COOKIE_DOMAIN: "" })).toBe(false);
  });

  it("can be forced either way", () => {
    expect(hostedPilotActive({ ...KIT, NEXT_PUBLIC_HOSTED_PILOT: "true" })).toBe(true);
    expect(hostedPilotActive({ ...HOSTED_PRODUCTION, NEXT_PUBLIC_HOSTED_PILOT: "false" })).toBe(false);
  });

  it("resolves the cookie domain the way the auth guards do", () => {
    expect(resolveCookieDomain({ VERCEL: "1" })).toBe(HOSTED_COOKIE_DOMAIN);
    expect(resolveCookieDomain({})).toBeUndefined();
    expect(resolveCookieDomain({ VERCEL: "1", AUTH_COOKIE_DOMAIN: "" })).toBeUndefined();
    expect(resolveCookieDomain({ AUTH_COOKIE_DOMAIN: ".example.test" })).toBe(".example.test");
  });
});

describe("the editing clock: 15 days from the first sign-in after the pilot went live", () => {
  const day = 24 * 60 * 60 * 1000;
  // After the window was shortened, so the plain rule applies.
  const firstSignIn = new Date("2026-11-01T10:00:00.000Z");

  it("runs fifteen days from the organisation's first sign-in", () => {
    expect(PILOT_EDIT_DAYS).toBe(15);
    const clock = pilotClock(firstSignIn, firstSignIn);
    expect(clock.startedAt).toEqual(firstSignIn);
    expect(clock.daysLeft).toBe(15);
    expect(clock.readOnly).toBe(false);
  });

  it("counts down and switches to read-only on day sixteen", () => {
    expect(pilotClock(firstSignIn, new Date(firstSignIn.getTime() + 10 * day)).daysLeft).toBe(5);
    const lastDay = pilotClock(firstSignIn, new Date(firstSignIn.getTime() + 15 * day - 1));
    expect(lastDay.daysLeft).toBe(1);
    expect(lastDay.readOnly).toBe(false);
    const over = pilotClock(firstSignIn, new Date(firstSignIn.getTime() + 15 * day));
    expect(over.daysLeft).toBe(0);
    expect(over.readOnly).toBe(true);
    expect(pilotClock(firstSignIn, new Date(firstSignIn.getTime() + 400 * day)).daysLeft).toBe(0);
  });

  it("with no recorded first sign-in, gives the full window from now, whatever the organisation's age", () => {
    // An organisation created long ago and never signed into since the pilot
    // went live: its window starts at the sign-in being made, not at creation.
    const muchLater = new Date("2027-06-01T00:00:00.000Z");
    const clock = pilotClock(null, muchLater);
    expect(clock.startedAt).toEqual(muchLater);
    expect(clock.daysLeft).toBe(15);
    expect(clock.readOnly).toBe(false);
    expect(pilotClock(undefined, muchLater).readOnly).toBe(false);
  });

  it("never starts before the deployment date", () => {
    const beforeLive = new Date("2026-03-01T00:00:00.000Z");
    expect(pilotFirstSignInStamp(beforeLive)).toEqual(PILOT_LIVE_FROM);
    const clock = pilotClock(beforeLive, PILOT_LIVE_FROM);
    expect(clock.startedAt).toEqual(PILOT_LIVE_FROM);
    // Started before the window was shortened: the transition rule applies.
    expect(clock.endsAt).toEqual(new Date(PILOT_WINDOW_SHORTENED_AT.getTime() + 15 * day));
    expect(clock.readOnly).toBe(false);
    expect(clock.readOnly).toBe(false);
    expect(pilotFirstSignInStamp(firstSignIn)).toEqual(firstSignIn);
  });

  it("states the rule in the words the other suite apps use, in both languages", () => {
    expect(PILOT_TERMS.en).toBe("15 days of editing from your first sign-in, then read-only with export.");
    expect(PILOT_TERMS.es).toBe(
      "15 días de edición desde tu primer inicio de sesión; después, solo lectura con exportación.",
    );
  });
});

describe("the transition when the window went from 90 to 15 days (11 Oct 2026)", () => {
  const day = 24 * 60 * 60 * 1000;
  const shortened = PILOT_WINDOW_SHORTENED_AT.getTime();

  it("takes effect at the end of the release day", () => {
    expect(PILOT_WINDOW_SHORTENED_AT.toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(PILOT_EDIT_DAYS_BEFORE_SHORTENING).toBe(90);
  });

  it("gives an organisation already in its pilot the earlier of its 90-day end and 15 days from the change", () => {
    // Started on the day the pilot went live: 90 days would run to 18 Dec; 15 from the change is earlier.
    expect(pilotEndsAt(PILOT_LIVE_FROM)).toEqual(new Date(shortened + 15 * day));
    // Started the day before the change: the same, never less than 15 days from it.
    const dayBefore = new Date(shortened - day);
    expect(pilotEndsAt(dayBefore)).toEqual(new Date(shortened + 15 * day));
  });

  it("leaves nobody read-only at the release", () => {
    const atRelease = new Date("2026-10-11T18:00:00.000Z");
    for (const start of [PILOT_LIVE_FROM, new Date("2026-10-01T00:00:00.000Z"), new Date("2026-10-11T12:00:00.000Z")]) {
      const clock = pilotClock(start, atRelease);
      expect(clock.readOnly).toBe(false);
      expect(clock.daysLeft).toBeGreaterThanOrEqual(15);
    }
  });

  it("applies the plain 15 days to a first sign-in from the change onwards", () => {
    expect(pilotEndsAt(PILOT_WINDOW_SHORTENED_AT)).toEqual(new Date(shortened + 15 * day));
    const later = new Date("2026-12-01T09:00:00.000Z");
    expect(pilotEndsAt(later)).toEqual(new Date(later.getTime() + 15 * day));
  });
});

describe("the records ceiling", () => {
  it("has a positive ceiling and a label in both languages for every key", () => {
    for (const key of PILOT_CEILING_KEYS) {
      expect(PILOT_CEILINGS[key]).toBeGreaterThan(0);
      expect(PILOT_CEILING_LABELS[key].en).toBeTruthy();
      expect(PILOT_CEILING_LABELS[key].es).toBeTruthy();
    }
  });

  it("caps systems at twenty-five and vendors at fifty", () => {
    expect(PILOT_CEILINGS.systems).toBe(25);
    expect(PILOT_CEILINGS.vendors).toBe(50);
  });
});

describe("what the pilot says", () => {
  it("names the two ways out in both languages when a cap is reached", () => {
    const exportUrl = pilotExportUrl("org-1");
    expect(exportUrl).toBe("/api/export/program-pack?organizationId=org-1");
    for (const locale of ["en", "es"] as const) {
      const ceiling = pilotCeilingMessage(locale, "systems", exportUrl);
      expect(ceiling).toContain("25");
      expect(ceiling).toContain(PILOT_PRICING_URL[locale]);
      expect(ceiling).toContain(exportUrl);
      const readOnly = pilotReadOnlyMessage(locale, exportUrl);
      expect(readOnly).toMatch(locale === "es" ? /periodo de edición/ : /editing window/);
      expect(readOnly).toContain(PILOT_PRICING_URL[locale]);
      expect(readOnly).toContain(exportUrl);
      expect(pilotOneOrganizationMessage(locale)).toContain(PILOT_MANAGED_URL[locale]);
      for (const m of [ceiling, readOnly, pilotOneOrganizationMessage(locale)]) {
        expect(m).not.toMatch(/own instance|propia instancia|todo\.law\/run/);
      }
    }
  });

  it("closes every limit message with the one keep-going link, to the managed wizard in the reader's language", () => {
    const exportUrl = pilotExportUrl("org-1");
    const expected = {
      en: "For a managed instance or your own hardware, ask for a quote (https://www.todo.law/contact/managed).",
      es: "Para una instancia gestionada o tu propio hardware, pide presupuesto (https://www.todo.law/es/contact/managed).",
    };
    for (const locale of ["en", "es"] as const) {
      const other = locale === "en" ? "es" : "en";
      const messages = [
        ...PILOT_CEILING_KEYS.map((key) => pilotCeilingMessage(locale, key, exportUrl)),
        pilotReadOnlyMessage(locale, exportUrl),
      ];
      for (const message of messages) {
        expect(message.endsWith(expected[locale]), message).toBe(true);
        expect(message).not.toContain(PILOT_MANAGED_URL[other]);
        expect(message).not.toContain("/contact/deploy");
      }
    }
  });

  it("states only the editing terms on the sign-in screen, as DPO Central does", () => {
    expect(PILOT_SIGN_IN_LINE.en).toBe(
      "Free pilot: 15 days of editing from your first sign-in, then read-only with export.",
    );
    expect(PILOT_SIGN_IN_LINE.es).toBe(
      "Piloto gratuito: 15 días de edición desde tu primer inicio de sesión; después, solo lectura con exportación.",
    );
    expect(PILOT_RUN_URL).toBe("https://www.todo.law/run");
  });

  it("leaves certification to the disclosure: the sign-in line does not mention it, and has no long dash", () => {
    for (const locale of ["en", "es"] as const) {
      expect(PILOT_SIGN_IN_LINE[locale]).not.toMatch(/certific/i);
      expect(PILOT_SIGN_IN_LINE[locale]).not.toMatch(/[—–]/);
      expect(PILOT_SIGN_IN_LINE[locale]).not.toMatch(/For real data|Para datos reales/);
    }
  });
});
