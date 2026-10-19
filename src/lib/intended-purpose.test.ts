// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { assemblePurpose, hasPurposeAnswers, type PurposeFrames } from "./intended-purpose";

const EN: PurposeFrames = {
  who: (v) => `Used by: ${v}`,
  where: (v) => `Context of use: ${v}`,
  decisions: (v) => `Decisions it supports: ${v}`,
  notFor: (v) => `It must not be used for: ${v}`,
};

describe("intended purpose builder", () => {
  it("assembles the five answers into one statement, sentence by sentence", () => {
    expect(
      assemblePurpose(
        {
          what: "ranks incoming job applications",
          who: "the recruitment team",
          where: "hiring for office roles in Spain",
          decisions: "which candidates are interviewed",
          notFor: "final hiring decisions.",
        },
        EN,
      ),
    ).toBe(
      "Ranks incoming job applications. Used by: the recruitment team. Context of use: hiring for office roles in Spain. Decisions it supports: which candidates are interviewed. It must not be used for: final hiring decisions.",
    );
  });

  it("leaves out the parts with no answer", () => {
    expect(assemblePurpose({ what: "Summarises claims", notFor: "  " }, EN)).toBe("Summarises claims.");
    expect(assemblePurpose({ who: "claims handlers" }, EN)).toBe("Used by: claims handlers.");
  });

  it("knows when nothing has been answered", () => {
    expect(hasPurposeAnswers({})).toBe(false);
    expect(hasPurposeAnswers({ what: "   " })).toBe(false);
    expect(hasPurposeAnswers({ where: "Madrid" })).toBe(true);
  });

  it("keeps a question mark or a full stop already typed", () => {
    expect(assemblePurpose({ what: "Answers questions about policies." }, EN)).toBe(
      "Answers questions about policies.",
    );
  });
});
