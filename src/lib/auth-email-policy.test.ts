// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, it, expect, vi } from "vitest";
import { carriesTypedEmail, withEmailPolicy } from "@/lib/auth-email-policy";

function post(path: string, body: Record<string, string>, cookie?: string) {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(cookie ? { cookie } : {}),
    },
    body: new URLSearchParams(body),
  });
}

describe("auth e-mail policy wrapper", () => {
  it("only inspects the routes that take a typed address", () => {
    expect(carriesTypedEmail("POST", "/api/auth/signin/email")).toBe(true);
    expect(carriesTypedEmail("POST", "/api/auth/callback/dev-credentials")).toBe(true);
    expect(carriesTypedEmail("GET", "/api/auth/signin/email")).toBe(false);
    expect(carriesTypedEmail("POST", "/api/auth/signin/google")).toBe(false);
  });

  it.each(["x@hotmail.com", "X@AOL.CO.UK", "B.AKE.R.MICHE.LL.EBA.HPC.Y.JX@GMAIL.COM"])(
    "answers 400 with the key for %s and never calls NextAuth",
    async (email) => {
      const handler = vi.fn(async () => new Response("ok"));
      const res = await withEmailPolicy(handler)(post("/api/auth/signin/email", { email, csrfToken: "t" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("email_not_accepted");
      expect(body.message).toContain("We can't accept this one.");
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it("answers in Spanish when the locale cookie says so", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const res = await withEmailPolicy(handler)(
      post("/api/auth/callback/dev-credentials", { email: "x@aol.com" }, "locale=es"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe(
      "Usa tu correo del trabajo u otra dirección personal. No podemos aceptar esta.",
    );
  });

  it("passes accepted addresses through untouched", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const res = await withEmailPolicy(handler)(
      post("/api/auth/signin/email", { email: "FIRST.LAST@GMAIL.COM" }),
    );
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });
});
