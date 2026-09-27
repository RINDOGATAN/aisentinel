// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// What makes a system's registration complete, in one place. The "Incomplete"
// list uses this to show a person exactly what is missing, and the registry's
// "registration" filter uses the same field list, so the two can never disagree
// about which systems are incomplete.
//
// A system is registered when a person has said what it is (description and
// purpose), who owns it (a business and a technical owner) and how risky it is
// (a risk classification exists). Name, technique, role and status are required
// at creation, so they are always present and are not re-checked here.

/// The required string columns on AISystem. Each key is both the field name and
/// an i18n key under `registration.field.*`.
export const REGISTRATION_STRING_FIELDS = [
  "description",
  "purpose",
  "businessOwner",
  "technicalOwner",
] as const;

export type RegistrationStringField = (typeof REGISTRATION_STRING_FIELDS)[number];

/// The one required relation: a risk classification. Its own i18n key sits
/// alongside the string fields under `registration.field.riskClassification`.
export const REGISTRATION_RISK_FIELD = "riskClassification" as const;

/// Every registration field, in the order shown to a person.
export const REGISTRATION_FIELDS = [
  ...REGISTRATION_STRING_FIELDS,
  REGISTRATION_RISK_FIELD,
] as const;

export type RegistrationField = (typeof REGISTRATION_FIELDS)[number];

/// The shape the completeness check reads. A partial of the system row plus
/// whether a risk classification exists; callers pass what they have.
export interface RegistrationSubject {
  description?: string | null;
  purpose?: string | null;
  businessOwner?: string | null;
  technicalOwner?: string | null;
  /// True when the system has a risk classification. Callers derive this from
  /// the relation (e.g. `!!system.riskClassification`).
  hasRiskClassification: boolean;
}

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

/// The registration fields still missing on this system, in display order.
/// Empty means the registration is complete.
export function missingRegistrationFields(
  subject: RegistrationSubject,
): RegistrationField[] {
  const missing: RegistrationField[] = [];
  for (const field of REGISTRATION_STRING_FIELDS) {
    if (isBlank(subject[field])) missing.push(field);
  }
  if (!subject.hasRiskClassification) missing.push(REGISTRATION_RISK_FIELD);
  return missing;
}

/// True when nothing is missing.
export function isRegistrationComplete(subject: RegistrationSubject): boolean {
  return missingRegistrationFields(subject).length === 0;
}
