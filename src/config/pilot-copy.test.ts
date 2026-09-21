// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The copy rule of the hosted pilot, guarded: every public description of
 * the product says the hosted service is a free, capped pilot and that
 * premium modules are sold only for the kit at 60 a year each. No public
 * text prices a module per month or ties a licence to the hosted service.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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

/**
 * The banner once said the pilot had "no security certification". The agreed
 * sentence says "no contractual safeguards" instead, and every repeat of it
 * (README, llms files, docs pages, strings) follows. The versioned disclosure
 * is the one place that speaks of certifications: it is a fact a person
 * acknowledges, not the banner, and it changes only with a new version.
 */
const OLD_PHRASE = new RegExp(
  ["no security", "certification"].join(" ") + "|" + ["sin certificaci[oó]n(es)?", "de seguridad"].join(" "),
  "i",
);
const SCANNED_ROOTS = ["README.md", "public", "docs", "src", "prisma", "deploy", "scripts"];
const SCANNED_EXTENSIONS = /\.(md|mdx|txt|ts|tsx|json|prisma|html|ya?ml|example)$/;
const DISCLOSURE_FILES = new Set([
  "src/config/pilot-disclosure.ts",
  "src/config/pilot-disclosure.test.ts",
  // The comment on the acknowledgement model describes what the disclosure says.
  "prisma/schema.prisma",
  // This file quotes the phrase to prove the scan catches it.
  "src/config/pilot-copy.test.ts",
]);

function textFiles(rel: string): string[] {
  const full = join(root, rel);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return SCANNED_EXTENSIONS.test(rel) ? [rel] : [];
  return readdirSync(full)
    .filter((name) => name !== "node_modules" && !name.startsWith("."))
    .flatMap((name) => textFiles(`${rel}/${name}`));
}

describe("the old banner phrase", () => {
  it("appears nowhere outside the versioned disclosure", () => {
    const files = SCANNED_ROOTS.flatMap(textFiles).filter((rel) => !DISCLOSURE_FILES.has(rel));
    expect(files.length).toBeGreaterThan(100);
    const offenders = files.filter((rel) => OLD_PHRASE.test(read(rel)));
    expect(offenders).toEqual([]);
  });

  it("is still what the scan would catch", () => {
    expect("a free, capped pilot with no security certification").toMatch(OLD_PHRASE);
    expect("(free, capped, No Security Certifications; every module open)").toMatch(OLD_PHRASE);
    expect("un piloto sin certificación de seguridad").toMatch(OLD_PHRASE);
    expect("with no contractual safeguards").not.toMatch(OLD_PHRASE);
  });

  it.each(Object.keys(PUBLIC_TEXT))("%s says what the banner says instead", (file) => {
    expect(PUBLIC_TEXT[file]).toMatch(/no contractual safeguards/);
  });
});

describe("what the public copy says about the hosted pilot", () => {
  it.each(Object.keys(PUBLIC_TEXT))("%s calls the hosted service a free, capped pilot and prices modules for the kit only", (file) => {
    const text = PUBLIC_TEXT[file];
    expect(text).toMatch(/free, capped/i);
    expect(text).toMatch(/60 a year/);
    // One string serves every visitor, so it names no currency of its own.
    expect(text).toMatch(/60 a year each in the kit[ ,(]+in your currency/);
    expect(text).not.toMatch(/[€$]\s?60\b|\b60\s?[€$]/);
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
    const enNotice = (en as { docs: { premiumNotice: Record<string, string> } }).docs.premiumNotice;
    const esNotice = (es as { docs: { premiumNotice: Record<string, string> } }).docs.premiumNotice;
    expect(enNotice.hosted).toMatch(/hosted pilot/);
    expect(enNotice.selfHosted).toMatch(/self-hosted/);
    expect(esNotice.hosted).toMatch(/piloto alojado/);
    expect(esNotice.selfHosted).toMatch(/autoalojadas/);
    expect((en as { premiumShowcase: { lockedHint: string } }).premiumShowcase.lockedHint).toMatch(/kit/);
    expect((es as { premiumShowcase: { lockedHint: string } }).premiumShowcase.lockedHint).toMatch(/kit/);
    // The in-app strings take the price with its currency, never a bare figure.
    for (const s of [
      (en as { skills: { includedHintPilot: string } }).skills.includedHintPilot,
      (en as { premiumShowcase: { lockedHint: string } }).premiumShowcase.lockedHint,
    ]) {
      expect(s).toMatch(/\{price\} a year/);
      expect(s).not.toMatch(/\b60\b/);
    }
    for (const s of [
      (es as { skills: { includedHintPilot: string } }).skills.includedHintPilot,
      (es as { premiumShowcase: { lockedHint: string } }).premiumShowcase.lockedHint,
    ]) {
      expect(s).toMatch(/\{price\} al año/);
      expect(s).not.toMatch(/\b60\b/);
    }
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
