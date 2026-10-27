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
import { Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CARD_HEADER_WITH_STATUS, CardSaveStatus } from "@/components/ui/save-status";
import { Instruction } from "@/components/ui/instruction";
import { trpc } from "@/lib/trpc";
import { refreshAfterScopeChange } from "@/lib/scope-refresh";
import { useAutoSave } from "@/lib/use-auto-save";
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
  const utils = trpc.useUtils();
  const { data: org } = trpc.organization.getById.useQuery({ organizationId });

  // Null means "untouched: show what the server has". The edit is kept after
  // it saves, so a tick made while the previous one is on its way is never
  // shown undone. Each tick saves on its own, as in Settings.
  const [edited, setEdited] = useState<JurisdictionId[] | null>(null);
  const saved = (org?.operatingJurisdictions ?? []) as JurisdictionId[];
  const selection = edited ?? saved;

  const save = trpc.organization.setJurisdictions.useMutation({
    onSuccess: () => refreshAfterScopeChange(utils),
  });
  const autosave = useAutoSave<JurisdictionId[]>(
    (jurisdictions) => save.mutateAsync({ organizationId, jurisdictions }),
    { delayMs: 500, onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) },
  );

  const declared = saved.length > 0;

  return (
    <Card data-testid="step-jurisdictions">
      <CardHeader className={CARD_HEADER_WITH_STATUS}>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" aria-hidden="true" />
          {tj("title")}
        </CardTitle>
        {canWrite && (
          <CardSaveStatus status={autosave.status} onRetry={autosave.retry} testId="step-jurisdictions-save-status" />
        )}
        <CardDescription>{tj("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {org && !declared && <Instruction tone="attention">{tj("undeclaredHint")}</Instruction>}
        <JurisdictionPicker
          value={selection}
          onChange={(next) => {
            setEdited(next);
            autosave.push(next);
          }}
          // Not before the saved places have loaded: a tick on the empty
          // picker would save that one place alone and drop the others.
          disabled={!canWrite || !org}
        />
      </CardContent>
    </Card>
  );
}
