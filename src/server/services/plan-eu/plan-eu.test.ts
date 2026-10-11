// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The automatic upgrade to the paid plan: the signed relay, the mapping rule,
 * idempotence, the end of a subscription, the checkout redirect and the
 * visitor's currency. No database: an in-memory fake stands in.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handlePlanSync } from "./handler";
import { signSyncBody, applySyncInstruction, parseSyncBody, type SyncDb } from "./sync";
import { makePlanReference, parsePlanReference } from "./reference";
import { planCheckout, type CheckoutDb } from "./checkout";
import { visitorCurrency, regionFromAcceptLanguage } from "./currency";

const SECRET = "test-secret-0123456789abcdef";
const ON = { AUTO_UPGRADE_ENABLED: "true", PLAN_SYNC_SECRET: SECRET };
const NOW_S = 1_800_000_000;

type Org = {
  id: string;
  slug: string;
  name: string;
  plan: "PILOT" | "EU_CLOUD" | null;
  planStartedAt: Date | null;
  planRenewsAt: Date | null;
  planNote: string | null;
  planStripeSubscriptionId: string | null;
};
type Member = { organizationId: string; email: string; role: string };

function org(id: string, extra: Partial<Org> = {}): Org {
  return {
    id,
    slug: id,
    name: id,
    plan: "PILOT",
    planStartedAt: null,
    planRenewsAt: null,
    planNote: null,
    planStripeSubscriptionId: null,
    ...extra,
  };
}

function fakeDb(orgs: Org[], members: Member[] = []) {
  const audits: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; data: Partial<Org> }> = [];
  const pick = (o: Org) => ({ ...o });
  const organization = {
    findMany: async ({ where }: { where: { planStripeSubscriptionId: string } }) =>
      orgs.filter((o) => o.planStripeSubscriptionId === where.planStripeSubscriptionId).map(pick),
    findUnique: async ({ where }: { where: { id: string } }) => {
      const o = orgs.find((x) => x.id === where.id);
      return o ? pick(o) : null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Org> }) => {
      updates.push({ id: where.id, data });
      Object.assign(orgs.find((x) => x.id === where.id)!, data);
    },
  };
  const organizationMember = {
    findMany: async ({
      where,
    }: {
      where: { role: { in: string[] }; user: { email: { equals: string } } };
    }) =>
      members
        .filter(
          (m) => where.role.in.includes(m.role) && m.email.toLowerCase() === where.user.email.equals.toLowerCase(),
        )
        .map((m) => ({ organizationId: m.organizationId })),
  };
  const auditLog = { create: async ({ data }: { data: Record<string, unknown> }) => void audits.push(data) };
  const db = {
    organization,
    organizationMember,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ organization, auditLog }),
  };
  return { db: db as unknown as SyncDb, audits, updates, orgs };
}

function body(extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: 1,
    eventId: "evt_1",
    eventType: "checkout.session.completed",
    kind: "paid",
    subscriptionId: "sub_1",
    customerEmail: "owner@example.test",
    clientReferenceId: null,
    periodEnd: "2027-10-11T00:00:00.000Z",
    livemode: false,
    ...extra,
  });
}

const quiet = () => {};

