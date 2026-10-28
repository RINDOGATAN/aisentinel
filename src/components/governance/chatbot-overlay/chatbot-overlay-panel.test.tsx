// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The overlay's summary line counts distinct laws: a law listed under several
 * controls (or twice under one) is one law, in force when any of its entries
 * is in force, otherwise upcoming.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import {
  EMPTY_CHATBOT_FACTS,
  chatbotControlViews,
  chatbotWatchList,
  countDistinctLaws,
} from "@/config/chatbot-overlay";

const PLACES = ["EU", "US_CA", "US_NY", "US_WA", "US_CO"];
const TODAY = "2026-10-27";

const views = chatbotControlViews(PLACES, TODAY);
const DATA = {
  enabled: true as const,
  facts: { ...EMPTY_CHATBOT_FACTS, interactsWithConsumers: "YES" as const },
  state: "APPLIES" as const,
  places: PLACES,
  placesDeclared: true,
  today: TODAY,
  controls: views.map((v) => ({
    id: v.control.id,
    number: v.control.number,
    title: v.control.title,
    duty: v.control.duty,
    keeps: v.control.keeps,
    requirementId: null,
    status: null,
    evidenceCount: 0,
    inForce: v.inForce,
    upcoming: v.upcoming,
    laws: v.laws.map((l) => ({
      lawId: l.law.id,
      name: l.law.name,
      reaches: l.law.reaches,
      source: l.law.source,
      citation: l.entry.citation,
      appliesFrom: l.entry.appliesFrom,
      adds: l.entry.adds,
      timing: l.timing,
      places: l.places,
    })),
  })),
  watchList: chatbotWatchList(PLACES),
  counsel: { items: [] as string[] },
  version: "test",
  lawReviewedAsOf: TODAY,
  reviewMarker: { en: "Reviewed", es: "Revisado" },
  signedOff: true,
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({}),
    chatbotOverlay: {
      getForSystem: { useQuery: () => ({ data: DATA, isLoading: false }) },
      setFacts: { useMutation: () => ({ mutate: () => undefined, isPending: false }) },
      setCounsel: { useMutation: () => ({ mutate: () => undefined, isPending: false }) },
    },
  },
}));

import { ChatbotOverlayPanel } from "./chatbot-overlay-panel";

const render = (locale: "en" | "es") =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en} timeZone="UTC">
      <ChatbotOverlayPanel organizationId="o" aiSystemId="s" canDecide={false} canWrite={false} />
    </NextIntlClientProvider>,
  );

describe("distinct law counts", () => {
  it("counts a law once, in force when any entry is in force", () => {
    expect(
      countDistinctLaws([
        { lawId: "a", timing: "UPCOMING" },
        { lawId: "a", timing: "IN_FORCE" },
        { lawId: "a", timing: "UPCOMING" },
        { lawId: "b", timing: "UPCOMING" },
        { lawId: "b", timing: "UPCOMING" },
        { lawId: "c", timing: "IN_FORCE" },
      ]),
    ).toEqual({ inForce: 2, upcoming: 1 });
    expect(countDistinctLaws([])).toEqual({ inForce: 0, upcoming: 0 });
  });

  it("adds up to the number of distinct laws for the declared places", () => {
    const ids = new Set(views.flatMap((v) => v.laws.map((l) => l.law.id)));
    const entries = views.reduce((n, v) => n + v.laws.length, 0);
    const counts = countDistinctLaws(views.flatMap((v) => v.laws.map((l) => ({ lawId: l.law.id, timing: l.timing }))));
    expect(counts.inForce + counts.upcoming).toBe(ids.size);
    // The places chosen list some laws under more than one control.
    expect(entries).toBeGreaterThan(ids.size);
  });

  it("counts a law listed twice under one control once in that control's badge", () => {
    for (const v of views) {
      const ids = new Set(v.laws.map((l) => l.law.id));
      expect(v.inForce + v.upcoming).toBe(ids.size);
    }
  });

  it("writes the distinct counts in the summary line, in English and in Spanish", () => {
    const { inForce, upcoming } = countDistinctLaws(DATA.controls.flatMap((c) => c.laws));
    const summed = {
      inForce: DATA.controls.reduce((n, c) => n + c.inForce, 0),
      upcoming: DATA.controls.reduce((n, c) => n + c.upcoming, 0),
    };
    expect(summed.inForce + summed.upcoming).toBeGreaterThan(inForce + upcoming);

    const enLaw = (n: number) => `${n} ${n === 1 ? "law" : "laws"} in force`;
    expect(render("en")).toContain(`For your places: ${enLaw(inForce)} and ${upcoming} upcoming.`);
    const esLaw = (n: number) => `${n} ${n === 1 ? "ley" : "leyes"} en vigor`;
    const esNext = (n: number) => `${n} ${n === 1 ? "próxima" : "próximas"}`;
    expect(render("es")).toContain(`En tus lugares: ${esLaw(inForce)} y ${esNext(upcoming)}.`);
  });
});
