// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { AI_SENTINEL_PATH, EMPTY_PATH_COUNTS } from "@/components/guided/path-config";
import { buildProgressReport } from "@/server/services/program/progress-report";
import { renderProgramReport } from "./program-report";

type ReportArgs = Parameters<typeof renderProgramReport>[0];

// The smallest program the report can render: no systems, no gaps.
const scorecard = {
  generatedAt: "2026-10-26T12:00:00.000Z",
  tiles: {
    overall: 12,
    systemsGoverned: { classified: 0, total: 0 },
    highRiskUnderOversight: { withGate: 0, needing: 0 },
    policyCoverage: { coreTypesPresent: 0 },
    complianceAssessedPct: 0,
    openGaps: 0,
  },
  maturity: { nist: [], dimensions: [] },
  snapshot: { compliance: { assessed: 0, compliant: 0, partial: 0, totalMappings: 0 } },
  plan: [],
  rollout: [],
  duties: null,
} as unknown as ReportArgs["scorecard"];

const graph = { groups: [], systems: [], vendors: [] } as ReportArgs["graph"];

describe("program report: the progress page renders", () => {
  for (const locale of ["en", "es"] as const) {
    it(`renders with the progress page in ${locale}`, async () => {
      const progress = buildProgressReport(AI_SENTINEL_PATH, { ...EMPTY_PATH_COUNTS, systems: 2 });
      const doc = await renderProgramReport({ orgName: "Test org", locale, graph, scorecard, progress });
      const buffer = await renderToBuffer(doc);
      expect(buffer.length).toBeGreaterThan(1000);
    }, 60_000);
  }

  it("still renders without the progress page (older callers)", async () => {
    const doc = await renderProgramReport({ orgName: "Test org", locale: "en", graph, scorecard });
    const buffer = await renderToBuffer(doc);
    expect(buffer.length).toBeGreaterThan(1000);
  }, 60_000);
});
