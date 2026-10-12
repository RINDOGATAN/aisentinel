// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Whether the account a sibling application names has an organisation here.
 *
 * The answer goes through the same resolver as the import writes
 * (src/lib/import-account.ts): it is about the named account only, an
 * organisation the sender names must be that account's, and the response
 * carries the one organisation the resolver picks, never a list.
 */
import { NextResponse } from "next/server";
import { guardImportRequest } from "@/lib/import-auth";
import { resolveImportAccount } from "@/lib/import-account";

export async function POST(request: Request) {
  const blocked = guardImportRequest(request);
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  const userEmail = body?.userEmail;

  if (!userEmail || typeof userEmail !== "string") {
    return NextResponse.json(
      { error: "userEmail is required" },
      { status: 400 }
    );
  }

  const account = await resolveImportAccount(userEmail, body.organizationId, "read");
  if (!account.ok) {
    return NextResponse.json({
      hasAccount: account.error !== "User not found",
      hasOrg: false,
      orgId: null,
      orgName: null,
    });
  }

  return NextResponse.json({
    hasAccount: true,
    hasOrg: true,
    orgId: account.organizationId,
    orgName: account.organizationName,
  });
}
