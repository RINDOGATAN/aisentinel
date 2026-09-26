// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { frameworksData } from "./model";
import { isCellDimmed, toggleHighlight } from "./highlight";

describe("frameworks wheel: highlight a dimension across every framework", () => {
  const rings = frameworksData.rings.map((r) => r.id);
  const target = rings[0];

  it("selecting a dimension highlights it and dims every other ring", () => {
    const highlight = toggleHighlight(null, target);
    expect(highlight).toBe(target);
    // The chosen ring stays at full strength across every framework.
    for (const framework of frameworksData.frameworks) {
      expect(isCellDimmed(highlight, target)).toBe(false);
      void framework;
    }
    // Every other dimension recedes.
    for (const other of rings.filter((id) => id !== target)) {
      expect(isCellDimmed(highlight, other)).toBe(true);
    }
  });

  it("selecting the same dimension again clears the highlight", () => {
    const first = toggleHighlight(null, target);
    const cleared = toggleHighlight(first, target);
    expect(cleared).toBeNull();
    // With nothing highlighted, no cell is dimmed.
    for (const id of rings) expect(isCellDimmed(cleared, id)).toBe(false);
  });

  it("selecting a different dimension moves the highlight rather than clearing it", () => {
    const first = toggleHighlight(null, rings[0]);
    const second = toggleHighlight(first, rings[1]);
    expect(second).toBe(rings[1]);
    expect(isCellDimmed(second, rings[0])).toBe(true);
    expect(isCellDimmed(second, rings[1])).toBe(false);
  });
});
