// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The customer-facing chatbot overlay: the triggers, the place mapping, the
 * dates, the switch and the content's integrity. Pure, no database.
 */

import { describe, expect, it } from "vitest";
import {
  CHATBOT_CONTROLS,
  CHATBOT_LAWS,
  CHATBOT_OVERLAY_PLACES,
  CHATBOT_OVERLAY_SIGNOFF_ID,
  CHATBOT_OVERLAY_TAG,
  CHATBOT_REQUIREMENTS,
  CHATBOT_WATCH_LIST,
  COUNSEL_FLAG,
  COUNSEL_ITEMS,
  EMPTY_CHATBOT_FACTS,
  chatbotControlViews,
  chatbotLaw,
  chatbotOverlayInScope,
  chatbotOverlayState,
  chatbotWatchList,
  isoToday,
  lawPlaces,
  lawTiming,
  readChatbotFacts,
  type ChatbotFacts,
} from "./chatbot-overlay";
import {
  CHATBOT_OVERLAY_ONLY_JURISDICTIONS,
  JURISDICTION_IDS,
  jurisdictionsInGroup,
  offeredJurisdictions,
} from "./jurisdictions";
import { LEGAL_SIGNOFF } from "./legal-signoff";
import { CHOOSABLE_FRAMEWORKS } from "./applicability";
import { overlayFrameworksNotInScope } from "./framework-scope";
import { chatbotOverlayEnabled } from "@/server/services/chatbot-overlay/switch";

const facts = (patch: Partial<ChatbotFacts>): ChatbotFacts => ({ ...EMPTY_CHATBOT_FACTS, ...patch });
const NO_ALL = facts({ interactsWithConsumers: "NO", isCompanionChatbot: "NO", minorsMayUse: "NO", handlesSensitiveTopics: "NO" });

describe("triggers", () => {
  it("any yes applies the overlay", () => {
    for (const q of ["interactsWithConsumers", "isCompanionChatbot", "minorsMayUse", "handlesSensitiveTopics"] as const) {
      expect(chatbotOverlayState({ ...NO_ALL, [q]: "YES" })).toBe("APPLIES");
    }
  });
  it("four noes rule it out", () => {
    expect(chatbotOverlayState(NO_ALL)).toBe("DOES_NOT_APPLY");
  });
  it("not sure never switches it off: no yes and one unanswered is undetermined", () => {
    expect(chatbotOverlayState({ ...NO_ALL, minorsMayUse: "NOT_ASSESSED" })).toBe("UNDETERMINED");
    expect(chatbotOverlayState(EMPTY_CHATBOT_FACTS)).toBe("UNDETERMINED");
  });
  it("adds rows only with the switch on and a yes", () => {
    const yes = facts({ isCompanionChatbot: "YES" });
    expect(chatbotOverlayInScope(true, yes)).toBe(true);
    expect(chatbotOverlayInScope(false, yes)).toBe(false);
    expect(chatbotOverlayInScope(true, EMPTY_CHATBOT_FACTS)).toBe(false);
    expect(chatbotOverlayInScope(true, NO_ALL)).toBe(false);
  });
  it("reads the facts from the stored screening facts, the first two shared with the regimes", () => {
    expect(readChatbotFacts({ interactsWithConsumers: "YES", isCompanionChatbot: "NO", minorsMayUse: "maybe" })).toEqual({
      interactsWithConsumers: "YES",
      isCompanionChatbot: "NO",
      minorsMayUse: "NOT_ASSESSED",
      handlesSensitiveTopics: "NOT_ASSESSED",
    });
    expect(readChatbotFacts(null)).toEqual(EMPTY_CHATBOT_FACTS);
  });
});

describe("the switch", () => {
  it("is on only for the exact string true", () => {
    expect(chatbotOverlayEnabled({})).toBe(false);
    expect(chatbotOverlayEnabled({ CHATBOT_OVERLAY_ENABLED: "" })).toBe(false);
    expect(chatbotOverlayEnabled({ CHATBOT_OVERLAY_ENABLED: "TRUE" })).toBe(false);
    expect(chatbotOverlayEnabled({ CHATBOT_OVERLAY_ENABLED: "1" })).toBe(false);
    expect(chatbotOverlayEnabled({ CHATBOT_OVERLAY_ENABLED: "false" })).toBe(false);
    expect(chatbotOverlayEnabled({ CHATBOT_OVERLAY_ENABLED: "true" })).toBe(true);
  });
  it("puts the overlay out of scope while off, and for a system whose facts do not apply it", () => {
    expect(overlayFrameworksNotInScope({ enabled: false })).toEqual(["CHATBOT_OVERLAY"]);
    expect(overlayFrameworksNotInScope({ enabled: false, systemApplies: true })).toEqual(["CHATBOT_OVERLAY"]);
    expect(overlayFrameworksNotInScope({ enabled: true })).toEqual([]);
    expect(overlayFrameworksNotInScope({ enabled: true, systemApplies: false })).toEqual(["CHATBOT_OVERLAY"]);
    expect(overlayFrameworksNotInScope({ enabled: true, systemApplies: true })).toEqual([]);
  });
  it("is never a framework the organization chooses", () => {
    expect(CHOOSABLE_FRAMEWORKS as readonly string[]).not.toContain("CHATBOT_OVERLAY");
  });
});

