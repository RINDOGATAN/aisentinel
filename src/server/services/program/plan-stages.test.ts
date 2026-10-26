// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One action plan by phase: the program page's actions sit under the phase
 * of the path they belong to, and the Dashboard's "Open" lands on that section.
 */

import { describe, it, expect } from "vitest";
import { GAP_STAGE, PATH_STAGE_IDS } from "./program-data";
import { DOCUMENT_REGISTER } from "@/config/document-register";

describe("the plan's actions follow the path's phases", () => {
  it("names only phases that exist on the path", () => {
    for (const [gap, stage] of Object.entries(GAP_STAGE)) {
      expect(PATH_STAGE_IDS, gap).toContain(stage);
    }
  });

  it("asks for the drafts to be confirmed in the first phase", () => {
    expect(GAP_STAGE["unconfirmed-items"]).toBe(PATH_STAGE_IDS[0]);
  });

  it("opens the plan section from the documents list", () => {
    expect(DOCUMENT_REGISTER.find((d) => d.id === "plan")?.href).toBe("/governance/program#plan");
  });
});
