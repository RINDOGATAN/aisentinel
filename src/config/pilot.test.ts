// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  HOSTED_COOKIE_DOMAIN,
  PILOT_CEILINGS,
  PILOT_CEILING_KEYS,
  PILOT_CEILING_LABELS,
  PILOT_EDIT_DAYS,
  PILOT_LIVE_FROM,
  PILOT_RUN_URL,
  PILOT_SENTENCE,
  PILOT_TERMS,
  pilotFirstSignInStamp,
  hostedPilotActive,
  pilotCeilingMessage,
  pilotClock,
  pilotExportUrl,
  pilotOneOrganizationMessage,
  pilotReadOnlyMessage,
  pilotSentenceText,
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

describe("the editing clock: 90 days from the first sign-in after the pilot went live", () => {
  const day = 24 * 60 * 60 * 1000;
  const firstSignIn = new Date("2026-10-01T10:00:00.000Z");

  it("runs ninety days from the organisation's first sign-in", () => {
    expect(PILOT_EDIT_DAYS).toBe(90);
    const clock = pilotClock(firstSignIn, firstSignIn);
    expect(clock.startedAt).toEqual(firstSignIn);
    expect(clock.daysLeft).toBe(90);
    expect(clock.readOnly).toBe(false);
  });

  it("counts down and switches to read-only on day ninety-one", () => {
    expect(pilotClock(firstSignIn, new Date(firstSignIn.getTime() + 30 * day)).daysLeft).toBe(60);
    const lastDay = pilotClock(firstSignIn, new Date(firstSignIn.getTime() + 90 * day - 1));
    expect(lastDay.daysLeft).toBe(1);
    expect(lastDay.readOnly).toBe(false);
    const over = pilotClock(firstSignIn, new Date(firstSignIn.getTime() + 90 * day));
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
    expect(clock.daysLeft).toBe(90);
    expect(clock.readOnly).toBe(false);
    expect(pilotClock(undefined, muchLater).readOnly).toBe(false);
  });

  it("never starts before the deployment date", () => {
    const beforeLive = new Date("2026-03-01T00:00:00.000Z");
    expect(pilotFirstSignInStamp(beforeLive)).toEqual(PILOT_LIVE_FROM);
    const clock = pilotClock(beforeLive, PILOT_LIVE_FROM);
    expect(clock.startedAt).toEqual(PILOT_LIVE_FROM);
    expect(clock.daysLeft).toBe(90);
    expect(clock.readOnly).toBe(false);
    expect(pilotFirstSignInStamp(firstSignIn)).toEqual(firstSignIn);
  });

  it("states the rule in the words the other suite apps use, in both languages", () => {
    expect(PILOT_TERMS.en).toBe("90 days of editing from your first sign-in, then read-only with export.");
    expect(PILOT_TERMS.es).toBe(
      "90 días de edición desde tu primer inicio de sesión y después solo lectura con exportación.",
    );
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
      expect(ceiling).toContain(PILOT_RUN_URL);
      expect(ceiling).toContain(exportUrl);
      const readOnly = pilotReadOnlyMessage(locale, exportUrl);
      expect(readOnly).toContain("90");
      expect(readOnly).toContain(PILOT_RUN_URL);
      expect(readOnly).toContain(exportUrl);
      expect(pilotOneOrganizationMessage(locale)).toContain(PILOT_RUN_URL);
    }
  });

  it("carries the one sentence in both languages, with the link on the way out", () => {
    // The wording agreed across the suite on 20 September 2026, word for word.
    expect(pilotSentenceText("en")).toBe(
      "Hosted pilot: free, capped (see docs), and with no contractual safeguards. To deploy real customer details, run your own instance.",
    );
    expect(pilotSentenceText("es")).toBe(
      "Piloto alojado: gratuito, limitado (ver documentación) y sin garantías contractuales. Para manejar datos reales de clientes, usa tu propia instancia.",
    );
    expect(PILOT_SENTENCE.en.docs).toBe("see docs");
    expect(PILOT_SENTENCE.en.link).toBe("run your own instance");
    expect(PILOT_SENTENCE.es.docs).toBe("ver documentación");
    expect(PILOT_SENTENCE.es.link).toBe("usa tu propia instancia");
    expect(PILOT_RUN_URL).toBe("https://www.todo.law/run");
  });

  it("leaves certification to the disclosure: the sentence does not mention it, and has no long dash", () => {
    for (const locale of ["en", "es"] as const) {
      expect(pilotSentenceText(locale)).not.toMatch(/certific/i);
      expect(pilotSentenceText(locale)).not.toMatch(/[—–]/);
    }
  });
});
