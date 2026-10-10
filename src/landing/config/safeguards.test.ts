// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The safeguards guide's level table (owner's mockup, 10 Oct 2026): every answer row and
 * every level-to-way row, in both markets. Ported from the storefront's
 * src/content/safeguards.test.ts; the AI wording checks follow this product (the record
 * details an AI draft uses, not "the selected text").
 */
import { describe, it, expect } from "vitest";
import { COPY, LADDER, QUESTIONS, WAY_CARD, levelOf, optionsFor, pickWay, recommend, requirementsOf, type Answers, type Locale } from "./safeguards";
import en from "../i18n/en/ai-sentinel-startups.json";
import es from "../i18n/es/ai-sentinel-startups.json";

const LOCALES: Locale[] = ["en", "es"];

/** Question, answer, minimum level: the mockup's first table. */
const ROWS: [keyof Answers, string, number][] = [
  ["loc", "any", 0],
  ["loc", "servers", 2],
  ["data", "test", 0],
  ["data", "real", 1],
  ["data", "special", 1],
  ["ai", "none", 0],
  ["ai", "ext", 0],
  ["ai", "key", 1],
  ["ai", "local", 1],
  ["iso", "yes", 1],
  ["iso", "no", 0],
  ["it", "yes", 0],
  ["it", "no", 0],
  ["cert", "yes", 2],
  ["cert", "no", 0],
];

describe.each(LOCALES)("level table (%s)", (locale) => {
  it.each(ROWS)("%s = %s sets level %i", (q, v, level) => {
    expect(levelOf({ [q]: v }, locale)).toBe(level);
  });

  it("takes the highest level any answer asks for", () => {
    expect(levelOf({ data: "real", ai: "ext" }, locale)).toBe(1);
    expect(levelOf({ data: "real", cert: "yes" }, locale)).toBe(2);
    expect(levelOf({ iso: "no", it: "no", data: "test" }, locale)).toBe(0);
  });

  it("counts unanswered questions as the lightest answer", () => {
    expect(levelOf({}, locale)).toBe(0);
    expect(recommend({}, locale)).toBeNull();
  });

  it("level 0 leads to the cloud and level 1 to managed", () => {
    expect(pickWay({ loc: "any" }, locale)).toBe("cloud");
    expect(pickWay({ data: "real" }, locale)).toBe("managed");
    expect(pickWay({ ai: "key" }, locale)).toBe("managed");
    expect(pickWay({ iso: "yes" }, locale)).toBe("managed");
  });

  it("sends special-category or privileged data to managed", () => {
    expect(pickWay({ data: "special" }, locale)).toBe("managed");
  });

  it("sends 'local models only' to managed, which meets it (owner, 10 Oct 2026)", () => {
    expect(pickWay({ ai: "local" }, locale)).toBe("managed");
    expect(pickWay({ ai: "local", it: "no" }, locale)).toBe("managed");
    const r = recommend({ ai: "local" }, locale)!;
    expect(r.checks).toEqual([{ key: "ai:local", met: true }]);
  });

  it("has copy for every option it offers and a note for every way on the ladder", () => {
    const c = COPY[locale];
    for (const q of QUESTIONS) for (const o of optionsFor(q, locale)) expect(c.questions[q.id].options[o.value]).toBeTruthy();
    for (const w of LADDER[locale]) expect(c.summaries[w]).toBeTruthy();
    // Every requirement reachable in this market has a label and a note for every way it can be shown against.
    for (const q of QUESTIONS)
      for (const o of optionsFor(q, locale))
        for (const k of requirementsOf({ [q.id]: o.value }, locale)) {
          expect(c.safeguards[k]).toBeTruthy();
          for (const w of LADDER[locale]) expect(c.notes[k][w]).toBeTruthy();
        }
  });
});

