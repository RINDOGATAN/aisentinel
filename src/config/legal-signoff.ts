// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Legal sign-off status for each pack of regulatory content.
 *
 * One source of truth, so a marker can never drift from the fact. Every pack
 * that renders a review marker reads it from here, and the generated documents
 * state the status of the content they actually cite.
 *
 * `basis` is deliberately part of the record. A sign-off is only as good as
 * what it rests on, and a reader of an exported document is entitled to know
 * whether the content was read line by line or confirmed as a body. Recording
 * "confirmed as a body" honestly is worth more than a claim nobody can stand
 * behind.
 */

import type { Localized } from "@/config/lawfirm-ai-toolkit";

export type SignoffStatus = "signed-off" | "pending";

export interface SignoffRecord {
  status: SignoffStatus;
  /** The date the content was last reviewed against source. */
  lawReviewedAsOf: string;
  /** Who confirmed it. A role where no name was recorded. */
  confirmedBy?: string;
  /** When they confirmed it. */
  confirmedAt?: string;
  /** How the confirmation was made. Shown in the marker. */
  basis?: Localized;
}

const OWNER_CONFIRMED: Localized = {
  en: "confirmed as a body by the product owner after sampling the sign-off review",
  es: "confirmado en bloque por el responsable del producto tras revisar una muestra en la consola de validación",
};

/** Keyed by content pack. */
export const LEGAL_SIGNOFF: Record<string, SignoffRecord> = {
  EU_GDPR: {
    status: "signed-off",
    lawReviewedAsOf: "2026-09-08",
    confirmedBy: "Product owner",
    confirmedAt: "2026-09-08",
    basis: OWNER_CONFIRMED,
  },
  CO_SB_26_189: {
    status: "signed-off",
    lawReviewedAsOf: "2026-09-08",
    confirmedBy: "Product owner",
    confirmedAt: "2026-09-08",
    basis: OWNER_CONFIRMED,
  },
  TX_TRAIGA: {
    status: "signed-off",
    lawReviewedAsOf: "2026-09-08",
    confirmedBy: "Product owner",
    confirmedAt: "2026-09-08",
    basis: OWNER_CONFIRMED,
  },
  WA_AI_RULES: {
    status: "signed-off",
    lawReviewedAsOf: "2026-09-08",
    confirmedBy: "Product owner",
    confirmedAt: "2026-09-08",
    basis: OWNER_CONFIRMED,
  },
  UNIFIED_ASSESSMENT: {
    status: "signed-off",
    lawReviewedAsOf: "2026-09-08",
    confirmedBy: "Product owner",
    confirmedAt: "2026-09-08",
    basis: OWNER_CONFIRMED,
  },
  AGENTIC_STRESS_TEST: {
    status: "signed-off",
    lawReviewedAsOf: "2026-09-08",
    confirmedBy: "Product owner",
    confirmedAt: "2026-09-08",
    basis: OWNER_CONFIRMED,
  },
  // Not part of the sign-off console, so still pending on their own terms.
  CA_CCPA_ADMT: { status: "pending", lawReviewedAsOf: "2026-08-21" },
  EU_AI_ACT: { status: "pending", lawReviewedAsOf: "2026-08-05" },
};

/** The marker a pack renders under its content. */
export function signoffMarker(packId: string): Localized {
  const record = LEGAL_SIGNOFF[packId];
  if (!record) {
    return {
      en: "Legal sign-off status not recorded for this content.",
      es: "No consta la situación de validación jurídica de este contenido.",
    };
  }
  const reviewed = record.lawReviewedAsOf;
  if (record.status === "pending") {
    return {
      en: `Law reviewed as of ${reviewed}; legal sign-off pending.`,
      es: `Revisión jurídica a fecha de ${reviewed}; pendiente de validación jurídica.`,
    };
  }
  const by = record.confirmedBy ?? "the product owner";
  const at = record.confirmedAt ?? reviewed;
  const basis = record.basis;
  return {
    en: `Law reviewed as of ${reviewed}. Signed off ${at} by ${by}${basis ? `, ${basis.en}` : ""}.`,
    es: `Revisión jurídica a fecha de ${reviewed}. Validado el ${at} por ${by}${basis ? `, ${basis.es}` : ""}.`,
  };
}

/** True when every pack a document cites has been signed off. */
export function allSignedOff(packIds: readonly string[]): boolean {
  return packIds.every((id) => LEGAL_SIGNOFF[id]?.status === "signed-off");
}

/** The packs still pending, for a document to name rather than imply. */
export function pendingPacks(packIds: readonly string[]): string[] {
  return packIds.filter((id) => LEGAL_SIGNOFF[id]?.status !== "signed-off");
}
