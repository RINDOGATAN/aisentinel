"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { frameworksData, isUnderReview } from "@/lib/frameworks/model";
import { docsPageForModule } from "@/lib/frameworks/doc-links";
import { DepthChip, UnderReviewTag } from "./depth";

export interface CellRef {
  framework: string;
  ring: string;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/** The detail of one cell, as a side sheet. Closing returns focus to the cell. */
export function CellDetail({ cell, onClose }: { cell: CellRef | null; onClose: () => void }) {
  const t = useTranslations("docs.frameworks");
  const f = cell ? frameworksData.frameworks.find((x) => x.id === cell.framework) : undefined;
  const r = cell ? frameworksData.rings.find((x) => x.id === cell.ring) : undefined;
  const c = f && r ? f.cells[r.id] : undefined;
  const review = c ? isUnderReview(c) : false;

  return (
    <Sheet open={!!c} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" showCloseButton={false} className="w-full overflow-y-auto sm:max-w-md p-5 gap-5">
        {f && r && c && (
          <>
            <div className="space-y-1 pr-2">
              <SheetDescription className="text-xs uppercase tracking-wider">{r.label}</SheetDescription>
              <SheetTitle className="text-lg font-display leading-snug">{f.name}</SheetTitle>
            </div>
            <Row label={t("depth.title")}>
              <span className="inline-flex items-center gap-2">
                <DepthChip depth={c.depth} underReview={review} />
                {t("depth.value", { depth: c.depth })}
                {review && <UnderReviewTag />}
              </span>
            </Row>
            <Row label={t("detail.summary")}>
              {review ? <span className="text-muted-foreground">{t("underReviewNote")}</span> : c.summary}
            </Row>
            {r.depthMeaning && (
              <p className="text-xs text-muted-foreground">{t("rings.depthMeaning", { meaning: r.depthMeaning })}</p>
            )}
            <Row label={t("detail.source")}>
              <div className="space-y-1">
                {review && <UnderReviewTag />}
                {c.source?.ref && <div>{c.source.ref}</div>}
                {c.source?.url && (
                  <a href={c.source.url} {...external} className="inline-flex items-center gap-1 break-all text-primary hover:underline">
                    {c.source.url}
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                )}
                {c.source?.file && (
                  <div className="text-xs text-muted-foreground">{t("detail.foundIn", { file: c.source.file })}</div>
                )}
              </div>
            </Row>
            {c.note && <Row label={t("detail.note")}>{c.note}</Row>}
            {!!c.modules?.length && (
              <Row label={t("detail.modules")}>
                <ul className="space-y-1">
                  {c.modules.map((m) => {
                    const mod = frameworksData.modules[m];
                    const href = docsPageForModule(m);
                    return (
                      <li key={m} className="flex flex-wrap items-baseline gap-x-2">
                        <span>{mod?.label ?? m}</span>
                        {href && (
                          <Link href={href} onClick={onClose} className="text-xs text-primary hover:underline">
                            {t("detail.relatedDocs")}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Row>
            )}
            <Row label={t("detail.framework")}>
              <p className="text-muted-foreground">{f.summary}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <a href={f.url} {...external} className="inline-flex items-center gap-1 text-primary hover:underline">
                  {t("detail.officialText")}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <Link
                  href={`/docs/frameworks/compare?f=${encodeURIComponent(f.id)}`}
                  onClick={onClose}
                  className="text-primary hover:underline"
                >
                  {t("detail.compare")}
                </Link>
              </div>
            </Row>
            <Button variant="outline" size="sm" className="self-start" onClick={onClose}>
              {t("detail.close")}
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
