"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type DeletableRecord = "aiSystem" | "vendor" | "assessment" | "policy" | "gate";

/**
 * Delete for a record page: the button opens a confirmation that says what is
 * lost with the record; only "Yes, delete" calls the server. A header action
 * of the default size (page-header.tsx). The page decides whether to render it
 * (owners and admins only; see `canDelete` in organization-context.tsx).
 */
export function DeleteRecordButton({
  record,
  pending,
  onConfirm,
}: {
  record: DeletableRecord;
  pending: boolean;
  onConfirm: () => void;
}) {
  const t = useTranslations("deleteRecord");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label={t(`${record}.title`)}
        data-testid="delete-record"
      >
        <Trash2 className="w-4 h-4 mr-1.5" />
        {t("delete")}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(`${record}.title`)}</DialogTitle>
            <DialogDescription>{t(`${record}.warning`)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={onConfirm}
              data-testid="delete-record-confirm"
            >
              {pending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
