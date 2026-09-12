// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Creating a threat model, from wherever it is asked for.
 *
 * One code path, used by the threat-model screen and by the Quick Start
 * wizard, so a model built by the wizard is the same object as one built by
 * hand: same scenarios, same controls, same tests to run.
 *
 * Idempotent on purpose. The wizard can be run twice on the same account, and
 * the second run must add nothing it already added.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { SCENARIO_LIBRARY, priorityFor, suggestScenarios } from "@/config/threat-model";

type Db = PrismaClient | Prisma.TransactionClient;

const toDbCategory = (c: string) => c.toUpperCase();
const toDbLayer = (l: string) => l.toUpperCase();

/**
 * Materialise library scenarios onto a threat model, with a control per
 * suggestion and the test carried onto the control. Scenarios already present
 * (matched by their library id) are skipped, so this can run repeatedly.
 */
export async function addLibraryScenarios(
  db: Db,
  organizationId: string,
  threatModelId: string,
  userId: string,
  libraryIds: string[],
): Promise<number> {
  const existing = await db.threatScenario.findMany({
    where: { threatModelId, organizationId },
    select: { libraryId: true },
  });
  const taken = new Set(existing.map((e) => e.libraryId).filter(Boolean));

  let added = 0;
  for (const libraryId of libraryIds) {
    if (taken.has(libraryId)) continue;
    const entry = SCENARIO_LIBRARY.find((s) => s.id === libraryId);
    if (!entry) continue;

    const priority = priorityFor(
      entry.defaults.impact,
      entry.defaults.likelihood,
      entry.defaults.blastRadius,
    ).priority;

    const scenario = await db.threatScenario.create({
      data: {
        organizationId,
        threatModelId,
        libraryId: entry.id,
        category: toDbCategory(entry.category) as never,
        title: entry.title.en,
        description: entry.story.en,
        impact: entry.defaults.impact,
        likelihood: entry.defaults.likelihood,
        blastRadius: entry.defaults.blastRadius,
        priority,
        createdBy: userId,
      },
    });

    for (const control of entry.controls) {
      await db.threatControl.create({
        data: {
          organizationId,
          scenarioId: scenario.id,
          layer: toDbLayer(control.layer) as never,
          description: control.text.en,
          howToTest: entry.test.en,
          createdBy: userId,
        },
      });
    }
    taken.add(entry.id);
    added += 1;
  }
  return added;
}

export interface BuilderModelResult {
  threatModelId: string;
  created: boolean;
  scenariosAdded: number;
}

/**
 * The wizard's builder path: one threat model for the product being built.
 *
 * Deduped by name within the organisation. A second wizard run with the same
 * name tops up any scenarios the capabilities now imply and creates nothing
 * else, which is what "run it again after adding a tool" should do.
 */
export async function createBuilderThreatModel(
  db: Db,
  args: {
    organizationId: string;
    userId: string;
    name: string;
    capabilities: string[];
    systemSummary?: string;
    aiSystemId?: string | null;
  },
): Promise<BuilderModelResult> {
  const existing = await db.threatModel.findFirst({
    where: { organizationId: args.organizationId, name: args.name },
    select: { id: true, capabilities: true },
  });

  const libraryIds = suggestScenarios(args.capabilities).map((s) => s.id);

  if (existing) {
    // Union the capabilities: a second run that adds "can issue refunds" must
    // widen the model rather than replace what was there.
    const union = [...new Set([...existing.capabilities, ...args.capabilities])];
    if (union.length !== existing.capabilities.length) {
      await db.threatModel.updateMany({
        where: { id: existing.id, organizationId: args.organizationId },
        data: { capabilities: union },
      });
    }
    const added = await addLibraryScenarios(
      db,
      args.organizationId,
      existing.id,
      args.userId,
      suggestScenarios(union).map((s) => s.id),
    );
    return { threatModelId: existing.id, created: false, scenariosAdded: added };
  }

  const model = await db.threatModel.create({
    data: {
      organizationId: args.organizationId,
      name: args.name,
      systemSummary: args.systemSummary,
      aiSystemId: args.aiSystemId ?? undefined,
      capabilities: args.capabilities,
      createdBy: args.userId,
    },
  });

  const added = await addLibraryScenarios(
    db,
    args.organizationId,
    model.id,
    args.userId,
    libraryIds,
  );

  return { threatModelId: model.id, created: true, scenariosAdded: added };
}
