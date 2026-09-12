// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect, vi } from "vitest";
import { addLibraryScenarios, createBuilderThreatModel } from "./create";
import { suggestScenarios } from "@/config/threat-model";

type Row = Record<string, unknown>;

/**
 * A fake with the three delegates the service touches, applying the same
 * filtering Prisma would. The wizard can be run twice on one account, so the
 * behaviour under repetition is the thing worth testing.
 */
function fakeDb(existingModels: Row[] = []) {
  const models = [...existingModels];
  const scenarios: Row[] = [];
  const controls: Row[] = [];

  const db = {
    threatModel: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        models.find((m) => m.organizationId === where.organizationId && m.name === where.name) ??
        null,
      ),
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { id: `model-${models.length + 1}`, ...data };
        models.push(row);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const row = models.find((m) => m.id === where.id);
        if (row) Object.assign(row, data);
        return { count: row ? 1 : 0 };
      }),
    },
    threatScenario: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        scenarios.filter((s) => s.threatModelId === where.threatModelId),
      ),
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { id: `scenario-${scenarios.length + 1}`, ...data };
        scenarios.push(row);
        return row;
      }),
    },
    threatControl: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { id: `control-${controls.length + 1}`, ...data };
        controls.push(row);
        return row;
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return { db, models, scenarios, controls };
}

const ARGS = {
  organizationId: "org-1",
  userId: "user-1",
  name: "Support agent",
  capabilities: ["customer_records", "transact"],
};

describe("creating a threat model from the wizard", () => {
  it("creates the model and the scenarios its capabilities imply", async () => {
    const { db, models, scenarios, controls } = fakeDb();
    const result = await createBuilderThreatModel(db, ARGS);

    expect(result.created).toBe(true);
    expect(models).toHaveLength(1);
    expect(scenarios).toHaveLength(suggestScenarios(ARGS.capabilities).length);
    expect(result.scenariosAdded).toBe(scenarios.length);
    // Every scenario brings at least one control.
    expect(controls.length).toBeGreaterThanOrEqual(scenarios.length);
  });

  it("carries the test onto each control, so nothing has to be written later", async () => {
    const { db, controls } = fakeDb();
    await createBuilderThreatModel(db, ARGS);
    expect(controls.every((c) => typeof c.howToTest === "string" && c.howToTest)).toBe(true);
  });
});

describe("running the wizard twice on the same account", () => {
  it("adds nothing the second time", async () => {
    const { db, models, scenarios } = fakeDb();
    await createBuilderThreatModel(db, ARGS);
    const firstCount = scenarios.length;

    const second = await createBuilderThreatModel(db, ARGS);

    expect(second.created).toBe(false);
    expect(second.scenariosAdded).toBe(0);
    expect(models).toHaveLength(1);
    expect(scenarios).toHaveLength(firstCount);
  });

  it("widens the model when the second run names a new capability", async () => {
    const { db, models, scenarios } = fakeDb();
    await createBuilderThreatModel(db, ARGS);
    const firstCount = scenarios.length;

    const second = await createBuilderThreatModel(db, {
      ...ARGS,
      capabilities: ["send_external"],
    });

    // The capabilities are unioned, not replaced: the earlier answers survive.
    expect(models[0].capabilities).toEqual(
      expect.arrayContaining(["customer_records", "transact", "send_external"]),
    );
    expect(second.scenariosAdded).toBeGreaterThan(0);
    expect(scenarios.length).toBeGreaterThan(firstCount);
    expect(models).toHaveLength(1);
  });

  it("keeps one model per name, not one per run", async () => {
    const { db, models } = fakeDb();
    await createBuilderThreatModel(db, ARGS);
    await createBuilderThreatModel(db, ARGS);
    await createBuilderThreatModel(db, ARGS);
    expect(models).toHaveLength(1);
  });
});

describe("adding scenarios to an existing model", () => {
  it("skips the ones already on the board", async () => {
    const { db, scenarios } = fakeDb();
    const created = await createBuilderThreatModel(db, ARGS);
    const before = scenarios.length;

    const added = await addLibraryScenarios(
      db,
      "org-1",
      created.threatModelId,
      "user-1",
      suggestScenarios(ARGS.capabilities).map((s) => s.id),
    );

    expect(added).toBe(0);
    expect(scenarios).toHaveLength(before);
  });

  it("ignores a library id that does not exist", async () => {
    const { db } = fakeDb();
    const created = await createBuilderThreatModel(db, { ...ARGS, capabilities: [] });
    const added = await addLibraryScenarios(db, "org-1", created.threatModelId, "user-1", [
      "not-a-scenario",
    ]);
    expect(added).toBe(0);
  });
});
