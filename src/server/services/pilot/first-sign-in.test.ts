// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Recording the start of the pilot clock: the first stamp wins, it is never
 * earlier than the deployment date, and off the pilot nothing is written.
 * An in-memory fake stands in for the organisation table.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PILOT_LIVE_FROM } from "@/config/pilot";
import { ensurePilotFirstSignIn, recordPilotSignIn, type FirstSignInDb } from "./first-sign-in";

type Row = { id: string; pilotFirstSignInAt: Date | null; members: string[] };

function fakeDb(rows: Row[]) {
  const writes: string[] = [];
  const db: FirstSignInDb = {
    organization: {
      async updateMany({ where, data }) {
        let count = 0;
        for (const row of rows) {
          if (row.pilotFirstSignInAt !== null) continue;
          if (where.id && row.id !== where.id) continue;
          if (where.members && !row.members.includes(where.members.some.userId)) continue;
          row.pilotFirstSignInAt = data.pilotFirstSignInAt;
          writes.push(row.id);
          count++;
        }
        return { count };
      },
      async findFirst({ where }) {
        const row = rows.find((r) => r.id === where.id);
        return row ? { pilotFirstSignInAt: row.pilotFirstSignInAt } : null;
      },
    },
  };
  return { db, writes };
}

const SIGN_IN = new Date("2026-10-05T08:00:00.000Z");

describe("on the hosted pilot", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("a sign-in starts the clock of each organisation of the account that has none", async () => {
    const started = new Date("2026-09-20T00:00:00.000Z");
    const rows: Row[] = [
      { id: "a", pilotFirstSignInAt: null, members: ["u1"] },
      { id: "b", pilotFirstSignInAt: started, members: ["u1"] },
      { id: "c", pilotFirstSignInAt: null, members: ["u2"] },
    ];
    const { db } = fakeDb(rows);
    await recordPilotSignIn(db, "u1", SIGN_IN);
    expect(rows[0].pilotFirstSignInAt).toEqual(SIGN_IN);
    expect(rows[1].pilotFirstSignInAt).toEqual(started); // never moved
    expect(rows[2].pilotFirstSignInAt).toBeNull(); // someone else's organisation
  });

  it("an organisation opened without a recorded first sign-in is stamped once", async () => {
    const rows: Row[] = [{ id: "a", pilotFirstSignInAt: null, members: ["u1"] }];
    const { db, writes } = fakeDb(rows);
    expect(await ensurePilotFirstSignIn(db, { id: "a", pilotFirstSignInAt: null }, SIGN_IN)).toEqual(SIGN_IN);
    const later = new Date(SIGN_IN.getTime() + 86_400_000);
    // A second request holding the stale row finds the first stamp, not its own.
    expect(await ensurePilotFirstSignIn(db, { id: "a", pilotFirstSignInAt: null }, later)).toEqual(SIGN_IN);
    expect(writes).toEqual(["a"]);
  });

  it("never records a first sign-in earlier than the deployment date", async () => {
    const rows: Row[] = [{ id: "a", pilotFirstSignInAt: null, members: ["u1"] }];
    const { db } = fakeDb(rows);
    await recordPilotSignIn(db, "u1", new Date("2026-09-01T00:00:00.000Z"));
    expect(rows[0].pilotFirstSignInAt).toEqual(PILOT_LIVE_FROM);
  });
});

describe("on the kit", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("AUTH_COOKIE_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("writes nothing", async () => {
    const rows: Row[] = [{ id: "a", pilotFirstSignInAt: null, members: ["u1"] }];
    const { db, writes } = fakeDb(rows);
    await recordPilotSignIn(db, "u1", SIGN_IN);
    expect(await ensurePilotFirstSignIn(db, { id: "a", pilotFirstSignInAt: null }, SIGN_IN)).toBeNull();
    expect(writes).toEqual([]);
  });
});
