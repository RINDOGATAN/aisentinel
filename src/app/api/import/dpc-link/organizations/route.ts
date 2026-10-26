// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * POST /api/import/dpc-link/organizations: the AI Sentinel organisations the
 * signed-in person may link (owner or administrator), with their link state.
 * Called by DPO Central's "Start from DPO Central" page.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { linkableOrganizations } from "@/server/services/suite/dpc-link";
import { readLinkRequest } from "../guard";

export async function POST(request: Request) {
  const req = await readLinkRequest(request);
  if (!req.ok) return req.response;
  const organizations = await linkableOrganizations(prisma, req.email);
  return NextResponse.json({ organizations });
}
