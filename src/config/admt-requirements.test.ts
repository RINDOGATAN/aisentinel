// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  ADMT_REQUIREMENTS,
  ADMT_REQUIREMENTS_VERSION,
  ADMT_REQUIREMENTS_LAW_REVIEWED_AS_OF,
  ADMT_REQUIREMENTS_REVIEW_MARKER,
  ADMT_FRAMEWORK,
  admtRequirementId,
  flattenAdmtRequirements,
  getLocalizedRequirement,
} from "./admt-requirements";
import { ADMT_APPLICABILITY_TAGS } from "./admt-rules";

const all = flattenAdmtRequirements();

describe("ADMT requirement content", () => {
  it("carries a version and a PENDING California sign-off marker", () => {
    expect(ADMT_REQUIREMENTS_VERSION).toMatch(/^\d{4}\.\d{2}\.\d+$/);
    expect(ADMT_REQUIREMENTS_LAW_REVIEWED_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // The pack is not signed off; the marker must say so in both languages.
    expect(ADMT_REQUIREMENTS_REVIEW_MARKER.en).toContain("sign-off pending");
    expect(ADMT_REQUIREMENTS_REVIEW_MARKER.es).toContain("pendiente");
    expect(ADMT_FRAMEWORK.code).toBe("CA_CCPA_ADMT");
  });

  it("has every title and description populated in both locales", () => {
    for (const row of all) {
      expect(row.title.en.trim(), `${row.code} title.en`).not.toBe("");
      expect(row.title.es.trim(), `${row.code} title.es`).not.toBe("");
      expect(row.description.en.trim(), `${row.code} description.en`).not.toBe("");
      expect(row.description.es.trim(), `${row.code} description.es`).not.toBe("");
      // A Spanish string identical to the English one is an untranslated stub.
      expect(row.description.es, `${row.code} untranslated`).not.toBe(
        row.description.en,
      );
    }
  });

  it("has unique slugs and unique codes", () => {
    const slugs = all.map((r) => r.slug);
    const codes = all.map((r) => r.code);
    expect(new Set(slugs).size, "duplicate slug").toBe(slugs.length);
    expect(new Set(codes).size, "duplicate code").toBe(codes.length);
  });

  it("derives ids from slugs, never from codes (§ mangles slugs)", () => {
    for (const row of all) {
      const id = admtRequirementId(row.slug);
      expect(id).toBe(`ca-${row.slug}`);
      expect(id, `${row.code} id must be url-safe`).toMatch(/^ca-[a-z0-9-]+$/);
    }
  });

  /**
   * The structural guarantee. Every existing auto-mapping call site queries
   * `applicableTo: { has: <tier> }` with no framework filter, so a non-empty
   * applicableTo here would attach ADMT rows to every system in the product.
   */
  it("leaves applicableTo empty on every row so ADMT cannot flood auto-mapping", () => {
    for (const row of all) {
      expect(
        (row as { applicableTo?: unknown }).applicableTo,
        `${row.code} must not declare applicableTo`,
      ).toBeUndefined();
    }
  });

  it("uses only tags from the shared vocabulary, and leaves none of it dead", () => {
    const used = new Set(all.flatMap((r) => r.applicabilityTags));
    const vocabulary = new Set<string>(ADMT_APPLICABILITY_TAGS);

    const orphans = [...used].filter((t) => !vocabulary.has(t));
    expect(orphans, "tags used but not in the vocabulary").toEqual([]);

    const dead = [...vocabulary].filter((t) => !used.has(t as never));
    expect(dead, "vocabulary entries no row uses").toEqual([]);
  });

  it("tags every row for California and for at least one article", () => {
    for (const row of all) {
      expect(row.applicabilityTags, `${row.code}`).toContain("jurisdiction:US_CA");
      const hasArticle = row.applicabilityTags.some(
        (t) => t === "admt:art9" || t === "admt:art10" || t === "admt:art11",
      );
      expect(hasArticle, `${row.code} has no article tag`).toBe(true);
    }
  });

  it("keeps the hierarchy sane: children sorted, no grandchildren, parents ordered", () => {
    for (const parent of ADMT_REQUIREMENTS) {
      const children = parent.children ?? [];
      const orders = children.map((c) => c.sortOrder);
      expect([...orders].sort((a, b) => a - b), `${parent.code} children`).toEqual(
        orders,
      );
      for (const child of children) {
        expect(child.children ?? [], `${child.code} grandchildren`).toEqual([]);
      }
    }
    const topOrders = ADMT_REQUIREMENTS.map((r) => r.sortOrder);
    expect([...topOrders].sort((a, b) => a - b)).toEqual(topOrders);
  });

  it("covers all three regimes plus the gate", () => {
    const codes = all.map((r) => r.code);
    // Gate
    expect(codes).toContain("§ 7001(e)(1)");
    // Article 11
    expect(codes).toContain("§ 7220(c)(1)");
    expect(codes).toContain("§ 7222(b)(2)");
    // Article 10
    expect(codes).toContain("§ 7152(a)(3)(G)");
    expect(codes).toContain("§ 7157(e)");
    // Article 9
    expect(codes).toContain("§ 7123(f)");
    expect(codes).toContain("§ 7124");
  });

  it("records the three opt-out exceptions and no more", () => {
    const exceptionRows = all.filter((r) =>
      r.applicabilityTags.includes("admt:art11:optout_exception"),
    );
    const codes = exceptionRows.map((r) => r.code);
    expect(codes).toContain("§ 7221(b)(1)");
    expect(codes).toContain("§ 7221(b)(2)");
    expect(codes).toContain("§ 7221(b)(3)");
    // Security, fraud and safety are disclosure limiters, never exceptions.
    const b = all.find((r) => r.code === "§ 7220(c)(2)(B)")!;
    expect(b.description.en).toMatch(/closed at three|NOT opt-out exceptions/i);
  });

  it("keeps the business-day and calendar-day clocks distinct", () => {
    const cease = all.find((r) => r.code === "§ 7221(n)(1)")!;
    const produce = all.find((r) => r.code === "§ 7157(e)")!;
    expect(cease.description.en).toMatch(/BUSINESS days/);
    expect(produce.description.en).toMatch(/CALENDAR days/);
  });

  it("resolves localized content by code", () => {
    const en = getLocalizedRequirement("§ 7001(e)(1)", "en");
    const es = getLocalizedRequirement("§ 7001(e)(1)", "es");
    expect(en?.title).toContain("Human-involvement");
    expect(es?.title).toContain("intervención humana");
    expect(getLocalizedRequirement("§ 9999", "en")).toBeNull();
  });
});
