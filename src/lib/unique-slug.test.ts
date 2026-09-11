// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { firstFreeSlug } from "./unique-slug";

describe("firstFreeSlug", () => {
  it("keeps a free slug as it is", () => {
    expect(firstFreeSlug("acme", new Set(["other"]))).toBe("acme");
  });

  it("takes the next free numeric suffix", () => {
    expect(firstFreeSlug("acme", new Set(["acme", "acme-2"]))).toBe("acme-3");
  });

  it("stays within 50 characters, without a doubled hyphen", () => {
    const base = `${"a".repeat(47)}-bc`;
    const slug = firstFreeSlug(base, new Set([base]))!;
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug.endsWith("-2")).toBe(true);
    expect(slug).not.toContain("--");
  });

  it("gives up only when every variant is taken", () => {
    const taken = new Set(["x", ...Array.from({ length: 998 }, (_, i) => `x-${i + 2}`)]);
    expect(firstFreeSlug("x", taken)).toBeNull();
  });
});
