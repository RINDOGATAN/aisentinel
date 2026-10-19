// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { hashOpensAdvanced, PILOT_ANCHOR, SCREENING_ANCHOR } from "./settings-anchors";
import { WIPE_ANCHOR } from "./post-export-wipe";

describe("hashOpensAdvanced", () => {
  it("opens the Advanced group for the cards inside it", () => {
    expect(hashOpensAdvanced(`#${PILOT_ANCHOR}`)).toBe(true);
    expect(hashOpensAdvanced(`#${WIPE_ANCHOR}`)).toBe(true);
  });

  it("leaves it closed for the cards above it, or no hash", () => {
    expect(hashOpensAdvanced(`#${SCREENING_ANCHOR}`)).toBe(false);
    expect(hashOpensAdvanced("")).toBe(false);
    expect(hashOpensAdvanced("#")).toBe(false);
  });
});