describe("level 2 in Spain: three ways only", () => {
  it.each([
    [{ loc: "servers" }],
    [{ cert: "yes" }],
    [{ loc: "servers", it: "yes" }],
    [{ loc: "servers", ai: "local", it: "no" }],
  ] as Answers[][])("%o leads to Despliegue y formación", (a) => {
    expect(pickWay(a, "es")).toBe("deploy");
  });

  it("does not offer 'inside our office' and ignores it if it arrives", () => {
    const loc = QUESTIONS.find((q) => q.id === "loc")!;
    expect(optionsFor(loc, "es").map((o) => o.value)).toEqual(["any", "servers"]);
    expect(levelOf({ loc: "office" }, "es")).toBe(0);
    expect(requirementsOf({ loc: "office" }, "es")).toEqual([]);
  });

  it("never recommends or neighbours the kit or the Box", () => {
    const values = QUESTIONS.map((q) => optionsFor(q, "es").map((o) => o.value));
    // Every combination of answers (unanswered included).
    const combos = values.reduce<Answers[]>(
      (acc, opts, i) => acc.flatMap((a) => [a, ...opts.map((v) => ({ ...a, [QUESTIONS[i].id]: v }))]),
      [{}],
    );
    for (const a of combos) {
      const r = recommend(a, "es");
      if (!r) continue;
      expect(["cloud", "managed", "deploy"]).toContain(r.way);
      for (const n of [r.up, r.down]) if (n) expect(["cloud", "managed", "deploy"]).toContain(n.way);
    }
  });
});

describe("level 2 in English: five ways", () => {
  it("leads to the kit with an IT team", () => {
    expect(pickWay({ loc: "servers", it: "yes" }, "en")).toBe("kit");
    expect(pickWay({ cert: "yes", it: "yes" }, "en")).toBe("kit");
    expect(pickWay({ loc: "office", it: "yes" }, "en")).toBe("kit");
  });

  it("leads to the Box with no IT team and the office or local models only", () => {
    expect(levelOf({ loc: "office" }, "en")).toBe(2);
    expect(pickWay({ loc: "office", it: "no" }, "en")).toBe("box");
    // local models only no longer reaches level 2 by itself; with own servers it still steers to the Box
    expect(pickWay({ loc: "servers", ai: "local", it: "no" }, "en")).toBe("box");
  });

  it("leads to Deployment and capability with no IT team otherwise, or when the IT question is unanswered", () => {
    expect(pickWay({ loc: "servers", it: "no" }, "en")).toBe("deploy");
    expect(pickWay({ cert: "yes", it: "no" }, "en")).toBe("deploy");
    expect(pickWay({ loc: "servers" }, "en")).toBe("deploy");
    expect(pickWay({ loc: "office" }, "en")).toBe("deploy");
  });

  it("lists the safeguards each neighbour would not meet", () => {
    const r = recommend({ loc: "servers", it: "no", data: "real" }, "en")!;
    expect(r.way).toBe("deploy");
    expect(r.checks.every((c) => c.met)).toBe(true);
    expect(r.up).toEqual({ way: "box", missing: [] });
    expect(r.down).toEqual({ way: "kit", missing: ["it:no"] });
    const cloud = recommend({ loc: "any" }, "en")!;
    expect(cloud.down).toBeNull();
    expect(cloud.up?.way).toBe("managed");
    expect(recommend({ loc: "office", it: "no" }, "en")!.up).toBeNull();
  });
});

