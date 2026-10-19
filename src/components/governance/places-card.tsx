"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Where the organisation operates, on step 1.2's own page: the same picker
 * and the same mutation as the card in Settings, so an answer given in
 * either place is the one answer the regime rules read.
 *
 * Until places are declared, regulatory scoping can only say "we cannot tell
 * yet", so an undeclared organisation gets a plain prompt rather than a
 * silently empty state.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, Globe, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { JurisdictionPicker } from "@/components/governance/jurisdiction-picker";
import type { JurisdictionId } from "@/config/jurisdictions";

export function PlacesCard({
  organizationId,
  canWrite,
}: {
  organizationId: string;
  canWrite: boolean;
}) {
  const tj = useTranslations("jurisdictions");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const { data: org } = trpc.organization.getById.useQuery({ organizationId });

  // Null means "untouched: show what the server has". Derived rather than
  // synced into an effect, so the two never fight after a save.
  const [edited, setEdited] = useState<JurisdictionId[] | null>(null);
  const saved = (org?.operatingJurisdictions ?? []) as JurisdictionId[];
  const selection = edited ?? saved;
  const dirty = edited !== null;

  const save = trpc.organization.setJurisdictions.useMutation({
    onSuccess: () => {
      setEdited(null);
      toast.success(tj("saved"));
      void utils.organization.getById.invalidate();
      void utils.organization.getDashboardStats.invalidate();
      void utils.obligations.getObligations.invalidate();
      void utils.regimes.getApplicability.invalidate();
      void utils.admt.getOrgScope.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const declared = saved.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" aria-hidden="true" />
          {tj("title")}
        </CardTitle>
        <CardDescription>{tj("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {org && !declared && (
          <div className="flex items-start gap-2 rounded-md border border-warning bg-warning/10 p-3 text-foreground">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">{tj("undeclaredHint")}</p>
          </div>
        )}
        <JurisdictionPicker value={selection} onChange={setEdited} disabled={!canWrite || save.isPending} />
        {canWrite && (
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate({ organizationId, jurisdictions: selection })}
            >
              {save.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              {tc("save")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