describe("the sync route: signature and switch", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(quiet);
    vi.spyOn(console, "info").mockImplementation(quiet);
  });

  it("answers 503 and writes nothing while the switch is off", async () => {
    const { db, updates } = fakeDb([org("o1")]);
    const raw = body();
    const out = await handlePlanSync(db, raw, signSyncBody(SECRET, raw, NOW_S), { PLAN_SYNC_SECRET: SECRET }, NOW_S);
    expect(out.status).toBe(503);
    const noSecret = await handlePlanSync(db, raw, signSyncBody(SECRET, raw, NOW_S), { AUTO_UPGRADE_ENABLED: "true" }, NOW_S);
    expect(noSecret.status).toBe(503);
    expect(updates).toHaveLength(0);
  });

  it("refuses a missing, wrong or stale signature with 401 and writes nothing", async () => {
    const { db, updates } = fakeDb([org("o1")], [{ organizationId: "o1", email: "owner@example.test", role: "OWNER" }]);
    const raw = body();
    expect((await handlePlanSync(db, raw, null, ON, NOW_S)).status).toBe(401);
    expect((await handlePlanSync(db, raw, signSyncBody("another-secret-xxxxxxxx", raw, NOW_S), ON, NOW_S)).status).toBe(401);
    expect((await handlePlanSync(db, raw, signSyncBody(SECRET, raw + " ", NOW_S), ON, NOW_S)).status).toBe(401);
    expect((await handlePlanSync(db, raw, signSyncBody(SECRET, raw, NOW_S - 301), ON, NOW_S)).status).toBe(401);
    expect((await handlePlanSync(db, raw, "t=abc,v1=zz", ON, NOW_S)).status).toBe(401);
    expect(updates).toHaveLength(0);
  });

  it("answers 400 to a malformed body", async () => {
    const { db } = fakeDb([]);
    const raw = JSON.stringify({ version: 1, kind: "paid" });
    expect((await handlePlanSync(db, raw, signSyncBody(SECRET, raw, NOW_S), ON, NOW_S)).status).toBe(400);
    expect(parseSyncBody("not json")).toBeNull();
  });

  it("answers 500 when the database fails, so the relay retries", async () => {
    vi.spyOn(console, "error").mockImplementation(quiet);
    const { db } = fakeDb([org("o1")], [{ organizationId: "o1", email: "owner@example.test", role: "OWNER" }]);
    (db as unknown as { $transaction: () => Promise<never> }).$transaction = async () => {
      throw new Error("down");
    };
    const raw = body();
    expect((await handlePlanSync(db, raw, signSyncBody(SECRET, raw, NOW_S), ON, NOW_S)).status).toBe(500);
  });

  it("applies a correctly signed instruction and logs the flip with an audit entry", async () => {
    const { db, audits, orgs } = fakeDb([org("o1")], [{ organizationId: "o1", email: "Owner@Example.test", role: "OWNER" }]);
    const raw = body();
    const out = await handlePlanSync(db, raw, signSyncBody(SECRET, raw, NOW_S), ON, NOW_S);
    expect(out.status).toBe(200);
    expect(out.body.results).toEqual([{ organizationId: "o1", rule: "email", changed: true }]);
    expect(orgs[0].plan).toBe("EU_CLOUD");
    expect(orgs[0].planStripeSubscriptionId).toBe("sub_1");
    expect(orgs[0].planRenewsAt?.toISOString()).toBe("2027-10-11T00:00:00.000Z");
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe("PLAN_CHANGE");
    expect(audits[0].metadata).toMatchObject({ source: "stripe-auto-upgrade", eventId: "evt_1", subscriptionId: "sub_1", rule: "email" });
  });
});

