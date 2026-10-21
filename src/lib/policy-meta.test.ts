// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import {
  countPolicyOrigins,
  isRemovableTemplateDraft,
  isSubstantiveEdit,
  isUnreviewedTemplateDraft,
  policyReference,
  reviewDateAfter,
} from "./policy-meta";

const base = { provenance: "USER_ENTERED", status: "DRAFT", confirmedAt: null, editedAt: null, sourceRef: null };

describe("policy origin", () => {
  it("counts template policies apart from the ones written here", () => {
    const counts = countPolicyOrigins([
      base,
      { ...base, status: "PUBLISHED" },
      { ...base, provenance: "AUTO_TEMPLATE" },
      { ...base, provenance: "AUTO_TEMPLATE", editedAt: new Date() },
      { ...base, provenance: "AUTO_TEMPLATE", status: "APPROVED" },
    ]);
    expect(counts).toEqual({ total: 5, writtenHere: 2, fromTemplates: 3, toReview: 1 });
  });

  it("marks only untouched template drafts for review", () => {
    expect(isUnreviewedTemplateDraft({ ...base, provenance: "AUTO_TEMPLATE" })).toBe(true);
    expect(isUnreviewedTemplateDraft({ ...base, provenance: "AUTO_TEMPLATE", confirmedAt: new Date() })).toBe(false);
    expect(isUnreviewedTemplateDraft({ ...base, provenance: "AUTO_TEMPLATE", editedAt: new Date() })).toBe(false);
    expect(isUnreviewedTemplateDraft({ ...base, provenance: "AUTO_TEMPLATE", status: "UNDER_REVIEW" })).toBe(false);
    expect(isUnreviewedTemplateDraft(base)).toBe(false);
  });

  it("never offers the sample data's policy for removal", () => {
    const tpl = { ...base, provenance: "AUTO_TEMPLATE" };
    expect(isRemovableTemplateDraft({ ...tpl, sourceRef: "quickstart:policy-pack" })).toBe(true);
    expect(isRemovableTemplateDraft({ ...tpl, sourceRef: null })).toBe(true);
    expect(isRemovableTemplateDraft({ ...tpl, sourceRef: "worked-example@3" })).toBe(false);
  });

  it("treats title, description and text changes as edits, and dates or owner as not", () => {
    expect(isSubstantiveEdit({ content: "x" })).toBe(true);
    expect(isSubstantiveEdit({ title: "x" })).toBe(true);
    expect(isSubstantiveEdit({})).toBe(false);
  });
});

describe("policy reference and review date", () => {
  it("formats the number", () => {
    expect(policyReference(7)).toBe("POL-007");
    expect(policyReference(1234)).toBe("POL-1234");
    expect(policyReference(null)).toBeNull();
  });

  it("adds months, keeping the day within short months", () => {
    expect(reviewDateAfter(new Date("2026-10-19T00:00:00Z"), 12)).toBe("2027-10-19");
    expect(reviewDateAfter(new Date("2026-08-31T00:00:00Z"), 6)).toBe("2027-02-28");
  });
});
