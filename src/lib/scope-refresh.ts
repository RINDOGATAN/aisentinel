// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What to read again after the organisation's scope changes: the places it
 * operates in, the applicability answers, a screening answer, or a fact on
 * one system that the scope rules read.
 *
 * Each of those changes which laws and frameworks reach each system, and the
 * server brings the requirement rows in line in the same request
 * (src/server/services/scope/sync-requirements.ts). Every screen that shows
 * the result has to ask again: the "these apply" list, the obligations
 * calendar, the framework tabs and counts of the evidence matrix, the menu,
 * the program report and the dashboard. Queries are kept for half a minute
 * (src/components/providers.tsx), so a screen not asked again would show the
 * old scope when opened right after the change.
 *
 * One list, used by every card that saves a scope answer, so no card can
 * forget one of them.
 */

import type { trpc } from "@/lib/trpc";

type Utils = ReturnType<typeof trpc.useUtils>;

export function refreshAfterScopeChange(utils: Utils): void {
  void utils.organization.getById.invalidate();
  void utils.organization.getDashboardStats.invalidate();
  void utils.programPath.invalidate();
  void utils.program.invalidate();
  void utils.obligations.invalidate();
  void utils.regimes.invalidate();
  void utils.admt.invalidate();
  void utils.compliance.invalidate();
  void utils.unified.invalidate();
  void utils.chatbotOverlay.invalidate();
}
