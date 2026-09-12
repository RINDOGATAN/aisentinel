"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Legal holds, in settings.
 *
 * While a hold is in force nothing in its scope can be deleted and the export
 * snapshots stop being pruned. Placing and releasing both require a written
 * reason, and both are audited.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Gavel, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

const HOLD_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

export function LegalHoldCard({
  organizationId,
  userRole,
}: {
  organizationId: string;
  userRole: string | null;
}) {
  const t = useTranslations("legalHold");
  const utils = trpc.useUtils();
  const mayHold = userRole !== null && HOLD_ROLES.includes(userRole);

  const [matter, setMatter] = useState("");
  const [reason, setReason] = useState("");
  const [releasing, setReleasing] = useState<string | null>(null);
  const [releaseReason, setReleaseReason] = useState("");

  const { data: holds, isLoading } = trpc.legalHold.list.useQuery(
    { organizationId, includeReleased: true },
    { enabled: !!organizationId },
  );

  const place = trpc.legalHold.place.useMutation({
    onSuccess: () => {
      toast.success(t("placed"));
      setMatter("");
      setReason("");
      void utils.legalHold.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const release = trpc.legalHold.release.useMutation({
    onSuccess: () => {
      toast.success(t("released"));
      setReleasing(null);
      setReleaseReason("");
      void utils.legalHold.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const active = (holds ?? []).filter((h) => !h.releasedAt);
  const past = (holds ?? []).filter((h) => h.releasedAt);

  return (
    <Card className={active.length > 0 ? "border-warning/50" : undefined}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gavel className="w-4 h-4 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noneActive")}</p>
            ) : (
              <div className="space-y-2">
                {active.map((h) => (
                  <div key={h.id} className="border rounded-md p-3 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-warning text-warning text-[10px]">
                        {t("inForce")}
                      </Badge>
                      <span className="text-sm font-medium">{h.matter}</span>
                      <span className="text-xs text-muted-foreground">
                        {h.aiSystem ? t("scopeSystem", { name: h.aiSystem.name }) : t("scopeOrg")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{h.reason}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("placedBy", {
                        who: h.issuedByName ?? "—",
                        when: new Date(h.issuedAt).toLocaleDateString(),
                      })}
                    </p>

                    {mayHold &&
                      (releasing === h.id ? (
                        <div className="space-y-2 pt-1">
                          <Textarea
                            rows={2}
                            placeholder={t("releaseReasonPlaceholder")}
                            value={releaseReason}
                            onChange={(e) => setReleaseReason(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!releaseReason.trim() || release.isPending}
                              onClick={() =>
                                release.mutate({
                                  organizationId,
                                  id: h.id,
                                  releaseReason: releaseReason.trim(),
                                })
                              }
                            >
                              {release.isPending && (
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                              )}
                              {t("confirmRelease")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReleasing(null);
                                setReleaseReason("");
                              }}
                            >
                              {t("cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setReleasing(h.id)}>
                          {t("release")}
                        </Button>
                      ))}
                  </div>
                ))}
              </div>
            )}

            {mayHold && (
              <div className="space-y-2 border-t pt-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="hold-matter">
                      {t("matter")}
                    </Label>
                    <Input
                      id="hold-matter"
                      value={matter}
                      onChange={(e) => setMatter(e.target.value)}
                      placeholder={t("matterPlaceholder")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="hold-reason">
                    {t("reason")}
                  </Label>
                  <Textarea
                    id="hold-reason"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("reasonPlaceholder")}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!matter.trim() || !reason.trim() || place.isPending}
                  onClick={() =>
                    place.mutate({
                      organizationId,
                      matter: matter.trim(),
                      reason: reason.trim(),
                    })
                  }
                >
                  {place.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  {t("place")}
                </Button>
                <p className="text-[11px] text-muted-foreground">{t("effect")}</p>
              </div>
            )}

            {past.length > 0 && (
              <div className="border-t pt-3 space-y-1.5">
                <p className="text-xs font-medium">{t("pastTitle")}</p>
                {past.map((h) => (
                  <p key={h.id} className="text-[11px] text-muted-foreground">
                    {h.matter} ·{" "}
                    {t("releasedBy", {
                      who: h.releasedByName ?? "—",
                      when: h.releasedAt ? new Date(h.releasedAt).toLocaleDateString() : "—",
                    })}
                    {h.releaseReason ? ` · ${h.releaseReason}` : ""}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
