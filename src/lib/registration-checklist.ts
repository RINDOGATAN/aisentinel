// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The registration checklist shown at the top of each AI system.
 *
 * The required items are exactly the completeness rule
 * (src/lib/registration-completeness.ts), so the checklist, the "Incomplete"
 * list and the registry filter always agree on whether a system is complete.
 * Three further items describe how the system is built and what data it uses:
 * they are recommended, never required, and do not make a system incomplete.
 *
 * Each item names where it is filled in, so a missing item can be a link.
 */

import {
  missingRegistrationFields,
  REGISTRATION_FIELDS,
  type RegistrationField,
  type RegistrationSubject,
} from "./registration-completeness";

export const RECOMMENDED_ITEMS = ["models", "dataSources", "dataFlow"] as const;
export type RecommendedItem = (typeof RECOMMENDED_ITEMS)[number];
export type ChecklistItemId = RegistrationField | RecommendedItem;

/** Where an item is filled in: the edit form, or a tab on the system's page. */
export type ChecklistTarget = "edit" | "risk" | "models" | "data-sources" | "data-flow";

export interface ChecklistItem {
  id: ChecklistItemId;
  done: boolean;
  required: boolean;
  /** Required, but done in a later step of the path (the risk level). */
  later: boolean;
  target: ChecklistTarget;
}

export interface ChecklistSubject extends RegistrationSubject {
  models: number;
  dataSources: number;
  dataRecipients: number;
}

export interface RegistrationChecklist {
  items: ChecklistItem[];
  done: number;
  total: number;
  requiredDone: number;
  requiredTotal: number;
  /** Every required item is done: the completeness rule holds. */
  complete: boolean;
}

const TARGETS: Record<ChecklistItemId, ChecklistTarget> = {
  description: "edit",
  purpose: "edit",
  businessOwner: "edit",
  technicalOwner: "edit",
  riskClassification: "risk",
  models: "models",
  dataSources: "data-sources",
  dataFlow: "data-flow",
};

export function registrationChecklist(subject: ChecklistSubject): RegistrationChecklist {
  const missing = new Set<RegistrationField>(missingRegistrationFields(subject));
  const required: ChecklistItem[] = REGISTRATION_FIELDS.map((id) => ({
    id,
    done: !missing.has(id),
    required: true,
    later: id === "riskClassification",
    target: TARGETS[id],
  }));
  const recommendedDone: Record<RecommendedItem, boolean> = {
    models: subject.models > 0,
    dataSources: subject.dataSources > 0,
    dataFlow: subject.dataRecipients > 0,
  };
  const recommended: ChecklistItem[] = RECOMMENDED_ITEMS.map((id) => ({
    id,
    done: recommendedDone[id],
    required: false,
    later: false,
    target: TARGETS[id],
  }));
  const items = [...required, ...recommended];
  const requiredDone = required.filter((i) => i.done).length;
  return {
    items,
    done: items.filter((i) => i.done).length,
    total: items.length,
    requiredDone,
    requiredTotal: required.length,
    complete: requiredDone === required.length,
  };
}
