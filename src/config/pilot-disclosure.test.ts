// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The retired opening statement of the hosted pilot. It is no longer shown or
 * asked for; the wording stays only as the record that earlier
 * acknowledgement rows (stored with DISCLOSURE_VERSION) refer to.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DISCLOSURE_POINTS, DISCLOSURE_VERSION, disclosureLines } from "./pilot-disclosure";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

const root = join(__dirname, "../..");

function sourceFiles(rel: string): string[] {
  const full = join(root, rel);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return /\.(ts|tsx)$/.test(rel) ? [rel] : [];
  return readdirSync(full)
    .filter((name) => name !== "node_modules" && !name.startsWith("."))
    .flatMap((name) => sourceFiles(`${rel}/${name}`));
}

const strings = (x: unknown): string[] =>
  typeof x === "string"
    ? [x]
    : Array.isArray(x)
      ? x.flatMap(strings)
      : x && typeof x === "object"
        ? Object.values(x).flatMap(strings)
        : [];

describe("the retired pilot opening statement", () => {
  it("keeps the wording of the version stored on earlier acknowledgements", () => {
    expect(DISCLOSURE_VERSION).toBe("1.0.0");
    expect(DISCLOSURE_POINTS.map((p) => p.id)).toEqual([
      "free-pilot",
      "no-certifications",
      "no-real-data",
      "export-anytime",
      "real-deletion",
    ]);
    expect(disclosureLines("en")).toHaveLength(5);
    expect(disclosureLines("es")).toHaveLength(5);
  });

  it("is imported by no screen, page, router or service", () => {
    const importers = sourceFiles("src")
      .filter((rel) => !/\.test\.tsx?$/.test(rel))
      .filter((rel) => rel !== "src/config/pilot-disclosure.ts")
      .filter((rel) => /config\/pilot-disclosure["']/.test(readFileSync(join(root, rel), "utf8")));
    expect(importers).toEqual([]);
  });

  it("leaves no in-app text telling people to keep real data out of the pilot", () => {
    const docsPage = readFileSync(join(root, "src/app/docs/pilot/page.tsx"), "utf8");
    const texts = [...strings(en), ...strings(es), docsPage];
    const contradiction =
      /real client matter|asuntos reales de clientes|test records|registros de prueba|invented names|nombres, cifras y documentos inventados/i;
    expect(texts.filter((t) => contradiction.test(t))).toEqual([]);
  });
});
