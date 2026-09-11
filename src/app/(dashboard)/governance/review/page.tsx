"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Review queue: everything the product drafted automatically (templates,
 * catalogue, rules, imports) that no person has yet taken ownership of.
 *
 * The wizard's success page and the program send people here. Anyone can read
 * the queue; only owners, admins and AI officers can confirm, because
 * confirming is an approval (enforced server-side in provenance.confirm).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/lib/organization-context";

const ENTITIES = [
  "RiskClassification",
  "ComplianceMapping",
  "OversightGate",
  "AIPolicy",
  "TransparencyProfile",
] as const;
type Entity = (typeof ENTITIES)[number];

const APPROVER_ROLES = ["OWNER", "ADMIN", "AI_OFFICER"];

// The queue's summary line carries enum codes (status, tier, policy type);
// these map them onto the shared labels in the "common" namespace.
const CODE_LABEL: Record<string, string> = {
  NOT_ASSESSED: "complianceNotAssessed",
  COMPLIANT: "complianceCompliant",
  PARTIALLY_COMPLIANT: "compliancePartial",
  NON_COMPLIANT: "complianceNonCompliant",
  UNACCEPTABLE: "riskUnacceptable",
  HIGH: "riskHigh",
  LIMITED: "riskLimited",
  MINIMAL: "riskMinimal",
  DRAFT: "statusDraft",
  PENDING: "statusPending",
  IN_REVIEW: "statusInReview",
  UNDER_REVIEW: "statusUnderReview",
  PASSED: "statusPassed",
  FAILED: "statusFailed",
  APPROVED: "statusApproved",
  PUBLISHED: "statusPublished",
  ARCHIVED: "statusArchived",
  PRE_DEPLOYMENT: "gateTypePreDeployment",
  POST_DEPLOYMENT: "gateTypePostDeployment",
  PERIODIC_REVIEW: "gateTypePeriodicReview",
  AI_USAGE: "policyTypeAiUsage",
  AI_GOVERNANCE: "policyTypeAiGovernance",
  AI_ETHICS: "policyTypeAiEthics",
  AI_RISK_MANAGEMENT: "policyTypeRiskManagement",
  AI_DATA_GOVERNANCE: "policyTypeDataGovernance",
  AI_PROCUREMENT: "policyTypeProcurement",
  AI_INCIDENT_RESPONSE: "policyTypeIncidentResponse",
  AI_TRANSPARENCY: "policyTypeTransparency",
};
// The server's page cap. Confirmed items leave the queue, so confirming a
// page brings the next one into view.
const PAGE = 100;

export default function ReviewQueuePage() {
  const t = useTranslations("provenance");
  const tc = useTranslations("common");
  const humanize = (summary: string) =>
    summary
      .split(" · ")
      .map((part) => (CODE_LABEL[part] ? tc(CODE_LABEL[part]) : part))
      .join(" · ");
  const { organization, userRole } = useOrganization();
  const orgId = organization?.id ?? "";
  const canApprove = userRole !== null && APPROVER_ROLES.includes(userRole);
  const utils = trpc.useUtils();

  const [entityType, setEntityType] = useState<Entity | "ALL">("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: summary } = trpc.provenance.getConfirmationSummary.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId },
  );
  const { data, isLoading } = trpc.provenance.listQueue.useQuery(
    {
      organizationId: orgId,
      entityType: entityType === "ALL" ? undefined : entityType,
      limit: PAGE,
    },
    { enabled: !!orgId },
  );
  const items = useMemo(() => data?.items ?? [], [data]);
  const keyOf = (i: { entityType: string; id: string }) => `${i.entityType}:${i.id}`;

  const confirm = trpc.provenance.confirm.useMutation({
    onSuccess: async (r) => {
      toast.success(t("actions.confirmedToast", { count: r.confirmed }));
      setSelected(new Set());
      await Promise.all([utils.provenance.invalidate(), utils.program.invalidate()]);
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmKeys = (keys: string[]) => {
    const chosen = items
      .filter((i) => keys.includes(keyOf(i)))
      .map((i) => ({ entityType: i.entityType as Entity, id: i.id }));
    // The server caps a request at 200 items.
    if (chosen.length > 0) confirm.mutate({ organizationId: orgId, items: chosen.slice(0, 200) });
  };

  const allSelected = items.length > 0 && items.every((i) => selected.has(keyOf(i)));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          {t("queue.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("queue.subtitle")}</p>
      </div>

      {summary && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">
              {summary.total === 0
                ? t("meter.empty")
                : t("meter.headline", { percent: summary.weightedPct })}
            </p>
            {summary.total > 0 && (
              <>
                <Progress value={summary.weightedPct} />
                <p className="text-xs text-muted-foreground">
                  {t("meter.detail", { confirmed: summary.confirmed, total: summary.total })}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v as Entity | "ALL");
            setSelected(new Set());
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("queue.filterAll")}</SelectItem>
            {ENTITIES.map((e) => (
              <SelectItem key={e} value={e}>
                {t(`entity.${e}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canApprove && items.length > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(items.map(keyOf)))
              }
            >
              {allSelected ? t("queue.clearSelection") : t("queue.selectAll")}
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0 || confirm.isPending}
              onClick={() => confirmKeys([...selected])}
            >
              {confirm.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              {t("queue.confirmSelected")}
              {selected.size > 0 && ` (${selected.size})`}
            </Button>
          </>
        )}
      </div>

      {!canApprove && items.length > 0 && (
        <p className="text-xs text-muted-foreground">{t("queue.approverOnly")}</p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("queue.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const key = keyOf(item);
            return (
              <Card key={key}>
                <CardContent className="p-3 flex items-center gap-3">
                  {canApprove && (
                    <Checkbox
                      checked={selected.has(key)}
                      onCheckedChange={(checked) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(key);
                          else next.delete(key);
                          return next;
                        })
                      }
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t(`entity.${item.entityType}`)} · {humanize(item.summary)} ·{" "}
                      {t(`origin.${item.provenance}`)}
                    </p>
                  </div>
                  <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  {canApprove && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={confirm.isPending}
                      onClick={() => confirmKeys([key])}
                    >
                      {t("actions.confirm")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {data?.nextCursor && (
            <p className="text-xs text-muted-foreground text-center pt-2">{t("queue.moreAfterConfirm", { count: PAGE })}</p>
          )}
        </div>
      )}
    </div>
  );
}
