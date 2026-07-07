// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { ComplianceSummaryReport, type ComplianceSummaryData, type ComplianceRequirementExport } from "@/server/services/export/compliance-summary";
import { fmtDate } from "@/server/services/export/pdf-styles";

export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  const aiSystemId = request.nextUrl.searchParams.get("aiSystemId");
  const frameworkId = request.nextUrl.searchParams.get("frameworkId");

  if (!organizationId) {
    return Response.json({ error: "organizationId is required" }, { status: 400 });
  }
  if (!aiSystemId) {
    return Response.json({ error: "aiSystemId is required" }, { status: 400 });
  }
  if (!frameworkId) {
    return Response.json({ error: "frameworkId is required" }, { status: 400 });
  }

  const token = await getToken({ req: request });
  const userEmail = token?.email as string | undefined;
  if (!userEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId, user: { email: userEmail } },
    include: { organization: true },
  });
  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify AI system belongs to org
  const aiSystem = await prisma.aISystem.findFirst({
    where: { id: aiSystemId, organizationId },
    select: { name: true },
  });
  if (!aiSystem) {
    return Response.json({ error: "AI System not found" }, { status: 404 });
  }

  const framework = await prisma.complianceFramework.findUnique({
    where: { id: frameworkId },
    select: { name: true, code: true },
  });
  if (!framework) {
    return Response.json({ error: "Framework not found" }, { status: 404 });
  }

  // Fetch top-level requirements with children
  const requirements = await prisma.complianceRequirement.findMany({
    where: { frameworkId, parentId: null },
    include: {
      children: {
        orderBy: { sortOrder: "asc" },
        include: {
          mappings: {
            where: { aiSystemId, organizationId },
            include: { evidenceItems: true },
          },
        },
      },
      mappings: {
        where: { aiSystemId, organizationId },
        include: { evidenceItems: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const reqs: ComplianceRequirementExport[] = requirements.map((req) => {
    const mapping = req.mappings[0];
    return {
      code: req.code,
      title: req.title,
      status: mapping?.status ?? "NOT_ASSESSED",
      evidenceCount: mapping?.evidenceItems?.length ?? 0,
      notes: mapping?.notes ?? null,
      children: req.children.map((child) => {
        const childMapping = child.mappings[0];
        return {
          code: child.code,
          title: child.title,
          status: childMapping?.status ?? "NOT_ASSESSED",
          evidenceCount: childMapping?.evidenceItems?.length ?? 0,
          notes: childMapping?.notes ?? null,
        };
      }),
    };
  });

  const reportData: ComplianceSummaryData = {
    orgName: membership.organization.name,
    aiSystemName: aiSystem.name,
    frameworkName: framework.name,
    frameworkCode: framework.code,
    requirements: reqs,
  };

  const dateStr = fmtDate(new Date());

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: membership.userId,
      entityType: "ComplianceMapping",
      entityId: aiSystemId,
      action: "EXPORT_COMPLIANCE_SUMMARY",
      changes: { format: "pdf", framework: framework.code, aiSystemId, requirementCount: reqs.length },
    },
  });

  const buffer = await renderToBuffer(
    ComplianceSummaryReport({ data: reportData })
  );

  const filename = `Compliance-${framework.code}-${aiSystem.name.replace(/[^a-zA-Z0-9]/g, "-")}-${dateStr}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
