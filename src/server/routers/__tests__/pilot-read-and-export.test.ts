// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot never locks a firm out of its own records.
 *
 * One suite for the promise the pilot makes: an organisation at every records
 * ceiling, and far past its ninety editing days, can still read everything and
 * export everything. Only editing stops.
 *
 *   1. Every query in the application, called through the real middleware as
 *      such an organisation, gets past the pilot: none is refused with a pilot
 *      limit. A new query built on the write procedure would fail here.
 *   2. The mutations the pilot does refuse are all edits: none of them reads or
 *      exports (the list is pinned, so a new one has to be looked at).
 *   3. No export route consults the pilot guard.
 *   4. The clock: past the window the status says read-only and exports allowed.
 *
 * No database: a permissive fake answers every model with nothing.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Session } from "next-auth";

const H = vi.hoisted(() => {
  const DAY = 24 * 60 * 60 * 1000;
  // At every ceiling at once: every count answers far above any ceiling.
  const AT_EVERY_CEILING = 10_000;
  const organization = {
    id: "org-a",
    name: "Org A",
    slug: "org-a",
    settings: {},
    createdAt: new Date("2026-09-19T00:00:00.000Z"),
    // 400 days before the fake present below: far past the ninety.
    pilotFirstSignInAt: new Date(new Date("2027-12-01T12:00:00.000Z").getTime() - 400 * DAY),
  };
  const membership = { organizationId: "org-a", userId: "user-a", role: "OWNER", organization };

  const method = (model: string, name: string) => async (...args: unknown[]) => {
    if (model === "organizationMember" && name === "findUnique") return membership;
    if (model === "organization" && (name === "findUnique" || name === "findFirst")) return organization;
    if (name === "count") return AT_EVERY_CEILING;
    if (name === "findMany" || name === "groupBy") return [];
    if (name === "aggregate") return { _count: {}, _sum: {}, _avg: {}, _min: {}, _max: {} };
    if (name.endsWith("Many")) return { count: 0 };
    void args;
    return null;
  };
  const model = (name: string) =>
    new Proxy({}, { get: (_t, prop) => (typeof prop === "string" ? method(name, prop) : undefined) });

  const db: Record<string, unknown> = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") return undefined;
        if (prop === "$transaction")
          return async (arg: unknown) =>
            typeof arg === "function" ? (arg as (tx: unknown) => unknown)(db) : Promise.all(arg as unknown[]);
        if (prop === "$queryRaw" || prop === "$queryRawUnsafe") return async () => [];
        if (prop === "$executeRaw" || prop === "$executeRawUnsafe") return async () => 0;
        return typeof prop === "string" ? model(prop) : undefined;
      },
    },
  );
  return { db, organization };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));

import { appRouter } from "@/server/routers";
import { createInnerTRPCContext } from "@/server/trpc";
import { PilotLimitReached, getPilotStatus, type PilotDb } from "@/server/services/pilot/caps";

const session = {
  user: { id: "user-a", email: "user-a@example.test", name: "user-a" },
  expires: "2099-01-01T00:00:00.000Z",
} as unknown as Session;

type AnyProcedure = { _def: { type: "query" | "mutation" | "subscription" } };
const procedures = Object.entries(
  (appRouter as unknown as { _def: { procedures: Record<string, AnyProcedure> } })._def.procedures,
);

/** Calls one procedure by its dotted path, with only the organisation as input. */
async function call(path: string): Promise<unknown> {
  const caller = appRouter.createCaller(
    createInnerTRPCContext({ session, getCookie: () => undefined, clientIp: "203.0.113.1" }),
  ) as unknown as Record<string, unknown>;
  let target: unknown = caller;
  for (const part of path.split(".")) target = (target as Record<string, unknown>)[part];
  try {
    return await (target as (input: unknown) => Promise<unknown>)({ organizationId: "org-a" });
  } catch (error) {
    return error;
  }
}

