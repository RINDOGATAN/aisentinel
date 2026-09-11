"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Permanently delete the organization (owners only). The user types the
 * organization's name to confirm; the server checks the role and the name
 * again. No browser confirm() dialog: the typed name is the confirmation.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

export function DeleteOrganizationCard({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const t = useTranslations("deleteOrganization");
  const router = useRouter();
  const { refetchOrganizations } = useOrganization();
  const [typed, setTyped] = useState("");

  const remove = trpc.organization.delete.useMutation({
    onSuccess: async () => {
      toast.success(t("deleted"));
      try {
        localStorage.removeItem("currentOrganizationId");
      } catch {
        // Storage can be unavailable (private mode); nothing to clean then.
      }
      await refetchOrganizations();
      router.push("/governance");
      router.refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const matches = typed.trim() === organizationName.trim();

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{t("title")}</CardTitle>
        <CardDescription>{t("description", { name: organizationName })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2">
        <Input
          value={typed}
          placeholder={organizationName}
          aria-label={t("confirmLabel")}
          onChange={(e) => setTyped(e.target.value)}
        />
        <Button
          variant="destructive"
          disabled={!matches || remove.isPending}
          onClick={() => remove.mutate({ organizationId, confirmName: typed })}
        >
          {remove.isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-1.5" />
          )}
          {t("button")}
        </Button>
      </CardContent>
    </Card>
  );
}
