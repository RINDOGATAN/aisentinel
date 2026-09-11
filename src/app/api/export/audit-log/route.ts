// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Audit trail export.
 *
 * The whole trail for an organisation as CSV, optionally filtered, newest
 * first. This is the file counsel hands over when asked who changed what and
 * when, so it carries every column the row holds, including the recorded
 * change payload, rather than a prettified subset.
 *
 * Reading the trail is restricted to OWNER / ADMIN / AI_OFFICER, matching the
 * tRPC router: it is a record about people, not only about systems.
 */

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE_NAME, useSecureCookies } from "@/lib/session-cookie";
import prisma from "@/lib/prisma";
import { fmtDate } from "@/server/services/export/pdf-styles";
import { exportStamp, stampLines } from "@/server/services/export/integrity";

const READER_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

/** A hard ceiling so one request can never stream an unbounded table. */
const MAX_ROWS = 50000;

function csvCell(v: string): string {
  return /[",;\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const organizationId = params.get("organizationId");

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
  if (!READER_ROLES.includes(membership.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const entityType = params.get("entityType") || undefined;
  const action = params.get("action") || undefined;
  const userId = params.get("userId") || undefined;
  const fromRaw = params.get("from");
  const toRaw = params.get("to");
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  const where = {
    organizationId,
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const header = [
    "Timestamp (UTC)",
    "Action",
    "Entity type",
    "Entity id",
    "Actor name",
    "Actor email",
    "Actor id",
    "Changes",
    "Metadata",
  ];

  const body = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      r.action,
      r.entityType,
      r.entityId,
      r.user?.name ?? "",
      r.user?.email ?? "",
      r.userId ?? "",
      r.changes === null || r.changes === undefined ? "" : JSON.stringify(r.changes),
      r.metadata === null || r.metadata === undefined ? "" : JSON.stringify(r.metadata),
    ]
      .map((v) => csvCell(String(v)))
      .join(","),
  );

  const stamp = await exportStamp();
  // The provenance of the file itself, as comment rows above the table. A
  // spreadsheet shows them as text; a reader knows when it was made, from
  // which build, and whether the ceiling truncated it.
  const preamble = [
    ...stampLines(stamp).map((l) => csvCell(`# ${l}`)),
    csvCell(`# Organisation: ${membership.organization.name}`),
    csvCell(
      `# Rows: ${rows.length}${rows.length === MAX_ROWS ? ` (truncated at the ${MAX_ROWS} row limit; narrow the date range)` : ""}`,
    ),
    csvCell(
      `# Filters: ${[
        entityType ? `entity=${entityType}` : null,
        action ? `action=${action}` : null,
        userId ? `actor=${userId}` : null,
        from ? `from=${from.toISOString()}` : null,
        to ? `to=${to.toISOString()}` : null,
      ]
        .filter(Boolean)
        .join(" ") || "none"}`,
    ),
  ];

  const csv = `﻿${[...preamble, header.join(","), ...body].join("\r\n")}\r\n`;

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: membership.userId,
      entityType: "AuditLog",
      entityId: organizationId,
      action: "EXPORT_AUDIT_LOG",
      changes: {
        format: "csv",
        rows: rows.length,
        truncated: rows.length === MAX_ROWS,
        entityType: entityType ?? null,
        actionFilter: action ?? null,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      },
    },
  });

  const orgName = membership.organization.name.replace(/[^a-zA-Z0-9]/g, "-");
  const filename = `Audit-Trail-${orgName}-${fmtDate(new Date())}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
