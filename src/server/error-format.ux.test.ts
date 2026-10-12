// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicError } from "./error-format";

describe("what a person reads when a save fails", () => {
  it("an expired session is a sentence with what to do, not the bare code", () => {
    const err = new TRPCError({ code: "UNAUTHORIZED" });
    expect(publicError(err, { locale: "en" }).message).toMatch(/^Your session has ended/);
    expect(publicError(err, { locale: "es" }).message).toMatch(/^Tu sesión ha terminado/);
  });

  it("keeps a deliberate UNAUTHORIZED message", () => {
    const err = new TRPCError({ code: "UNAUTHORIZED", message: "Licence required." });
    expect(publicError(err, { locale: "en" }).message).toBe("Licence required.");
  });

  it("refused input names the field and the limit instead of the validator's list", () => {
    const parsed = z.object({ name: z.string().max(200) }).safeParse({ name: "x".repeat(260) });
    const err = new TRPCError({ code: "BAD_REQUEST", cause: parsed.error });
    const en = publicError(err, { locale: "en" }).message;
    expect(en).toBe("Some of what was entered is not valid (name: at most 200 characters). Correct it and save again.");
    expect(en).not.toMatch(/too_big|\[/);
    expect(publicError(err, { locale: "es" }).message).toContain("nombre: 200 caracteres como máximo");
  });

  it("passes a deliberate BAD_REQUEST without a validator cause through", () => {
    const err = new TRPCError({ code: "BAD_REQUEST", message: "Organization ID is required" });
    expect(publicError(err, { locale: "en" }).message).toBe("Organization ID is required");
  });
});
