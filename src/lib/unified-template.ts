// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The unified impact assessment writes one template per system, calibrated to
 * that system's scope (src/server/services/program/starter-artifacts.ts). It
 * belongs to that system's assessment, so it is not a general template to offer
 * when assessing another system.
 */
export const UNIFIED_TEMPLATE_REF = "Unified: EU AI Act Art. 27 / GDPR Art. 35 / CCPA ADMT / CO / TX / WA";

export function isPerSystemUnifiedTemplate(tpl: { frameworkRef?: string | null; isSystem?: boolean }): boolean {
  return !tpl.isSystem && (tpl.frameworkRef ?? "").startsWith("Unified:");
}
