// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The guard of the suite-link routes (src/server/services/suite/dpc-link.ts):
 * the sibling application's key, then the signed statement of the person.
 * Stricter than the other import routes: wherever identity secrets are
 * configured, the statement is required, since these routes create or
 * remove a link between two organisations.
 */
import { NextResponse } from "next/server";
import { guardImportRequest } from "@/lib/import-auth";
import { checkImportIdentity, IMPORT_IDENTITY_HEADER } from "@/lib/import-identity";

export async function readLinkRequest(
  request: Request,
): Promise<{ ok: true; body: Record<string, unknown>; email: string } | { ok: false; response: Response }> {
  const blocked = guardImportRequest(request);
  if (blocked) return { ok: false, response: blocked };
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = typeof body?.userEmail === "string" ? body.userEmail.trim().toLowerCase() : "";
  if (!body || !email) {
    return { ok: false, response: NextResponse.json({ error: "userEmail is required" }, { status: 400 }) };
  }
  const secretsConfigured = (process.env.IMPORT_IDENTITY_SECRETS ?? "").split(",").some((s) => s.trim());
  if (secretsConfigured && !request.headers.get(IMPORT_IDENTITY_HEADER)) {
    return { ok: false, response: NextResponse.json({ error: "Identity statement required" }, { status: 401 }) };
  }
  const identity = checkImportIdentity(request, email);
  if (identity) return { ok: false, response: identity };
  return { ok: true, body, email };
}
