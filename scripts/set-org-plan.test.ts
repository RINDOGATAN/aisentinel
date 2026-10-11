// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The operator's script (set-org-plan.ts): a dry run unless --execute is
 * given; the options and their refusals.
 */

import { describe, it, expect } from "vitest";
import { parseArgs, parseDateArg } from "./set-org-plan";
import { PlanInputError } from "../src/server/services/pilot/plan";

describe("set-org-plan arguments", () => {
  it("is a dry run by default, and with --dry-run", () => {
    expect(parseArgs(["--org", "acme", "--plan", "EU_CLOUD"]).dryRun).toBe(true);
    expect(parseArgs(["--org", "acme", "--plan", "EU_CLOUD", "--dry-run"]).dryRun).toBe(true);
  });

  it("writes only with --execute", () => {
    expect(parseArgs(["--org", "acme", "--plan", "EU_CLOUD", "--execute"]).dryRun).toBe(false);
  });

  it("refuses --execute together with --dry-run", () => {
    expect(() => parseArgs(["--org", "acme", "--plan", "EU_CLOUD", "--execute", "--dry-run"])).toThrow(PlanInputError);
  });

  it("reads the plan, dates, note and operator", () => {
    const input = parseArgs([
      "--org",
      "acme",
      "--plan",
      "eu_cloud",
      "--started",
      "2026-10-12",
      "--renews",
      "2026-11-12",
      "--note",
      "invoice 1",
      "--by",
      "ops",
    ]);
    expect(input).toEqual({
      org: "acme",
      plan: "EU_CLOUD",
      startedAt: new Date("2026-10-12T00:00:00Z"),
      renewsAt: new Date("2026-11-12T00:00:00Z"),
      note: "invoice 1",
      operator: "ops",
      dryRun: true,
    });
    expect(parseArgs(["--org", "acme", "--plan", "PILOT", "--note", "none"]).note).toBeNull();
  });

  it("refuses a missing organisation, an unknown plan or option, and a bad date", () => {
    expect(() => parseArgs(["--plan", "EU_CLOUD"])).toThrow(PlanInputError);
    expect(() => parseArgs(["--org", "acme", "--plan", "GOLD"])).toThrow(PlanInputError);
    expect(() => parseArgs(["--org", "acme", "--plan", "PILOT", "--force"])).toThrow(PlanInputError);
    expect(() => parseArgs(["--org", "--plan", "PILOT"])).toThrow(PlanInputError);
    expect(() => parseDateArg("started", "tomorrow")).toThrow(PlanInputError);
    expect(parseDateArg("started", "none")).toBeNull();
  });
});
