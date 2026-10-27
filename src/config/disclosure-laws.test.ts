// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { DISCLOSURE_LAWS, disclosureLawsFor } from "./disclosure-laws";
import { stepText } from "@/components/guided/step-why";

const translator = (messages: { guided: Record<string, unknown> }) =>
  (key: string, values?: Record<string, string | number>) => {
    const value = key
      .split(".")
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages.guided);
    if (typeof value !== "string") throw new Error(`missing guided.${key}`);
    return value.replace(/\{(\w+)\}/g, (_, k: string) => String(values?.[k] ?? `{${k}}`));
  };

describe("disclosureLawsFor", () => {
  it("names no law while no place is declared", () => {
    expect(disclosureLawsFor([])).toEqual([]);
  });

  it("names EU AI Act Art. 50 for the EU or the EEA, unless the Act is out of scope", () => {
    expect(disclosureLawsFor(["EU"])).toEqual(["euAiActArt50"]);
    expect(disclosureLawsFor(["EEA"])).toEqual(["euAiActArt50"]);
    expect(disclosureLawsFor(["EU"], ["EU_AI_ACT"])).toEqual([]);
  });

  it("names only the US laws already in the rule data, per declared state", () => {
    expect(disclosureLawsFor(["US_TX", "US_UT", "US_WA"])).toEqual(["texasTraiga", "utahAipa", "washingtonCompanion"]);
    // California, Colorado and the rest carry no disclosure law in the rule data.
    expect(disclosureLawsFor(["US_CA", "US_CO", "US_NY", "UK"])).toEqual([]);
  });
});

describe("the 'Telling people it is AI' step", () => {
  it("stays neutral, with no article, when no law is named", () => {
    for (const messages of [en, es]) {
      const t = translator(messages as never);
      const text = stepText(t, "transparency", "why", [], "en");
      expect(text).not.toMatch(/Art\. 50|art\. 50/);
    }
  });

  it("names the laws of the declared places in both languages", () => {
    const tEn = translator(en as never);
    expect(stepText(tEn, "transparency", "why", ["euAiActArt50", "utahAipa"], "en")).toContain(
      "EU AI Act Art. 50 and the Utah AI Policy Act",
    );
    const tEs = translator(es as never);
    expect(stepText(tEs, "transparency", "why", ["euAiActArt50", "utahAipa"], "es")).toContain(
      "art. 50 del RIA y la Ley de Política de IA de Utah",
    );
  });

  it("has a name for every law in both languages, and other steps are untouched", () => {
    for (const messages of [en, es]) {
      const t = translator(messages as never);
      for (const id of DISCLOSURE_LAWS) expect(t(`disclosureLaws.${id}`)).toBeTruthy();
      expect(stepText(t, "oversight", "why", ["euAiActArt50"], "en")).toBe(t("steps.oversight.why"));
    }
  });
});
