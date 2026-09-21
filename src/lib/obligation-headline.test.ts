// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The obligations card once printed "EU prohibited practices and AI literacy
 * are live applied 596 days ago": a title with its own verb poured into a
 * sentence that brought another. This renders the card's two lines for every
 * milestone in the catalogue, at every moment, in both languages, with the
 * real message files, and fails when a label could glue a verb to a title.
 */

import { describe, it, expect } from "vitest";
import { createTranslator } from "next-intl";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import {
  REGULATORY_MILESTONES,
  type MilestoneKind,
} from "@/config/regulatory-milestones";
import {
  headlineMoment,
  headlineTimingKey,
  obligationHeadline,
  type HeadlineMoment,
} from "./obligation-headline";

const MESSAGES = { en, es } as const;
type Locale = keyof typeof MESSAGES;
const LOCALES: Locale[] = ["en", "es"];

const DATE_LABEL: Record<Locale, string> = {
  en: "2 December 2026",
  es: "2 de diciembre de 2026",
};

/** A row at each moment the card can meet; `days` is signed. */
const MOMENTS: { moment: HeadlineMoment; daysRemaining: number; overdue: boolean }[] = [
  { moment: "ahead", daysRemaining: 72, overdue: false },
  { moment: "ahead", daysRemaining: 1, overdue: false },
  { moment: "today", daysRemaining: 0, overdue: false },
  { moment: "overdue", daysRemaining: -50, overdue: true },
  { moment: "overdue", daysRemaining: -1, overdue: true },
  { moment: "inForce", daysRemaining: -596, overdue: false },
];

const KINDS: MilestoneKind[] = [
  "applies",
  "duty-live",
  "deadline",
  "grace-expiry",
  "phase-in",
];

/**
 * The verbs the titles carry. A timing label must carry none of them, which
 * is what makes a doubled verb impossible whatever title follows it.
 */
const TITLE_VERBS: Record<Locale, RegExp> = {
  en: /\b(is|are|was|were|be|apply|applies|applied|live|due|expire|expires|expired|must|comply|required|complete|until)\b/i,
  es: /\b(es|son|está|están|aplica|aplican|aplicó|vence|vencen|vencid[oa]s?|expira|expiran|deben?|cumplir|quedan|vigor|obligatori[oa]s?)\b/i,
};

/** One verb directly after another: the shape of the original defect. */
const DOUBLED: Record<Locale, RegExp> = {
  en: /\b(live|apply|applies|applied|due|expires|comply|required|complete)\s+(is|are|was|applied|applies|apply|expires|due)\b/i,
  es: /\b(vigor|aplican?|vencen?|expiran?|cumplir|obligatorias|completas)\s+(se\s+)?(aplican?|vencen?|expiran?|es|son|está|están)\b/i,
};

function translator(locale: Locale) {
  const t = createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: "obligations",
  } as unknown as Parameters<typeof createTranslator>[0]) as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  return t;
}

describe("the obligations card headline", () => {
  it("names the moment from the signed days and the overdue flag", () => {
    for (const m of MOMENTS) {
      expect(headlineMoment({ kind: "applies", ...m })).toBe(m.moment);
    }
  });

  it("has a message for every kind at every moment, in both languages", () => {
    for (const locale of LOCALES) {
      const t = translator(locale);
      for (const kind of KINDS) {
        for (const m of MOMENTS) {
          const key = headlineTimingKey({ kind, ...m });
          const out = t(key, { days: Math.abs(m.daysRemaining), date: DATE_LABEL[locale] });
          expect(out.trim(), `${locale} ${key}`).not.toBe("");
          // A missing message comes back as its own key.
          expect(out, `${locale} ${key}`).not.toContain("next.timing");
        }
      }
    }
  });

  it("renders every milestone in the catalogue without gluing a verb to its title", () => {
    for (const locale of LOCALES) {
      const t = translator(locale);
      for (const milestone of REGULATORY_MILESTONES) {
        for (const m of MOMENTS) {
          const where = `${locale} ${milestone.id} ${m.moment} ${m.daysRemaining}`;
          const headline = obligationHeadline(
            { kind: milestone.kind, title: milestone.title[locale], ...m },
            DATE_LABEL[locale],
            t,
          );

          expect(headline.timing.trim(), where).not.toBe("");
          expect(headline.title.trim(), where).not.toBe("");
          // The title is shown as written, never rewritten into a sentence.
          expect(headline.title, where).toBe(milestone.title[locale]);
          // The label is a label: no verb of the kind a title carries, and no
          // title inside it.
          expect(headline.timing, where).not.toMatch(TITLE_VERBS[locale]);
          expect(headline.timing, where).not.toContain(milestone.title[locale]);

          // Read together, as a screen reader reads the two lines.
          const spoken = `${headline.timing} ${headline.title}`;
          expect(spoken, where).not.toContain("are live applied");
          expect(spoken, where).not.toMatch(DOUBLED[locale]);
          // And the other way round, which is how the defect was printed.
          expect(`${headline.title} ${headline.timing}`, where).not.toMatch(
            DOUBLED[locale],
          );
          // No long dash in anything the card prints.
          expect(headline.timing, where).not.toMatch(/[—–]/);
        }
      }
    }
  });

  it("would have caught the sentence the card used to print", () => {
    const old = "EU prohibited practices and AI literacy are live applied 596 days ago";
    expect(old).toMatch(DOUBLED.en);
    expect("Las normas están en vigor se aplica desde hace 596 días").toMatch(DOUBLED.es);
  });

  it("uses the singular for one day", () => {
    const one = { kind: "applies" as const, daysRemaining: 1, overdue: false, title: "x" };
    expect(obligationHeadline(one, DATE_LABEL.en, translator("en")).timing).toContain("1 day ");
    expect(obligationHeadline(one, DATE_LABEL.es, translator("es")).timing).toContain("1 día ");
  });
});