const EDITS_THE_PILOT_REFUSES = [
  "sample.create",
  "organization.setJurisdictions",
  "aiSystem.importRows", "aiSystem.create", "aiSystem.update", "aiSystem.delete",
  "aiSystem.addModel", "aiSystem.updateModel", "aiSystem.deleteModel",
  "aiSystem.addDataSource", "aiSystem.updateDataSource", "aiSystem.deleteDataSource",
  "aiSystem.generateAnnexIv",
  "riskClassification.classify", "riskClassification.generateAiRationale",
  "transparency.upsert", "transparency.generateStatement",
  "assessment.create", "assessment.update", "assessment.submit", "assessment.processApproval",
  "assessment.generateAiDraft", "assessment.markAiAccepted", "assessment.createTemplate",
  "assessment.cloneTemplate",
  "compliance.updateMapping", "compliance.addEvidence", "compliance.removeEvidence",
  "oversight.create", "oversight.update", "oversight.addDecision",
  "incident.create", "incident.update", "incident.addTimelineEntry", "incident.addTask",
  "incident.updateTask", "incident.addNotification", "incident.updateNotification",
  "incident.setStatutoryFacts",
  "vendor.create", "vendor.createWithSystem", "vendor.update", "vendor.delete",
  "vendor.createAssessment", "vendor.updateAssessment",
  "policy.create", "policy.update", "policy.publishVersion", "policy.approve",
  "policy.linkSystem", "policy.unlinkSystem",
  "shadowAi.createReport", "shadowAi.updateReport", "shadowAi.registerWithAutoCreate",
  "quickstart.execute",
  "program.captureSnapshot", "program.deleteSnapshot",
  "provenance.confirm", "provenance.unconfirm",
  "admt.setOrgFacts", "admt.upsertProfile", "admt.syncMappings",
  "regimes.setOrgFacts", "regimes.setSystemFacts", "regimes.syncMappings",
  "unified.createAssessment", "unified.applyToRegister",
  "agent.upsertProfile",
  "skills.activateOffline", "skills.deactivate",
  "ai.setPosture",
  "sensitiveData.create", "sensitiveData.update", "sensitiveData.complete", "sensitiveData.delete",
  "dataFlow.setSystemFlowFacts", "dataFlow.setSourceFacts", "dataFlow.addRecipient",
  "dataFlow.updateRecipient", "dataFlow.removeRecipient",
  "legalHold.place", "legalHold.release",
  "proceedings.create", "proceedings.update", "proceedings.addEvent", "proceedings.completeEvent",
  "proceedings.delete",
  "boardReports.create", "boardReports.update", "boardReports.delete",
  "clientTemplate.copy",
  "threatModel.create", "threatModel.update", "threatModel.addFromLibrary",
  "threatModel.addScenario", "threatModel.updateScenario", "threatModel.addControl",
  "threatModel.updateControl", "threatModel.recordTest", "threatModel.delete",
  "threatModel.applyToRegister",
  // Read 2026-09-25: each appends an AIUC-1 evidence row or sets a mapping's status.
  "aiuc1.recordTest", "aiuc1.acceptPartial", "aiuc1.setApplicability",
];

const refusedByPilot = (outcome: unknown) =>
  outcome instanceof Error && (outcome as { cause?: unknown }).cause instanceof PilotLimitReached;

beforeAll(() => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "");
  vi.useFakeTimers({ now: new Date("2027-12-01T12:00:00.000Z"), toFake: ["Date"] });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("a firm at every ceiling and past its ninety days", () => {
  it("still reaches every query in the application", async () => {
    const queries = procedures.filter(([, p]) => p._def.type === "query").map(([path]) => path);
    expect(queries.length).toBeGreaterThan(50);

    const refused: string[] = [];
    for (const path of queries) if (refusedByPilot(await call(path))) refused.push(path);
    expect(refused).toEqual([]);
  });

  it("is refused only edits: the pilot-refused mutations are pinned and none reads or exports", async () => {
    const mutations = procedures.filter(([, p]) => p._def.type === "mutation").map(([path]) => path);
    const refused: string[] = [];
    for (const path of mutations) if (refusedByPilot(await call(path))) refused.push(path);

    // The way out stays open.
    expect(refused).not.toContain("organization.delete");
    // Every entry below was read on 2026-09-22 and is an edit: it creates,
    // changes or deletes a record, or drafts new content with the model
    // (generateAnnexIv, generateStatement, generateAiRationale,
    // generateAiDraft). None reads or exports. A new entry, or a missing one,
    // fails here until someone has looked at it.
    expect([...refused].sort()).toEqual([...EDITS_THE_PILOT_REFUSES].sort());
  });
});

describe("exports", () => {
  it("no export route consults the pilot guard", () => {
    const root = join(__dirname, "../../../app/api/export");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) files.push(full);
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThanOrEqual(9);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("services/pilot/caps");
      expect(source, file).not.toContain("assertPilotWritable");
      expect(source, file).not.toContain("assertPilotRoom");
    }
  });
});

describe("the clock", () => {
  it("past the window: read-only, exports allowed, and the export link is given", async () => {
    const counts = new Proxy({}, { get: () => ({ count: async () => 10_000 }) }) as PilotDb;
    const status = await getPilotStatus(counts, H.organization, new Date("2027-12-01T12:00:00.000Z"));
    expect(status.active).toBe(true);
    if (!status.active) return;
    expect(status.readOnly).toBe(true);
    expect(status.exportsAllowed).toBe(true);
    expect(status.exportUrl).toBe("/api/export/program-pack?organizationId=org-a");
  });
});
