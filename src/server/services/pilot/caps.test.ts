// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot's caps: one organisation per account, the ninety-day
 * switch to read-only, the records ceiling, and exports that stay open.
 * No database: a counting fake stands in for the eleven delegates.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TRPCError } from "@trpc/server";
import { PILOT_CEILINGS, PILOT_RUN_URL, PILOT_CEILING_KEYS } from "@/config/pilot";
import {
  assertPilotOrganizationLimit,
  assertPilotRoom,
  assertPilotWritable,
  getPilotStatus,
  pilotLocale,
  pilotRemaining,
  type PilotDb,
} from "./caps";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-10-01T00:00:00.000Z");
const ORG = { id: "org-1", pilotFirstSignInAt: START };

function fakeDb(counts: Partial<Record<keyof PilotDb, number>> = {}): PilotDb {
  const delegate = (n: number) => ({ count: async () => n });
  return {
    aISystem: delegate(counts.aISystem ?? 0),
    aIVendor: delegate(counts.aIVendor ?? 0),
    aIAssessment: delegate(counts.aIAssessment ?? 0),
    aIIncident: delegate(counts.aIIncident ?? 0),
    aIPolicy: delegate(counts.aIPolicy ?? 0),
    oversightGate: delegate(counts.oversightGate ?? 0),
    threatModel: delegate(counts.threatModel ?? 0),
    shadowAIReport: delegate(counts.shadowAIReport ?? 0),
    regulatoryProceeding: delegate(counts.regulatoryProceeding ?? 0),
    boardReport: delegate(counts.boardReport ?? 0),
    organizationMember: delegate(counts.organizationMember ?? 0),
  };
}

async function forbidden(fn: () => Promise<unknown> | unknown): Promise<string> {
  try {
    await fn();
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe("FORBIDDEN");
    return (error as TRPCError).message;
  }
  throw new Error("expected a FORBIDDEN error");
}

describe("on the hosted pilot", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("allows one organisation per account and refuses a second", async () => {
    await expect(
      assertPilotOrganizationLimit({ organizationMember: { count: async () => 0 } }, "u1", "en"),
    ).resolves.toBeUndefined();
    const message = await forbidden(() =>
      assertPilotOrganizationLimit({ organizationMember: { count: async () => 1 } }, "u1", "en"),
    );
    expect(message).toContain("one organisation per account");
    expect(message).toContain(PILOT_RUN_URL);
  });

  it("allows edits for ninety days and then makes the organisation read-only", async () => {
    expect(() => assertPilotWritable(ORG, "en", new Date(START.getTime() + 89 * DAY))).not.toThrow();
    const message = await forbidden(() =>
      assertPilotWritable(ORG, "en", new Date(START.getTime() + 90 * DAY)),
    );
    expect(message).toContain("read-only");
    expect(message).toContain(PILOT_RUN_URL);
    expect(message).toContain("/api/export/program-pack?organizationId=org-1");
  });

  it("never makes an organisation read-only before its first sign-in is recorded", async () => {
    const neverSignedIn = { id: "org-2", pilotFirstSignInAt: null };
    const later = new Date(START.getTime() + 400 * DAY);
    expect(() => assertPilotWritable(neverSignedIn, "en", later)).not.toThrow();
    const status = await getPilotStatus(fakeDb(), neverSignedIn, later);
    expect(status.active && status.daysLeft).toBe(90);
  });

  it("speaks Spanish when the locale cookie says so", async () => {
    expect(pilotLocale(() => "es")).toBe("es");
    expect(pilotLocale(() => undefined)).toBe("en");
    const message = await forbidden(() =>
      assertPilotWritable(ORG, "es", new Date(START.getTime() + 91 * DAY)),
    );
    expect(message).toContain("solo lectura");
    expect(message).toContain("ejecuta tu propia instancia");
  });

  it("still allows every export once read-only", async () => {
    const status = await getPilotStatus(fakeDb(), ORG, new Date(START.getTime() + 100 * DAY));
    expect(status.active).toBe(true);
    if (!status.active) return;
    expect(status.readOnly).toBe(true);
    expect(status.daysLeft).toBe(0);
    expect(status.exportsAllowed).toBe(true);
    expect(status.exportUrl).toBe("/api/export/program-pack?organizationId=org-1");
  });

  it("keeps the pilot guard out of every export route", () => {
    // The structural half of "export still allowed": no file under the export
    // API imports the guard, so a read-only organisation cannot be refused there.
    const root = join(__dirname, "../../../app/api/export");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (entry.endsWith(".ts")) files.push(full);
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("services/pilot/caps");
      expect(source, file).not.toContain("assertPilotWritable");
    }
  });

  it("enforces the records ceiling at the boundary", async () => {
    const atCap = fakeDb({ aISystem: PILOT_CEILINGS.systems });
    const message = await forbidden(() => assertPilotRoom(atCap, "org-1", "systems", "en"));
    expect(message).toContain(`ceiling of ${PILOT_CEILINGS.systems} AI systems`);
    expect(message).toContain(PILOT_RUN_URL);
    expect(message).toContain("/api/export/program-pack?organizationId=org-1");

    const oneBelow = fakeDb({ aISystem: PILOT_CEILINGS.systems - 1 });
    await expect(assertPilotRoom(oneBelow, "org-1", "systems", "en")).resolves.toBeUndefined();
    await expect(assertPilotRoom(oneBelow, "org-1", "systems", "en", 2)).rejects.toBeInstanceOf(TRPCError);
    expect(await pilotRemaining(oneBelow, "org-1", "systems")).toBe(1);
  });

  it("counts every ceiling for the settings card", async () => {
    const db = fakeDb({ aISystem: 3, aIVendor: 7, organizationMember: 2 });
    const status = await getPilotStatus(db, ORG, START);
    expect(status.active).toBe(true);
    if (!status.active) return;
    expect(status.daysLeft).toBe(90);
    expect(status.ceilings.map((c) => c.key)).toEqual([...PILOT_CEILING_KEYS]);
    expect(status.ceilings.find((c) => c.key === "systems")).toEqual({ key: "systems", used: 3, max: 25 });
    expect(status.ceilings.find((c) => c.key === "vendors")).toEqual({ key: "vendors", used: 7, max: 50 });
    expect(status.ceilings.find((c) => c.key === "members")).toEqual({ key: "members", used: 2, max: 5 });
  });
});

describe("on the kit", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("AUTH_COOKIE_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_HOSTED_PILOT", "");
    vi.stubEnv("NEXT_PUBLIC_ALL_SKILLS_FREE", "true");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("applies no cap at all", async () => {
    const full = fakeDb({ aISystem: 10_000, organizationMember: 500 });
    await expect(assertPilotRoom(full, "org-1", "systems", "en")).resolves.toBeUndefined();
    expect(await pilotRemaining(full, "org-1", "systems")).toBe(Infinity);
    expect(() => assertPilotWritable(ORG, "en", new Date(START.getTime() + 1000 * DAY))).not.toThrow();
    await expect(
      assertPilotOrganizationLimit({ organizationMember: { count: async () => 40 } }, "u1", "en"),
    ).resolves.toBeUndefined();
    expect(await getPilotStatus(full, ORG)).toEqual({ active: false });
  });
});
