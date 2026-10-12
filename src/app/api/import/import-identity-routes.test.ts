// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The signed identity statement, through the four real import handlers.
 * Every route checks it before it reads or writes an account.
 */
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => {
  const reads: string[] = [];
  const db = {
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => {
        reads.push(where.email);
        if (where.email !== "member@a.example") return null;
        return {
          id: "u-member",
          email: "member@a.example",
          organizationMemberships: [
            { userId: "u-member", organizationId: "org-a", role: "MEMBER", organization: { id: "org-a", name: "Org A" } },
          ],
        };
      },
    },
    aISystem: { findFirst: async () => null, count: async () => 0, create: async () => ({ id: "sys-1" }) },
    aIVendor: { findFirst: async () => null, count: async () => 0, create: async () => ({ id: "ven-1" }) },
    auditLog: { createMany: async ({ data }: { data: unknown[] }) => ({ count: data.length }) },
  };
  return { db, reads };
});

vi.mock("@/lib/prisma", () => ({ default: H.db, prisma: H.db }));

import { POST as checkAccount } from "@/app/api/import/check-account/route";
import { POST as importSystems } from "@/app/api/import/dpc-ai-systems/route";
import { POST as importVendors } from "@/app/api/import/portfolio-vendors/route";
import { POST as systemStatus } from "@/app/api/import/ai-system-status/route";
import { __resetRateLimitStore } from "@/lib/rate-limit";

const KEY = "test-import-key";
const SECRET = "identity-test-secret";

function statement(sub: string, iss = "dpocentral") {
  const now = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(
    JSON.stringify({ iss, aud: "aisentinel-import", sub, iat: now, exp: now + 300, jti: "x" }),
  ).toString("base64url");
  return `${h}.${p}.${createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url")}`;
}

function post(path: string, body: unknown, identity?: string) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-api-key": KEY };
  if (identity) headers["x-import-identity"] = identity;
  return new Request(`http://localhost/api/import/${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

const ROUTES = [
  ["check-account", checkAccount, {}],
  ["dpc-ai-systems", importSystems, { systems: [{ name: "Model", dpoCentralSystemId: "dpc-1" }] }],
  ["portfolio-vendors", importVendors, { vendors: [{ name: "A vendor" }] }],
  ["ai-system-status", systemStatus, { aisSystemId: "sys-1" }],
] as const;

beforeEach(() => {
  H.reads.length = 0;
  __resetRateLimitStore();
  vi.stubEnv("VW_IMPORT_API_KEYS", KEY);
  vi.stubEnv("IMPORT_IDENTITY_SECRETS", SECRET);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("import routes: the identity statement", () => {
  for (const [path, handler, extra] of ROUTES) {
    it(`${path}: a statement for another person is refused before the account is read`, async () => {
      const res = await handler(post(path, { userEmail: "member@a.example", ...extra }, statement("other@a.example")));
      expect(res.status).toBe(403);
      expect(H.reads).toHaveLength(0);
    });

    it(`${path}: an invalid statement is refused`, async () => {
      const res = await handler(post(path, { userEmail: "member@a.example", ...extra }, "a.b.c"));
      expect(res.status).toBe(401);
      expect(H.reads).toHaveLength(0);
    });

    it(`${path}: a matching statement goes through`, async () => {
      const res = await handler(post(path, { userEmail: "member@a.example", ...extra }, statement("member@a.example")));
      expect(res.status).toBe(200);
      expect(H.reads).toEqual(["member@a.example"]);
    });

    it(`${path}: without a statement, still served (phase 1), refused once required`, async () => {
      const served = await handler(post(path, { userEmail: "member@a.example", ...extra }));
      expect(served.status).toBe(200);
      vi.stubEnv("IMPORT_IDENTITY_REQUIRED", "true");
      const refused = await handler(post(path, { userEmail: "member@a.example", ...extra }));
      expect(refused.status).toBe(401);
    });
  }

  it("the shared key is still checked first", async () => {
    const req = new Request("http://localhost/api/import/check-account", {
      method: "POST",
      headers: { "x-api-key": "wrong", "x-import-identity": statement("member@a.example") },
      body: JSON.stringify({ userEmail: "member@a.example" }),
    });
    expect((await checkAccount(req)).status).toBe(401);
  });
});
