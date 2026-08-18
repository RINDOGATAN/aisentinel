// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import en from "./en.json";
import es from "./es.json";

type Messages = Record<string, unknown>;

/** Collect every leaf key path; arrays record their length so parallel lists must match. */
function collectPaths(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) {
    return [`${prefix}[len=${obj.length}]`];
  }
  if (obj !== null && typeof obj === "object") {
    return Object.entries(obj as Messages).flatMap(([key, value]) =>
      collectPaths(value, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [prefix];
}

describe("i18n message parity (en ↔ es)", () => {
  const enPaths = new Set(collectPaths(en));
  const esPaths = new Set(collectPaths(es));

  it("es.json has every key en.json has (same structure, same array lengths)", () => {
    const missing = [...enPaths].filter((p) => !esPaths.has(p));
    expect(missing).toEqual([]);
  });

  it("en.json has every key es.json has (no orphan Spanish keys)", () => {
    const missing = [...esPaths].filter((p) => !enPaths.has(p));
    expect(missing).toEqual([]);
  });

  it("no empty translations in either locale", () => {
    const empties: string[] = [];
    const walk = (obj: unknown, prefix: string, locale: string) => {
      if (Array.isArray(obj)) {
        obj.forEach((v, i) => walk(v, `${prefix}[${i}]`, locale));
      } else if (obj !== null && typeof obj === "object") {
        for (const [k, v] of Object.entries(obj as Messages)) {
          walk(v, prefix ? `${prefix}.${k}` : k, locale);
        }
      } else if (typeof obj === "string" && obj.trim() === "") {
        empties.push(`${locale}:${prefix}`);
      }
    };
    walk(en, "", "en");
    walk(es, "", "es");
    expect(empties).toEqual([]);
  });
});
