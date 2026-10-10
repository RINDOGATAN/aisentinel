// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE_NAME, useSecureCookies } from "@/lib/session-cookie";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { ModelInventoryReport } from "@/server/services/export/model-inventory";
import { loadModelInventoryData } from "@/server/services/export/document-data";
import { fmtDate } from "@/server/services/export/pdf-styles";
import { exportLocale } from "@/server/services/export/pdf-labels";
import { stripAccents } from "@/lib/file-name";

export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organizationId");

  if (!organizationId) {
    return Response.json({ error: "organizationId is required" }, { status: 400 });
  }

  const token = await getToken({
    req: request,
    // This app overrides NextAuth's default cookie names; without these,
    // getToken looks for `next-auth.session-token`, never finds it, and 401s
    // a valid session. See @/lib/session-cookie.
    cookieName: SESSION_COOKIE_NAME,
    secureCookie: useSecureCookies,
  });
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

  const data = await loadModelInventoryData(prisma, organizationId);

  const orgName = membership.organization.name;
  const locale = exportLocale(request.nextUrl.searchParams.get("locale"), request.headers.get("cookie"));
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
    ModelInventoryReport({ models: data, orgName, locale })
  );

  const filename = `${locale === "es" ? "Inventario-de-modelos-de-IA" : "AI-Model-Inventory"}-${stripAccents(orgName).replace(/[^a-zA-Z0-9]/g, "-")}-${dateStr}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
