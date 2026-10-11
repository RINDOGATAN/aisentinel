// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The public docs follow the offer as it stands (owner, 10 Oct 2026): a free, capped
 * pilot, a paid plan or a managed instance for real data, three hosting options, no
 * six-week engagement, and none of the retired pilot warnings (see FORBIDDEN).
 * The pilot disclosure people acknowledge (src/config/pilot-disclosure.ts) is legal
 * wording versioned on its own and is not covered here.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

const strings = (x: unknown): string[] =>
  typeof x === "string" ? [x] : Array.isArray(x) ? x.flatMap(strings) : x && typeof x === "object" ? Object.values(x).flatMap(strings) : [];

const pilotPage = readFileSync(join(__dirname, "pilot", "page.tsx"), "utf-8");

// Built from fragments so this file does not itself trip the old-phrase scan in pilot-copy.test.ts.
const FORBIDDEN = new RegExp(
  [
    "six[- ]week",
    "seis semanas",
    "runbook",
    "manual de operación",
    "no (independent |security )?certification",
    "sin certificación",
    ["no contractual", "safeguards"].join(" "),
    ["sin garantías", "contractuales"].join(" "),
    "enterprise[- ]grade",
    "nivel empresarial",
    "pre-?audited",
    "preauditad",
  ].join("|"),
  "i",
);

describe("public docs follow the current offer", () => {
  it.each([
    ["en", en],
    ["es", es],
  ] as const)("%s docs strings carry no retired offer wording", (_l, messages) => {
    const bad = strings(messages.docs).filter((s) => FORBIDDEN.test(s));
    expect(bad).toEqual([]);
  });

  it("the pilot page carries no retired offer wording", () => {
    expect(pilotPage).not.toMatch(FORBIDDEN);
  });

  it("the pilot page states the three hosting options and the paid plan in both languages", () => {
    for (const title of ["In the TODO.LAW cloud", "Managed virtual server", "Your own hardware", "En la nube de TODO.LAW", "Servidor virtual gestionado", "Tu propio hardware"]) {
      expect(pilotPage).toContain(title);
    }
    expect(pilotPage).toContain("179 € al mes o 1.800 € al año");
    expect(pilotPage).not.toMatch(/\$\s?\d/);
  });

  it("Spanish docs strings never show dollars or use usted", () => {
    const bad = strings(es.docs).filter((s) => /\$\s?\d|\d\s?\$|\bUSD\b|\busted(es)?\b|vosotros/.test(s));
    expect(bad).toEqual([]);
  });
});
