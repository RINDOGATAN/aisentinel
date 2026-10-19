// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import { systemReference } from "./system-reference";

describe("system reference", () => {
  it("is the prefix and the last six characters of the id, in capitals", () => {
    expect(systemReference("cm1x9abcd0000qwe7k2q9x")).toBe("AIS-7K2Q9X");
  });

  it("is the same every time for the same system", () => {
    const id = "clz3p8w0b000108l4h2g5f6d1";
    expect(systemReference(id)).toBe(systemReference(id));
  });

  it("tells two systems apart", () => {
    expect(systemReference("clz3p8w0b000108l4aaaaaa")).not.toBe(systemReference("clz3p8w0b000108l4bbbbbb"));
  });

  it("drops characters that are not letters or digits", () => {
    expect(systemReference("demo-system-1")).toBe("AIS-YSTEM1");
  });
});
