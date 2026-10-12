// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The safeguards guide's level table (owner's mockup, 10 Oct 2026): every answer row and
 * every level-to-way row, in both markets. Ported from the storefront's
 * src/content/safeguards.test.ts; the copy itself is shared word for word (see
 * safeguards.canonical.test.ts).
 */
import { describe, it, expect } from "vitest";
import { COPY, LADDER, QUESTIONS, WAY_CARD, levelOf, meets, optionsFor, pickWay, recommend, requirementsOf, type Answers, type Locale } from "./safeguards";
import en from "../i18n/en/ai-sentinel-startups.json";
import es from "../i18n/es/ai-sentinel-startups.json";

const LOCALES: Locale[] = ["en", "es"];

/** Question, answer, minimum level: the mockup's first table. */
const ROWS: [keyof Answers, string, number][] = [
  ["loc", "any", 0],
  ["loc", "servers", 2],
  ["data", "test", 0],
  ["data", "real", 0],
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
    expect(levelOf({ data: "real", ai: "ext" }, locale)).toBe(0);
    expect(levelOf({ data: "real", ai: "key" }, locale)).toBe(1);
    expect(levelOf({ data: "special", ai: "ext" }, locale)).toBe(1);
    expect(levelOf({ data: "real", cert: "yes" }, locale)).toBe(2);
    expect(levelOf({ iso: "no", it: "no", data: "test" }, locale)).toBe(0);
  });

  it("counts unanswered questions as the lightest answer", () => {
    expect(levelOf({}, locale)).toBe(0);
    expect(recommend({}, locale)).toBeNull();
  });

  it("level 0 leads to the cloud and level 1 to managed", () => {
    expect(pickWay({ loc: "any" }, locale)).toBe("cloud");
    expect(pickWay({ data: "real" }, locale)).toBe("cloud");
    expect(pickWay({ ai: "key" }, locale)).toBe("managed");
    expect(pickWay({ iso: "yes" }, locale)).toBe("managed");
  });

  it("sends special-category or privileged data to managed", () => {
    expect(pickWay({ data: "special" }, locale)).toBe("managed");
  });

  it("sends 'local models only' to managed, which meets it", () => {
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

describe("real client data: the cloud in both markets", () => {
  it("real data sets level 0 (cloud), special categories stay at level 1 (managed)", () => {
    for (const l of LOCALES) {
      expect(levelOf({ data: "real" }, l)).toBe(0);
      expect(pickWay({ data: "real" }, l)).toBe("cloud");
      expect(levelOf({ data: "special" }, l)).toBe(1);
      expect(pickWay({ data: "special" }, l)).toBe("managed");
    }
  });

  it("the cloud meets real data with the sub-processors note, and special categories stay unmet", () => {
    for (const l of LOCALES) {
      expect(meets("cloud", "data:real", l)).toBe(true);
      expect(meets("cloud", "data:special", l)).toBe(false);
      expect(recommend({ data: "real" }, l)!.checks).toEqual([{ key: "data:real", met: true }]);
      expect(recommend({ data: "special" }, l)!.down).toEqual({ way: "cloud", missing: ["data:special"] });
    }
    expect(COPY.en.notes["data:real"].cloud).toBe("Accepted: all our sub-processors have the necessary safeguards and certifications.");
    expect(COPY.es.notes["data:real"].cloud).toBe("Se admiten: todos nuestros subencargados cuentan con las certificaciones y garantías necesarias.");
  });

  it("question 1's first answer is the shared wording", () => {
    expect(COPY.en.questions.loc.options.any).toBe("We could use a SaaS, provided that all sub-processors have the necessary safeguards and certifications");
    expect(COPY.es.questions.loc.options.any).toBe("Pueden estar en nube siempre y cuando todos los subencargados cuenten con las certificaciones y garantías necesarias");
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

// Three ways in English too: level 2 is "Your own hardware".
describe("level 2 in English: three ways", () => {
  it("leads to your own hardware whatever the IT answer", () => {
    for (const it of ["yes", "no", undefined]) {
      expect(pickWay({ loc: "servers", it }, "en")).toBe("deploy");
      expect(pickWay({ loc: "office", it }, "en")).toBe("deploy");
      expect(pickWay({ cert: "yes", it }, "en")).toBe("deploy");
    }
    expect(levelOf({ loc: "office" }, "en")).toBe(2);
  });

  it("offers only the three ways, and names the neighbours", () => {
    expect(LADDER.en).toEqual(["cloud", "managed", "deploy"]);
    const r = recommend({ loc: "servers", it: "no", data: "real" }, "en")!;
    expect(r.way).toBe("deploy");
    expect(r.checks.every((c) => c.met)).toBe(true);
    expect(r.up).toBeNull();
    expect(r.down?.way).toBe("managed");
    const cloud = recommend({ loc: "any" }, "en")!;
    expect(cloud.down).toBeNull();
    expect(cloud.up?.way).toBe("managed");
  });
});

describe("copy rules", () => {
  const all = (locale: Locale) => JSON.stringify(COPY[locale]);

  it("states no prices, no long dashes and no certification marks", () => {
    for (const l of LOCALES) {
      const text = all(l);
      expect(text).not.toMatch(/[$€]|\d{3}\s?(USD|EUR)|—|–|SOC\s?2|®|™/);
      expect(all(l)).not.toMatch(/guarantee|garantizamos/i);
    }
  });

  it("Spanish has no kit, hardware, Box or Docker, no 'ejecut', and uses tú", () => {
    const es = all("es");
    expect(es).not.toMatch(/\bkit\b|hardware|\bBox\b|Docker|Instalador local|ejecut/i);
    expect(es).not.toMatch(/\busted(es)?\b|vosotros|\bvuestr/i);
  });

  it("managed is hosted in Asturias with open-weight models on the instance; the cloud states shared, free start and real data, and never a lack of certification", () => {
    expect(COPY.en.summaries.managed).toBe(
      "An isolated instance we run for your organization alone, hosted in Asturias, Spain. Your records stay on that instance. AI features stay off until you turn them on, and can use open-weight models hosted on the instance itself, so the text does not leave it, or your own provider key.",
    );
    expect(COPY.es.summaries.managed).toBe(
      "Una instancia aislada que operamos nosotros, solo para tu organización, alojada en Asturias (España). Tus registros se quedan en esa instancia. Las funciones de IA están desactivadas hasta que las activas, y pueden usar modelos de pesos abiertos alojados en la propia instancia, de modo que el texto no sale de ella, o la clave de tu propio proveedor.",
    );
    // The AI features send the details of the record being drafted, never "the selected text".
    for (const l of LOCALES) expect(all(l)).not.toMatch(/selected text|texto seleccionado/);
    // No unqualified "your data stays" where AI could send text out.
    for (const l of LOCALES) expect(all(l)).not.toMatch(/Your data stays on (that instance|your servers|your hardware)|Tus datos se quedan/);
    expect(COPY.en.summaries.cloud).toMatch(/shared service[\s\S]*start free[\s\S]*real client data/);
    expect(COPY.es.summaries.cloud).toMatch(/servicio compartido[\s\S]*empezar gratis[\s\S]*datos reales/);
    for (const l of LOCALES) expect(all(l)).not.toMatch(/not for real client data|solo con datos de prueba|solo para registros de prueba/i);
    // "We always have an answer": no line saying we lack a certification.
    for (const l of LOCALES) expect(all(l)).not.toMatch(/no (service level or )?independent certification|no independent certification today|sin certificación independiente|no tenemos certificación independiente/);
  });

  it("leaves the classifier sentence out of the panel", () => {
    for (const l of LOCALES) expect(COPY[l].whyP).not.toMatch(/classifier|clasificador/i);
    expect(COPY.en.whyP).toMatch(/On a managed instance or on your own servers, AI features/);
    expect(COPY.es.whyP).toMatch(/En una instancia gestionada o en tus propios servidores, las funciones de IA pueden usar modelos de pesos abiertos/);
    expect(COPY.en.whyP).not.toMatch(/the Box/);
    expect(COPY.es.whyP).not.toMatch(/Box/);
  });

  it("English uses US spelling", () => {
    expect(all("en")).not.toMatch(/organisation|licence|colour|programme|centre/);
  });

  it("keeps ISO 27001 as the example in question 6; names Asturias only for managed and no location for the cloud", () => {
    expect(COPY.en.questions.cert.label).toMatch(/for example ISO 27001/);
    expect(COPY.es.questions.cert.label).toMatch(/por ejemplo, ISO 27001/);
    // The one place named is the managed instance's Asturias; the copy names no location for the cloud.
    for (const l of LOCALES) expect(all(l)).not.toMatch(/United States|Estados Unidos|EE\. ?UU|Frankfurt|Fráncfort/);
    // English names no hosting location for the cloud.
    expect(COPY.en.summaries.cloud).toMatch(/^Hosted by us, on a shared service/);
    expect(all("en")).not.toMatch(/\bEU\b|Europe/);
    expect(COPY.es.summaries.cloud).toMatch(/puede estar fuera de la UE\.$/);
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
    expect(WAY_CARD.en).toEqual({ cloud: 1, managed: 2, deploy: 3 });
    expect(WAY_CARD.es).toEqual({ cloud: 1, managed: 2, deploy: 3 });
  });
});

describe("the Spanish own-hardware result", () => {
  it("offers our on-site or remote assistance, with no six-week engagement, training or price", () => {
    expect((COPY.es.summaries.deploy ?? "").startsWith("Instalado en tus propios servidores, con nuestra asistencia presencial o remota. ")).toBe(true);
    expect(COPY.es.summaries.deploy).toMatch(/dentro de tu perímetro/);
    const all = JSON.stringify(COPY.es);
    expect(all).not.toMatch(/semanas|formamos|\bformad[oa]|\bformación|manual de operación|15\.000/);
  });
});
