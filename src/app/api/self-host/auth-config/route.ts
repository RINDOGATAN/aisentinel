// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Self-host auth config.
 *
 * GET /api/self-host/auth-config — tells the sign-in page whether the local
 * (dev-credentials) login requires the workspace passphrase. The passphrase
 * itself is a RUNTIME server env var (WORKSPACE_PASSPHRASE, deliberately not
 * NEXT_PUBLIC so it is never baked into the client bundle); only the boolean
 * "is one required" is exposed here.
 *
 * Public endpoint, no auth — it reveals nothing beyond what the sign-in form
 * already shows once rendered.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const required = (process.env.WORKSPACE_PASSPHRASE ?? "").trim();
  return NextResponse.json({ passphraseRequired: required.length > 0 });
}
