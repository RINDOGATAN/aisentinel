// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { mapVendorToUpsert } from "./vendor-watch-mapper";
import type { VendorWatchVendor } from "./vendor-watch-types";

const base = { slug: "v", name: "V", category: "AI", tags: [] } as unknown as VendorWatchVendor;

describe("mapVendorToUpsert training use and retention", () => {
  for (const value of ["no", "opt-out", "opt-in", "yes", "not-stated"]) {
    it(`passes "${value}" through`, () => {
      expect(mapVendorToUpsert({ ...base, trainingUse: value }).trainingUse).toBe(value);
    });
  }

  it("turns an unknown value into null", () => {
    expect(mapVendorToUpsert({ ...base, trainingUse: "sometimes" }).trainingUse).toBeNull();
  });

  it("passes null through and keeps retention as given", () => {
    const m = mapVendorToUpsert({ ...base, trainingUse: null, retention: "30 days" });
    expect(m.trainingUse).toBeNull();
    expect(m.retention).toBe("30 days");
  });

  it("leaves both undefined when the snapshot has no keys", () => {
    const m = mapVendorToUpsert(base);
    expect(m.trainingUse).toBeUndefined();
    expect(m.retention).toBeUndefined();
  });
});
