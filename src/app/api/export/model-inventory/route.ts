import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { ModelInventoryReport, type ModelExportData } from "@/server/services/export/model-inventory";
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

  const models = await prisma.aIModel.findMany({
    where: { organizationId },
    include: {
      aiSystem: {
        include: { riskClassification: true },
      },
    },
    orderBy: [{ aiSystem: { name: "asc" } }, { name: "asc" }],
  });

  const data: ModelExportData[] = models.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    modelType: m.modelType,
    version: m.version,
    trainingDataSummary: m.trainingDataSummary,
    knownLimitations: m.knownLimitations,
    aiSystemName: m.aiSystem.name,
    aiSystemStatus: m.aiSystem.status,
    riskLevel: m.aiSystem.riskClassification?.riskLevel ?? null,
  }));

  const orgName = membership.organization.name;
  const dateStr = fmtDate(new Date());

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: membership.userId,
      entityType: "AIModel",
      entityId: organizationId,
      action: "EXPORT_MODEL_INVENTORY",
      changes: { format: "pdf", count: data.length },
    },
  });

  const buffer = await renderToBuffer(
    ModelInventoryReport({ models: data, orgName })
  );

  const filename = `AI-Model-Inventory-${orgName.replace(/[^a-zA-Z0-9]/g, "-")}-${dateStr}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
