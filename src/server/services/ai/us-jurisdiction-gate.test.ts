// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AI is unavailable to an organization that declares a US state.
 *
 * The rule lives in requireAi (services/ai/posture.ts), which every AI
 * feature procedure runs before building a prompt. A posture saved before
 * the organization declared a US state does not reopen AI.
 * AI_ALLOW_US_JURISDICTIONS=true lifts the rule for a deployment whose
 * engine terms cover US state laws. Mocked Prisma, stubbed env.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import type { PrismaClient } from "@prisma/client";
import {
  declaresUsState,
  isAiBlockedForUsJurisdiction,
  requireAi,
  usJurisdictionAiBlockActive,
} from "@/server/services/ai/posture";

const prismaMock = {
  organizationAiSettings: { findUnique: vi.fn() },
  aiGeneration: { count: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  organization: { findUnique: vi.fn() },
};
const prisma = prismaMock as unknown as Pick<
  PrismaClient,
  "organizationAiSettings" | "aiGeneration" | "organization"
>;

const declares = (...operatingJurisdictions: string[]) =>
  prismaMock.organization.findUnique.mockResolvedValue({ operatingJurisdictions });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_ALLOW_US_JURISDICTIONS", "");
  vi.stubEnv("LLM_GATEWAY_URL", "http://ollama:11434");
  vi.stubEnv("LLM_MODEL_ALIAS", "qwen2.5:7b-instruct");
  prismaMock.organizationAiSettings.findUnique.mockResolvedValue({
    organizationId: "org-1",
    posture: "cloud_us",
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("declaresUsState", () => {
  it.each([["US_CA"], ["US_CO"], ["US_NY"], ["US_WA"]])("%s is a US state", (j) => {
    expect(declaresUsState([j])).toBe(true);
  });

  it.each([["EU"], ["UK"], ["CANADA"], ["US_FEDERAL"], ["OTHER"]])("%s is not", (j) => {
    expect(declaresUsState([j])).toBe(false);
  });

  it("one US state among others is enough", () => {
    expect(declaresUsState(["EU", "US_FEDERAL", "US_TX"])).toBe(true);
  });
});

describe("usJurisdictionAiBlockActive", () => {
  it("is on by default and lifted only by AI_ALLOW_US_JURISDICTIONS=true", () => {
    expect(usJurisdictionAiBlockActive()).toBe(true);
    vi.stubEnv("AI_ALLOW_US_JURISDICTIONS", "true");
    expect(usJurisdictionAiBlockActive()).toBe(false);
    vi.stubEnv("AI_ALLOW_US_JURISDICTIONS", "1");
    expect(usJurisdictionAiBlockActive()).toBe(true);
  });
});

describe("isAiBlockedForUsJurisdiction", () => {
  it("reads the organization's own operating jurisdictions", async () => {
    declares("US_CA");
    await expect(isAiBlockedForUsJurisdiction(prisma, "org-1")).resolves.toBe(true);
    expect(prismaMock.organization.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "org-1" } })
    );
  });

  it("does not query when the rule is lifted", async () => {
    vi.stubEnv("AI_ALLOW_US_JURISDICTIONS", "true");
    await expect(isAiBlockedForUsJurisdiction(prisma, "org-1")).resolves.toBe(false);
    expect(prismaMock.organization.findUnique).not.toHaveBeenCalled();
  });

  it("a missing organization is not blocked by this rule", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null);
    await expect(isAiBlockedForUsJurisdiction(prisma, "org-1")).resolves.toBe(false);
  });
});

describe("requireAi with a US state declared", () => {
  it("refuses with ai_us_jurisdiction even when AI was switched on before", async () => {
    declares("EU", "US_CA");
    await expect(requireAi(prisma, "org-1")).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "ai_us_jurisdiction",
    });
    expect(prismaMock.organizationAiSettings.findUnique).not.toHaveBeenCalled();
  });

  it("lets an organization with no US state through as before", async () => {
    declares("EU", "CANADA", "US_FEDERAL");
    await expect(requireAi(prisma, "org-1")).resolves.toMatchObject({ posture: "cloud_us" });
  });

  it("lets a US organization through when the rule is lifted", async () => {
    vi.stubEnv("AI_ALLOW_US_JURISDICTIONS", "true");
    declares("US_CA");
    await expect(requireAi(prisma, "org-1")).resolves.toMatchObject({ posture: "cloud_us" });
  });
});
