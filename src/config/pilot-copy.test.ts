// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The copy rule of the hosted pilot, guarded: every public description of
 * the product says the hosted service is a free, capped pilot and that
 * premium modules are sold only for the kit at 60 a year each. No public
 * text prices a module per month or ties a licence to the hosted service.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import landingEn from "@/landing/i18n/en/ai-sentinel-startups.json";
import landingEs from "@/landing/i18n/es/ai-sentinel-startups.json";

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const PUBLIC_TEXT: Record<string, string> = {
  "README.md": read("README.md"),
  "public/llms.txt": read("public/llms.txt"),
  "public/llms-full.txt": read("public/llms-full.txt"),
};

describe("what the public copy says about the hosted pilot", () => {
  it.each(Object.keys(PUBLIC_TEXT))("%s calls the hosted service a free, capped pilot and prices modules for the kit only", (file) => {
    const text = PUBLIC_TEXT[file];
    expect(text).toMatch(/free, capped/i);
    expect(text).toMatch(/60 a year/);
    expect(text).toMatch(/https:\/\/www\.todo\.law\/run/);
    // Nothing per month, and no licence attached to the hosted service.
    expect(text).not.toMatch(/\/mo\b/);
    expect(text).not.toMatch(/per month/i);
    expect(text).not.toMatch(/hosted instance[^.]*need(s)? a licence/i);
  });

  it("the landing call to action says pilot and points to an own instance, in both languages", () => {
    expect(landingEn["cta.text"]).toMatch(/free, capped pilot/);
    expect(landingEn["cta.text"]).toMatch(/run your own instance/);
    expect(landingEs["cta.text"]).toMatch(/piloto gratuito y con límites/);
    expect(landingEs["cta.text"]).toMatch(/ejecuta tu propia instancia/);
  });

  it("the docs and lock strings tie the price to the kit, in both languages", () => {
    const enHome = (en as { docs: { home: Record<string, unknown> } }).docs.home;
    const esHome = (es as { docs: { home: Record<string, unknown> } }).docs.home;
    expect(String(enHome.premiumIntroFree)).toMatch(/kit/);
    expect(String(enHome.premiumIntroFree)).toMatch(/60 a year/);
    expect(String(esHome.premiumIntroFree)).toMatch(/kit/);
    expect(String(esHome.premiumIntroFree)).toMatch(/60 al año/);
    expect((en as { premiumShowcase: { lockedHint: string } }).premiumShowcase.lockedHint).toMatch(/kit/);
    expect((es as { premiumShowcase: { lockedHint: string } }).premiumShowcase.lockedHint).toMatch(/kit/);
    expect((en as { skills: { includedHintPilot: string } }).skills.includedHintPilot).toMatch(/60 a year/);
    expect((es as { skills: { includedHintPilot: string } }).skills.includedHintPilot).toMatch(/60 al año/);
  });

  it("the Spanish copy addresses the reader as tú", () => {
    const strings = [
      landingEs["cta.text"],
      (es as { pilot: Record<string, string> }).pilot.editsUntil,
      (es as { pilot: Record<string, string> }).pilot.runOwn,
      (es as { premiumShowcase: { lockedHint: string } }).premiumShowcase.lockedHint,
    ];
    for (const s of strings) {
      expect(s).not.toMatch(/\busted\b/i);
      expect(s).not.toMatch(/\bejecute\b|\bactive\b|\bpuede editar\b/);
    }
  });
});
