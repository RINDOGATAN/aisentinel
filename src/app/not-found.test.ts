// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

describe("not-found page copy", () => {
  it("exists in both languages, with a way to the dashboard and the start page", () => {
    for (const m of [en, es]) {
      const nf: Record<string, string> = m.notFound;
      for (const key of ["pageTitle", "code", "title", "body", "dashboard", "home"]) {
        expect(nf[key]).toBeTruthy();
      }
    }
    expect(es.notFound.title).not.toBe(en.notFound.title);
  });
});
