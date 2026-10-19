// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Download one policy as PDF or Word: GET ?organizationId&id&format=pdf|docx.
 * The document is headed with the organization's name, the policy's reference,
 * version, status and dates, and ends with the generation stamp every export
 * carries. Any member of the organization may download; each download is
 * recorded in the audit trail.
 */

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { renderToBuffer } from "@react-pdf/renderer";
import { createTranslator } from "next-intl";
import { SESSION_COOKIE_NAME, useSecureCookies } from "@/lib/session-cookie";
import prisma from "@/lib/prisma";
import { exportLocale } from "@/server/services/export/pdf-labels";
import { exportStamp, stampLines } from "@/server/services/export/integrity";
import { fmtDate } from "@/server/services/export/pdf-styles";
import { buildPolicyDocument, type PolicyDocLabels } from "@/server/services/export/policy-document";
import { PolicyPdf } from "@/server/services/export/policy-pdf";
import { renderPolicyDocx } from "@/server/services/export/policy-docx";
import { resolvePolicyAssignments } from "@/server/services/policy/assignments";
import { fillMissingPolicyNumbers } from "@/server/services/policy/number";
import { policyReference } from "@/lib/policy-meta";
import { EXPORT_FILE_PREFIX, stripAccents } from "@/lib/file-name";

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const organizationId = params.get("organizationId");
  const id = params.get("id");
  const format = params.get("format") === "docx" ? "docx" : "pdf";
  const locale = exportLocale(params.get("locale"), request.headers.get("cookie"), request.headers.get("accept-language"));

  if (!organizationId || !id) {
    return Response.json({ error: "organizationId and id are required" }, { status: 400 });
  }

  const token = await getToken({ req: request, cookieName: SESSION_COOKIE_NAME, secureCookie: useSecureCookies });
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

  await fillMissingPolicyNumbers(prisma, organizationId);
  const policy = await prisma.aIPolicy.findFirst({
    where: { id, organizationId },
    include: { systemLinks: { include: { aiSystem: { select: { name: true } } } } },
  });
  if (!policy) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const assignment = (await resolvePolicyAssignments(prisma, organizationId, [policy])).get(policy.id)!;

  const messages = (await import(`../../../../i18n/messages/${locale}.json`)).default as Record<string, unknown>;
  const t = createTranslator({
    locale,
    messages,
    namespace: "policyDoc",
    onError: () => undefined,
    getMessageFallback: ({ key }: { key: string }) => key.split(".").pop() ?? key,
  } as unknown as Parameters<typeof createTranslator>[0]) as unknown as (key: string) => string;

  const labels: PolicyDocLabels = {
    reference: t("reference"),
    version: t("version"),
    status: t("status"),
    type: t("type"),
    effectiveDate: t("effectiveDate"),
    reviewDate: t("reviewDate"),
    approvedAt: t("approvedAt"),
    owner: t("owner"),
    department: t("department"),
    systems: t("systems"),
    notSet: t("notSet"),
    noContent: t("noContent"),
    draftNotice: t("draftNotice"),
  };

  const stamp = await exportStamp();
  const doc = buildPolicyDocument(
    {
      orgName: membership.organization.name,
      reference: policyReference(policy.number),
      title: policy.title,
      version: policy.currentVersion,
      status: policy.status,
      statusLabel: t(`statusLabel.${policy.status}`),
      typeLabel: t(`typeLabel.${policy.type}`),
      description: policy.description,
      content: policy.content,
      effectiveDate: policy.effectiveDate,
      reviewDate: policy.reviewDate,
      approvedAt: policy.approvedAt,
      ownerName: assignment.ownerName,
      departmentName: assignment.departmentName,
      systems: policy.systemLinks.map((l) => l.aiSystem.name),
    },
    labels,
    locale,
    stampLines(stamp, locale),
  );

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: membership.userId,
      entityType: "AIPolicy",
      entityId: policy.id,
      action: "EXPORT_POLICY",
      changes: { format, locale, version: policy.currentVersion, appVersion: stamp.appVersion },
    },
  });

  const date = fmtDate(new Date());
  const ref = policyReference(policy.number);
  const slug = stripAccents(policy.title).replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").slice(0, 60) || "policy";
  const base = `${EXPORT_FILE_PREFIX.policy[locale]}-${ref ? `${ref}-` : ""}${slug}-${date}`;

  if (format === "docx") {
    const buffer = await renderPolicyDocx(doc);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": DOCX_TYPE,
        "Content-Disposition": `attachment; filename="${base}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const buffer = await renderToBuffer(PolicyPdf({ doc, date }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${base}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
