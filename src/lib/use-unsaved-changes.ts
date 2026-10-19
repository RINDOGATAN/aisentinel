"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useEffect, useId } from "react";
import { useTranslations } from "next-intl";
import { installUnsavedListeners, setUnsaved } from "@/lib/unsaved-changes";

/**
 * Warn before leaving the page while `dirty` is true (typed text not yet
 * saved). Call it in any form that needs typing; see `unsaved-changes.ts`.
 */
export function useUnsavedChangesWarning(dirty: boolean): void {
  const id = useId();
  const t = useTranslations("autosave");
  const warning = t("leaveWarning");

  useEffect(() => {
    installUnsavedListeners();
  }, []);

  useEffect(() => {
    setUnsaved(id, dirty, warning);
    return () => setUnsaved(id, false);
  }, [id, dirty, warning]);
}
