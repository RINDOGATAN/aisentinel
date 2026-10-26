// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * POST /api/import/dpc-link/sync: one round of the two-way sync, called by
 * DPO Central's schedule for a linked organisation (src/server/services/suite/dpc-link.ts).
 * The statement names the person who created the link; the link must still
 * be active and point at the DPO Central organisation the call names.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readLink, syncRound, type DpcLinkSystem, type DpcLinkVendor } from "@/server/services/suite/dpc-link";
import { readLinkRequest } from "../guard";

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export async function POST(request: Request) {
  const req = await readLinkRequest(request);
  if (!req.ok) return req.response;
  const { body } = req;
  const organizationId = typeof body.aisOrganizationId === "string" ? body.aisOrganizationId : "";
  const dpcOrganizationId = typeof body.dpcOrganizationId === "string" ? body.dpcOrganizationId : "";
  if (!organizationId || !dpcOrganizationId) {
    return NextResponse.json({ error: "aisOrganizationId and dpcOrganizationId are required" }, { status: 400 });
  }
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { settings: true } });
  const link = readLink(org?.settings);
  if (!link || link.dpcOrganizationId !== dpcOrganizationId) {
    return NextResponse.json({ linked: false });
  }
  if (!link.active) return NextResponse.json({ linked: false, unlinkedAt: link.unlinkedAt ?? null });
  const round = await syncRound(prisma, {
    organizationId,
    vendors: Array.isArray(body.vendors) ? (body.vendors as DpcLinkVendor[]) : [],
    systems: Array.isArray(body.systems) ? (body.systems as DpcLinkSystem[]) : [],
    knownAisSystemIds: strings(body.knownAisSystemIds),
    knownAisVendorIds: strings(body.knownAisVendorIds),
  });
  return NextResponse.json({ linked: true, ...round });
}
