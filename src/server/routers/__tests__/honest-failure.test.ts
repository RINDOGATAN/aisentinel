// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What a person is told when a procedure fails for a reason on our side.
 *
 * Driven over HTTP through the real tRPC handler and error formatter, with the
 * procedure that fails on purpose (diagnostics.fail, behind a test flag): the
 * response carries a sentence the person can act on and a reference, never the
 * underlying error; the server log carries the error under the same reference.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {}, prisma: {} }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createInnerTRPCContext, createTRPCRouter } from "@/server/trpc";
import { DELIBERATE_FAILURE_DETAIL, diagnosticsRouter } from "@/server/routers/diagnostics";
import { publicError } from "@/server/error-format";
import { TRPCError } from "@trpc/server";

const router = createTRPCRouter({ diagnostics: diagnosticsRouter });

async function callFail(locale?: "es") {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router,
    req: new Request("http://localhost/api/trpc/diagnostics.fail", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ json: null }),
    }),
    createContext: () =>
      createInnerTRPCContext({
        session: { user: { id: "u1", email: "person@example.test" }, expires: "2099-01-01" } as never,
        getCookie: (name) => (name === "locale" ? locale : undefined),
      }),
  });
  return { status: response.status, body: await response.json() };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("a procedure that fails for a reason on our side", () => {
  it("returns a sentence the person can act on, with a reference, and no detail", async () => {
    vi.stubEnv("AISENTINEL_TEST_FAILURES", "true");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, body } = await callFail();
    expect(status).toBe(500);
    const message: string = body.error.json.message;
    expect(message).toMatch(/^This could not be completed because of a problem on our side\./);
    expect(message).not.toMatch(/internal server error/i);

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("secret_internal_table");
    expect(serialized).not.toContain("deliberate failure");
    expect(body.error.json.data.stack ?? null).toBeNull();

    // The reference in the message is the one in the log line.
    const reference = body.error.json.data.reference as string;
    expect(reference).toMatch(/^E-[2-9A-HJKMNP-Z]{8}$/);
    expect(message).toContain(reference);
    const logged = log.mock.calls.map((c) => c.map(String).join(" ")).join("\n");
    expect(logged).toContain(reference);
    expect(logged).toContain(DELIBERATE_FAILURE_DETAIL);
  });

  it("speaks Spanish (tú) to a person who reads the app in Spanish", async () => {
    vi.stubEnv("AISENTINEL_TEST_FAILURES", "true");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { body } = await callFail("es");
    expect(body.error.json.message).toMatch(/^No se ha podido completar por un problema nuestro\./);
    expect(body.error.json.message).toContain("Vuelve a intentarlo");
  });

  it("does not exist unless the test flag is set", async () => {
    const { status, body } = await callFail();
    expect(status).toBe(404);
    expect(body.error.json.data.code).toBe("NOT_FOUND");
  });
});

describe("publicError", () => {
  it("passes a deliberate refusal through unchanged", () => {
    const refusal = new TRPCError({ code: "FORBIDDEN", message: "Viewers have read-only access." });
    expect(publicError(refusal, { locale: "en", log: () => {} })).toEqual({
      message: "Viewers have read-only access.",
    });
  });

  it("replaces an internal error's message and logs the cause", () => {
    const log = vi.fn();
    const cause = new Error("Invalid `prisma.aISystem.create()` invocation");
    const internal = new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: cause.message, cause });
    const result = publicError(internal, { path: "aiSystem.create", locale: "en", log });
    expect(result.message).not.toContain("prisma");
    expect(result.reference).toBeDefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining(result.reference!), cause);
    expect(log.mock.calls[0][0]).toContain("aiSystem.create");
  });
});
