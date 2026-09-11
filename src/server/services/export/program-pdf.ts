// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Renders the governance program PDF and freezes the snapshot it was rendered
 * from. Shared by /api/export/governance-program and the program pack, so the
 * PDF inside the pack is byte-for-byte the same report the page exports.
 */

import type { PrismaClient } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  getProgramGraphData,
  getProgramScorecardData,
} from "@/server/services/program/program-data";
import {
  renderProgramReport,
  type DerivationSummary,
  type SnapshotContext,
} from "@/server/services/export/program-report";
import { getConfirmationSummary } from "@/server/services/provenance/summary";
import {
  captureProgramSnapshot,
  getPreviousSnapshot,
  getSnapshot,
} from "@/server/services/program/snapshot";
import { diffSnapshots } from "@/lib/program-diff";

export async function renderProgramPdf(
  prisma: PrismaClient,
  args: { organizationId: string; userId: string; orgName: string; locale: "en" | "es" },
): Promise<{ buffer: Buffer; dateStr: string; systems: number }> {
  const { organizationId, orgName, locale, userId } = args;
  const [graph, scorecard, confirmation] = await Promise.all([
    getProgramGraphData(prisma, organizationId, locale),
    getProgramScorecardData(prisma, organizationId, locale),
    // Feeds the annex's derivation table: how much of this report a human has
    // actually vouched for. Without it the annex says so explicitly rather
    // than implying everything is reviewed.
    getConfirmationSummary(prisma, organizationId),
  ]);

  const derivation: DerivationSummary = {
    weightedPct: confirmation.weightedPct,
    byClass: confirmation.byClass.map((row) => ({
      id: row.id,
      total: row.total,
      autoDerived: row.total - row.confirmed,
      confirmed: row.confirmed,
    })),
  };

  const dateStr = scorecard.generatedAt.slice(0, 10);

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: userId,
      entityType: "Organization",
      entityId: organizationId,
      action: "EXPORT_GOVERNANCE_PROGRAM",
      changes: { format: "pdf", locale, systems: graph.systems.length },
    },
  });

  // Freeze what this PDF was rendered from. An exported artifact that cannot
  // be reproduced later is a screenshot, not a record — the snapshot id and
  // hash printed in the annex are what make it one.
  let snapshotContext: SnapshotContext | null = null;
  try {
    const captured = await captureProgramSnapshot(prisma, organizationId, locale, {
      reason: "EXPORT",
      createdBy: userId,
    });

    const current = await getSnapshot(prisma, organizationId, captured.id);
    const previous = current
      ? await getPreviousSnapshot(prisma, organizationId, current.createdAt)
      : null;
    const diff =
      current && previous
        ? diffSnapshots(previous.payload, current.payload)
        : null;

    snapshotContext = {
      id: captured.id,
      payloadHash: captured.payloadHash,
      capturedAt: (current?.createdAt ?? new Date()).toISOString(),
      previous:
        previous && diff
          ? {
              id: previous.id,
              capturedAt: previous.createdAt.toISOString(),
              overallDelta: diff.overall.delta,
              dimensionDeltas: diff.dimensions.map((d) => ({
                id: d.id,
                delta: d.delta,
              })),
              gapsClosed: diff.gapsClosed,
              gapsOpened: diff.gapsOpened,
              rulePackChanges: diff.rulePackChanges,
            }
          : null,
    };
  } catch (error) {
    // A snapshot is a record of the export, not a precondition for it. If the
    // capture fails the user still gets their PDF — it just renders without
    // the snapshot-identity annex page.
    console.error("[export/governance-program] snapshot capture failed", error);
  }

  const buffer = await renderToBuffer(
    await renderProgramReport({
      orgName,
      locale,
      graph,
      scorecard,
      derivation,
      snapshot: snapshotContext,
    }),
  );


  return { buffer, dateStr, systems: graph.systems.length };
}
