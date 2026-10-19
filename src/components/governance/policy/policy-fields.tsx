"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The fields the policy form and the policy page share:
 *
 *  - PolicyTypeSelect: the nine types, each with its one-line definition.
 *  - PolicyAssignmentFields: owner (a member, or a name typed for someone
 *    outside the team) and department.
 *  - ReviewIntervalSelect: how often the organization reviews the policy.
 *  - PolicyLifecycle: the status steps in one line, each with a hover line.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  POLICY_LIFECYCLE,
  POLICY_TYPES,
  REVIEW_INTERVALS,
  type PolicyTypeValue,
} from "@/lib/policy-meta";

/** Message keys of the type names in the `policies` namespace. */
export const POLICY_TYPE_LABEL_KEYS: Record<PolicyTypeValue, string> = {
  AI_USAGE: "policyTypeAiUsage",
  AI_GOVERNANCE: "policyTypeAiGovernance",
  AI_ETHICS: "policyTypeAiEthics",
  AI_RISK_MANAGEMENT: "policyTypeRiskManagement",
  AI_DATA_GOVERNANCE: "policyTypeDataGovernance",
  AI_PROCUREMENT: "policyTypeProcurement",
  AI_INCIDENT_RESPONSE: "policyTypeIncidentResponse",
  AI_TRANSPARENCY: "policyTypeTransparency",
  CUSTOM: "policyTypeCustom",
};

export function usePolicyTypeLabel() {
  const t = useTranslations("policies");
  return (type: string) =>
    type in POLICY_TYPE_LABEL_KEYS ? t(POLICY_TYPE_LABEL_KEYS[type as PolicyTypeValue]) : type;
}

