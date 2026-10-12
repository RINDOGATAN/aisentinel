// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkImportIdentity,
  IMPORT_IDENTITY_AUDIENCE,
  IMPORT_IDENTITY_ISSUERS,
  verifyIdentityStatement,
} from "./import-identity";

const SECRET = "identity-test-secret";
const NOW = 1_800_000_000;

function sign(
  claims: Record<string, unknown>,
  secret = SECRET,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
): string {
  const h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const p = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const s = createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}

function claims(over: Record<string, unknown> = {}) {
  return {
    iss: "dpocentral",
    aud: IMPORT_IDENTITY_AUDIENCE,
    sub: "person@example.test",
    iat: NOW,
    exp: NOW + 300,
    jti: "abc",
    ...over,
  };
}

const opts = { audience: IMPORT_IDENTITY_AUDIENCE, issuers: IMPORT_IDENTITY_ISSUERS, now: NOW + 10 };

describe("verifyIdentityStatement", () => {
  it("accepts a valid statement from either caller", () => {
    expect(verifyIdentityStatement(sign(claims()), [SECRET], opts)).toEqual({
      ok: true,
      email: "person@example.test",
      issuer: "dpocentral",
    });
    expect(verifyIdentityStatement(sign(claims({ iss: "vendorwatch" })), [SECRET], opts)).toMatchObject({ ok: true });
  });

  it("accepts any configured secret (rotation)", () => {
    expect(verifyIdentityStatement(sign(claims(), "old"), ["new", "old"], opts)).toMatchObject({ ok: true });
  });

  it("normalises the subject", () => {
    expect(verifyIdentityStatement(sign(claims({ sub: " Person@Example.TEST " })), [SECRET], opts)).toMatchObject({
      email: "person@example.test",
    });
  });

  const refusals: Array<[string, string, string]> = [
    ["wrong signature", sign(claims(), "another-secret"), "signature"],
    ["wrong audience", sign(claims({ aud: "dpocentral-import" })), "audience"],
    ["unknown issuer", sign(claims({ iss: "elsewhere" })), "issuer"],
    ["expired", sign(claims({ iat: NOW - 1000, exp: NOW - 700 })), "expired"],
    ["issued in the future", sign(claims({ iat: NOW + 100, exp: NOW + 200 })), "not yet valid"],
    ["lifetime over 300 s", sign(claims({ exp: NOW + 301 })), "lifetime"],
    ["no times", sign(claims({ iat: undefined })), "times"],
    ["no subject", sign(claims({ sub: "" })), "subject"],
    ["alg none", sign(claims(), SECRET, { alg: "none" }), "algorithm"],
    ["alg HS512", sign(claims(), SECRET, { alg: "HS512" }), "algorithm"],
    ["malformed", "not-a-token", "malformed"],
    ["bad base64", "a.b.c!", "algorithm"],
  ];
  for (const [name, token, reason] of refusals) {
    it(`refuses: ${name}`, () => {
      expect(verifyIdentityStatement(token, [SECRET], opts)).toEqual({ ok: false, reason });
    });
  }

  it("tolerates 30 seconds of clock skew, no more", () => {
    const token = sign(claims({ iat: NOW + 20, exp: NOW + 320 }));
    expect(verifyIdentityStatement(token, [SECRET], { ...opts, now: NOW })).toMatchObject({ ok: true });
    const late = sign(claims());
    expect(verifyIdentityStatement(late, [SECRET], { ...opts, now: NOW + 329 })).toMatchObject({ ok: true });
    expect(verifyIdentityStatement(late, [SECRET], { ...opts, now: NOW + 331 })).toMatchObject({ ok: false });
  });
});

describe("checkImportIdentity (phase 1: both forms accepted)", () => {
  afterEach(() => vi.unstubAllEnvs());

  const fresh = () => {
    const now = Math.floor(Date.now() / 1000);
    return sign(claims({ iat: now, exp: now + 300 }));
  };
  const req = (token?: string) =>
    new Request("http://localhost/api/import/check-account", {
      method: "POST",
      headers: token ? { "x-import-identity": token } : {},
    });

  it("with no secret configured, ignores the header (legacy behaviour)", () => {
    vi.stubEnv("IMPORT_IDENTITY_SECRETS", "");
    expect(checkImportIdentity(req(), "anyone@example.test")).toBeNull();
    expect(checkImportIdentity(req("garbage"), "anyone@example.test")).toBeNull();
  });

  it("without the header, serves the request unless the statement is required", async () => {
    vi.stubEnv("IMPORT_IDENTITY_SECRETS", SECRET);
    expect(checkImportIdentity(req(), "person@example.test")).toBeNull();
    vi.stubEnv("IMPORT_IDENTITY_REQUIRED", "true");
    const res = checkImportIdentity(req(), "person@example.test");
    expect(res?.status).toBe(401);
    await expect(res?.json()).resolves.toEqual({ error: "Identity statement required" });
  });

  it("a valid statement for the named account passes, case-insensitively", () => {
    vi.stubEnv("IMPORT_IDENTITY_SECRETS", SECRET);
    expect(checkImportIdentity(req(fresh()), "Person@Example.test")).toBeNull();
  });

  it("a statement for another person is refused with 403", async () => {
    vi.stubEnv("IMPORT_IDENTITY_SECRETS", SECRET);
    const res = checkImportIdentity(req(fresh()), "someone-else@example.test");
    expect(res?.status).toBe(403);
    await expect(res?.json()).resolves.toEqual({ error: "Identity does not match the account" });
  });

  it("an invalid statement is refused with 401", async () => {
    vi.stubEnv("IMPORT_IDENTITY_SECRETS", SECRET);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = checkImportIdentity(req(sign(claims())), "person@example.test"); // issued at a fixed time, not valid now
    expect(res?.status).toBe(401);
    await expect(res?.json()).resolves.toEqual({ error: "Invalid identity statement" });
  });
});
