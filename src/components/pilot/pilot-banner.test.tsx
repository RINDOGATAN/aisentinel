// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The banner is on every hosted page and on no page of the kit. The decision
 * is a pure function of the environment and the session cookie; the markup
 * is rendered here without the app shell to prove the sentence and the link.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PILOT_BANNER_DISMISSED,
  PILOT_RUN_URL,
  PILOT_SENTENCE,
  pilotBannerVisible,
  pilotSentenceText,
} from "@/config/pilot";
import { DISCLOSURE_DOCS_PATH } from "@/config/pilot-disclosure";
import { PilotBanner } from "./pilot-banner";

const HOSTED = { VERCEL: "1", VERCEL_ENV: "production" };
const KIT = { NEXT_PUBLIC_ALL_SKILLS_FREE: "true", NEXT_PUBLIC_LOCAL_AUTH_ENABLED: "true" };

describe("where the banner shows", () => {
  it("shows on the hosted pilot until dismissed for the session", () => {
    expect(pilotBannerVisible(HOSTED, undefined)).toBe(true);
    expect(pilotBannerVisible(HOSTED, PILOT_BANNER_DISMISSED)).toBe(false);
    expect(pilotBannerVisible(HOSTED, "anything-else")).toBe(true);
  });

  it("never shows on the kit, dismissed or not", () => {
    expect(pilotBannerVisible(KIT, undefined)).toBe(false);
    expect(pilotBannerVisible({}, undefined)).toBe(false);
  });
});

describe("what the banner says", () => {
  it.each(["en", "es"] as const)("renders the one sentence with its two links: the docs and /run (%s)", (locale) => {
    const html = renderToStaticMarkup(
      <PilotBanner
        locale={locale}
        sentence={PILOT_SENTENCE[locale]}
        dismissLabel={locale === "es" ? "Cerrar" : "Dismiss"}
      />,
    );
    expect(html).toContain('data-testid="pilot-banner"');
    expect(html).toContain(PILOT_SENTENCE[locale].before);
    expect(html).toContain(`href="${DISCLOSURE_DOCS_PATH}"`);
    expect(html).toContain(`>${PILOT_SENTENCE[locale].docs}</a>`);
    expect(html).toContain(`href="${PILOT_RUN_URL}"`);
    expect(html).toContain(`>${PILOT_SENTENCE[locale].link}</a>`);
    expect(html).toContain(`aria-label="${locale === "es" ? "Cerrar" : "Dismiss"}"`);
    // Read as text, the markup is the agreed sentence and nothing else.
    expect(html.replace(/<[^>]+>/g, "")).toBe(pilotSentenceText(locale));
  });

  it("the sign-up screens and the Settings card add the editing terms, word for word", () => {
    // The banner stays one line; these three show PILOT_TERMS beneath the sentence.
    for (const file of [
      "src/app/(auth)/sign-in/sign-in-form.tsx",
      "src/landing/LandingPage.tsx",
      "src/components/governance/pilot-status-card.tsx",
    ]) {
      expect(readFileSync(join(process.cwd(), file), "utf8"), file).toMatch(/PILOT_TERMS\[\w+\]/);
    }
  });

  it("every copy of the sentence goes through the one renderer, so they change together", () => {
    for (const file of [
      "src/components/pilot/pilot-banner.tsx",
      "src/app/(auth)/sign-in/sign-in-form.tsx",
      "src/landing/components/StartupProductPage.tsx",
      "src/components/governance/pilot-status-card.tsx",
    ]) {
      expect(readFileSync(join(process.cwd(), file), "utf8"), file).toMatch(/<PilotSentenceText\b/);
    }
  });

  it("keeps to one sentence in each language: no price, no module for sale", () => {
    for (const locale of ["en", "es"] as const) {
      const text = pilotSentenceText(locale);
      expect(text.split(". ").length).toBeLessThanOrEqual(2);
      expect(text).not.toMatch(/€|\$|\b60\b/);
    }
  });
});
