// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The "Backups and recovery" section of the public security page
 * (src/app/docs/security/page.tsx): the same four paragraphs in English and
 * Spanish, the figures the hosted service keeps (7-day history, 30-day daily
 * copy, two business days for a customer's restore), and no long dash.
 */

import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

const KEYS = ["title", "cloud", "recovery", "deletion", "selfHosted"];

describe("security page: backups and recovery", () => {
  for (const [lang, messages] of [["en", en], ["es", es]] as const) {
    it(`${lang}: every paragraph is present, with the stated figures and no long dash`, () => {
      const b = (messages as { docs: { security: { backups: Record<string, string> } } }).docs.security.backups;
      expect(Object.keys(b)).toEqual(KEYS);
      for (const k of KEYS) expect(b[k], k).toMatch(/\S/);
      const all = Object.values(b).join(" ");
      expect(all).not.toMatch(/[–—]|--/);
      expect(all).toMatch(/7/);
      expect(all).toMatch(/30/);
      expect(b.cloud).toMatch(/AES-256/);
    });
  }
});