export function PolicyTypeSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: PolicyTypeValue | "";
  onChange: (type: PolicyTypeValue) => void;
}) {
  const t = useTranslations("policyFields");
  const typeLabel = usePolicyTypeLabel();
  return (
    <div className="space-y-1.5">
      <Select value={value} onValueChange={(v) => onChange(v as PolicyTypeValue)}>
        <SelectTrigger id={id} className="w-full max-w-full">
          <SelectValue placeholder={t("typePlaceholder")} />
        </SelectTrigger>
        <SelectContent className="max-w-[min(36rem,calc(100vw-2rem))]">
          {POLICY_TYPES.map((type) => (
            <SelectItem
              key={type}
              value={type}
              description={t(`typeDefinition.${type}`)}
              className="items-start py-2"
            >
              {typeLabel(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && <p className="text-sm text-muted-foreground">{t(`typeDefinition.${value}`)}</p>}
    </div>
  );
}

export interface PolicyAssignmentValue {
  ownerMemberId: string;
  ownerName: string;
  departmentId: string;
}

const NONE = "__none__";
const OUTSIDE = "__outside__";
const INVITED = "invited:";

export function PolicyAssignmentFields({
  organizationId,
  value,
  onChange,
  idPrefix = "policy",
}: {
  organizationId: string;
  value: PolicyAssignmentValue;
  onChange: (next: PolicyAssignmentValue) => void;
  idPrefix?: string;
}) {
  const t = useTranslations("policyFields");
  const td = useTranslations("departments");
  const { data } = trpc.policy.assignmentOptions.useQuery(
    { organizationId },
    { enabled: !!organizationId, staleTime: 60 * 1000 },
  );
  const members = data?.members ?? [];
  const departments = data?.departments ?? [];
  const invitations = data?.invitations ?? [];
  // A colleague invited who has not joined yet is named by address; the
  // policy is linked to them when they accept.
  const invited = !value.ownerMemberId
    ? invitations.find((i) => i.email.toLowerCase() === value.ownerName.trim().toLowerCase())
    : undefined;
  // "Someone outside the team" stays chosen while the name is still empty.
  const [outsideChosen, setOutsideChosen] = useState(!value.ownerMemberId && !!value.ownerName);
  const ownerMode = value.ownerMemberId || (invited ? `${INVITED}${invited.id}` : outsideChosen ? OUTSIDE : NONE);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-owner`}>{t("ownerLabel")}</Label>
        <Select
          value={ownerMode}
          onValueChange={(v) => {
            setOutsideChosen(v === OUTSIDE);
            if (v === NONE || v === OUTSIDE) onChange({ ...value, ownerMemberId: "", ownerName: "" });
            else if (v.startsWith(INVITED)) {
              const inv = invitations.find((x) => `${INVITED}${x.id}` === v);
              onChange({ ...value, ownerMemberId: "", ownerName: inv?.email ?? "" });
            } else {
              const m = members.find((x) => x.id === v);
              onChange({ ...value, ownerMemberId: v, ownerName: m?.name ?? "" });
            }
          }}
        >
          <SelectTrigger id={`${idPrefix}-owner`} className="w-full max-w-full">
            <SelectValue placeholder={t("ownerPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("ownerNone")}</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
            {invitations.map((i) => (
              <SelectItem key={i.id} value={`${INVITED}${i.id}`}>
                {td("invitedName", { name: i.email })}
              </SelectItem>
            ))}
            <SelectItem value={OUTSIDE}>{t("ownerOutside")}</SelectItem>
          </SelectContent>
        </Select>
        {ownerMode === OUTSIDE && (
          <Input
            aria-label={t("ownerNameLabel")}
            placeholder={t("ownerNamePlaceholder")}
            maxLength={200}
            value={value.ownerName}
            onChange={(e) => onChange({ ...value, ownerMemberId: "", ownerName: e.target.value })}
          />
        )}
        <p className="text-xs text-muted-foreground">{t("ownerHint")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-department`}>{t("departmentLabel")}</Label>
        <Select
          value={value.departmentId || NONE}
          onValueChange={(v) => onChange({ ...value, departmentId: v === NONE ? "" : v })}
          disabled={departments.length === 0}
        >
          <SelectTrigger id={`${idPrefix}-department`} className="w-full max-w-full">
            <SelectValue placeholder={t("departmentNone")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("departmentNone")}</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.parentId ? `· ${d.name}` : d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {departments.length === 0 ? t("departmentEmptyHint") : t("departmentHint")}
        </p>
      </div>
    </div>
  );
}

/** The values to send for an assignment ("" means none). */
export function assignmentPayload(value: PolicyAssignmentValue) {
  return {
    ownerMemberId: value.ownerMemberId || null,
    ownerName: value.ownerName.trim() || null,
    departmentId: value.departmentId || null,
  };
}

export function ReviewIntervalSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: number | null;
  onChange: (months: number | null) => void;
}) {
  const t = useTranslations("policyFields");
  return (
    <Select value={value ? String(value) : NONE} onValueChange={(v) => onChange(v === NONE ? null : Number(v))}>
      <SelectTrigger id={id} className="w-full max-w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("intervalNone")}</SelectItem>
        {REVIEW_INTERVALS.map((m) => (
          <SelectItem key={m} value={String(m)}>
            {m === 12 ? t("intervalSuggested", { months: m }) : t("intervalMonths", { months: m })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * "Draft, in review, approved, published, then reviewed on its review date",
 * each step with a hover line (also read by screen readers). The current step
 * is marked when a status is given.
 */
export function PolicyLifecycle({ status, className }: { status?: string; className?: string }) {
  const t = useTranslations("policyFields");
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      <span className="sr-only">{t("lifecycleLead")} </span>
      {POLICY_LIFECYCLE.map((step, i) => {
        const current = step === status;
        return (
          <span key={step}>
            {i > 0 && <span aria-hidden="true">{i === POLICY_LIFECYCLE.length - 1 ? ", " : " → "}</span>}
            <span
              tabIndex={0}
              title={t(`lifecycleHover.${step}`)}
              aria-label={`${t(`lifecycleStep.${step}`)}: ${t(`lifecycleHover.${step}`)}`}
              className={cn(
                "underline decoration-dotted underline-offset-4 cursor-help outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
                current && "font-semibold text-foreground",
              )}
            >
              {t(`lifecycleStep.${step}`)}
            </span>
          </span>
        );
      })}
    </p>
  );
}
