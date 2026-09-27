// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { parseIntroCookie, shouldShowIntro } from "./help-intro";

describe("first-run intro cookie", () => {
  it("reads the value out of a cookie string", () => {
    expect(parseIntroCookie("ais_intro=dismissed")).toBe("dismissed");
    expect(parseIntroCookie("foo=1; ais_intro=open; bar=2")).toBe("open");
    expect(parseIntroCookie("other=1")).toBeNull();
    expect(parseIntroCookie("")).toBeNull();
    expect(parseIntroCookie(null)).toBeNull();
  });

  it("shows on first visit and after a reopen, hides once dismissed", () => {
    // First visit: no cookie yet.
    expect(shouldShowIntro(null)).toBe(true);
    // Reopened from the help panel.
    expect(shouldShowIntro("open")).toBe(true);
    // Dismissed: stays hidden.
    expect(shouldShowIntro("dismissed")).toBe(false);
  });
});
