// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Pure builder: Prisma-shaped rows → ProgramGraph.
 *
 * Mirrors DPO Central's flow-input.ts posture: no Prisma imports, everything
 * injectable (clock, labels, rollout-stage lookup) so it unit-tests hermetically
 * and is shared verbatim by the tRPC router and the PDF export route.
 *
 * Grouping: systems created by the law-firm quickstart carry
 * metadata.toolId → resolved to a toolkit category lane (config order).
 * Everything else groups by technique; unknown/missing → implicit
 * "ungrouped" lane (handled by the layout).
 */

import type {
  ProgramGraph,
  ProgramGraphGroup,
  ProgramGraphSystem,
  ProgramGraphVendor,
  ProgramRiskLevel,
  ProgramSystemStatus,
  ProgramGateStatus,
  ProgramVendorRisk,
  RolloutStage,
} from "@/lib/program-map/types";
import {
  LAWFIRM_TOOLS,
  LAWFIRM_TOOL_CATEGORIES,
  type ContentLocale,
} from "@/config/lawfirm-ai-toolkit";

export interface ProgramSystemRow {
  id: string;
  name: string;
  technique: string;
  status: string;
  processesPersonalData: boolean;
  vendorId: string | null;
  metadata: unknown;
  riskLevel: string | null;
  gates: Array<{ gateType: string; status: string; nextReviewDate: Date | null }>;
  policyLinkCount: number;
  hasTransparencyProfile: boolean;
}

export interface ProgramVendorRow {
  id: string;
  name: string;
  riskLevel: string | null;
  systemCount: number;
}

export interface BuildProgramGraphInput {
  systems: ProgramSystemRow[];
  vendors: ProgramVendorRow[];
  /** aiSystemId → { assessed, total } compliance-mapping counts */
  complianceBySystem: ReadonlyMap<string, { assessed: number; total: number }>;
  locale: ContentLocale;
  now: Date;
  labels: {
    /** localized label for one AITechnique enum value */
    technique: (technique: string) => string;
  };
  /** injected so this module doesn't depend on program-guidance directly */
  stageForCategory?: (categoryId: string) => RolloutStage | undefined;
}

const RISK_LEVELS: ReadonlySet<string> = new Set([
  "UNACCEPTABLE",
  "HIGH",
  "LIMITED",
  "MINIMAL",
]);
const VENDOR_RISKS: ReadonlySet<string> = new Set([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
]);
const GATE_STATUSES: ReadonlySet<string> = new Set([
  "PENDING",
  "IN_REVIEW",
  "PASSED",
  "FAILED",
  "DEFERRED",
]);

function lawFirmCategoryIdFor(row: ProgramSystemRow): string | null {
  const meta = row.metadata as { profile?: unknown; toolId?: unknown } | null;
  if (!meta || meta.profile !== "lawfirm" || typeof meta.toolId !== "string") {
    return null;
  }
  const tool = LAWFIRM_TOOLS.find((t) => t.id === meta.toolId);
  return tool ? tool.categoryId : null;
}

export function buildProgramGraph(input: BuildProgramGraphInput): ProgramGraph {
  const { locale, now } = input;

  // RETIRED systems are excluded from the map by default.
  const rows = input.systems.filter((s) => s.status !== "RETIRED");

  // Resolve each system's group and collect groups in stable order:
  // lawfirm categories in config order first, then technique groups by id.
  const groupIdBySystem = new Map<string, string>();
  const techniqueGroups = new Set<string>();
  const lawfirmGroups = new Set<string>();
  for (const row of rows) {
    const categoryId = lawFirmCategoryIdFor(row);
    if (categoryId) {
      groupIdBySystem.set(row.id, categoryId);
      lawfirmGroups.add(categoryId);
    } else {
      const id = `technique:${row.technique}`;
      groupIdBySystem.set(row.id, id);
      techniqueGroups.add(id);
    }
  }

  const groups: ProgramGraphGroup[] = [
    ...LAWFIRM_TOOL_CATEGORIES.filter((c) => lawfirmGroups.has(c.id)).map(
      (c) => ({
        id: c.id,
        label: c.label[locale],
        rolloutStage: input.stageForCategory?.(c.id),
      }),
    ),
    ...[...techniqueGroups].sort().map((id) => ({
      id,
      label: input.labels.technique(id.slice("technique:".length)),
    })),
  ];

  const systems: ProgramGraphSystem[] = rows.map((row) => {
    const compliance = input.complianceBySystem.get(row.id);
    return {
      id: row.id,
      name: row.name,
      groupId: groupIdBySystem.get(row.id)!,
      riskLevel: RISK_LEVELS.has(row.riskLevel ?? "")
        ? (row.riskLevel as ProgramRiskLevel)
        : null,
      status: row.status as ProgramSystemStatus,
      processesPersonalData: row.processesPersonalData,
      vendorId: row.vendorId,
      gates: row.gates.map((g) => ({
        gateType: g.gateType,
        status: (GATE_STATUSES.has(g.status)
          ? g.status
          : "PENDING") as ProgramGateStatus,
        overdue:
          (g.status === "PENDING" || g.status === "IN_REVIEW") &&
          g.nextReviewDate !== null &&
          g.nextReviewDate.getTime() < now.getTime(),
      })),
      policyLinkCount: row.policyLinkCount,
      transparencyRelevant: row.technique === "GENERATIVE_AI",
      hasTransparencyProfile: row.hasTransparencyProfile,
      complianceAssessedPct:
        compliance && compliance.total > 0
          ? Math.round((100 * compliance.assessed) / compliance.total)
          : null,
    };
  });

  const referencedVendorIds = new Set(
    systems.map((s) => s.vendorId).filter((id): id is string => id !== null),
  );
  const vendors: ProgramGraphVendor[] = input.vendors
    .filter((v) => referencedVendorIds.has(v.id))
    .map((v) => ({
      id: v.id,
      name: v.name,
      riskLevel: VENDOR_RISKS.has(v.riskLevel ?? "")
        ? (v.riskLevel as ProgramVendorRisk)
        : null,
      systemCount: v.systemCount,
    }));

  return { groups, systems, vendors };
}
