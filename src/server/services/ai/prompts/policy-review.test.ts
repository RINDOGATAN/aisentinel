// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { POLICY_REVIEW_MAX_CHARS, buildPolicyReviewSystemPrompt, buildPolicyReviewUserPrompt } from "./policy-review";

describe("policy review prompt", () => {
  it("asks for suggestions, never a rewrite, in the reader's language", () => {
    expect(buildPolicyReviewSystemPrompt("en")).toMatch(/do not rewrite/);
    expect(buildPolicyReviewSystemPrompt("es")).toMatch(/tú/);
  });

  it("carries the policy and the declared places, and says when the text was cut", () => {
    const short = buildPolicyReviewUserPrompt({ title: "Use", typeLabel: "AI_USAGE", content: "Text", jurisdictions: ["EU"] });
    expect(short).toContain("Jurisdictions: EU");
    expect(short).not.toContain("first");
    const long = buildPolicyReviewUserPrompt({ title: "Use", typeLabel: "AI_USAGE", content: "x".repeat(POLICY_REVIEW_MAX_CHARS + 5), jurisdictions: [] });
    expect(long).toContain("not declared");
    expect(long).toContain(`first ${POLICY_REVIEW_MAX_CHARS} characters`);
  });
});
