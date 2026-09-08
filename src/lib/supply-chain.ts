// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Vendor supply chain: subprocessor lists from the vendor catalog.
 *
 * vendor.watch ships each catalog vendor with a structured `subprocessors`
 * JSON array (name, purpose, location, source, sourceUrl, and when the
 * subprocessor is itself a catalog vendor, `catalogVendorSlug`). The column
 * is untyped Json and older rows have carried a JSON string or bare names,
 * so every reader goes through `parseSubprocessors` and never trusts the
 * shape. Pure functions — no DB, no network.
 */

export interface Subprocessor {
  name: string;
  purpose: string | null;
  location: string | null;
  source: string | null;
  sourceUrl: string | null;
  catalogVendorSlug: string | null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/** Tolerant reader for the catalog's `subprocessors` Json column. */
export function parseSubprocessors(raw: unknown): Subprocessor[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];

  const out: Subprocessor[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    let item: Subprocessor | null = null;
    if (typeof entry === "string") {
      const name = asString(entry);
      if (name) {
        item = { name, purpose: null, location: null, source: null, sourceUrl: null, catalogVendorSlug: null };
      }
    } else if (entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>;
      const name = asString(e.name);
      if (name) {
        item = {
          name,
          purpose: asString(e.purpose),
          location: asString(e.location),
          source: asString(e.source),
          sourceUrl: asString(e.sourceUrl),
          catalogVendorSlug: asString(e.catalogVendorSlug),
        };
      }
    }
    if (!item) continue;
    const key = subprocessorKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Identity of a subprocessor across vendors: the catalog slug when linked,
 * otherwise the normalised name. Two vendors listing "Amazon Web Services"
 * and "AWS" stay distinct; two listing the same slug collapse.
 */
export function subprocessorKey(sub: Pick<Subprocessor, "name" | "catalogVendorSlug">): string {
  if (sub.catalogVendorSlug) return `slug:${sub.catalogVendorSlug}`;
  return `name:${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
}

export interface SupplyChainSummary {
  total: number;
  linked: number;
  locations: { location: string; count: number }[];
}

export function summarizeSupplyChain(subs: Subprocessor[]): SupplyChainSummary {
  const byLocation = new Map<string, number>();
  let linked = 0;
  for (const s of subs) {
    if (s.catalogVendorSlug) linked += 1;
    if (s.location) byLocation.set(s.location, (byLocation.get(s.location) ?? 0) + 1);
  }
  const locations = [...byLocation.entries()]
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location));
  return { total: subs.length, linked, locations };
}

export interface PortfolioVendor {
  id: string;
  name: string;
  catalogSlug: string | null;
  subprocessors: unknown;
}

export interface SharedSubprocessor {
  key: string;
  name: string;
  catalogVendorSlug: string | null;
  dependents: { id: string; name: string }[];
}

/**
 * Concentration across an organisation's vendor portfolio: which
 * subprocessors sit under more than one of its vendors. Sorted by number
 * of dependents, then name. A vendor never counts as its own dependent.
 */
export function computeSharedSubprocessors(vendors: PortfolioVendor[]): SharedSubprocessor[] {
  const map = new Map<string, SharedSubprocessor>();
  for (const vendor of vendors) {
    const seenHere = new Set<string>();
    for (const sub of parseSubprocessors(vendor.subprocessors)) {
      if (sub.catalogVendorSlug && sub.catalogVendorSlug === vendor.catalogSlug) continue;
      const key = subprocessorKey(sub);
      if (seenHere.has(key)) continue;
      seenHere.add(key);
      const existing = map.get(key);
      if (existing) {
        existing.dependents.push({ id: vendor.id, name: vendor.name });
      } else {
        map.set(key, {
          key,
          name: sub.name,
          catalogVendorSlug: sub.catalogVendorSlug,
          dependents: [{ id: vendor.id, name: vendor.name }],
        });
      }
    }
  }
  return [...map.values()]
    .sort(
      (a, b) =>
        b.dependents.length - a.dependents.length || a.name.localeCompare(b.name),
    );
}
