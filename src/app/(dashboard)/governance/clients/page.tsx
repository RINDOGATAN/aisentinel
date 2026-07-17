"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  ClipboardCheck,
  AlertTriangle,
  Building2,
  Clock,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { useRouter } from "next/navigation";

function timeAgo(date: Date | string | null, noActivity: string): string {
  if (!date) return noActivity;
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "<1m";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/** URL identifier from a display name (lowercase, hyphens, max 50). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function ClientsPage() {
  const { data: clients, isLoading } = trpc.clients.listClients.useQuery();
  const { setOrganization } = useOrganization();
  const router = useRouter();
  const t = useTranslations("clients");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();

  const [addOpen, setAddOpen] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: "", slug: "", domain: "", slugTouched: false });

  const createOrg = trpc.organization.create.useMutation({
    onSuccess: (org) => {
      toast.success(t("orgCreated"));
      utils.clients.listClients.invalidate();
      setAddOpen(false);
      setOrgForm({ name: "", slug: "", domain: "", slugTouched: false });
      // Switch into the new organization and start its onboarding.
      setOrganization({ id: org.id, name: org.name, slug: org.slug });
      router.push("/governance/quickstart");
    },
    onError: (e) => toast.error(e.message),
  });

  const totalAssessments = clients?.reduce((s, c) => s + c.activeAssessments, 0) ?? 0;
  const totalIncidents = clients?.reduce((s, c) => s + c.openIncidents, 0) ?? 0;
  const totalHighRisk = clients?.reduce((s, c) => s + c.highRiskSystems, 0) ?? 0;
  const attentionCount = clients?.filter((c) => c.needsAttention).length ?? 0;

  const handleClientClick = (client: NonNullable<typeof clients>[number]) => {
    setOrganization({
      id: client.organizationId,
      name: client.organizationName,
      slug: client.organizationSlug,
    });
    router.push("/governance");
  };

  const slugValid = /^[a-z0-9-]{2,50}$/.test(orgForm.slug);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("managedCount", { count: clients?.length ?? 0 })}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          {t("addOrganization")}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{totalAssessments}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsActiveAssessments")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{totalIncidents}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsOpenIncidents")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{totalHighRisk}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsHighRiskSystems")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className={`text-xl sm:text-2xl font-bold ${attentionCount > 0 ? "text-amber-400" : "text-foreground"}`}>
              {attentionCount}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("statsNeedAttention")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Client Cards */}
      {clients && clients.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {clients.map((client) => (
            <Card
              key={client.organizationId}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleClientClick(client)}
            >
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-sm sm:text-base truncate">
                      {client.organizationName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {client.needsAttention && (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {client.role.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t("cardAssessments", { count: client.activeAssessments })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t("cardIncidents", { count: client.openIncidents })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t("cardHighRisk", { count: client.highRiskSystems })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t("cardVendors", { count: client.activeVendors })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t border-border">
                  <Clock className="w-3 h-3" />
                  <span>
                    {t("lastActivity", { when: timeAgo(client.lastActivity, t("noActivity")) })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("emptyTitle")}</p>
            <p className="text-sm mt-1">{t("emptyHint")}</p>
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("addOrganization")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add-organization dialog (organization.create — creator becomes OWNER) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
            <Button variant="outline" onClick={() => setAddOpen(false)}>
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
    </div>
  );
}
