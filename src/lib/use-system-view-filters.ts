"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// The registry's filters live in the URL, so a view can be shared and bookmarked
// exactly as the person left it. This hook reads the filter set out of the query
// string and writes it back, using router.replace so filtering never floods the
// browser history. The vocabulary and the parsing rules are in
// src/lib/system-views.ts; this is only the URL binding.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  parseSystemViewFilters,
  serializeSystemViewFilters,
  type SystemViewFilters,
} from "@/lib/system-views";

export function useSystemViewFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseSystemViewFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const applyAll = useCallback(
    (next: SystemViewFilters) => {
      const qs = serializeSystemViewFilters(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const setFilter = useCallback(
    <K extends keyof SystemViewFilters>(key: K, value: SystemViewFilters[K]) => {
      const next: SystemViewFilters = { ...filters };
      if (value === undefined || value === null || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      applyAll(next);
    },
    [filters, applyAll],
  );

  // Clearing keeps the sort, which is a preference rather than a filter.
  const clearAll = useCallback(() => {
    applyAll(filters.sort ? { sort: filters.sort } : {});
  }, [applyAll, filters.sort]);

  return { filters, setFilter, applyAll, clearAll };
}
