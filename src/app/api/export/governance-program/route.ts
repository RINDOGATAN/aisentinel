// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE_NAME, useSecureCookies } from "@/lib/session-cookie";
import prisma from "@/lib/prisma";
import { resolveContentLocale } from "@/config/lawfirm-ai-toolkit";
import { renderProgramPdf } from "@/server/services/export/program-pdf";
import {
  checkShowcaseAccess,
  lockedResponse,
} from "@/server/services/licensing/showcase-gate";

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

  // Hosted keeps the finished deliverables behind the licence; self-hosted
  // deployments include them. src/config/premium-showcase.ts explains which.
  const access = await checkShowcaseAccess(organizationId, "program-report");
  if (!access.allowed) {
    return lockedResponse(access);
  }

  // ?locale= wins; otherwise the same cookie next-intl reads.
  const localeParam = request.nextUrl.searchParams.get("locale");
  const locale =
    localeParam === "es" || localeParam === "en"
      ? localeParam
      : resolveContentLocale((name) => request.cookies.get(name)?.value);

  const orgName = membership.organization.name;
  const { buffer, dateStr } = await renderProgramPdf(prisma, {
    organizationId,
    userId: membership.userId,
    orgName,
    locale,
  });

  const filename = `AI-Governance-Program-${orgName.replace(/[^a-zA-Z0-9]/g, "-")}-${dateStr}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
