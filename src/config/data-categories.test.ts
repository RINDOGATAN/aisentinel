// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  DATA_ROLES,
  RECIPIENT_TYPES,
  SENSITIVE_CATEGORIES,
  SENSITIVE_CATEGORY_IDS,
  isBeyondOurControl,
  sensitiveCategoryLabel,
} from "./data-categories";

describe("sensitive categories", () => {
  it("defines every id once, with a label and a basis in both languages", () => {
    expect(SENSITIVE_CATEGORIES.map((c) => c.id)).toEqual([...SENSITIVE_CATEGORY_IDS]);
    expect(new Set(SENSITIVE_CATEGORY_IDS).size).toBe(SENSITIVE_CATEGORY_IDS.length);
    for (const c of SENSITIVE_CATEGORIES) {
      expect(c.label.en).toBeTruthy();
      expect(c.label.es).toBeTruthy();
      expect(c.basis.en).toBeTruthy();
      expect(c.basis.es).toBeTruthy();
    }
  });

  it("covers the categories the US state laws actually diverge on", () => {
    for (const id of ["health", "biometric", "precise_location", "children"]) {
      expect(SENSITIVE_CATEGORY_IDS).toContain(id);
    }
  });

  it("falls back to the raw id rather than showing nothing", () => {
    expect(sensitiveCategoryLabel("health", "es")).toBe("Salud");
    expect(sensitiveCategoryLabel("not-a-category", "en")).toBe("not-a-category");
  });
});

describe("recipients beyond our control", () => {
  it("treats an advertising platform, a broker, a third party and another controller as outside", () => {
    for (const type of ["ADVERTISING_PLATFORM", "DATA_BROKER", "THIRD_PARTY", "CONTROLLER"]) {
      expect(isBeyondOurControl(type)).toBe(true);
    }
  });

  it("treats a processor and a service provider as inside", () => {
    expect(isBeyondOurControl("PROCESSOR")).toBe(false);
    expect(isBeyondOurControl("SERVICE_PROVIDER")).toBe(false);
  });

  it("does not treat an unknown value as outside", () => {
    expect(isBeyondOurControl("SOMETHING_ELSE")).toBe(false);
  });
});

describe("vocabularies mirrored from Prisma", () => {
  it("keeps the undetermined role first, so it stays the default", () => {
    expect(DATA_ROLES[0]).toBe("UNDETERMINED");
  });

  it("lists every recipient type exactly once", () => {
    expect(new Set(RECIPIENT_TYPES).size).toBe(RECIPIENT_TYPES.length);
  });
});
