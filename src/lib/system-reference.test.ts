// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { systemReference } from "./system-reference";

describe("system reference", () => {
  it("is the prefix and the running number, padded to three digits", () => {
    expect(systemReference(1)).toBe("AIS-001");
    expect(systemReference(42)).toBe("AIS-042");
  });

  it("keeps every digit past three", () => {
    expect(systemReference(1234)).toBe("AIS-1234");
  });

  it("is null for a system that has no number yet", () => {
    expect(systemReference(null)).toBeNull();
    expect(systemReference(undefined)).toBeNull();
  });
});
