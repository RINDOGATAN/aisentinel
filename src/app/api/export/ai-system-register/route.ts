import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { AISystemRegisterReport, type AISystemExportData } from "@/server/services/export/ai-system-register";
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

  const systems = await prisma.aISystem.findMany({
    where: { organizationId },
    include: {
      riskClassification: true,
      vendor: true,
      _count: {
        select: {
          models: true,
          dataSources: true,
          assessments: true,
          incidents: true,
          complianceMappings: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const data: AISystemExportData[] = systems.map((sys) => ({
    id: sys.id,
    name: sys.name,
    description: sys.description,
    technique: sys.technique,
    role: sys.role,
    status: sys.status,
    purpose: sys.purpose,
    businessOwner: sys.businessOwner,
    technicalOwner: sys.technicalOwner,
    deploymentDate: sys.deploymentDate,
    retirementDate: sys.retirementDate,
    processesPersonalData: sys.processesPersonalData,
    riskLevel: sys.riskClassification?.riskLevel ?? null,
    rationale: sys.riskClassification?.rationale ?? null,
    vendorName: sys.vendor?.name ?? null,
    modelCount: sys._count.models,
    dataSourceCount: sys._count.dataSources,
    assessmentCount: sys._count.assessments,
    incidentCount: sys._count.incidents,
    complianceMappingCount: sys._count.complianceMappings,
  }));

  const orgName = membership.organization.name;
  const dateStr = fmtDate(new Date());

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: membership.userId,
      entityType: "AISystem",
      entityId: organizationId,
      action: "EXPORT_AI_SYSTEM_REGISTER",
      changes: { format: "pdf", count: data.length },
    },
  });

  const buffer = await renderToBuffer(
    AISystemRegisterReport({ systems: data, orgName })
  );

  const filename = `AI-System-Register-${orgName.replace(/[^a-zA-Z0-9]/g, "-")}-${dateStr}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
