// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The firm-team contract with DPO Central (src/lib/suite-firm-team.ts) and
 * the endpoint's gate (POST /api/suite/firm-team): its own signature prefix,
 * five minutes' tolerance, the switch, the role mapping, the push parsed
 * field by field. Applying a push is tested against Postgres in
 * src/server/services/suite/firm-team.db.test.ts.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const applyFirmTeamPush = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ default: {}, prisma: {} }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/server/services/suite/firm-team", () => ({ applyFirmTeamPush }));

import { signSuiteRequest, verifySuiteSignature } from "@/lib/suite-plan-state";
import {
  aiSentinelRoleFor,
  parseFirmTeamPush,
  signFirmTeamPush,
  suiteFirmTeamEnabled,
  verifyFirmTeamSignature,
} from "@/lib/suite-firm-team";
import { POST } from "@/app/api/suite/firm-team/route";

const SECRET = "test-shared-secret";
const T0 = Date.parse("2026-10-27T10:00:00Z");

afterEach(() => {
  vi.unstubAllEnvs();
  applyFirmTeamPush.mockReset();
});

const pushBody = JSON.stringify({
  version: 1,
  sentAt: "2026-10-27T10:00:00.000Z",
  ownerEmail: "cons@firm.example",
  firmOrganizationIds: ["d1"],
  members: [{ email: "staff@firm.example", role: "PRIVACY_OFFICER", state: "accepted" }],
});

function post(body: string, sig: string) {
  return POST(new Request("http://x/api/suite/firm-team", { method: "POST", headers: { "x-suite-signature": sig }, body }));
}

describe("the signed contract", () => {
  const t = Math.floor(T0 / 1000);
  it("verifies its own signature; refuses an altered, expired or plan-state one", () => {
    const sig = signFirmTeamPush(SECRET, t, pushBody);
    expect(verifyFirmTeamSignature(sig, pushBody, SECRET, t)).toBe(true);
    expect(verifyFirmTeamSignature(sig, pushBody + " ", SECRET, t)).toBe(false);
    expect(verifyFirmTeamSignature(sig, pushBody, SECRET, t + 301)).toBe(false);
    expect(verifyFirmTeamSignature(signSuiteRequest(SECRET, t, pushBody), pushBody, SECRET, t)).toBe(false);
    expect(verifySuiteSignature(sig, pushBody, SECRET, t)).toBe(false);
  });

  it("is off unless SUITE_FIRM_TEAM is on and the secret is set", () => {
    expect(suiteFirmTeamEnabled({})).toBe(false);
    expect(suiteFirmTeamEnabled({ SUITE_FIRM_TEAM: "on" })).toBe(false);
    expect(suiteFirmTeamEnabled({ PLAN_SYNC_SECRET: SECRET })).toBe(false);
    expect(suiteFirmTeamEnabled({ SUITE_FIRM_TEAM: "on", PLAN_SYNC_SECRET: SECRET })).toBe(true);
  });

  it("maps PRIVACY_OFFICER to AI_OFFICER and never maps OWNER", () => {
    expect(aiSentinelRoleFor("PRIVACY_OFFICER")).toBe("AI_OFFICER");
    expect(["ADMIN", "MEMBER", "VIEWER"].map(aiSentinelRoleFor)).toEqual(["ADMIN", "MEMBER", "VIEWER"]);
    expect(aiSentinelRoleFor("OWNER")).toBeNull();
    expect(aiSentinelRoleFor("AI_OFFICER")).toBeNull();
  });

  it("refuses a push with an OWNER role or an unknown state; drops the owner and repeats", () => {
    const raw = JSON.parse(pushBody);
    expect(parseFirmTeamPush({ ...raw, members: [{ email: "x@y.z", role: "OWNER", state: "accepted" }] })).toBeNull();
    expect(parseFirmTeamPush({ ...raw, members: [{ email: "x@y.z", role: "MEMBER", state: "?" }] })).toBeNull();
    const parsed = parseFirmTeamPush({
      ...raw,
      members: [
        ...raw.members,
        { email: "STAFF@firm.example", role: "VIEWER", state: "pending" },
        { email: "cons@firm.example", role: "ADMIN", state: "accepted" },
      ],
    });
    expect(parsed?.members).toEqual([{ email: "staff@firm.example", role: "PRIVACY_OFFICER", state: "accepted" }]);
  });
});

describe("POST /api/suite/firm-team", () => {
  const now = () => Math.floor(Date.now() / 1000);

  it("is a 404 with the switch off, whatever the signature", async () => {
    vi.stubEnv("PLAN_SYNC_SECRET", SECRET);
    expect((await post(pushBody, signFirmTeamPush(SECRET, now(), pushBody))).status).toBe(404);
    expect(applyFirmTeamPush).not.toHaveBeenCalled();
  });

  it("refuses a bad or expired signature before reading anything", async () => {
    vi.stubEnv("SUITE_FIRM_TEAM", "on");
    vi.stubEnv("PLAN_SYNC_SECRET", SECRET);
    expect((await post(pushBody, signFirmTeamPush("other", now(), pushBody))).status).toBe(401);
    expect((await post(pushBody, signFirmTeamPush(SECRET, now() - 301, pushBody))).status).toBe(401);
    expect(applyFirmTeamPush).not.toHaveBeenCalled();
  });

  it("answers 409 for a stale push and 200 with the counts once applied", async () => {
    vi.stubEnv("SUITE_FIRM_TEAM", "on");
    vi.stubEnv("PLAN_SYNC_SECRET", SECRET);
    applyFirmTeamPush.mockResolvedValueOnce({ stale: true });
    expect((await post(pushBody, signFirmTeamPush(SECRET, now(), pushBody))).status).toBe(409);
    applyFirmTeamPush.mockResolvedValueOnce({ stale: false, organizations: 2, added: 1, updated: 0, removed: 0 });
    const res = await post(pushBody, signFirmTeamPush(SECRET, now(), pushBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: 1, applied: true, organizations: 2, added: 1, updated: 0, removed: 0 });
  });
});
