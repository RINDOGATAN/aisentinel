// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * What a new AI system's form can honestly suggest from what the account already
 * holds.
 *
 * The rule of this module is the rule of the whole product: a suggestion states
 * where it came from, or it is not offered. Guessing that a system is a
 * "deployer" because most systems are would put a supply-chain role into a
 * regulated record on the strength of a hunch, so it is not done. Naming the
 * person registering the system as its owner, or copying the owner that the rest
 * of the registry already names, is derivation, and each one says so.
 *
 * Nothing here writes anything. The caller shows each suggestion beside its
 * field with its basis, and the value enters the form only when a person applies
 * it: a pre-filled field that is submitted without being read is a worse defect
 * than an empty one.
 *
 * Pure leaf module: no Prisma, no React.
 */

export type PrefillField =
  | "businessOwner"
  | "technicalOwner"
  | "role"
  | "processesPersonalData";

/** Why a suggestion is being made. The UI renders this, not a bare value. */
export type PrefillBasis =
  | "you-are-registering-it"
  | "most-of-your-systems"
  | "this-vendor-supplies-it"
  | "every-system-so-far";

export interface Suggestion {
  field: PrefillField;
  /** Always a string, so one renderer serves text fields and selects alike. */
  value: string;
  basis: PrefillBasis;
  /** Filled in for the bases that name something, e.g. a vendor's name. */
  subject?: string;
}

export interface PrefillContext {
  /** The person filling the form in, as they are known to the account. */
  currentUser: { name?: string | null; email?: string | null } | null;
  /**
   * Owner values already recorded across the organisation's systems, in no
   * particular order. Blanks are ignored by the caller before this point.
   */
  existingBusinessOwners: string[];
  existingTechnicalOwners: string[];
  /**
   * Whether every system recorded so far processes personal data, and how many
   * there are. One system is not a pattern.
   */
  systemsTotal: number;
  systemsProcessingPersonalData: number;
  /** The vendor selected in the form, when the account records one. */
  selectedVendor: { name: string } | null;
}

/** The commonest value, when one value holds a clear majority. */
function dominant(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const [best, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  // More than half, and at least two, or it is a coincidence rather than the
  // way this organisation names owners.
  return count >= 2 && count * 2 > total ? best : null;
}

/** How the current user should be named in an owner field. */
function userLabel(user: PrefillContext["currentUser"]): string | null {
  const name = user?.name?.trim();
  if (name) return name;
  const email = user?.email?.trim();
  return email || null;
}

/**
 * The suggestions for a new system, in the order the form shows its fields.
 * Never more than one per field: two competing suggestions for the same box is
 * an interface asking the person to do the deriving.
 */
export function suggestSystemFields(context: PrefillContext): Suggestion[] {
  const out: Suggestion[] = [];

  // ── Owners ──────────────────────────────────────────────────────────────
  // The way this organisation already names owners wins over "you": a registry
  // where nine systems name one team and the tenth names whoever clicked is a
  // registry nobody can query.
  const business = dominant(context.existingBusinessOwners);
  const technical = dominant(context.existingTechnicalOwners);
  const me = userLabel(context.currentUser);

  if (business) {
    out.push({ field: "businessOwner", value: business, basis: "most-of-your-systems" });
  } else if (me) {
    out.push({ field: "businessOwner", value: me, basis: "you-are-registering-it" });
  }

  if (technical) {
    out.push({ field: "technicalOwner", value: technical, basis: "most-of-your-systems" });
  } else if (me) {
    out.push({ field: "technicalOwner", value: me, basis: "you-are-registering-it" });
  }

  // ── The organisation's supply-chain role ────────────────────────────────
  // Only when a vendor supplies the system. Then the organisation is not the
  // one placing it on the market, which is what "deployer" means, and the
  // suggestion can name the vendor as its reason.
  if (context.selectedVendor) {
    out.push({
      field: "role",
      value: "DEPLOYER",
      basis: "this-vendor-supplies-it",
      subject: context.selectedVendor.name,
    });
  }

  // ── Personal data ───────────────────────────────────────────────────────
  // Only where every system recorded so far does, and there are enough of them
  // for that to mean something. A partial pattern is not evidence about a
  // system nobody has described yet.
  if (context.systemsTotal >= 3 && context.systemsProcessingPersonalData === context.systemsTotal) {
    out.push({ field: "processesPersonalData", value: "true", basis: "every-system-so-far" });
  }

  return out;
}
