// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The public feedback form, through the real router.
 *
 * It is the one tRPC procedure a stranger can call, and every call writes a
 * row. It used to have no limit on the number of calls and none on the length
 * of `page`. It now counts per caller address inside the procedure (so request
 * batching cannot step around it) and caps `page` at 500 characters.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const H = vi.hoisted(() => {
  const rows: Record<string, unknown>[] = [];
  const db = {
    feedback: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        rows.push(data);
        return data;
      },
    },
  };
  return { db, rows };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { createInnerTRPCContext } from "@/server/trpc";
import { feedbackRouter } from "@/server/routers/feedback";
import { DEFAULT_POLICIES, __resetRateLimitStore } from "@/lib/rate-limit";

const callerAt = (clientIp?: string) =>
  feedbackRouter.createCaller(
    createInnerTRPCContext({ session: null, getCookie: () => undefined, clientIp }),
  );

beforeEach(() => {
  H.rows.length = 0;
  __resetRateLimitStore();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("feedback.submit", () => {
  it("an anonymous visitor can still leave feedback", async () => {
    await expect(
      callerAt("203.0.113.7").submit({ message: "The export is clear.", page: "/governance" }),
    ).resolves.toEqual({ success: true });
    expect(H.rows).toHaveLength(1);
  });

  it("refuses the call after the allowance, and writes nothing more", async () => {
    const stranger = callerAt("203.0.113.7");
    const allowance = DEFAULT_POLICIES.feedback.limit;
    for (let i = 0; i < allowance; i += 1) await stranger.submit({ message: `note ${i}` });

    await expect(stranger.submit({ message: "one too many" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(H.rows).toHaveLength(allowance);

    // Another address keeps its own allowance.
    await expect(callerAt("198.51.100.9").submit({ message: "hello" })).resolves.toEqual({
      success: true,
    });
  });

  it("callers whose address cannot be read share one allowance", async () => {
    const allowance = DEFAULT_POLICIES.feedback.limit;
    for (let i = 0; i < allowance; i += 1) await callerAt().submit({ message: `note ${i}` });

    await expect(callerAt().submit({ message: "one too many" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("the allowance is read from RATE_LIMIT_FEEDBACK", async () => {
    vi.stubEnv("RATE_LIMIT_FEEDBACK", "1/60");
    const stranger = callerAt("203.0.113.7");
    await stranger.submit({ message: "first" });
    await expect(stranger.submit({ message: "second" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("refuses a `page` longer than 500 characters", async () => {
    await expect(
      callerAt("203.0.113.7").submit({ message: "hello", page: "x".repeat(501) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(H.rows).toHaveLength(0);
  });
});
