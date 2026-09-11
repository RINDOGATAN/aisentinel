"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Import the AI inventory from a spreadsheet (CSV). Parsing and column
 * mapping happen in the browser so the user sees exactly what will be
 * created before anything is written; the server validates every row again.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  inventoryTemplateCsv,
  parseInventory,
  type ImportField,
  type ParsedInventory,
} from "@/lib/inventory-import";

const FIELD_ORDER: ImportField[] = [
  "name", "vendor", "purpose", "technique", "role", "status", "riskLevel", "personalData",
  "businessOwner", "technicalOwner", "description",
];

export function InventoryImportDialog({
  organizationId,
  variant = "outline",
}: {
  organizationId: string;
  variant?: "outline" | "default";
}) {
  const t = useTranslations("inventoryImport");
  const locale = useLocale() === "es" ? "es" : "en";
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedInventory | null>(null);

  const importRows = trpc.aiSystem.importRows.useMutation({
    onSuccess: async (r) => {
      toast.success(
        t("done", {
          created: r.created,
          classified: r.classified,
          vendors: r.vendorsCreated,
          assessments: r.starterAssessments,
        }),
      );
      if (r.skippedExisting.length > 0) toast.info(t("skippedExisting", { count: r.skippedExisting.length }));
      await Promise.all([utils.aiSystem.invalidate(), utils.program.invalidate(), utils.organization.invalidate()]);
      setOpen(false);
      setParsed(null);
      setFileName(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setParsed(parseInventory(await file.text()));
  };

  const downloadTemplate = () => {
    const blob = new Blob([`﻿${inventoryTemplateCsv(locale)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = locale === "es" ? "inventario-ia-plantilla.csv" : "ai-inventory-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const unclassified = parsed?.rows.filter((r) => r.riskLevel === null).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className="w-full sm:w-auto">
          <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">{t("button")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:border-primary/50">
              <Upload className="w-4 h-4" />
              {fileName ?? t("chooseFile")}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-1.5" />
              {t("downloadTemplate")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("formatHint")}</p>

          {parsed?.error && (
            <p className="text-sm text-destructive">
              {parsed.error === "no-name-column" ? t("errorNoName") : t("errorNoRows")}
            </p>
          )}

          {parsed && !parsed.error && (
            <div className="space-y-3">
              <p className="text-sm">
                {t("summary", { rows: parsed.rows.length, unclassified })}
              </p>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {FIELD_ORDER.map((f) => (
                  <span
                    key={f}
                    className={`rounded px-2 py-0.5 border ${
                      parsed.columns[f] !== undefined
                        ? "border-primary/40 text-foreground"
                        : "border-border text-muted-foreground line-through"
                    }`}
                  >
                    {t(`field.${f}`)}
                  </span>
                ))}
              </div>
              <div className="max-h-56 overflow-auto rounded border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="p-2">{t("field.name")}</th>
                      <th className="p-2">{t("field.vendor")}</th>
                      <th className="p-2">{t("field.technique")}</th>
                      <th className="p-2">{t("field.riskLevel")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2 text-muted-foreground">{r.vendor ?? ""}</td>
                        <td className="p-2 text-muted-foreground">{r.technique}</td>
                        <td className="p-2">{r.riskLevel ?? <span className="text-amber-500">{t("unclassified")}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.skippedNoName.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("skippedNoName", { count: parsed.skippedNoName.length })}
                </p>
              )}
              {parsed.truncated > 0 && (
                <p className="text-xs text-amber-500">{t("truncated", { count: parsed.truncated })}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={!parsed || !!parsed.error || parsed.rows.length === 0 || importRows.isPending}
            onClick={() =>
              parsed &&
              importRows.mutate({
                organizationId,
                fileName: fileName ?? undefined,
                rows: parsed.rows,
              })
            }
          >
            {importRows.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("importButton", { count: parsed?.rows.length ?? 0 })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
