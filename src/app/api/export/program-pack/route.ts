// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * GET /api/export/program-pack?organizationId=&locale=
 * The whole program in one ZIP (see src/server/services/export/program-pack.ts).
 * Same authentication as the other exports: the session JWT, then membership
 * of the requested organization.
 */

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE_NAME, useSecureCookies } from "@/lib/session-cookie";
import prisma from "@/lib/prisma";
import { resolveContentLocale } from "@/config/lawfirm-ai-toolkit";
import { buildProgramPack } from "@/server/services/export/program-pack";
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
  const access = await checkShowcaseAccess(organizationId, "program-pack");
  if (!access.allowed) {
    return lockedResponse(access);
  }

  const localeParam = request.nextUrl.searchParams.get("locale");
  const locale =
    localeParam === "es" || localeParam === "en"
      ? localeParam
      : resolveContentLocale((name) => request.cookies.get(name)?.value);

  const { zip, filename } = await buildProgramPack(prisma, {
    organizationId,
    userId: membership.userId,
    orgName: membership.organization.name,
    locale,
  });

  return new Response(new Blob([zip as BlobPart], { type: "application/zip" }), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