describe("places", () => {
  it("adds the seven states, offered only while the overlay is on", () => {
    expect([...CHATBOT_OVERLAY_ONLY_JURISDICTIONS].sort()).toEqual([...CHATBOT_OVERLAY_PLACES].sort());
    for (const p of CHATBOT_OVERLAY_PLACES) expect(JURISDICTION_IDS).toContain(p);
    const off = jurisdictionsInGroup("us").map((j) => j.id);
    const on = jurisdictionsInGroup("us", { chatbotOverlay: true }).map((j) => j.id);
    for (const p of CHATBOT_OVERLAY_PLACES) {
      expect(off).not.toContain(p);
      expect(on).toContain(p);
    }
    expect(offeredJurisdictions().map((j) => j.id)).not.toContain("US_OR");
    expect(offeredJurisdictions({ chatbotOverlay: true }).map((j) => j.id)).toContain("US_OR");
  });
  it("brings a law into view only for a declared place", () => {
    const eu = chatbotLaw("eu-ai-act")!;
    expect(lawPlaces(eu, ["EU"])).toEqual(["EU"]);
    expect(lawPlaces(eu, ["EEA", "US_CA"])).toEqual(["EEA"]);
    expect(lawPlaces(eu, ["US_CA"])).toEqual([]);
    expect(lawPlaces(chatbotLaw("or-sb1546")!, ["US_OR"])).toEqual(["US_OR"]);
  });
  it("shows the federal children's rule for any United States place", () => {
    const coppa = chatbotLaw("us-coppa")!;
    expect(lawPlaces(coppa, ["US_FEDERAL"])).toEqual(["US_FEDERAL"]);
    expect(lawPlaces(coppa, ["US_NV"])).toEqual(["US_NV"]);
    expect(lawPlaces(coppa, ["EU"])).toEqual([]);
  });
  it("lists no law with no place declared, and keeps all eight controls", () => {
    const views = chatbotControlViews([], "2026-10-27");
    expect(views).toHaveLength(8);
    expect(views.every((v) => v.laws.length === 0)).toBe(true);
  });
  it("lists only the declared places' laws", () => {
    const views = chatbotControlViews(["US_NY"], "2026-10-27");
    const laws = new Set(views.flatMap((v) => v.laws.map((l) => l.law.id)));
    expect(laws.has("ny-gbl-47")).toBe(true);
    expect(laws.has("us-coppa")).toBe(true);
    expect(laws.has("ca-sb243")).toBe(false);
    expect(laws.has("eu-ai-act")).toBe(false);
  });
  it("shows the watch list only for its places", () => {
    expect(chatbotWatchList(["US_CA"])).toEqual([]);
    expect(chatbotWatchList(["US_NY"]).map((w) => w.id)).toEqual(["ny-s9051b"]);
    expect(chatbotWatchList(["US_CO", "US_NY"])).toHaveLength(2);
  });
});

describe("dates", () => {
  it("marks a law upcoming before its start date and in force from it", () => {
    expect(lawTiming("2027-01-01", "2026-12-31")).toBe("UPCOMING");
    expect(lawTiming("2027-01-01", "2027-01-01")).toBe("IN_FORCE");
    expect(lawTiming(null, "2026-10-27")).toBe("IN_FORCE");
  });
  it("on 27 October 2026, Washington is upcoming and New York in force", () => {
    const views = chatbotControlViews(["US_WA", "US_NY", "US_HI"], "2026-10-27");
    const disclosure = views.find((v) => v.control.id === "ai-disclosure")!;
    const timing = (law: string) => disclosure.laws.find((l) => l.law.id === law)!.timing;
    expect(timing("wa-eshb2225")).toBe("UPCOMING");
    expect(timing("ny-gbl-47")).toBe("IN_FORCE");
    expect(timing("hi-act248")).toBe("IN_FORCE");
    const reports = views.find((v) => v.control.id === "required-reports")!;
    expect(reports.laws.find((l) => l.law.id === "hi-act248")!.timing).toBe("UPCOMING");
    expect(disclosure.inForce + disclosure.upcoming).toBe(disclosure.laws.length);
  });
  it("gives today as an ISO date", () => {
    expect(isoToday(new Date("2026-10-27T23:00:00Z"))).toBe("2026-10-27");
  });
});

