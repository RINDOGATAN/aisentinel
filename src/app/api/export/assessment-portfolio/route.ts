// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { AssessmentPortfolioReport, type AssessmentExportData } from "@/server/services/export/assessment-portfolio";
import { fmtDate } from "@/server/services/export/pdf-styles";

export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organizationId");

  if (!organizationId) {
    return Response.json({ error: "organizationId is required" }, { status: 400 });
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

  const assessments = await prisma.aIAssessment.findMany({
    where: { organizationId },
    include: {
      aiSystem: { select: { name: true } },
      template: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data: AssessmentExportData[] = assessments.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    status: a.status,
    riskScore: a.riskScore,
    aiSystemName: a.aiSystem.name,
    templateName: a.template?.name ?? null,
    createdBy: a.createdBy,
    reviewedBy: a.reviewedBy,
    approvedBy: a.approvedBy,
    createdAt: a.createdAt,
    reviewedAt: a.reviewedAt,
    approvedAt: a.approvedAt,
  }));

  const orgName = membership.organization.name;
  const dateStr = fmtDate(new Date());

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: membership.userId,
      entityType: "AIAssessment",
      entityId: organizationId,
      action: "EXPORT_ASSESSMENT_PORTFOLIO",
      changes: { format: "pdf", count: data.length },
    },
  });

  const buffer = await renderToBuffer(
    AssessmentPortfolioReport({ assessments: data, orgName })
  );

  const filename = `Assessment-Portfolio-${orgName.replace(/[^a-zA-Z0-9]/g, "-")}-${dateStr}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
