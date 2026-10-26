// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * POST /api/import/dpc-link/unlink: DPO Central removes the link. Imported
 * records stay; the sync stops (src/server/services/suite/dpc-link.ts).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LINK_ROLES, linkMembership, readLink, removeLink } from "@/server/services/suite/dpc-link";
import { readLinkRequest } from "../guard";

export async function POST(request: Request) {
  const req = await readLinkRequest(request);
  if (!req.ok) return req.response;
  const organizationId = typeof req.body.aisOrganizationId === "string" ? req.body.aisOrganizationId : "";
  const dpcOrganizationId = typeof req.body.dpcOrganizationId === "string" ? req.body.dpcOrganizationId : "";
  const member = organizationId ? await linkMembership(prisma, req.email, organizationId) : null;
  if (!member) return NextResponse.json({ error: "No such organization for this account" }, { status: 404 });
  if (!LINK_ROLES.includes(member.role)) {
    return NextResponse.json({ error: "Only an owner or administrator can unlink organizations" }, { status: 403 });
  }
  const link = readLink(member.settings);
  if (!link || link.dpcOrganizationId !== dpcOrganizationId) return NextResponse.json({ changed: false });
  const outcome = await removeLink(prisma, organizationId, member.userId, "dpocentral");
  return NextResponse.json(outcome);
}
