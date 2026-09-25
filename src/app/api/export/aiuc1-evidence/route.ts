// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Download one agent's AIUC-1 evidence file as Markdown, with the generation
 * stamp every other export carries and the SHA-256 of the text.
 *
 * Not behind the premium showcase: that list (src/config/premium-showcase.ts)
 * names the deliverables that are sold, and adding one is a pricing decision.
 */

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE_NAME, useSecureCookies } from "@/lib/session-cookie";
import prisma from "@/lib/prisma";
import { agentReadiness, isAgentSystem } from "@/config/aiuc1-evidence";
import { loadAgentRows } from "@/server/services/aiuc1/readiness";
import { renderAiuc1EvidenceDoc } from "@/server/services/export/aiuc1-evidence-doc";
import { exportStamp, sha256, stampLines } from "@/server/services/export/integrity";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const organizationId = params.get("organizationId");
  const aiSystemId = params.get("aiSystemId");
  const locale = params.get("locale") === "es" ? "es" : "en";

  if (!organizationId || !aiSystemId) {
    return Response.json({ error: "organizationId and aiSystemId are required" }, { status: 400 });
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

  const system = await prisma.aISystem.findFirst({
    where: { id: aiSystemId, organizationId },
    select: { id: true, name: true, technique: true, agentProfile: { select: { autonomy: true } } },
  });
  if (!system || !isAgentSystem({ technique: system.technique, autonomy: system.agentProfile?.autonomy })) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const rows = await loadAgentRows(prisma, organizationId, [system.id]);
  const readiness = agentReadiness(rows.get(system.id) ?? new Map(), now);

  const ids = [
    ...new Set(
      readiness.domains.flatMap((d) =>
        d.requirements.flatMap((r) => [
          ...r.tests.map((x) => x.recordedBy),
          ...(r.acceptance ? [r.acceptance.acceptedBy] : []),
        ]),
      ),
    ),
  ];
  const users = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids }, organizationMemberships: { some: { organizationId } } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const people = Object.fromEntries(users.map((u) => [u.id, u.name || u.email]));

  const body = renderAiuc1EvidenceDoc(
    {
      agentName: system.name,
      organizationName: membership.organization.name,
      readiness,
      people,
    },
    locale,
  );

  const stamp = await exportStamp();
  const digest = sha256(body);
  const markdown = `${body}\n${stampLines(stamp, locale)
    .map((line) => `- ${line}`)
    .join("\n")}\n- ${locale === "es" ? "Huella SHA-256 del texto anterior" : "SHA-256 of the text above"}: \`${digest}\`\n`;

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: membership.userId,
      entityType: "AISystem",
      entityId: system.id,
      action: "EXPORT_AIUC1_EVIDENCE",
      changes: {
        format: "markdown",
        locale,
        readyForAudit: readiness.overall.readyForAudit,
        appVersion: stamp.appVersion,
        sha256: digest,
      },
    },
  });

  const slug = system.name.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 60) || "agent";
  const filename = `AIUC-1-evidence-${slug}-${now.toISOString().slice(0, 10)}.md`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
