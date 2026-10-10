// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { parseSystemTimelineEntry } from "./incident-timeline";

describe("system incident timeline entries", () => {
  it("reads the creation entry the router writes", () => {
    expect(parseSystemTimelineEntry("Incident reported", "CRITICAL hallucination incident reported")).toEqual({
      kind: "reported",
      severity: "CRITICAL",
      type: "HALLUCINATION",
    });
    expect(parseSystemTimelineEntry("Incident reported", "HIGH data leak incident reported")).toEqual({
      kind: "reported",
      severity: "HIGH",
      type: "DATA_LEAK",
    });
  });

  it("reads a status change", () => {
    expect(parseSystemTimelineEntry("Status changed to INVESTIGATING", "Status updated from REPORTED to INVESTIGATING")).toEqual({
      kind: "status",
      from: "REPORTED",
      to: "INVESTIGATING",
    });
  });

  it("leaves an entry a person typed alone", () => {
    expect(parseSystemTimelineEntry("Called the vendor", "They are looking into it")).toBeNull();
    expect(parseSystemTimelineEntry("Incident reported", "by phone")).toBeNull();
  });
});
