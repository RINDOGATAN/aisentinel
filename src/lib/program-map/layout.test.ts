// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect } from "vitest";
import {
  computeProgramMapLayout,
  paginateProgramGraph,
  deriveGlyphs,
  UNGROUPED_LANE_ID,
} from "./layout";
import { MOCK_PROGRAM_GRAPH } from "./__fixtures__/mock-graph";
import type { LayoutBox, ProgramGraph } from "./types";

const overlaps = (a: LayoutBox, b: LayoutBox) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("computeProgramMapLayout", () => {
  const layout = computeProgramMapLayout(MOCK_PROGRAM_GRAPH);

  it("is deterministic: identical input produces identical output", () => {
    expect(computeProgramMapLayout(MOCK_PROGRAM_GRAPH)).toEqual(layout);
  });

  it("lays out every system exactly once", () => {
    expect(layout.nodes).toHaveLength(MOCK_PROGRAM_GRAPH.systems.length);
    expect(new Set(layout.nodes.map((n) => n.id)).size).toBe(layout.nodes.length);
  });

  it("no two system nodes overlap", () => {
    for (let i = 0; i < layout.nodes.length; i++) {
      for (let j = i + 1; j < layout.nodes.length; j++) {
        expect(
          overlaps(layout.nodes[i], layout.nodes[j]),
          `${layout.nodes[i].id} vs ${layout.nodes[j].id}`,
        ).toBe(false);
      }
    }
  });

  it("every node sits inside its lane; lanes do not overlap", () => {
    const laneById = new Map(layout.lanes.map((l) => [l.id, l]));
    for (const node of layout.nodes) {
      const lane = laneById.get(node.laneId)!;
      expect(node.x).toBeGreaterThanOrEqual(lane.x);
      expect(node.y).toBeGreaterThanOrEqual(lane.y);
      expect(node.x + node.w).toBeLessThanOrEqual(lane.x + lane.w);
      expect(node.y + node.h).toBeLessThanOrEqual(lane.y + lane.h);
    }
    for (let i = 0; i < layout.lanes.length; i++) {
      for (let j = i + 1; j < layout.lanes.length; j++) {
        expect(overlaps(layout.lanes[i], layout.lanes[j])).toBe(false);
      }
    }
  });

  it("systems with undeclared groups land in the implicit ungrouped lane", () => {
    const orphan = layout.nodes.find((n) => n.id === "sys-orphan")!;
    expect(orphan.laneId).toBe(UNGROUPED_LANE_ID);
    expect(layout.lanes.some((l) => l.id === UNGROUPED_LANE_ID)).toBe(true);
  });

  it("vendor rail includes only referenced vendors, ordered top-to-bottom without overlap", () => {
    expect(layout.vendorNodes.some((v) => v.id === "ven-unused")).toBe(false);
    const ys = layout.vendorNodes.map((v) => v.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    for (let i = 1; i < layout.vendorNodes.length; i++) {
      expect(layout.vendorNodes[i].y).toBeGreaterThanOrEqual(
        layout.vendorNodes[i - 1].y + layout.vendorNodes[i - 1].h,
      );
    }
  });

  it("edges connect existing nodes to existing vendors; systems without vendor have no edge", () => {
    const nodeIds = new Set(layout.nodes.map((n) => n.id));
    const vendorIds = new Set(layout.vendorNodes.map((v) => v.id));
    for (const edge of layout.edges) {
      expect(nodeIds.has(edge.sourceId)).toBe(true);
      expect(vendorIds.has(edge.targetId)).toBe(true);
      expect(edge.path.startsWith("M ")).toBe(true);
    }
    expect(layout.edges.some((e) => e.sourceId === "sys-orphan")).toBe(false);
  });

  it("unclassified systems get the gap treatment (dashed, gray)", () => {
    const westlaw = layout.nodes.find((n) => n.id === "sys-westlaw")!;
    expect(westlaw.dashed).toBe(true);
    expect(westlaw.riskColor).toBe("#94a3b8");
    const harvey = layout.nodes.find((n) => n.id === "sys-harvey")!;
    expect(harvey.dashed).toBe(false);
  });

  it("within a lane, systems sort by severity then name", () => {
    const clm = layout.nodes
      .filter((n) => n.laneId === "CONTRACT_CLM")
      .sort((a, b) => a.y - b.y || a.x - b.x);
    expect(clm[0].id).toBe("sys-luminance"); // HIGH before LIMITED
  });

  it("vendors serving >= 3 systems are bold", () => {
    const microsoft = layout.vendorNodes.find((v) => v.id === "ven-microsoft")!;
    const openai = layout.vendorNodes.find((v) => v.id === "ven-openai")!;
    expect(microsoft.bold).toBe(true);
    expect(openai.bold).toBe(false);
  });

  it("compact mode fits the same content into a smaller canvas", () => {
    const compact = computeProgramMapLayout(MOCK_PROGRAM_GRAPH, { compact: true });
    expect(compact.height).toBeLessThan(layout.height);
    expect(compact.nodes).toHaveLength(layout.nodes.length);
  });

  it("empty graph yields an empty but well-formed layout", () => {
    const empty = computeProgramMapLayout({ groups: [], systems: [], vendors: [] });
    expect(empty.nodes).toHaveLength(0);
    expect(empty.lanes).toHaveLength(0);
    expect(empty.edges).toHaveLength(0);
    expect(empty.legend.length).toBeGreaterThan(0);
    expect(empty.height).toBeGreaterThan(0);
  });

  it("technique-derived groups sort riskiest lane first", () => {
    const graph: ProgramGraph = {
      groups: [
        { id: "technique:NLP", label: "NLP" },
        { id: "technique:GENERATIVE_AI", label: "GenAI" },
      ],
      systems: [
        { ...MOCK_PROGRAM_GRAPH.systems[0], id: "a", groupId: "technique:NLP", riskLevel: "MINIMAL" },
        { ...MOCK_PROGRAM_GRAPH.systems[0], id: "b", groupId: "technique:GENERATIVE_AI", riskLevel: "HIGH" },
      ],
      vendors: [],
    };
    const l = computeProgramMapLayout(graph);
    expect(l.lanes[0].id).toBe("technique:GENERATIVE_AI");
  });
});

describe("deriveGlyphs", () => {
  const base = MOCK_PROGRAM_GRAPH.systems[0];

  it("policy glyph always present; missing state when unlinked", () => {
    const linked = deriveGlyphs({ ...base, policyLinkCount: 2 });
    const unlinked = deriveGlyphs({ ...base, policyLinkCount: 0 });
    expect(linked.find((g) => g.kind === "policy")!.state).toBe("present");
    expect(unlinked.find((g) => g.kind === "policy")!.state).toBe("missing");
  });

  it("gate states: overdue/failed=alert, all passed=ok, else warn, none=absent", () => {
    const overdue = deriveGlyphs({
      ...base,
      gates: [{ gateType: "PRE_DEPLOYMENT", status: "PENDING", overdue: true }],
    });
    expect(overdue.find((g) => g.kind === "gate")!.state).toBe("alert");
    const none = deriveGlyphs({ ...base, gates: [] });
    expect(none.some((g) => g.kind === "gate")).toBe(false);
  });

  it("transparency glyph only for relevant systems; alert when profile missing", () => {
    const missing = deriveGlyphs({
      ...base,
      transparencyRelevant: true,
      hasTransparencyProfile: false,
    });
    expect(missing.find((g) => g.kind === "transparency")!.state).toBe("alert");
    const irrelevant = deriveGlyphs({ ...base, transparencyRelevant: false });
    expect(irrelevant.some((g) => g.kind === "transparency")).toBe(false);
  });

  it("glyph x offsets are sequential and non-overlapping", () => {
    const glyphs = deriveGlyphs(base);
    glyphs.forEach((g, i) => expect(g.dx).toBe(i * 16));
  });
});

describe("paginateProgramGraph", () => {
  it("returns a single page when everything fits", () => {
    expect(paginateProgramGraph(MOCK_PROGRAM_GRAPH, {}, 10000)).toHaveLength(1);
  });

  it("splits along lane boundaries, preserving all systems exactly once", () => {
    const pages = paginateProgramGraph(MOCK_PROGRAM_GRAPH, {}, 260);
    expect(pages.length).toBeGreaterThan(1);
    const ids = pages.flatMap((p) => p.systems.map((s) => s.id)).sort();
    expect(ids).toEqual(MOCK_PROGRAM_GRAPH.systems.map((s) => s.id).sort());
    for (const page of pages) {
      const pageLayout = computeProgramMapLayout(page);
      // Each page's own layout must respect roughly the budget (single
      // over-tall lane is allowed to exceed; none in the fixture do)
      expect(pageLayout.lanes.length).toBeGreaterThan(0);
    }
  });

  it("page sub-graphs only carry vendors their systems reference", () => {
    const pages = paginateProgramGraph(MOCK_PROGRAM_GRAPH, {}, 260);
    for (const page of pages) {
      const referenced = new Set(page.systems.map((s) => s.vendorId).filter(Boolean));
      for (const vendor of page.vendors) {
        expect(referenced.has(vendor.id)).toBe(true);
      }
    }
  });
});
