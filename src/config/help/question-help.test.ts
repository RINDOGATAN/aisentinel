// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { QUESTION_HELP, questionHelp } from "./question-help";

/** FRIA question ids as seeded (fria<section>_<n>), read from the seed source. */
function friaQuestionIds(): string[] {
  const source = readFileSync(
    join(process.cwd(), "scripts", "seed-assessment-templates.ts"),
    "utf8",
  );
  const ids = new Set<string>();
  for (const match of source.matchAll(/id:\s*"(fria\d+_\d+)"/g)) {
    ids.add(match[1]);
  }
  return [...ids];
}

describe("assessment question help", () => {
  it("annotates every FRIA question the seed defines", () => {
    const ids = friaQuestionIds();
    expect(ids.length).toBe(22); // guards against the seed changing unnoticed
    const missing = ids.filter((id) => !questionHelp(id));
    expect(missing).toEqual([]);
  });

  it("every entry is bilingual and complete", () => {
    for (const [id, help] of Object.entries(QUESTION_HELP)) {
      for (const field of [help.meaning, help.example]) {
        expect(field.en.trim().length, `${id} en`).toBeGreaterThan(0);
        expect(field.es.trim().length, `${id} es`).toBeGreaterThan(0);
      }
      if (help.reference) {
        expect(help.reference.en.trim().length, `${id} ref en`).toBeGreaterThan(0);
        expect(help.reference.es.trim().length, `${id} ref es`).toBeGreaterThan(0);
      }
    }
  });
});
