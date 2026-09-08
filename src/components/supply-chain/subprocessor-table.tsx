"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Presentational list of a vendor's subprocessors. Shared by the catalog
 * detail page and the vendor risk detail page; the caller passes the
 * translated labels so each page keeps its own i18n namespace.
 */

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import type { Subprocessor } from "@/lib/supply-chain";

export interface SubprocessorRowData extends Subprocessor {
  /** Resolved catalog entry when `catalogVendorSlug` is set (optional). */
  catalog?: { slug: string; name: string; category: string } | null;
  /** The caller's own vendor record on this subprocessor, if any. */
  ownVendor?: { id: string; name: string; riskLevel?: string | null } | null;
}

export interface SubprocessorTableLabels {
  inCatalog: string;
  governed: string;
  notGoverned?: string;
  viewSource: string;
  showAll: (count: number) => string;
  showLess: string;
}

const COLLAPSED_LIMIT = 20;

export function SubprocessorTable({
  rows,
  labels,
  showGovernance = false,
}: {
  rows: SubprocessorRowData[];
  labels: SubprocessorTableLabels;
  showGovernance?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_LIMIT);

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-border/50 rounded-md border border-border/50">
        {visible.map((row) => {
          const slug = row.catalog?.slug ?? row.catalogVendorSlug;
          return (
            <li
              key={`${row.catalogVendorSlug ?? ""}|${row.name}`}
              className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5 bg-muted/20"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  {slug ? (
                    <Link
                      href={`/governance/vendor-catalog/${slug}`}
                      className="font-medium text-sm truncate hover:underline"
                    >
                      {row.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-sm truncate">{row.name}</span>
                  )}
                  {slug && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {labels.inCatalog}
                    </Badge>
                  )}
                </div>
                {row.purpose && (
                  <p className="text-xs text-muted-foreground truncate">{row.purpose}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {row.location && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {row.location}
                  </span>
                )}
                {showGovernance &&
                  (row.ownVendor ? (
                    <Link href={`/governance/vendors/${row.ownVendor.id}`}>
                      <Badge className="bg-success/20 text-success text-[10px] inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        {labels.governed}
                      </Badge>
                    </Link>
                  ) : (
                    slug &&
                    labels.notGoverned && (
                      <Badge variant="secondary" className="text-[10px]">
                        {labels.notGoverned}
                      </Badge>
                    )
                  ))}
                {row.sourceUrl && (
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    title={labels.viewSource}
                    aria-label={labels.viewSource}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length > COLLAPSED_LIMIT && (
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? labels.showLess : labels.showAll(rows.length)}
        </Button>
      )}
    </div>
  );
}
