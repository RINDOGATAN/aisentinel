"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The program overview for the current organisation: every document of the
 * register with its state, what needs action, the deadlines at risk and the
 * drafts waiting for a person (programPath.overview). One query shared by the
 * Guided menu (its document lines and state words) and the dashboard (the
 * documents panel, the area tiles, the next actions), so both show the same
 * answer.
 *
 * It sits under `programPath`, so the refresh the Guided layout already runs
 * after every change (useProgramPathRefresh) refreshes it too.
 */

import { useLocale } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import type { EvaluatedDocument } from "@/config/document-register";
import type { NeedsActionItem } from "@/lib/needs-action";
import type { RecordDeadline } from "@/lib/programme-overview";

const STALE_MS = 30_000;

export interface ProgrammeOverview {
  documents: EvaluatedDocument[];
  needsAction: NeedsActionItem[];
  deadlines: RecordDeadline[];
  /** Drafted items waiting for a person to confirm them (the review queue). */
  drafts: number;
}

/**
 * Null while loading, and for a member limited to departments (`limited`
 * true: the figures are the whole organisation's, so none are shown).
 */
export function useProgrammeOverview(): {
  overview: ProgrammeOverview | null;
  limited: boolean;
  refreshing: boolean;
} {
  const { organization } = useOrganization();
  const locale = useLocale() === "es" ? "es" : "en";
  const { data, isFetching } = trpc.programPath.overview.useQuery(
    { organizationId: organization?.id ?? "", locale },
    { enabled: !!organization?.id, staleTime: STALE_MS, refetchOnWindowFocus: false },
  );
  if (!data || data.limited) return { overview: null, limited: !!data?.limited, refreshing: isFetching };
  return {
    overview: {
      documents: data.documents,
      needsAction: data.needsAction,
      deadlines: data.deadlines,
      drafts: data.drafts,
    },
    limited: false,
    refreshing: isFetching,
  };
}
