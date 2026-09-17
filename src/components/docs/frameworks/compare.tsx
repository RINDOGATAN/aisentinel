"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { frameworksData, isUnderReview } from "@/lib/frameworks/model";
import { docsPagesForModules } from "@/lib/frameworks/doc-links";
import Link from "next/link";
import { DepthChip, UnderReviewTag } from "./depth";

const MAX = 3;

export function FrameworksCompare({ initial = [] }: { initial?: string[] }) {
  const t = useTranslations("docs.frameworks");
  const { frameworks: F, rings: R } = frameworksData;
  const known = new Set(F.map((f) => f.id));
  const [picked, setPicked] = useState<string[]>(() => initial.filter((id) => known.has(id)).slice(0, MAX));

  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX ? cur : [...cur, id]));

  const chosen = F.filter((f) => picked.includes(f.id));

  return (
    <div className="space-y-4">
      <fieldset className="rounded-xl border border-border bg-card p-4">
        <legend className="px-1 text-sm font-semibold">{t("compare.pick")}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {F.map((f) => {
            const on = picked.includes(f.id);
            return (
              <label key={f.id} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={on}
                  disabled={!on && picked.length >= MAX}
                  onChange={() => toggle(f.id)}
                  value={f.id}
                />
                {f.short}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {picked.length < 2 ? t("compare.help") : picked.length >= MAX ? t("compare.max") : ""}
        </p>
      </fieldset>

      {chosen.length > 0 && (
        <div className="overflow-auto rounded-xl border border-border bg-card">
          <table className="w-full border-separate border-spacing-0 text-sm" data-testid="frameworks-compare">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 min-w-[8rem] border-b border-border bg-secondary px-3 py-2 text-left">
                  {t("compare.dimension")}
                </th>
                {chosen.map((f) => (
                  <th key={f.id} scope="col" className="min-w-[14rem] border-b border-border bg-secondary px-3 py-2 text-left align-bottom">
                    <div>{f.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">{f.nature}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {R.map((r) => (
                <tr key={r.id}>
                  <th scope="row" title={r.question} className="sticky left-0 z-10 border-b border-border bg-card px-3 py-2 text-left align-top font-medium">
                    {r.label}
                  </th>
                  {chosen.map((f) => {
                    const c = f.cells[r.id];
                    const review = isUnderReview(c);
                    const docs = docsPagesForModules(c.modules);
                    return (
                      <td key={f.id} className="border-b border-border px-3 py-2 align-top">
                        <div className="flex gap-2">
                          <span aria-hidden="true">
                            <DepthChip depth={c.depth} underReview={review} />
                          </span>
                          <span className="sr-only">
                            {t("depth.title")} {t("depth.value", { depth: c.depth })}.
                          </span>
                          <div className="space-y-1">
                            {review ? <UnderReviewTag /> : <p className="text-muted-foreground">{c.summary}</p>}
                            {!review && c.source?.url && (
                              <a
                                href={c.source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                {c.source.ref ?? t("detail.source")}
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                            {docs.length > 0 && (
                              <div className="text-xs">
                                {docs.map((d) => (
                                  <Link key={d.href} href={d.href} className="mr-3 text-primary hover:underline">
                                    {t("detail.relatedDocs")}: {frameworksData.modules[d.module]?.label}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
