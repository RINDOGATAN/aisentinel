// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * One pilot and one plan across the suite (src/lib/suite-plan-state.ts,
 * src/server/services/suite/plan-state.ts, POST /api/suite/plan-state):
 * the signed contract, the answer this app gives, and what it takes from
 * DPO Central (paid plan adopted, pilot start used only by an organisation
 * with none, nothing off the pilot, nothing for a non-owner, nothing when
 * the peer is down).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fakeDb = vi.hoisted(() => ({ organization: { findMany: vi.fn() }, user: { findFirst: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ default: fakeDb, prisma: fakeDb }));
const fakeLogger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: fakeLogger }));

import { NOT_FOUND, parseSuiteState, signSuiteRequest, verifySuiteSignature } from "@/lib/suite-plan-state";
import {
  clearSuiteCache,
  localPlanStateForEmail,
  peerKnowsPerson,
  peerPlanState,
  peerUrl,
  suiteForRequest,
  type ApplyDb,
  type LocalStateDb,
} from "./plan-state";
import { ensurePilotFirstSignIn, type FirstSignInDb } from "@/server/services/pilot/first-sign-in";
import { POST } from "@/app/api/suite/plan-state/route";

const SECRET = "test-shared-secret";
const HOSTED = { VERCEL_ENV: "production", PLAN_SYNC_SECRET: SECRET };
const T0 = Date.parse("2026-10-26T10:00:00Z");

function okFetch(answer: unknown) {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => answer }));
}

beforeEach(() => clearSuiteCache());
afterEach(() => vi.unstubAllEnvs());

describe("the signed contract", () => {
  it("verifies its own signature and refuses a stale one", () => {
    const body = JSON.stringify({ version: 1, email: "a@b.com" });
    const t = Math.floor(T0 / 1000);
    expect(verifySuiteSignature(signSuiteRequest(SECRET, t, body), body, SECRET, t)).toBe(true);
    expect(verifySuiteSignature(signSuiteRequest(SECRET, t, body), body, SECRET, t + 301)).toBe(false);
  });

  it("asks DPO Central by default", () => {
    expect(peerUrl({})).toBe("https://dpocentral.todo.law/api/suite/plan-state");
    expect(parseSuiteState({ version: 1, found: false, paid: true })).toEqual(NOT_FOUND);
  });
});

describe("the answer this app gives", () => {
  it("is not found when the person owns no organisation", async () => {
    const db = {
      organization: { findMany: vi.fn(async () => []) },
      user: { findFirst: vi.fn(async () => null) },
    } as unknown as LocalStateDb;
    expect(await localPlanStateForEmail(db, "a@b.com")).toEqual(NOT_FOUND);
  });

  it("folds the organisations owned: paid when any is, the earliest start, the account's kept start included", async () => {
    const db = {
      organization: {
        findMany: vi.fn(async () => [
          {
            plan: "PILOT",
            planRenewsAt: null,
            planStartedAt: null,
            planStripeSubscriptionId: null,
            pilotFirstSignInAt: new Date("2026-10-20T00:00:00Z"),
          },
          {
            plan: "EU_CLOUD",
            planRenewsAt: new Date("2027-10-01T00:00:00Z"),
            planStartedAt: new Date("2026-10-01T00:00:00Z"),
            planStripeSubscriptionId: "sub_2",
            pilotFirstSignInAt: null,
          },
        ]),
      },
      user: { findFirst: vi.fn(async () => ({ pilotTrialStartedAt: new Date("2026-10-15T00:00:00Z") })) },
    } as unknown as LocalStateDb;
    expect(await localPlanStateForEmail(db, "a@b.com")).toEqual({
      version: 1,
      found: true,
      paid: true,
      planRenewsAt: "2027-10-01T00:00:00.000Z",
      subscriptionId: "sub_2",
      pilotStartedAt: "2026-10-15T00:00:00.000Z",
    });
  });
});

