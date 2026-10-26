// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("@/lib/rate-limit", () => ({ enforce: () => null }));

import { readLinkRequest } from "./guard";

const SECRET = "test-identity-secret";

function statement(email: string) {
  const b = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const h = b({ alg: "HS256", typ: "JWT" });
  const p = b({ iss: "dpocentral", aud: "aisentinel-import", sub: email, iat: now, exp: now + 120, jti: "x" });
  const s = createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}

function req(headers: Record<string, string>, body: object) {
  return new Request("http://localhost/api/import/dpc-link", { method: "POST", headers, body: JSON.stringify(body) });
}

afterEach(() => vi.unstubAllEnvs());

describe("suite-link guard", () => {
  it("refuses without the application key", async () => {
    vi.stubEnv("VW_IMPORT_API_KEYS", "k1");
    const out = await readLinkRequest(req({}, { userEmail: "a@x.test" }));
    expect(out.ok).toBe(false);
  });

  it("requires the signed statement once identity secrets are configured", async () => {
    vi.stubEnv("VW_IMPORT_API_KEYS", "k1");
    vi.stubEnv("IMPORT_IDENTITY_SECRETS", SECRET);
    const missing = await readLinkRequest(req({ "x-api-key": "k1" }, { userEmail: "a@x.test" }));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.response.status).toBe(401);

    const other = await readLinkRequest(
      req({ "x-api-key": "k1", "x-import-identity": statement("b@x.test") }, { userEmail: "a@x.test" }),
    );
    expect(other.ok).toBe(false);

    const good = await readLinkRequest(
      req({ "x-api-key": "k1", "x-import-identity": statement("a@x.test") }, { userEmail: "A@x.test" }),
    );
    expect(good.ok).toBe(true);
  });
});
