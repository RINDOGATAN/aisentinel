// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Download one of the four unified artifacts as Markdown.
 *
 * Markdown rather than PDF on purpose: the artifacts are meant to be taken
 * into the organisation's own systems of record, and Markdown pastes into
 * every one of them with the citations intact. The PDF pipeline stays for the
 * register-style reports, which are read rather than re-used.
 */

import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE_NAME, useSecureCookies } from "@/lib/session-cookie";
import prisma from "@/lib/prisma";
import { resolveContentLocale } from "@/config/lawfirm-ai-toolkit";
import { loadSystemScope } from "@/server/services/scope/system-scope";
import {
  buildAgenticAddendumArtifact,
  buildAssessmentArtifact,
  buildNoticeArtifact,
  buildProtocolArtifact,
} from "@/server/services/artifacts/build-artifacts";
import { renderArtifactMarkdown } from "@/server/services/artifacts/render-markdown";
import { exportStamp, sha256, stampLines } from "@/server/services/export/integrity";
import {
  checkShowcaseAccess,
  lockedResponse,
} from "@/server/services/licensing/showcase-gate";

const KINDS = ["assessment", "notice", "protocol", "agentic-addendum"] as const;
type Kind = (typeof KINDS)[number];

const FILENAME: Record<Kind, string> = {
  assessment: "unified-impact-assessment",
  notice: "multi-jurisdictional-ai-notice",
  protocol: "human-review-and-appeal-protocol",
  "agentic-addendum": "agentic-addendum",
};

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "system";
}

export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  const aiSystemId = request.nextUrl.searchParams.get("aiSystemId");
  const kindParam = request.nextUrl.searchParams.get("kind") ?? "assessment";

  if (!organizationId || !aiSystemId) {
    return Response.json({ error: "organizationId and aiSystemId are required" }, { status: 400 });
  }
  if (!KINDS.includes(kindParam as Kind)) {
    return Response.json({ error: `kind must be one of ${KINDS.join(", ")}` }, { status: 400 });
  }
  const kind = kindParam as Kind;

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

  // The impact assessment document is the deliverable kept behind the licence
  // on the hosted instance. The notice and the human-review protocol stay
  // free, so the generation itself can still be seen and judged.
  if (kind === "assessment") {
    const access = await checkShowcaseAccess(organizationId, "impact-assessment-document");
    if (!access.allowed) {
      return lockedResponse(access);
    }
  }

  const localeParam = request.nextUrl.searchParams.get("locale");
  const locale =
    localeParam === "es" || localeParam === "en"
      ? localeParam
      : resolveContentLocale((name) => request.cookies.get(name)?.value);

  // loadSystemScope is org-scoped, so a system id from another organisation
  // is a 404 rather than a leak.
  let scope;
  try {
    scope = await loadSystemScope(prisma, organizationId, aiSystemId);
  } catch {
    return Response.json({ error: "AI system not found" }, { status: 404 });
  }

  const assessmentId = request.nextUrl.searchParams.get("assessmentId");
  const assessment = await prisma.aIAssessment.findFirst({
    where: {
      organizationId,
      aiSystemId,
      ...(assessmentId ? { id: assessmentId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, responses: true },
  });

  const input = {
    scope,
    answers: (assessment?.responses ?? {}) as Record<string, unknown>,
    locale,
    generatedAt: new Date().toISOString().slice(0, 10),
  };

  const artifact =
    kind === "assessment"
      ? buildAssessmentArtifact(input)
      : kind === "notice"
        ? buildNoticeArtifact(input)
        : kind === "protocol"
          ? buildProtocolArtifact(input)
          : buildAgenticAddendumArtifact(input);

  const body = renderArtifactMarkdown(artifact);
  // The document states what produced it. Without this a reader cannot tell,
  // later, which version of the rules the citations came from — the first
  // question asked of any generated legal document.
  const stamp = await exportStamp();
  const provenance = [
    "",
    "---",
    "",
    locale === "es" ? "## Procedencia de este documento" : "## How this document was produced",
    "",
    ...stampLines(stamp, locale).map((l) => `- ${l}`),
    `- ${locale === "es" ? "Huella SHA-256 del texto anterior" : "SHA-256 of the text above"}: \`${sha256(body)}\``,
    "",
  ].join("\n");
  const markdown = `${body}${provenance}`;

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: membership.userId,
      entityType: "AISystem",
      entityId: aiSystemId,
      action: "EXPORT_UNIFIED_ARTIFACT",
      changes: {
        kind,
        format: "markdown",
        locale,
        sourceAssessmentId: assessment?.id ?? null,
        gaps: artifact.gaps.length,
        regimes: artifact.regimes,
        appVersion: stamp.appVersion,
        commit: stamp.commit,
        generatedAt: stamp.generatedAt,
        sha256: sha256(body),
      },
    },
  });

  const filename = `${FILENAME[kind]}-${slug(scope.system.name)}-${input.generatedAt}.md`;
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
