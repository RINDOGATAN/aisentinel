"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { frameworksData, isUnderReview } from "@/lib/frameworks/model";
import { CellDetail, type CellRef } from "./cell-detail";
import { DepthChip, UnderReviewTag } from "./depth";

type SortKey = "name" | string;

export function FrameworksTable() {
  const t = useTranslations("docs.frameworks");
  const { frameworks: F, rings: R } = frameworksData;
  const [sort, setSort] = useState<{ key: SortKey | null; dir: 1 | -1 }>({ key: null, dir: 1 });
  const [selected, setSelected] = useState<CellRef | null>(null);

  const rows = useMemo(() => {
    const out = F.slice();
    if (sort.key === "name") out.sort((a, b) => sort.dir * a.name.localeCompare(b.name));
    else if (sort.key) {
      const k = sort.key;
      out.sort((a, b) => sort.dir * (a.cells[k].depth - b.cells[k].depth) || a.name.localeCompare(b.name));
    }
    return out;
  }, [F, sort]);

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 }));

  const ariaSort = (key: SortKey) =>
    sort.key === key ? (sort.dir > 0 ? "ascending" : "descending") : "none";

  const sortIcon = (k: SortKey) => {
    const props = { className: "inline h-3 w-3 ml-1 text-muted-foreground", "aria-hidden": true } as const;
    if (sort.key !== k) return <ArrowUpDown {...props} />;
    return sort.dir > 0 ? <ArrowUp {...props} /> : <ArrowDown {...props} />;
  };

  return (
    <div className="space-y-3 min-w-0">
      <p className="text-sm text-muted-foreground">{t("table.help")}</p>
      <div className="max-h-[75vh] w-full max-w-full min-w-0 overflow-auto rounded-xl border border-border bg-card">
        <table className="border-separate border-spacing-0 text-xs" data-testid="frameworks-table">
          <caption className="sr-only">{t("table.caption")}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                aria-sort={ariaSort("name")}
                className="sticky left-0 top-0 z-30 min-w-[9rem] border-b border-border bg-secondary p-0 text-left"
              >
                <button type="button" onClick={() => sortBy("name")} className="w-full px-2 py-2 text-left font-semibold">
                  {t("table.framework")}
                  {sortIcon("name")}
                </button>
              </th>
              {R.map((r) => (
                <th
                  key={r.id}
                  scope="col"
                  aria-sort={ariaSort(r.id)}
                  title={r.question}
                  className="sticky top-0 z-20 whitespace-nowrap border-b border-border bg-secondary p-0 text-left"
                >
                  <button type="button" onClick={() => sortBy(r.id)} className="w-full px-2 py-2 text-left font-semibold">
                    {r.label}
                    {sortIcon(r.id)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 min-w-[9rem] border-b border-border bg-card px-2 py-2 text-left align-top font-semibold"
                >
                  {f.name}
                </th>
                {R.map((r) => {
                  const c = f.cells[r.id];
                  const review = isUnderReview(c);
                  return (
                    <td key={r.id} className="min-w-[11rem] border-b border-border p-0 align-top">
                      <button
                        type="button"
                        onClick={() => setSelected({ framework: f.id, ring: r.id })}
                        className="flex w-full gap-1.5 px-2 py-2 text-left hover:bg-secondary focus-visible:bg-secondary"
                      >
                        <span aria-hidden="true">
                          <DepthChip depth={c.depth} underReview={review} />
                        </span>
                        <span className="sr-only">
                          {t("depth.title")} {t("depth.value", { depth: c.depth })}.
                        </span>
                        <span className={review ? "" : "text-muted-foreground"}>
                          {review ? <UnderReviewTag /> : c.summary}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CellDetail cell={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
