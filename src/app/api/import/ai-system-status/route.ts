// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Read-through status for a linked AI system.
 *
 * DPO Central's AI-system page calls this to show the AI-Act posture (risk tier,
 * FRIA, conformity, open oversight gates) of the AI Sentinel system it is linked
 * to — the "one system, both regimes" view. Read-only; returns a compact summary,
 * never the full record.
 *
 * Auth: x-api-key (VW_IMPORT_API_KEYS), same as the other import endpoints. The
 * caller must also pass the user's email; we only return a system that belongs to
 * that user's organization, so one deployment cannot read another org's systems.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateImportApiKey } from "@/lib/import-auth";

const OPEN_GATE_STATUSES = ["PENDING", "IN_REVIEW"];

export async function POST(request: Request) {
  if (!validateImportApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userEmail, aisSystemId } = body as {
    userEmail?: string;
    aisSystemId?: string;
  };

  if (!userEmail || !aisSystemId) {
    return NextResponse.json(
      { error: "userEmail and aisSystemId are required" },
      { status: 400 },
    );
  }

  // Resolve the caller's organization (same pattern as the other import routes).
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      organizationMemberships: { include: { organization: true }, take: 1 },
    },
  });
  const orgId = user?.organizationMemberships[0]?.organizationId;
  if (!orgId) {
    return NextResponse.json({ found: false });
  }

  const system = await prisma.aISystem.findFirst({
    where: { id: aisSystemId, organizationId: orgId },
    select: {
      id: true,
      name: true,
      status: true,
      riskClassification: {
        select: { riskLevel: true, annexIIICategory: true },
      },
      assessments: {
        select: {
          type: true,
          status: true,
          riskScore: true,
          approvedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      oversightGates: { select: { status: true } },
    },
  });

  if (!system) {
    return NextResponse.json({ found: false });
  }

  const latestOfType = (t: string) =>
    system.assessments.find((a) => a.type === t) ?? null;
  const fria = latestOfType("FRIA");
  const conformity = latestOfType("CONFORMITY");

  return NextResponse.json({
    found: true,
    systemId: system.id,
    name: system.name,
    status: system.status,
    riskLevel: system.riskClassification?.riskLevel ?? null,
    annexIIICategory: system.riskClassification?.annexIIICategory ?? null,
    fria: fria
      ? {
          status: fria.status,
          riskScore: fria.riskScore,
          approvedAt: fria.approvedAt?.toISOString() ?? null,
        }
      : null,
    conformity: conformity
      ? {
          status: conformity.status,
          approvedAt: conformity.approvedAt?.toISOString() ?? null,
        }
      : null,
    assessmentsTotal: system.assessments.length,
    openOversightGates: system.oversightGates.filter((g) =>
      OPEN_GATE_STATUSES.includes(g.status),
    ).length,
  });
}
