// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// The one filter vocabulary for a list of AI systems, and the pure rules that
// turn a filter set into Prisma conditions. The registry page, the saved-view
// chips and the `aiSystem.list` query all speak this vocabulary, so a view is
// the same thing whether it lives in the URL, in a saved row or in a query.
//
// Every rule here is pure and returns plain condition objects, so the meaning of
// each filter is tested without a database (src/lib/system-views.test.ts). The
// router spreads the conditions into an AND alongside the org guard and the
// department scope, which are added by trusted server code, never by a filter.

import type { Prisma } from "@prisma/client";
import { JURISDICTION_IDS, type JurisdictionId } from "@/config/jurisdictions";
import { LIST_SORTS, type ListSort, isListSort } from "@/lib/list-sort";
import { REGISTRATION_STRING_FIELDS } from "@/lib/registration-completeness";

export const STAGE_OPTIONS = ["DRAFT", "DEVELOPMENT", "TESTING", "DEPLOYED", "RETIRED"] as const;
export type SystemStage = (typeof STAGE_OPTIONS)[number];

export const SYSTEM_ROLE_OPTIONS = ["PROVIDER", "DEPLOYER", "IMPORTER", "DISTRIBUTOR", "USER"] as const;
export type SystemRoleFilter = (typeof SYSTEM_ROLE_OPTIONS)[number];

export const RISK_LEVEL_OPTIONS = ["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL"] as const;
/// The risk filter adds "none" for systems that have never been classified.
export const RISK_FILTER_OPTIONS = [...RISK_LEVEL_OPTIONS, "none"] as const;
export type RiskFilter = (typeof RISK_FILTER_OPTIONS)[number];

export const REGISTRATION_FILTER_OPTIONS = ["complete", "incomplete"] as const;
export type RegistrationFilter = (typeof REGISTRATION_FILTER_OPTIONS)[number];

export const ASSESSMENT_FILTER_OPTIONS = ["none", "in_progress", "approved"] as const;
export type AssessmentFilter = (typeof ASSESSMENT_FILTER_OPTIONS)[number];

/// The value the department filter uses for "no department assigned".
export const UNASSIGNED_DEPARTMENT = "unassigned";

export interface SystemViewFilters {
  /// Free text matched against the business and technical owner.
  owner?: string;
  /// A business unit id, or UNASSIGNED_DEPARTMENT for systems with no department.
  businessUnitId?: string;
  /// A jurisdiction the system operates in (its effective set).
  region?: JurisdictionId;
  stage?: SystemStage;
  registration?: RegistrationFilter;
  risk?: RiskFilter;
  role?: SystemRoleFilter;
  assessment?: AssessmentFilter;
  /// Free text matched against name, description and purpose.
  search?: string;
  sort?: ListSort;
}

/// The URL query-parameter name for each filter. Short, stable and shareable.
const PARAM: Record<keyof SystemViewFilters, string> = {
  owner: "owner",
  businessUnitId: "dept",
  region: "region",
  stage: "stage",
  registration: "reg",
  risk: "risk",
  role: "role",
  assessment: "assess",
  search: "q",
  sort: "sort",
};

function inSet<T extends string>(value: string | null | undefined, set: readonly T[]): value is T {
  return value != null && (set as readonly string[]).includes(value);
}

/// Read a filter set out of URL search params. Unknown or malformed values are
/// dropped rather than trusted, so a hand-edited URL can never inject a value
/// the vocabulary does not contain.
export function parseSystemViewFilters(params: URLSearchParams): SystemViewFilters {
  const filters: SystemViewFilters = {};
  const owner = params.get(PARAM.owner)?.trim();
  if (owner) filters.owner = owner;
  const dept = params.get(PARAM.businessUnitId)?.trim();
  if (dept) filters.businessUnitId = dept;
  const region = params.get(PARAM.region);
  if (inSet(region, JURISDICTION_IDS)) filters.region = region;
  const stage = params.get(PARAM.stage);
  if (inSet(stage, STAGE_OPTIONS)) filters.stage = stage;
  const registration = params.get(PARAM.registration);
  if (inSet(registration, REGISTRATION_FILTER_OPTIONS)) filters.registration = registration;
  const risk = params.get(PARAM.risk);
  if (inSet(risk, RISK_FILTER_OPTIONS)) filters.risk = risk;
  const role = params.get(PARAM.role);
  if (inSet(role, SYSTEM_ROLE_OPTIONS)) filters.role = role;
  const assessment = params.get(PARAM.assessment);
  if (inSet(assessment, ASSESSMENT_FILTER_OPTIONS)) filters.assessment = assessment;
  const search = params.get(PARAM.search)?.trim();
  if (search) filters.search = search;
  const sort = params.get(PARAM.sort);
  if (isListSort(sort)) filters.sort = sort;
  return filters;
}

