// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * POST /api/import/dpc-link: link an AI Sentinel organisation to a DPO
 * Central organisation and bring in its records as drafts
 * (src/server/services/suite/dpc-link.ts). The person must be owner or
 * administrator here; DPO Central has checked the same on its side.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  LINK_ROLES,
  createLink,
  linkMembership,
  type DpcLinkOrganization,
  type DpcLinkSystem,
  type DpcLinkVendor,
} from "@/server/services/suite/dpc-link";
import { readLinkRequest } from "./guard";

export async function POST(request: Request) {
  const req = await readLinkRequest(request);
  if (!req.ok) return req.response;
  const { body, email } = req;
  const organizationId = typeof body.aisOrganizationId === "string" ? body.aisOrganizationId : "";
  const dpc = body.dpcOrganization as DpcLinkOrganization | undefined;
  if (!organizationId || !dpc || typeof dpc.id !== "string" || typeof dpc.name !== "string") {
    return NextResponse.json({ error: "aisOrganizationId and dpcOrganization are required" }, { status: 400 });
  }
  const member = await linkMembership(prisma, email, organizationId);
  if (!member) return NextResponse.json({ error: "No such organization for this account" }, { status: 404 });
  if (!LINK_ROLES.includes(member.role)) {
    return NextResponse.json({ error: "Only an owner or administrator can link organizations" }, { status: 403 });
  }
  const outcome = await createLink(prisma, {
    organizationId,
    userId: member.userId,
    email,
    settings: member.settings,
    dpc: { id: dpc.id, name: dpc.name, country: dpc.country ?? null, laws: Array.isArray(dpc.laws) ? dpc.laws : [] },
    vendors: Array.isArray(body.vendors) ? (body.vendors as DpcLinkVendor[]) : [],
    systems: Array.isArray(body.systems) ? (body.systems as DpcLinkSystem[]) : [],
  });
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  return NextResponse.json({
    linked: true,
    organizationName: member.organizationName,
    mapped: { systems: outcome.result.systems, vendors: outcome.result.vendors },
    created: { systems: outcome.result.createdSystems, vendors: outcome.result.createdVendors },
    skipped: outcome.result.skipped,
  });
}
