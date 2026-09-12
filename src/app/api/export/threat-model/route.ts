// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Download one threat model as Markdown, with the same generation stamp every
 * other export carries. This is the document a team sends when a customer's
 * security review asks how they govern their AI, and it is produced from the
 * record rather than written for the occasion.
 */

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE_NAME, useSecureCookies } from "@/lib/session-cookie";
import prisma from "@/lib/prisma";
import { renderThreatModelDoc } from "@/server/services/export/threat-model-doc";
import { exportStamp, sha256, stampLines } from "@/server/services/export/integrity";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const organizationId = params.get("organizationId");
  const id = params.get("id");
  const locale = params.get("locale") === "es" ? "es" : "en";

  if (!organizationId || !id) {
    return Response.json({ error: "organizationId and id are required" }, { status: 400 });
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

  const model = await prisma.threatModel.findFirst({
    where: { id, organizationId },
    include: {
      aiSystem: { select: { name: true } },
      scenarios: {
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        include: {
          controls: {
            orderBy: { createdAt: "asc" },
            include: { tests: { orderBy: { testedAt: "desc" } } },
          },
        },
      },
    },
  });
  if (!model) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const body = renderThreatModelDoc(
    {
      name: model.name,
      systemSummary: model.systemSummary,
      systemName: model.aiSystem?.name ?? null,
      capabilities: model.capabilities,
      reviewedAt: model.reviewedAt,
      organizationName: membership.organization.name,
      scenarios: model.scenarios,
    },
    locale,
    now,
  );

  const stamp = await exportStamp();
  const markdown = `${body}\n${stampLines(stamp, locale)
    .map((line) => `- ${line}`)
    .join("\n")}\n- ${locale === "es" ? "Huella SHA-256 del texto anterior" : "SHA-256 of the text above"}: \`${sha256(body)}\`\n`;

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: membership.userId,
      entityType: "ThreatModel",
      entityId: id,
      action: "EXPORT_THREAT_MODEL",
      changes: {
        format: "markdown",
        locale,
        scenarios: model.scenarios.length,
        appVersion: stamp.appVersion,
        sha256: sha256(body),
      },
    },
  });

  const slug = model.name.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 60) || "threat-model";
  const filename = `Threat-model-${slug}-${now.toISOString().slice(0, 10)}.md`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
