"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Where the current organisation stands on the path. One query shared by the
 * menu, the phone bar and the next-step card (the query cache holds a single
 * copy), kept for half a minute so moving between pages does not ask again.
 */

import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import type { PathStatuses } from "./path";

const STALE_MS = 30_000;

export function useProgramPath(): PathStatuses | null {
  const { organization } = useOrganization();
  const { data } = trpc.programPath.status.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id, staleTime: STALE_MS, refetchOnWindowFocus: false },
  );
  return data?.steps ?? null;
}
