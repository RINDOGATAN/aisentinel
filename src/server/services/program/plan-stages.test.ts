// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One 30/60/90-day plan: the program page's actions sit under the window of
 * the stage they belong to, and the Dashboard's "Open" lands on that section.
 */

import { describe, it, expect } from "vitest";
import { GAP_STAGE, PATH_STAGE_IDS } from "./program-data";
import { PLAN_WINDOWS } from "@/components/guided/path-config";
import { DOCUMENT_REGISTER } from "@/config/document-register";

describe("the plan's actions follow the stage plan", () => {
  it("names only stages that exist on the path", () => {
    for (const [gap, stage] of Object.entries(GAP_STAGE)) {
      expect(PATH_STAGE_IDS, gap).toContain(stage);
    }
  });

  it("puts every action in exactly one window", () => {
    for (const [gap, stage] of Object.entries(GAP_STAGE)) {
      expect(PLAN_WINDOWS.filter((w) => w.stages.includes(stage)).length, gap).toBe(1);
    }
  });

  it("asks for the drafts to be confirmed in the first thirty days", () => {
    expect(PLAN_WINDOWS[0].stages).toContain(GAP_STAGE["unconfirmed-items"]);
  });

  it("opens the plan section from the documents list", () => {
    expect(DOCUMENT_REGISTER.find((d) => d.id === "plan")?.href).toBe("/governance/program#plan");
  });
});