describe("content", () => {
  const strings: string[] = [];
  const collect = (l: { en: string; es: string }) => {
    expect(l.en.trim()).not.toBe("");
    expect(l.es.trim()).not.toBe("");
    strings.push(l.en, l.es);
  };

  it("has eight controls, one row each, carrying the overlay tag and no tier", () => {
    expect(CHATBOT_CONTROLS.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(CHATBOT_REQUIREMENTS.map((r) => r.id)).size).toBe(8);
    expect(new Set(CHATBOT_REQUIREMENTS.map((r) => r.code)).size).toBe(8);
    for (const r of CHATBOT_REQUIREMENTS) expect([...r.applicabilityTags]).toEqual([CHATBOT_OVERLAY_TAG]);
  });

  it("cites only laws in the list, with valid places and ISO dates", () => {
    const used = new Set<string>();
    for (const c of CHATBOT_CONTROLS) {
      collect(c.title);
      collect(c.duty);
      c.keeps.forEach(collect);
      for (const l of c.laws) {
        expect(chatbotLaw(l.law), `${c.id}: ${l.law}`).toBeDefined();
        expect(l.citation.trim()).not.toBe("");
        if (l.appliesFrom !== null) expect(l.appliesFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        collect(l.adds);
        used.add(l.law);
      }
    }
    for (const law of CHATBOT_LAWS) {
      expect(used.has(law.id), `${law.id} is not cited by any control`).toBe(true);
      for (const p of law.places) expect(JURISDICTION_IDS).toContain(p);
      expect(law.source).toMatch(/^https:\/\//);
      collect(law.name);
      collect(law.reaches);
    }
    COUNSEL_ITEMS.forEach((c) => {
      collect(c.label);
      collect(c.why);
    });
    CHATBOT_WATCH_LIST.forEach((w) => collect(w.text));
  });

  it("uses no long dashes in anything a customer reads", () => {
    for (const s of strings) expect(s, s).not.toMatch(/[–—]/);
  });

  it("flags features for counsel in the agreed words", () => {
    expect(COUNSEL_FLAG.en).toBe("Needs review by counsel");
    expect(COUNSEL_FLAG.es).toBe("Requiere revisión de un abogado");
    expect(new Set(COUNSEL_ITEMS.map((c) => c.id)).size).toBe(COUNSEL_ITEMS.length);
    expect(COUNSEL_ITEMS.map((c) => c.id)).toContain("not-sure");
  });

  it("stays pending legal sign-off", () => {
    expect(LEGAL_SIGNOFF[CHATBOT_OVERLAY_SIGNOFF_ID]).toEqual({ status: "pending", lawReviewedAsOf: "2026-10-27" });
  });

  it("dates each law as the official sources state", () => {
    const date = (control: string, law: string, citation?: string) =>
      CHATBOT_CONTROLS.find((c) => c.id === control)!.laws.find(
        (l) => l.law === law && (citation === undefined || l.citation === citation),
      )!.appliesFrom;
    expect(date("ai-disclosure", "eu-ai-act")).toBe("2026-08-02");
    expect(date("age-and-minors", "eu-ai-act")).toBe("2025-02-02");
    expect(date("ai-disclosure", "co-hb26-1263")).toBe("2027-01-01");
    expect(date("ai-disclosure", "id-s1297")).toBe("2027-07-01");
    expect(date("ai-disclosure", "ia-sf2417")).toBe("2027-07-01");
    expect(date("ai-disclosure", "ne-lb525")).toBe("2027-07-01");
    expect(date("ai-disclosure", "hi-act248")).toBe("2026-07-14");
    expect(date("ai-disclosure", "ny-gbl-47")).toBe("2025-11-05");
    expect(date("age-and-minors", "ca-sb1119", "Cal. Bus. & Prof. Code § 21811")).toBe("2027-01-01");
    expect(date("age-and-minors", "ca-sb1119", "Cal. Bus. & Prof. Code §§ 21812, 21813")).toBe("2027-07-01");
    expect(date("required-reports", "hi-act248")).toBe("2028-01-01");
    expect(date("required-reports", "ca-sb243")).toBe("2027-07-01");
  });
});