/// Serialize a filter set into URL search params, dropping empties so a plain
/// list has a clean URL. `sort` is only written when it is not the default the
/// caller passes, to keep the common case tidy.
export function serializeSystemViewFilters(
  filters: SystemViewFilters,
  opts: { defaultSort?: ListSort } = {},
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.owner) params.set(PARAM.owner, filters.owner);
  if (filters.businessUnitId) params.set(PARAM.businessUnitId, filters.businessUnitId);
  if (filters.region) params.set(PARAM.region, filters.region);
  if (filters.stage) params.set(PARAM.stage, filters.stage);
  if (filters.registration) params.set(PARAM.registration, filters.registration);
  if (filters.risk) params.set(PARAM.risk, filters.risk);
  if (filters.role) params.set(PARAM.role, filters.role);
  if (filters.assessment) params.set(PARAM.assessment, filters.assessment);
  if (filters.search) params.set(PARAM.search, filters.search);
  if (filters.sort && filters.sort !== (opts.defaultSort ?? "newest")) {
    params.set(PARAM.sort, filters.sort);
  }
  return params;
}

/// True when no filter narrows the list (a plain, unfiltered view). `sort` is
/// not a narrowing filter, so it is ignored here.
export function isEmptyFilterSet(filters: SystemViewFilters): boolean {
  return (
    !filters.owner &&
    !filters.businessUnitId &&
    !filters.region &&
    !filters.stage &&
    !filters.registration &&
    !filters.risk &&
    !filters.role &&
    !filters.assessment &&
    !filters.search
  );
}

/// How many filters are active (for a chip count). `search` counts; `sort` does not.
export function activeFilterCount(filters: SystemViewFilters): number {
  return [
    filters.owner,
    filters.businessUnitId,
    filters.region,
    filters.stage,
    filters.registration,
    filters.risk,
    filters.role,
    filters.assessment,
    filters.search,
  ].filter(Boolean).length;
}

/// A where that can never match a row. Used when a filter is asking for
/// something structurally impossible (e.g. a region outside the org's declared
/// set), so the list is honestly empty rather than silently ignoring the filter.
const MATCH_NOTHING: Prisma.AISystemWhereInput = { id: { in: [] } };

function registrationConditions(value: RegistrationFilter): Prisma.AISystemWhereInput {
  if (value === "incomplete") {
    return {
      OR: [
        ...REGISTRATION_STRING_FIELDS.map((field) => ({
          OR: [{ [field]: null }, { [field]: "" }],
        })),
        { riskClassification: { is: null } },
      ] as Prisma.AISystemWhereInput[],
    };
  }
  // complete: every required string field present and non-blank, and a
  // classification exists.
  return {
    AND: [
      ...REGISTRATION_STRING_FIELDS.map((field) => ({
        AND: [{ [field]: { not: null } }, { NOT: { [field]: "" } }],
      })),
      { riskClassification: { isNot: null } },
    ] as Prisma.AISystemWhereInput[],
  };
}

function assessmentConditions(value: AssessmentFilter): Prisma.AISystemWhereInput {
  switch (value) {
    case "none":
      return { assessments: { none: {} } };
    case "approved":
      return { assessments: { some: { status: "APPROVED" } } };
    case "in_progress":
      return {
        AND: [{ assessments: { some: {} } }, { assessments: { none: { status: "APPROVED" } } }],
      };
  }
}

function regionConditions(
  region: JurisdictionId,
  orgJurisdictions: readonly JurisdictionId[],
): Prisma.AISystemWhereInput {
  // A system's effective jurisdictions are the org set (when its override is
  // empty) or the intersection of the org set and its override. Either way the
  // effective set is a subset of the org set, so a region the org has not
  // declared can never be in force for any system.
  if (!orgJurisdictions.includes(region)) return MATCH_NOTHING;
  return {
    OR: [{ jurisdictionOverride: { isEmpty: true } }, { jurisdictionOverride: { has: region } }],
  };
}

/**
 * Turn a filter set into a list of Prisma conditions, all AND-ed. The org guard
 * and the department scope are added by the router, not here; this function only
 * ever narrows, and never widens, what a query returns.
 */
export function buildSystemFilterConditions(
  filters: SystemViewFilters,
  opts: { orgJurisdictions: readonly JurisdictionId[] },
): Prisma.AISystemWhereInput[] {
  const conditions: Prisma.AISystemWhereInput[] = [];

  if (filters.search) {
    conditions.push({
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { purpose: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }
  if (filters.owner) {
    conditions.push({
      OR: [
        { businessOwner: { contains: filters.owner, mode: "insensitive" } },
        { technicalOwner: { contains: filters.owner, mode: "insensitive" } },
      ],
    });
  }
  if (filters.businessUnitId) {
    conditions.push(
      filters.businessUnitId === UNASSIGNED_DEPARTMENT
        ? { businessUnitId: null }
        : { businessUnitId: filters.businessUnitId },
    );
  }
  if (filters.region) {
    conditions.push(regionConditions(filters.region, opts.orgJurisdictions));
  }
  if (filters.stage) conditions.push({ status: filters.stage });
  if (filters.role) conditions.push({ role: filters.role });
  if (filters.risk) {
    conditions.push(
      filters.risk === "none"
        ? { riskClassification: { is: null } }
        : { riskClassification: { riskLevel: filters.risk } },
    );
  }
  if (filters.registration) conditions.push(registrationConditions(filters.registration));
  if (filters.assessment) conditions.push(assessmentConditions(filters.assessment));

  return conditions;
}

export { LIST_SORTS };
