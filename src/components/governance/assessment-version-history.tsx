"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The dated history of one assessment.
 *
 * An impact assessment is evidence that an analysis happened on a date. This
 * panel is where that is shown: each version, why it exists, who saved it, how
 * many questions were answered at the time, and the digest of its content so a
 * version quoted elsewhere can be matched to the one held here.
 *
 * Read-only by construction. Versions are appended by the server and there is
 * no edit or delete path anywhere in the application.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const REASON_KEY: Record<string, string> = {
  EDIT: "reasonEdit",
  SUBMIT: "reasonSubmit",
  APPROVE: "reasonApprove",
  REJECT: "reasonReject",
};

export function AssessmentVersionHistory({
  organizationId,
  assessmentId,
}: {
  organizationId: string;
  assessmentId: string;
}) {
  const t = useTranslations("assessmentVersions");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: versions, isLoading } = trpc.assessment.listVersions.useQuery(
    { organizationId, assessmentId },
    { enabled: !!organizationId && !!assessmentId },
  );

  const { data: detail } = trpc.assessment.getVersion.useQuery(
    { organizationId, versionId: openId ?? "" },
    { enabled: !!openId },
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t("intro")}</p>

        {!versions || versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="border rounded-md">
                <button
                  type="button"
                  className="w-full text-left p-3 flex flex-wrap items-center gap-2 hover:bg-muted/40"
                  onClick={() => setOpenId(openId === v.id ? null : v.id)}
                >
                  <Badge variant="outline" className="text-[10px]">
                    v{v.version}
                  </Badge>
                  <span className="text-sm">{t(REASON_KEY[v.reason] ?? "reasonEdit")}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                  {v.authorName && (
                    <span className="text-xs text-muted-foreground">· {v.authorName}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    · {t("answered", { count: v.answered })}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                    {v.contentHash.slice(0, 12)}
                  </span>
                </button>

                {openId === v.id && (
                  <div className="border-t p-3 space-y-2">
                    <p className="text-[11px] text-muted-foreground font-mono break-all">
                      {t("hashLabel")}: {v.contentHash}
                    </p>
                    {!detail ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(
                          (detail.responses as Record<string, unknown>) ?? {},
                        ).length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("noAnswers")}</p>
                        ) : (
                          Object.entries((detail.responses as Record<string, unknown>) ?? {}).map(
                            ([key, value]) => (
                              <div key={key} className="text-xs">
                                <div className="text-muted-foreground font-mono">{key}</div>
                                <div className="whitespace-pre-wrap break-words">
                                  {typeof value === "string" ? value : JSON.stringify(value)}
                                </div>
                              </div>
                            ),
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {versions && versions.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setOpenId(null)} className="text-xs">
            {t("collapse")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