describe("the mapping rule", () => {
  const opts = { secret: SECRET, app: "ais", log: quiet, now: new Date("2026-10-11T00:00:00Z") };

  it("a valid reference names the organisation, whatever the e-mail", async () => {
    const { db, orgs } = fakeDb([org("o1"), org("o2")], [{ organizationId: "o2", email: "owner@example.test", role: "OWNER" }]);
    const ins = parseSyncBody(body({ clientReferenceId: makePlanReference(SECRET, "ais", "o1") }))!;
    const res = await applySyncInstruction(db, ins, opts);
    expect(res).toEqual([{ organizationId: "o1", rule: "reference", changed: true }]);
    expect(orgs[0].plan).toBe("EU_CLOUD");
    expect(orgs[1].plan).toBe("PILOT");
  });

  it("an invalid reference falls back to the e-mail rule; no account means unmatched and no write", async () => {
    const { db, updates } = fakeDb([org("o1")]);
    const forged = makePlanReference("wrong-secret-0123456789", "ais", "o1");
    expect(parsePlanReference(SECRET, "ais", forged).kind).toBe("invalid");
    const ins = parseSyncBody(body({ clientReferenceId: forged, customerEmail: "nobody@example.test" }))!;
    expect(await applySyncInstruction(db, ins, opts)).toEqual([
      { organizationId: null, rule: "none", changed: false, reason: "no-account" },
    ]);
    expect(updates).toHaveLength(0);
  });

  it("an unknown reference (another app's, or not a plan reference) uses the e-mail rule", async () => {
    const { db, orgs } = fakeDb([org("o1")], [{ organizationId: "o1", email: "owner@example.test", role: "ADMIN" }]);
    const ins = parseSyncBody(body({ clientReferenceId: makePlanReference(SECRET, "dpc", "zzz") }))!;
    expect((await applySyncInstruction(db, ins, opts))[0]).toMatchObject({ organizationId: "o1", rule: "email" });
    expect(orgs[0].plan).toBe("EU_CLOUD");
  });

  it("several organisations, or a member who is not owner or administrator, are not matched", async () => {
    const { db, updates } = fakeDb(
      [org("o1"), org("o2"), org("o3")],
      [
        { organizationId: "o1", email: "a@example.test", role: "OWNER" },
        { organizationId: "o2", email: "a@example.test", role: "ADMIN" },
        { organizationId: "o3", email: "b@example.test", role: "MEMBER" },
      ],
    );
    expect((await applySyncInstruction(db, parseSyncBody(body({ customerEmail: "a@example.test" }))!, opts))[0].reason).toBe(
      "several-organisations",
    );
    expect((await applySyncInstruction(db, parseSyncBody(body({ customerEmail: "b@example.test" }))!, opts))[0].reason).toBe(
      "no-account",
    );
    expect(updates).toHaveLength(0);
  });

  it("does not move an organisation already paid under another subscription", async () => {
    const { db, updates } = fakeDb([org("o1", { plan: "EU_CLOUD", planStripeSubscriptionId: "sub_other" })]);
    const ins = parseSyncBody(body({ clientReferenceId: makePlanReference(SECRET, "ais", "o1") }))!;
    expect((await applySyncInstruction(db, ins, opts))[0].reason).toBe("already-paid-other-subscription");
    expect(updates).toHaveLength(0);
  });

  it("attaches the subscription to an organisation set paid by hand, keeping its start", async () => {
    const start = new Date("2026-05-01T00:00:00Z");
    const { db, orgs } = fakeDb([org("o1", { plan: "EU_CLOUD", planStartedAt: start, planNote: "invoice 7" })]);
    const ins = parseSyncBody(body({ clientReferenceId: makePlanReference(SECRET, "ais", "o1") }))!;
    await applySyncInstruction(db, ins, opts);
    expect(orgs[0].planStartedAt).toEqual(start);
    expect(orgs[0].planStripeSubscriptionId).toBe("sub_1");
    expect(orgs[0].planNote).toBe("invoice 7");
  });

  it("is idempotent: the same instruction twice writes once", async () => {
    const { db, audits } = fakeDb([org("o1")], [{ organizationId: "o1", email: "owner@example.test", role: "OWNER" }]);
    const ins = parseSyncBody(body())!;
    await applySyncInstruction(db, ins, opts);
    const second = await applySyncInstruction(db, ins, opts);
    expect(second).toEqual([{ organizationId: "o1", rule: "subscription", changed: false }]);
    expect(audits).toHaveLength(1);
  });

  it("a renewal moves the renewal date of the organisation on the subscription", async () => {
    const { db, orgs, audits } = fakeDb([
      org("o1", { plan: "EU_CLOUD", planStartedAt: new Date("2026-10-11T00:00:00Z"), planStripeSubscriptionId: "sub_1" }),
    ]);
    const ins = parseSyncBody(body({ eventId: "evt_2", eventType: "invoice.paid", periodEnd: "2028-10-11T00:00:00.000Z" }))!;
    expect((await applySyncInstruction(db, ins, opts))[0]).toMatchObject({ rule: "subscription", changed: true });
    expect(orgs[0].planRenewsAt?.toISOString()).toBe("2028-10-11T00:00:00.000Z");
    expect(audits).toHaveLength(1);
  });

  it("the end of the subscription returns the organisation to the pilot, with an audit entry, and leaves an operator-set one alone", async () => {
    const { db, orgs, audits } = fakeDb([
      org("o1", { plan: "EU_CLOUD", planStartedAt: new Date("2026-10-11T00:00:00Z"), planStripeSubscriptionId: "sub_1" }),
      org("o2", { plan: "EU_CLOUD", planStartedAt: new Date("2026-10-11T00:00:00Z") }),
    ]);
    const ins = parseSyncBody(body({ kind: "ended", eventType: "customer.subscription.deleted", periodEnd: null }))!;
    expect(await applySyncInstruction(db, ins, opts)).toEqual([{ organizationId: "o1", rule: "subscription", changed: true }]);
    expect(orgs[0]).toMatchObject({ plan: "PILOT", planRenewsAt: null, planStripeSubscriptionId: null });
    expect(orgs[1].plan).toBe("EU_CLOUD");
    expect(audits).toHaveLength(1);
    expect(audits[0].changes).toMatchObject({ before: { plan: "EU_CLOUD" }, after: { plan: "PILOT" } });
    // a repeat of the end writes nothing
    expect((await applySyncInstruction(db, ins, opts))[0].reason).toBe("no-organisation-on-subscription");
    expect(audits).toHaveLength(1);
  });
});

