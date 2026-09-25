"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Add an organisation (organization.create; the creator becomes OWNER), then
 * switch into it and open its quick start. Shared by the client cards page
 * (/governance/clients) and the Guided portfolio (/governance/portfolio), so
 * the add flow stays on the page it was started from.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

/** URL identifier from a display name (lowercase, hyphens, max 50). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function AddOrganizationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  /** Cancel, Escape or the close button. */
  onOpenChange: (open: boolean) => void;
  /** After creation, before the move to the quick start: close without touching the address. */
  onCreated: () => void;
}) {
  const t = useTranslations("clients");
  const tc = useTranslations("common");
  const router = useRouter();
  const utils = trpc.useUtils();
  const { setOrganization } = useOrganization();
  const [orgForm, setOrgForm] = useState({ name: "", slug: "", domain: "", slugTouched: false });

  const createOrg = trpc.organization.create.useMutation({
    onSuccess: (org) => {
      toast.success(t("orgCreated"));
      void utils.clients.listClients.invalidate();
      void utils.programPath.portfolio.invalidate();
      onCreated();
      setOrgForm({ name: "", slug: "", domain: "", slugTouched: false });
      // Switch into the new organization and start its onboarding.
      setOrganization({ id: org.id, name: org.name, slug: org.slug });
      router.push("/governance/quickstart");
    },
    onError: (e) => toast.error(e.message),
  });

  const slugValid = /^[a-z0-9-]{2,50}$/.test(orgForm.slug);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addOrgTitle")}</DialogTitle>
          <DialogDescription>{t("addOrgDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">{t("orgNameLabel")} *</Label>
            <Input
              id="org-name"
              value={orgForm.name}
              placeholder={t("orgNamePlaceholder")}
              onChange={(e) =>
                setOrgForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                  slug: prev.slugTouched ? prev.slug : slugify(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">{t("orgSlugLabel")} *</Label>
            <Input
              id="org-slug"
              value={orgForm.slug}
              onChange={(e) =>
                setOrgForm((prev) => ({ ...prev, slug: e.target.value, slugTouched: true }))
              }
            />
            <p className="text-xs text-muted-foreground">{t("orgSlugHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-domain">{t("orgDomainLabel")}</Label>
            <Input
              id="org-domain"
              value={orgForm.domain}
              placeholder={t("orgDomainPlaceholder")}
              onChange={(e) => setOrgForm((prev) => ({ ...prev, domain: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            disabled={!orgForm.name.trim() || !slugValid || createOrg.isPending}
            onClick={() =>
              createOrg.mutate({
                name: orgForm.name.trim(),
                slug: orgForm.slug,
                domain: orgForm.domain.trim() || undefined,
              })
            }
          >
            {createOrg.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("addOrganization")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
