// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Every AI path refuses an organization that declares a US state.
 *
 * Real routers and the real posture gate over a mocked Prisma; the LLM door
 * is a mock so a call reaching it would show. The organization saved
 * posture "cloud_us" earlier and an engine is configured, so the only reason
 * to refuse is the declared US state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Session } from "next-auth";

const M = vi.hoisted(() => ({
  db: {
    organizationMember: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    organizationAiSettings: { findUnique: vi.fn(), upsert: vi.fn() },
    aiGeneration: { count: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn(), count: vi.fn() },
    aISystem: { findFirst: vi.fn(), findUnique: vi.fn() },
    aIAssessment: { findFirst: vi.fn() },
    aIPolicy: { findFirst: vi.fn() },
  },
  chatComplete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: M.db, prisma: M.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/server/services/pilot/caps", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/services/pilot/caps")>();
  return { ...original, assertPilotRoom: async () => {}, assertPilotWritable: () => {} };
});
vi.mock("@/server/services/pilot/first-sign-in", () => ({
  ensurePilotFirstSignIn: async (_db: unknown, org: { pilotFirstSignInAt: Date | null }) => org.pilotFirstSignInAt,
}));
vi.mock("@/server/services/ai/llm-door", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/ai/llm-door")>()),
  chatComplete: M.chatComplete,
}));

import { createInnerTRPCContext } from "@/server/trpc";
import { aiRouter } from "@/server/routers/governance/ai";
import { aiSystemRouter } from "@/server/routers/governance/aiSystem";
import { assessmentRouter } from "@/server/routers/governance/assessment";
import { policyRouter } from "@/server/routers/governance/policy";
import { riskClassificationRouter } from "@/server/routers/governance/riskClassification";
import { transparencyRouter } from "@/server/routers/governance/transparency";

const ORG = { id: "org-us", name: "Org", pilotFirstSignInAt: new Date(0) };

function ctx() {
  const session = {
    user: { id: "owner", email: "owner@example.test", name: "owner" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as Session;
  return createInnerTRPCContext({ session, getCookie: () => undefined });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_ALLOW_US_JURISDICTIONS", "");
  vi.stubEnv("LLM_GATEWAY_URL", "http://gateway.example");
  vi.stubEnv("LLM_MODEL_ALIAS", "test-model");
  M.db.organizationMember.findUnique.mockResolvedValue({
    organizationId: ORG.id,
    userId: "owner",
    role: "OWNER",
    organization: ORG,
  });
  M.db.organization.findUnique.mockResolvedValue({ operatingJurisdictions: ["EU", "US_CA"] });
  M.db.organizationAiSettings.findUnique.mockResolvedValue({
    id: "s-1",
    organizationId: ORG.id,
    posture: "cloud_us",
    acknowledgedAt: null,
    acknowledgedBy: null,
  });
  M.db.aiGeneration.count.mockResolvedValue(0);
  M.db.auditLog.count.mockResolvedValue(0);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const refused = { code: "PRECONDITION_FAILED", message: "ai_us_jurisdiction" };
const nothingSent = () => {
  expect(M.chatComplete).not.toHaveBeenCalled();
  expect(M.db.aiGeneration.create).not.toHaveBeenCalled();
};

describe("AI paths refuse an organization that declares a US state", () => {
  it("aiSystem.generateAnnexIv", async () => {
    await expect(
      aiSystemRouter.createCaller(ctx()).generateAnnexIv({ organizationId: ORG.id, id: "sys-1" })
    ).rejects.toMatchObject(refused);
    nothingSent();
  });

  it("assessment.generateAiDraft", async () => {
    await expect(
      assessmentRouter
        .createCaller(ctx())
        .generateAiDraft({ organizationId: ORG.id, id: "asm-1", questionId: "q-1" } as never)
    ).rejects.toMatchObject(refused);
    nothingSent();
  });

  it("policy.suggestEdits", async () => {
    await expect(
      policyRouter.createCaller(ctx()).suggestEdits({ organizationId: ORG.id, id: "pol-1" })
    ).rejects.toMatchObject(refused);
    nothingSent();
  });

  it("riskClassification.generateAiRationale", async () => {
    await expect(
      riskClassificationRouter
        .createCaller(ctx())
        .generateAiRationale({ organizationId: ORG.id, aiSystemId: "sys-1", chosenLevel: "HIGH" } as never)
    ).rejects.toMatchObject(refused);
    nothingSent();
  });

  it("transparency.generateStatement", async () => {
    await expect(
      transparencyRouter.createCaller(ctx()).generateStatement({ organizationId: ORG.id, aiSystemId: "sys-1" })
    ).rejects.toMatchObject(refused);
    nothingSent();
  });

  it("ai.setPosture refuses switching AI on and stores nothing", async () => {
    await expect(
      aiRouter.createCaller(ctx()).setPosture({ organizationId: ORG.id, posture: "cloud_us", acknowledged: true })
    ).rejects.toMatchObject(refused);
    expect(M.db.organizationAiSettings.upsert).not.toHaveBeenCalled();
  });

  it("ai.setPosture still lets the organization switch AI off", async () => {
    M.db.organizationAiSettings.upsert.mockResolvedValue({ id: "s-1", posture: "off" });
    await expect(
      aiRouter.createCaller(ctx()).setPosture({ organizationId: ORG.id, posture: "off", acknowledged: true })
    ).resolves.toMatchObject({ posture: "off" });
  });

  it("ai.getStatus reports the block and that AI is not active", async () => {
    const status = await aiRouter.createCaller(ctx()).getStatus({ organizationId: ORG.id });
    expect(status).toMatchObject({ posture: "cloud_us", usJurisdictionBlocked: true, active: false });
  });

  it("ai.getStatus is unchanged for an organization with no US state", async () => {
    M.db.organization.findUnique.mockResolvedValue({ operatingJurisdictions: ["EU"] });
    const status = await aiRouter.createCaller(ctx()).getStatus({ organizationId: ORG.id });
    expect(status).toMatchObject({ usJurisdictionBlocked: false, active: true });
  });
});
