// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE_NAME, useSecureCookies } from "@/lib/session-cookie";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { AISystemRegisterReport } from "@/server/services/export/ai-system-register";
import { loadRegisterExportData } from "@/server/services/export/register-data";
import { fmtDate } from "@/server/services/export/pdf-styles";

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

  const data = await loadRegisterExportData(prisma, organizationId);

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
