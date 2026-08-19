// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE_NAME, useSecureCookies } from "@/lib/session-cookie";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  getProgramGraphData,
  getProgramScorecardData,
} from "@/server/services/program/program-data";
import { renderProgramReport } from "@/server/services/export/program-report";
import { resolveContentLocale } from "@/config/lawfirm-ai-toolkit";

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

  // ?locale= wins; otherwise the same cookie next-intl reads.
  const localeParam = request.nextUrl.searchParams.get("locale");
  const locale =
    localeParam === "es" || localeParam === "en"
      ? localeParam
      : resolveContentLocale((name) => request.cookies.get(name)?.value);

  const [graph, scorecard] = await Promise.all([
    getProgramGraphData(prisma, organizationId, locale),
    getProgramScorecardData(prisma, organizationId, locale),
  ]);

  const orgName = membership.organization.name;
  const dateStr = scorecard.generatedAt.slice(0, 10);

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: membership.userId,
      entityType: "Organization",
      entityId: organizationId,
      action: "EXPORT_GOVERNANCE_PROGRAM",
      changes: { format: "pdf", locale, systems: graph.systems.length },
    },
  });

  const buffer = await renderToBuffer(
    await renderProgramReport({ orgName, locale, graph, scorecard }),
  );

  const filename = `AI-Governance-Program-${orgName.replace(/[^a-zA-Z0-9]/g, "-")}-${dateStr}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