describe("the checkout redirect", () => {
  const HOSTED = { VERCEL_ENV: "production" };
  const LINKS = {
    PLAN_CLOUD_EUR_LINK: "https://pay.example.test/eur",
    PLAN_CLOUD_USD_LINK: "https://pay.example.test/usd",
  };
  const ENV = { ...ON, ...HOSTED, ...LINKS };
  const user = { id: "u1", email: "owner+x@example.test" };
  function db(role: string, plan: string | null = "PILOT"): CheckoutDb {
    return {
      organizationMember: {
        findMany: async () => [{ organizationId: "o1", role, organization: { plan } }],
      },
    } as unknown as CheckoutDb;
  }

  it("is a 404 while the switch is off", async () => {
    expect((await planCheckout(db("OWNER"), user, "o1", "EUR", { ...HOSTED, ...LINKS })).status).toBe(404);
  });

  it("is a 404 when the link for the visitor's currency is not set", async () => {
    const env = { ...ON, ...HOSTED, PLAN_CLOUD_EUR_LINK: LINKS.PLAN_CLOUD_EUR_LINK };
    expect((await planCheckout(db("OWNER"), user, "o1", "USD", env)).status).toBe(404);
    expect((await planCheckout(db("OWNER"), user, "o1", "EUR", env)).status).toBe(303);
  });

  it("refuses a member who is not an owner or administrator, and an organisation already paid", async () => {
    expect((await planCheckout(db("MEMBER"), user, "o1", "EUR", ENV)).status).toBe(403);
    expect((await planCheckout(db("OWNER", "EU_CLOUD"), user, "o1", "EUR", ENV)).status).toBe(409);
    expect((await planCheckout(db("OWNER"), null, "o1", "EUR", ENV)).status).toBe(401);
  });

  it("sends an owner to the link of the visitor's currency with the signed reference and the e-mail", async () => {
    for (const [currency, base] of [
      ["EUR", LINKS.PLAN_CLOUD_EUR_LINK],
      ["USD", LINKS.PLAN_CLOUD_USD_LINK],
    ] as const) {
      const out = await planCheckout(db("ADMIN"), user, "o1", currency, ENV);
      expect(out.status).toBe(303);
      const url = new URL((out as { location: string }).location);
      expect(`${url.origin}${url.pathname}`).toBe(base);
      expect(url.searchParams.get("prefilled_email")).toBe("owner+x@example.test");
      const ref = url.searchParams.get("client_reference_id")!;
      expect(parsePlanReference(SECRET, "ais", ref)).toEqual({ kind: "valid", organizationId: "o1" });
    }
  });
});

describe("the visitor's currency", () => {
  const h = (map: Record<string, string>) => ({ get: (n: string) => map[n] ?? null });
  it("a European country gets EUR, a US country USD", () => {
    expect(visitorCurrency(h({ "x-vercel-ip-country": "ES" }))).toBe("EUR");
    expect(visitorCurrency(h({ "x-vercel-ip-country": "de" }))).toBe("EUR");
    expect(visitorCurrency(h({ "x-vercel-ip-country": "US", "accept-language": "es-ES" }))).toBe("USD");
  });
  it("without the header, Accept-Language es-ES gets EUR", () => {
    expect(visitorCurrency(h({ "accept-language": "es-ES,es;q=0.9" }))).toBe("EUR");
    expect(regionFromAcceptLanguage("es, en-GB;q=0.8")).toBe("GB");
  });
  it("with nothing at all, USD", () => {
    expect(visitorCurrency(h({}))).toBe("USD");
    expect(visitorCurrency(h({ "accept-language": "es" }))).toBe("USD");
  });
});
