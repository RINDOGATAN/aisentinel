"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The Templates tab of the policy list: the library the product ships, kept
 * apart from the organization's policies. At the top, three questions suggest
 * which policies to have; below, every template can be read and used. "Use
 * this template" creates a draft and opens it.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { BookOpen, FilePlus2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  policyLibrary,
  policySectors,
  suggestPolicies,
  type PolicyRole,
  type PolicyTemplate,
  type LibraryGroup,
} from "@/config/policy-library";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";
import { usePolicyTypeLabel } from "./policy-fields";

const GROUPS: LibraryGroup[] = ["core", "lawfirm", "industry"];

export function PolicyTemplatesTab({ existingTitles }: { existingTitles: Set<string> }) {
  const t = useTranslations("policyTemplates");
  const locale = useLocale() === "es" ? "es" : "en";
  const router = useRouter();
  const typeLabel = usePolicyTypeLabel();
  const { organization, canWrite } = useOrganization();
  const utils = trpc.useUtils();

  const library = useMemo(() => policyLibrary(locale), [locale]);
  const sectors = useMemo(() => policySectors(locale), [locale]);
  const [sector, setSector] = useState("");
  const [role, setRole] = useState<PolicyRole | "">("");
  const [agents, setAgents] = useState<"yes" | "no" | "">("");
  const [reading, setReading] = useState<PolicyTemplate | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const answered = !!sector && !!role && !!agents;
  const suggestions = answered ? suggestPolicies({ sector, role: role as PolicyRole, agents: agents === "yes" }, locale) : [];

  const createDraft = trpc.policy.createFromTemplate.useMutation({
    onSuccess: (policy) => {
      toast.success(t("created"));
      void utils.policy.invalidate();
      router.push(`/governance/policies/${policy.id}`);
    },
    onError: (err) => {
      setPendingId(null);
      toast.error(err.message);
    },
  });

  const startFromTemplate = (id: string) => {
    if (!organization?.id || pendingId) return;
    setPendingId(id);
    createDraft.mutate({ organizationId: organization.id, templateId: id });
  };

  const templateButton = (tpl: PolicyTemplate) =>
    canWrite ? (
      <Button variant="outline" size="sm" onClick={() => startFromTemplate(tpl.id)} disabled={!!pendingId}>
        {pendingId === tpl.id ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden="true" />
        ) : (
          <FilePlus2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
        )}
        {t("use")}
      </Button>
    ) : null;

  const templateRow = (tpl: PolicyTemplate, reasons?: string[]) => (
    <li key={tpl.id} className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-medium">
          {tpl.title}
          {existingTitles.has(tpl.title) && (
            <Badge variant="outline" className="ml-2 align-middle text-xs">
              {t("alreadyInList")}
            </Badge>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{tpl.description}</p>
        <p className="text-xs text-muted-foreground">
          {typeLabel(tpl.type)}
          {tpl.industryName ? ` · ${tpl.industryName}` : ""}
          {reasons && reasons.length > 0 && ` · ${reasons.map((r) => t(`reason.${r}`)).join(" · ")}`}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={() => setReading(tpl)}>
          <BookOpen className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          {t("read")}
        </Button>
        {templateButton(tpl)}
      </div>
    </li>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("chooserTitle")}</CardTitle>
          <CardDescription className="text-sm text-foreground">{t("chooserLead")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tpl-sector">{t("qSector")}</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger id="tpl-sector" className="w-full max-w-full">
                  <SelectValue placeholder={t("choose")} />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-role">{t("qRole")}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as PolicyRole)}>
                <SelectTrigger id="tpl-role" className="w-full max-w-full">
                  <SelectValue placeholder={t("choose")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deployer">{t("roleDeployer")}</SelectItem>
                  <SelectItem value="provider">{t("roleProvider")}</SelectItem>
                  <SelectItem value="both">{t("roleBoth")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-agents">{t("qAgents")}</Label>
              <Select value={agents} onValueChange={(v) => setAgents(v as "yes" | "no")}>
                <SelectTrigger id="tpl-agents" className="w-full max-w-full">
                  <SelectValue placeholder={t("choose")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t("yes")}</SelectItem>
                  <SelectItem value="no">{t("no")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("roleHint")}</p>

          {answered && (
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("suggestedTitle", { count: suggestions.length })}</p>
              <ul>
                {suggestions.map((s) =>
                  s.kind === "template" ? (
                    templateRow(s.template, s.reasons)
                  ) : (
                    <li
                      key={`blank-${s.type}`}
                      className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{t("blankTitle", { type: typeLabel(s.type) })}</p>
                        <p className="text-sm text-muted-foreground">{t("blankHint")}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabel(s.type)} · {s.reasons.map((r) => t(`reason.${r}`)).join(" · ")}
                        </p>
                      </div>
                      {canWrite && (
                        <Link href={`/governance/policies/new?type=${s.type}`} className="shrink-0">
                          <Button variant="outline" size="sm">
                            <FilePlus2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                            {t("startBlank")}
                          </Button>
                        </Link>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {GROUPS.map((group) => {
        const items = library.filter((x) => x.group === group);
        if (items.length === 0) return null;
        return (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-base">{t(`group.${group}`)}</CardTitle>
              <CardDescription>{t(`groupLead.${group}`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul>
                {items.map((tpl) => templateRow(tpl))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!reading} onOpenChange={(open) => !open && setReading(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{reading?.title}</DialogTitle>
          </DialogHeader>
          {reading && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {typeLabel(reading.type)} · {reading.description}
              </p>
              <div className="max-h-[55vh] overflow-y-auto rounded-md bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                {reading.content}
              </div>
              <p className="text-xs text-muted-foreground">{t("readHint")}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReading(null)}>
              {t("close")}
            </Button>
            {reading && canWrite && (
              <Button onClick={() => startFromTemplate(reading.id)} disabled={!!pendingId}>
                {pendingId === reading.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
                {t("use")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
