// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { safeCallbackUrl } from "./safe-callback";

describe("safeCallbackUrl", () => {
  it("keeps a same-app path so a returning visitor lands where they were", () => {
    expect(safeCallbackUrl("/governance/ai-registry")).toBe("/governance/ai-registry");
    expect(safeCallbackUrl("/governance/assessments/abc?tab=1")).toBe(
      "/governance/assessments/abc?tab=1",
    );
  });

  it("falls back for a missing or non-rooted value", () => {
    expect(safeCallbackUrl(undefined)).toBe("/governance");
    expect(safeCallbackUrl("")).toBe("/governance");
    expect(safeCallbackUrl("governance")).toBe("/governance");
  });

  it("rejects an off-site redirect, protocol-relative or backslash trick", () => {
    expect(safeCallbackUrl("https://evil.example")).toBe("/governance");
    expect(safeCallbackUrl("//evil.example")).toBe("/governance");
    expect(safeCallbackUrl("/\\evil.example")).toBe("/governance");
  });

  it("uses the given fallback", () => {
    expect(safeCallbackUrl(null, "/sign-in")).toBe("/sign-in");
  });
});
