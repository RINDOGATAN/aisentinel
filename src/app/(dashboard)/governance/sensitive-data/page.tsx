"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Sensitive data analyses: the list.
 *
 * Each row is a decision the organisation has taken, or is taking, about
 * whether a set of data is health data (or another sensitive category). The
 * band is shown next to the one the rule derived, because a considered
 * departure from the rule is legitimate and is worth seeing at a glance.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HeartPulse, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

const CATEGORIES = ["HEALTH", "BIOMETRIC", "PRECISE_LOCATION", "FINANCIAL", "OTHER"] as const;
type Category = (typeof CATEGORIES)[number];

const BAND_STYLE: Record<string, string> = {
  LOW: "border-success/50 text-success",
  MEDIUM: "border-warning/50 text-warning",
  HIGH: "border-destructive/50 text-destructive",
};

export default function SensitiveDataPage() {
  const t = useTranslations("sensitiveData");
  const router = useRouter();
  const { organization, canWrite } = useOrganization();
  const orgId = organization?.id ?? "";

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("HEALTH");
  const [creating, setCreating] = useState(false);

  const { data: rows, isLoading, refetch } = trpc.sensitiveData.list.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId },
  );

  const create = trpc.sensitiveData.create.useMutation({
    onSuccess: (row) => {
      setSubject("");
      void refetch();
      router.push(`/governance/sensitive-data/${row.id}`);
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setCreating(false),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-primary" />
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t("subtitle")}</p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-1.5">
          <p className="text-sm font-medium">{t("whyTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("whyBody")}</p>
        </CardContent>
      </Card>

      {canWrite && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-xs">
                  {t("subjectLabel")}
                </Label>
                <Input
                  id="subject"
                  placeholder={t("subjectPlaceholder")}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("categoryLabel")}</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`category.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!subject.trim() || creating}
                onClick={() => {
                  setCreating(true);
                  create.mutate({ organizationId: orgId, subject: subject.trim(), category });
                }}
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1.5" />
                )}
                {t("newAnalysis")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : !rows || rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("empty")}</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Link key={r.id} href={`/governance/sensitive-data/${r.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{r.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`category.${r.category}`)}
                      {r.aiSystem ? ` · ${r.aiSystem.name}` : ""}
                      {r.owner ? ` · ${r.owner}` : ""}
                    </p>
                  </div>
                  {r.band ? (
                    <Badge variant="outline" className={BAND_STYLE[r.band]}>
                      {t(`band.${r.band}`)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("noBand")}
                    </Badge>
                  )}
                  {r.band && r.band !== r.derived.band && (
                    <span className="text-[11px] text-muted-foreground">
                      {t("differsFromRule", { band: t(`band.${r.derived.band}`) })}
                    </span>
                  )}
                  <Badge variant={r.completedAt ? "default" : "outline"} className="text-[10px]">
                    {r.completedAt ? t("statusComplete") : t("statusOpen")}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