describe("copy rules", () => {
  const all = (locale: Locale) => JSON.stringify(COPY[locale]);

  it("states no prices, no long dashes and no certification marks", () => {
    for (const l of LOCALES) {
      expect(all(l)).not.toMatch(/[$€]|\d{3}\s?(USD|EUR)|—|–|SOC\s?2|®|™/);
      expect(all(l)).not.toMatch(/guarantee|garantizamos/i);
    }
  });

  it("Spanish has no kit, hardware, Box or Docker, no 'ejecut', and uses tú", () => {
    const es = all("es");
    expect(es).not.toMatch(/\bkit\b|hardware|\bBox\b|Docker|Instalador local|ejecut/i);
    expect(es).not.toMatch(/\busted(es)?\b|vosotros|\bvuestr/i);
  });

  it("managed is hosted in Asturias with open-weight models on the instance; the cloud states EU, pilot, shared, no certification", () => {
    expect(COPY.en.summaries.managed).toBe(
      "An isolated instance we run for your organization alone, hosted in Asturias, Spain. Your records stay on that instance. AI features stay off until you turn them on, and can use open-weight models hosted on the instance itself, so the record details do not leave it, or your own provider key.",
    );
    expect(COPY.es.summaries.managed).toBe(
      "Una instancia aislada que operamos nosotros, solo para tu organización, alojada en Asturias (España). Tus registros se quedan en esa instancia. Las funciones de IA están desactivadas hasta que las activas, y pueden usar modelos de pesos abiertos alojados en la propia instancia, de modo que los datos del registro no salen de ella, o la clave de tu propio proveedor.",
    );
    // AI Sentinel sends record details to a draft, never "the selected text".
    for (const l of LOCALES) expect(all(l)).not.toMatch(/selected text|texto seleccionado/);
    // No unqualified "your data stays" where AI could send text out.
    for (const l of LOCALES) expect(all(l)).not.toMatch(/Your data stays on (that instance|your servers|your hardware)|Tus datos se quedan/);
    expect(COPY.en.summaries.cloud).toMatch(/capped pilot[\s\S]*test records[\s\S]*shared[\s\S]*no service level or independent certification/);
    expect(COPY.es.summaries.cloud).toMatch(/piloto[\s\S]*con límites[\s\S]*registros de prueba[\s\S]*comparte[\s\S]*certificación independiente/);
  });

  it("leaves the classifier sentence out of the panel", () => {
    for (const l of LOCALES) expect(COPY[l].whyP).not.toMatch(/classifier|clasificador/i);
    // The panel names the box as this landing does (its title is "TODO.LAW hardware").
    expect(COPY.en.whyP).toMatch(/On the managed instance, on your own servers or on TODO\.LAW hardware, AI features/);
    expect(COPY.es.whyP).toMatch(/En la instancia gestionada o si lo instalas en tus servidores, las funciones de IA pueden usar modelos de pesos abiertos/);
    expect(COPY.en.whyP).not.toMatch(/the Box/);
    expect(COPY.es.whyP).not.toMatch(/Box/);
  });

  it("English uses US spelling", () => {
    expect(all("en")).not.toMatch(/organisation|licence|colour|programme|centre/);
  });

  it("keeps ISO 27001 as the example in question 6; names Asturias only for managed and the EU for the cloud", () => {
    expect(COPY.en.questions.cert.label).toMatch(/for example ISO 27001/);
    expect(COPY.es.questions.cert.label).toMatch(/por ejemplo, ISO 27001/);
    // The cloud is hosted in the EU (Frankfurt); the one place named is the managed instance's Asturias. The cloud is never said to be in the United States.
    for (const l of LOCALES) expect(all(l)).not.toMatch(/United States|Estados Unidos|EE\. ?UU|Frankfurt/);
    expect(COPY.en.summaries.cloud).toMatch(/Hosted by us in the EU[\s\S]*may be outside the EU/);
    expect(COPY.es.summaries.cloud).toMatch(/en la UE[\s\S]*puede estar fuera de la UE/);
    for (const l of LOCALES) {
      const { managed, ...rest } = COPY[l].summaries;
      expect(managed).toMatch(/Asturias/);
      expect(JSON.stringify(rest)).not.toMatch(/Asturias|Spain|España/);
    }
  });

  it("says AI is off until an administrator turns it on, with no AI call while off", () => {
    expect(COPY.en.whyP).toMatch(/off until an administrator turns them on[\s\S]*no AI calls at all/);
    expect(COPY.es.whyP).toMatch(/desactivadas hasta que un administrador las activa[\s\S]*ninguna llamada a una IA/);
  });
});

describe("way names come from this landing's boxes", () => {
  const dicts: Record<Locale, Record<string, string>> = { en, es };

  it.each(LOCALES)("every way on the %s ladder has a box with a title", (l) => {
    expect(Object.keys(WAY_CARD[l]).sort()).toEqual([...LADDER[l]].sort());
    for (const w of LADDER[l]) expect(dicts[l][`${l}.ways.w${WAY_CARD[l][w]}.title`]).toBeTruthy();
  });

  it("numbers the boxes in the landing's order", () => {
    expect(WAY_CARD.en).toEqual({ cloud: 1, kit: 2, box: 3, managed: 4, deploy: 5 });
    expect(WAY_CARD.es).toEqual({ cloud: 1, managed: 2, deploy: 3 });
  });
});