describe("asking the peer", () => {
  it("returns null when DPO Central is unreachable", async () => {
    const f = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await peerPlanState("a@b.com", { env: HOSTED, fetch: f, now: () => T0 })).toBeNull();
  });

  it("asks nothing when switched off", async () => {
    const f = okFetch({});
    expect(
      await peerPlanState("a@b.com", { env: { ...HOSTED, SUITE_PLAN_STATE: "off" }, fetch: f, now: () => T0 }),
    ).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});

function applyDb(count = 1) {
  const writes: object[] = [];
  const audits: object[] = [];
  const db: ApplyDb = {
    organization: {
      updateMany: vi.fn(async (args: object) => {
        writes.push(args);
        return { count };
      }),
    },
    auditLog: {
      create: vi.fn(async (args: { data: object }) => {
        audits.push(args.data);
        return args.data;
      }),
    },
    $transaction: async (fn) => fn(db),
  };
  return { db, writes, audits };
}

describe("applying DPO Central's state here", () => {
  const owner = { id: "u1", email: "owner@firm.es" };
  const org = () => ({ id: "o1", plan: "PILOT", pilotFirstSignInAt: null as Date | null });

  it("adopts a paid plan held on DPO Central, with one audit entry", async () => {
    const { db, writes, audits } = applyDb();
    const o = org();
    const f = okFetch({ version: 1, found: true, paid: true, planRenewsAt: "2027-10-01T00:00:00Z", subscriptionId: "sub_9" });
    const res = await suiteForRequest(db, o, "OWNER", owner, { env: HOSTED, fetch: f, now: () => T0 });
    expect(res.suite).toBe(true);
    expect(o.plan).toBe("EU_CLOUD");
    expect((writes[0] as { data: Record<string, unknown> }).data).toMatchObject({
      plan: "EU_CLOUD",
      planStripeSubscriptionId: "sub_9",
    });
    expect(audits[0]).toMatchObject({ action: "PLAN_CHANGE", metadata: { source: "suite-peer" } });
  });

  it("offers DPO Central's pilot start when it is on the pilot", async () => {
    const { db, writes } = applyDb();
    const f = okFetch({ version: 1, found: true, paid: false, pilotStartedAt: "2026-10-20T00:00:00Z" });
    expect(await suiteForRequest(db, org(), "OWNER", owner, { env: HOSTED, fetch: f, now: () => T0 })).toEqual({
      suite: true,
      preferredPilotStart: new Date("2026-10-20T00:00:00Z"),
    });
    expect(writes).toHaveLength(0);
  });

  it("does nothing for a member who is not an owner", async () => {
    const { db } = applyDb();
    const f = okFetch({ version: 1, found: true, paid: true });
    expect((await suiteForRequest(db, org(), "ADMIN", owner, { env: HOSTED, fetch: f })).suite).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("does nothing when DPO Central does not know the person (another e-mail)", async () => {
    const { db, writes } = applyDb();
    const f = okFetch({ version: 1, found: false, paid: false });
    expect((await suiteForRequest(db, org(), "OWNER", owner, { env: HOSTED, fetch: f })).suite).toBe(false);
    expect(writes).toHaveLength(0);
  });

  it("never fails the request when DPO Central is down", async () => {
    const { db } = applyDb();
    const f = vi.fn(async () => {
      throw new Error("timeout");
    });
    expect(await suiteForRequest(db, org(), "OWNER", owner, { env: HOSTED, fetch: f })).toEqual({
      suite: false,
      preferredPilotStart: null,
    });
  });
});

describe("one pilot window across the suite", () => {
  const owner = { id: "u1", email: "owner@firm.es" };
  const pilotAnswer = { version: 1, found: true, paid: false, pilotStartedAt: "2026-10-20T00:00:00Z" };

  it("an organisation with its own start takes DPO Central's, with one audit entry", async () => {
    const { db, writes, audits } = applyDb();
    const o = { id: "o1", plan: "PILOT", pilotFirstSignInAt: new Date("2026-10-25T08:00:00Z") as Date | null };
    const res = await suiteForRequest(db, o, "OWNER", owner, { env: HOSTED, fetch: okFetch(pilotAnswer), now: () => T0 });
    expect(res.suite).toBe(true);
    expect(o.pilotFirstSignInAt?.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(writes[0]).toMatchObject({
      where: { id: "o1", plan: { not: "EU_CLOUD" } },
      data: { pilotFirstSignInAt: new Date("2026-10-20T00:00:00Z") },
    });
    expect(audits[0]).toMatchObject({
      action: "PILOT_CLOCK_CHANGE",
      changes: {
        before: { pilotFirstSignInAt: "2026-10-25T08:00:00.000Z" },
        after: { pilotFirstSignInAt: "2026-10-20T00:00:00.000Z" },
      },
      metadata: { source: "suite-peer" },
    });
  });

  it("writes nothing when the windows already match, for a paid organisation, or without a start on DPO Central", async () => {
    const same = applyDb();
    await suiteForRequest(
      same.db,
      { id: "o1", plan: "PILOT", pilotFirstSignInAt: new Date("2026-10-20T00:00:00Z") },
      "OWNER",
      owner,
      { env: HOSTED, fetch: okFetch(pilotAnswer), now: () => T0 },
    );
    expect(same.writes).toHaveLength(0);
    clearSuiteCache();
    const paid = applyDb();
    await suiteForRequest(
      paid.db,
      { id: "o1", plan: "EU_CLOUD", pilotFirstSignInAt: new Date("2026-10-25T00:00:00Z") },
      "OWNER",
      owner,
      { env: HOSTED, fetch: okFetch(pilotAnswer), now: () => T0 },
    );
    expect(paid.writes).toHaveLength(0);
    clearSuiteCache();
    const noStart = applyDb();
    await suiteForRequest(
      noStart.db,
      { id: "o1", plan: "PILOT", pilotFirstSignInAt: new Date("2026-10-25T00:00:00Z") },
      "OWNER",
      owner,
      { env: HOSTED, fetch: okFetch({ ...pilotAnswer, pilotStartedAt: null }), now: () => T0 },
    );
    expect(noStart.writes).toHaveLength(0);
  });

  it("keeps the organisation's value when another request changed it first", async () => {
    const { db, audits } = applyDb(0);
    const o = { id: "o1", plan: "PILOT", pilotFirstSignInAt: new Date("2026-10-25T08:00:00Z") as Date | null };
    await suiteForRequest(db, o, "OWNER", owner, { env: HOSTED, fetch: okFetch(pilotAnswer), now: () => T0 });
    expect(audits).toHaveLength(0);
    expect(o.pilotFirstSignInAt?.toISOString()).toBe("2026-10-25T08:00:00.000Z");
  });
});

describe("what is logged and the offer at entry", () => {
  it("logs the peer's outcome without the e-mail", async () => {
    fakeLogger.info.mockClear();
    await peerPlanState("owner@firm.es", { env: HOSTED, fetch: okFetch({ version: 1, found: false, paid: false }), now: () => T0 });
    expect(fakeLogger.info).toHaveBeenCalledWith("Suite plan state: peer answered", { found: false, paid: false, pilot: false });
    expect(JSON.stringify(fakeLogger.info.mock.calls)).not.toContain("owner@firm.es");
  });

  it("knows the person only when DPO Central says found, and only on the hosted pilot", async () => {
    expect(await peerKnowsPerson("a@b.com", { env: HOSTED, fetch: okFetch({ version: 1, found: true, paid: false }) })).toBe(true);
    clearSuiteCache();
    expect(await peerKnowsPerson("a@b.com", { env: HOSTED, fetch: okFetch({ version: 1, found: false, paid: false }) })).toBe(false);
    const f = okFetch({ version: 1, found: true, paid: false });
    expect(
      await peerKnowsPerson("a@b.com", { env: { ...HOSTED, VERCEL_ENV: "preview", NEXT_PUBLIC_HOSTED_PILOT: "false" }, fetch: f }),
    ).toBe(false);
    expect(await peerKnowsPerson(null, { env: HOSTED, fetch: f })).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("the first sign-in with the suite's start", () => {
  function clockDb() {
    const updates: { data: { pilotFirstSignInAt: Date } }[] = [];
    const db = {
      organization: {
        updateMany: vi.fn(async (args: { data: { pilotFirstSignInAt: Date } }) => {
          updates.push(args);
          return { count: 1 };
        }),
        findFirst: vi.fn(async () => null),
      },
    } as unknown as FirstSignInDb;
    return { db, updates };
  }

  it("uses the earlier start from DPO Central", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { db, updates } = clockDb();
    const got = await ensurePilotFirstSignIn(
      db,
      { id: "o1", pilotFirstSignInAt: null },
      new Date("2026-10-26T10:00:00Z"),
      new Date("2026-10-20T00:00:00Z"),
    );
    expect(got?.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(updates[0].data.pilotFirstSignInAt.toISOString()).toBe("2026-10-20T00:00:00.000Z");
  });

  it("never moves a recorded start", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { db, updates } = clockDb();
    const start = new Date("2026-10-24T00:00:00Z");
    expect(
      await ensurePilotFirstSignIn(db, { id: "o1", pilotFirstSignInAt: start }, new Date(), new Date("2026-10-01T00:00:00Z")),
    ).toBe(start);
    expect(updates).toHaveLength(0);
  });
});

describe("POST /api/suite/plan-state", () => {
  const call = (body: string, header: string | null) =>
    POST(
      new Request("http://localhost/api/suite/plan-state", {
        method: "POST",
        body,
        headers: header ? { "x-suite-signature": header } : {},
      }),
    );

  it("refuses a bad signature and answers a good one", async () => {
    vi.stubEnv("PLAN_SYNC_SECRET", SECRET);
    vi.stubEnv("VERCEL_ENV", "production");
    const body = JSON.stringify({ version: 1, email: "owner@firm.es" });
    expect((await call(body, "t=1,v1=" + "0".repeat(64))).status).toBe(401);
    fakeDb.organization.findMany.mockResolvedValueOnce([]);
    const res = await call(body, signSuiteRequest(SECRET, Math.floor(Date.now() / 1000), body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(NOT_FOUND);
  });

  it("is not available off the pilot", async () => {
    vi.stubEnv("PLAN_SYNC_SECRET", SECRET);
    vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "false");
    expect((await call("{}", null)).status).toBe(404);
  });
});
