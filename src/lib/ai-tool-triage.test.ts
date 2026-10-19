// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  STILL_TO_REVIEW,
  TOOL_TABS,
  TOOL_TAB_STATUSES,
  isStillToReview,
  tabOf,
  toolTabCounts,
  type ToolStatus,
} from "./ai-tool-triage";

const ALL: ToolStatus[] = ["DISCOVERED", "UNDER_REVIEW", "APPROVED", "PROHIBITED", "REGISTERED"];

describe("AI tools in use: tabs and counts", () => {
  it("puts every status in exactly one tab", () => {
    for (const status of ALL) {
      const tabs = TOOL_TABS.filter((tab) => TOOL_TAB_STATUSES[tab].includes(status));
      expect(tabs, status).toHaveLength(1);
      expect(tabOf(status)).toBe(tabs[0]);
    }
  });

  it("opens on the tools still to review: reported and under review", () => {
    expect(TOOL_TABS[0]).toBe("toReview");
    expect([...STILL_TO_REVIEW]).toEqual(["DISCOVERED", "UNDER_REVIEW"]);
    expect(isStillToReview("DISCOVERED")).toBe(true);
    expect(isStillToReview("UNDER_REVIEW")).toBe(true);
  });

  it("does not count an approved, prohibited or registered tool as still to review", () => {
    expect(isStillToReview("APPROVED")).toBe(false);
    expect(isStillToReview("PROHIBITED")).toBe(false);
    expect(isStillToReview("REGISTERED")).toBe(false);
  });

  it("counts each tab from the status counts", () => {
    expect(
      toolTabCounts({ discovered: 2, underReview: 3, approved: 1, prohibited: 4, registered: 5 }),
    ).toEqual({ toReview: 5, approved: 1, prohibited: 4, registered: 5 });
  });
});
