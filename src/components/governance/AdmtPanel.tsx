"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * AdmtPanel — California ADMT determination and scope for one registered AI
 * system (ADMT tab of the AI-registry detail page).
 *
 * Same doctrine as TransparencyPanel: the deterministic rules layer
 * (config/admt-rules.ts, via admt.getScope) is the ground truth, and the panel
 * never writes a status the user did not pick. Every unanswered question stays
 * NOT_ASSESSED and is surfaced as an open question rather than resolved into a
 * comfortable default.
 *
 * The § 7001(e)(1) test is conjunctive, so the panel shows its working: one
 * failed prong is enough to conclude the technology IS ADMT, while concluding
 * it is NOT requires all three answered and satisfied.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, Scale, ShieldAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ADMT_RULES_REVIEW_MARKER,
  OPT_OUT_EXCEPTIONS,
  RISK_ASSESSMENT_TRIGGERS,
  SIGNIFICANT_DECISION_DOMAINS,
  type AdmtDeterminationValue,
  type AdmtOptOutBasisValue,
  type AdmtProngStatusValue,
  type AdmtScopeState,
  type AdmtSoleFactorValue,
  type RiskAssessmentTrigger,
  type SignificantDecisionDomain,
} from "@/config/admt-rules";

const PRONG_STATUSES: AdmtProngStatusValue[] = [
  "NOT_ASSESSED",
  "SATISFIED",
  "NOT_SATISFIED",
];

const SOLE_FACTORS: AdmtSoleFactorValue[] = [
  "NOT_ASSESSED",
  "SOLE_FACTOR",
  "ONE_OF_SEVERAL",
  "NOT_USED",
];

const OPT_OUT_BASES: AdmtOptOutBasisValue[] = [
  "NOT_ASSESSED",
  "NONE_OPT_OUT_OFFERED",
  ...OPT_OUT_EXCEPTIONS,
];

const DETERMINATIONS: AdmtDeterminationValue[] = [
  "NOT_ASSESSED",
  "NOT_ADMT",
  "ADMT",
  "ADMT_EXCLUDED_7001_E_3",
];

/**
 * How each resolved state should read. Undetermined states are deliberately
 * "neutral", never "muted": a question nobody has answered must not look like a
 * settled negative.
 */
const STATE_TONE: Record<
  AdmtScopeState,
  { className: string; variant: "positive" | "attention" | "neutral" | "error" | "muted" }
> = {
  ARTICLE_10_ONLY: {
    className: "border-success/40 bg-success/10",
    variant: "positive",
  },
  ARTICLE_10_AND_11: {
    className: "border-warning/40 bg-warning/10",
    variant: "attention",
  },
  PROFILE_NOT_ASSESSED: {
    className: "border-border bg-muted/40",
    variant: "neutral",
  },
  COVERED_BUSINESS_NOT_ASSESSED: {
    className: "border-border bg-muted/40",
    variant: "neutral",
  },
  JURISDICTION_UNDECLARED: {
    className: "border-border bg-muted/40",
    variant: "neutral",
  },
  JURISDICTION_CONFLICT: {
    className: "border-destructive/40 bg-destructive/10",
    variant: "error",
  },
  OUT_OF_SCOPE_NO_CA_NEXUS: {
    className: "border-border bg-background",
    variant: "muted",
  },
};

/** Open questions that a link elsewhere resolves rather than this panel. */
const QUESTION_LINKS: Partial<Record<string, string>> = {
  declareJurisdictions: "/governance/settings",
  answerCoveredBusiness: "/governance/settings",
  answerAuditThreshold: "/governance/settings",
};

interface FormState {
  determination: AdmtDeterminationValue;
  prongInterpretOutput: AdmtProngStatusValue;
  prongReviewsOutputAndOtherInfo: AdmtProngStatusValue;
  prongAuthorityToChange: AdmtProngStatusValue;
  significantDecisionDomains: SignificantDecisionDomain[];
  riskAssessmentTriggers: RiskAssessmentTrigger[];
  soleFactor: AdmtSoleFactorValue;
  nonQualifyingHumanRole: string;
  optOutBasis: AdmtOptOutBasisValue;
  designatedReviewer: string;
  appealRouteDescription: string;
  worksForPurposeEvidence: string;
  nonDiscriminationEvidence: string;
  processingInitiatedAt: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  determination: "NOT_ASSESSED",
  prongInterpretOutput: "NOT_ASSESSED",
  prongReviewsOutputAndOtherInfo: "NOT_ASSESSED",
  prongAuthorityToChange: "NOT_ASSESSED",
  significantDecisionDomains: [],
  riskAssessmentTriggers: [],
  soleFactor: "NOT_ASSESSED",
  nonQualifyingHumanRole: "",
  optOutBasis: "NOT_ASSESSED",
  designatedReviewer: "",
  appealRouteDescription: "",
  worksForPurposeEvidence: "",
  nonDiscriminationEvidence: "",
  processingInitiatedAt: "",
  notes: "",
};

interface AdmtPanelProps {
  organizationId: string;
  aiSystemId: string;
  canWrite: boolean;
}

export function AdmtPanel({
  organizationId,
  aiSystemId,
  canWrite,
}: AdmtPanelProps) {
  const t = useTranslations("admt");
  // The sign-off marker is content, not chrome: it lives in the rules pack as a
  // bilingual pair rather than in the message files.
  const locale = useLocale() === "es" ? "es" : "en";
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admt.getScope.useQuery(
    { organizationId, aiSystemId },
    { enabled: !!organizationId && !!aiSystemId },
  );

  // Server state overlaid with the user's edits — no effect, no mirroring.
  const [edits, setEdits] = useState<Partial<FormState>>({});

  const defaults = useMemo<FormState>(() => {
    const profile = data?.profile;
    if (!profile) return EMPTY_FORM;
    return {
      determination: profile.determination as AdmtDeterminationValue,
      prongInterpretOutput:
        profile.prongInterpretOutput as AdmtProngStatusValue,
      prongReviewsOutputAndOtherInfo:
        profile.prongReviewsOutputAndOtherInfo as AdmtProngStatusValue,
      prongAuthorityToChange:
        profile.prongAuthorityToChange as AdmtProngStatusValue,
      significantDecisionDomains:
        profile.significantDecisionDomains as SignificantDecisionDomain[],
      riskAssessmentTriggers:
        profile.riskAssessmentTriggers as RiskAssessmentTrigger[],
      soleFactor: profile.soleFactor as AdmtSoleFactorValue,
      nonQualifyingHumanRole: profile.nonQualifyingHumanRole ?? "",
      optOutBasis: profile.optOutBasis as AdmtOptOutBasisValue,
      designatedReviewer: profile.designatedReviewer ?? "",
      appealRouteDescription: profile.appealRouteDescription ?? "",
      worksForPurposeEvidence: profile.worksForPurposeEvidence ?? "",
      nonDiscriminationEvidence: profile.nonDiscriminationEvidence ?? "",
      processingInitiatedAt: profile.processingInitiatedAt
        ? new Date(profile.processingInitiatedAt).toISOString().slice(0, 10)
        : "",
      notes: profile.notes ?? "",
    };
  }, [data]);

  const form: FormState = { ...defaults, ...edits };

  const upsert = trpc.admt.upsertProfile.useMutation({
    onSuccess: () => {
      toast.success(t("ui.toastSaved"));
      setEdits({});
      void utils.admt.getScope.invalidate({ organizationId, aiSystemId });
      void utils.admt.getOrgScope.invalidate({ organizationId });
    },
    onError: (err) => toast.error(err.message),
  });

  const sync = trpc.admt.syncMappings.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.created > 0
          ? t("ui.toastSynced", { count: result.created })
          : t("ui.toastSyncedNone"),
      );
      void utils.compliance.getMatrix.invalidate();
      void utils.compliance.getFrameworkCounts.invalidate({ organizationId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">{t("ui.loading")}</p>;
  }

  const { scope, deadlines } = data;
  const tone = STATE_TONE[scope.state];
  const positiveScope =
    scope.state === "ARTICLE_10_ONLY" || scope.state === "ARTICLE_10_AND_11";

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setEdits((prev) => ({ ...prev, [key]: value }));

  const toggleDomain = (domain: SignificantDecisionDomain, checked: boolean) =>
    set(
      "significantDecisionDomains",
      checked
        ? [...form.significantDecisionDomains, domain]
        : form.significantDecisionDomains.filter((d) => d !== domain),
    );

  const toggleTrigger = (trigger: RiskAssessmentTrigger, checked: boolean) =>
    set(
      "riskAssessmentTriggers",
      checked
        ? [...form.riskAssessmentTriggers, trigger]
        : form.riskAssessmentTriggers.filter((x) => x !== trigger),
    );

  const reliesOnTwoPartException =
    form.optOutBasis === "ADMISSION_ACCEPTANCE_HIRING_7221_B_2" ||
    form.optOutBasis === "ALLOCATION_COMPENSATION_7221_B_3";

  const handleSave = () =>
    upsert.mutate({
      organizationId,
      aiSystemId,
      determination: form.determination,
      prongInterpretOutput: form.prongInterpretOutput,
      prongReviewsOutputAndOtherInfo: form.prongReviewsOutputAndOtherInfo,
      prongAuthorityToChange: form.prongAuthorityToChange,
      significantDecisionDomains: form.significantDecisionDomains,
      riskAssessmentTriggers: form.riskAssessmentTriggers,
      soleFactor: form.soleFactor,
      nonQualifyingHumanRole: form.nonQualifyingHumanRole || undefined,
      optOutBasis: form.optOutBasis,
      designatedReviewer: form.designatedReviewer || undefined,
      appealRouteDescription: form.appealRouteDescription || undefined,
      worksForPurposeEvidence: form.worksForPurposeEvidence || undefined,
      nonDiscriminationEvidence: form.nonDiscriminationEvidence || undefined,
      processingInitiatedAt: form.processingInitiatedAt
        ? new Date(form.processingInitiatedAt)
        : null,
      notes: form.notes || undefined,
    });

  // Live conclusion from the form the user is looking at, not from the saved
  // profile — so the effect of changing a prong is visible before saving.
  const liveDetermination = evaluateLocally(form);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* ── Determination card ───────────────────────────────────── */}
      <div className={`rounded-md border p-4 space-y-3 ${tone.className}`}>
        <div className="flex flex-wrap items-center gap-2">
          {tone.variant === "error" && (
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          )}
          {tone.variant === "attention" && (
            <ShieldAlert className="w-4 h-4 text-warning shrink-0" />
          )}
          <p className="text-sm font-medium">{t(`state.${scope.state}`)}</p>
        </div>
        <p className="text-xs leading-relaxed">
          {t(`stateDetail.${scope.state}`)}
        </p>

        {scope.reasons.length > 0 && (
          <ul className="space-y-1">
            {scope.reasons.map((reason) => (
              <li
                key={reason}
                className="text-xs text-muted-foreground flex items-start gap-1.5"
              >
                <Scale className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                {t(`reason.${reason}`)}
              </li>
            ))}
          </ul>
        )}

        {/* The Article 11 clock, only once Article 11 actually attaches. */}
        {scope.state === "ARTICLE_10_AND_11" &&
          deadlines.entries
            .filter(
              (d) => d.id === "article_11_compliance" && d.status !== "not_assessed",
            )
            .map((d) => (
              <p key={d.id} className="text-xs">
                <span
                  className={
                    d.status === "overdue"
                      ? "bg-destructive/20 text-foreground px-1.5 py-0.5"
                      : ""
                  }
                >
                  {d.status === "overdue"
                    ? t("deadline.overdue")
                    : t("deadline.article_11_compliance")}
                  {d.date ? ` — ${formatDate(d.date)}` : ""}
                </span>
              </p>
            ))}

        {scope.openQuestions.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("ui.openQuestionsTitle")}
            </p>
            {scope.openQuestions.map((question) => {
              const href = QUESTION_LINKS[question];
              return (
                <p key={question} className="text-xs">
                  {t(`openQuestion.${question}`)}
                  {href && (
                    <>
                      {" "}
                      <a href={href} className="text-primary hover:underline">
                        {t("ui.resolveLink")}
                      </a>
                    </>
                  )}
                </p>
              );
            })}
          </div>
        )}
      </div>

      {/* ── § 7001(e)(1) three-prong test ─────────────────────────── */}
      <section className="space-y-3">
        <div>
          <p className="text-sm font-medium">{t("ui.sectionProngs")}</p>
          <p className="text-xs text-muted-foreground">{t("prong.legend")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("ui.prongConjunctive")}
          </p>
        </div>

        <div className="space-y-2">
          {(
            [
              ["prongInterpretOutput", "interpretOutput", "A"],
              ["prongReviewsOutputAndOtherInfo", "reviewsOutputAndOtherInfo", "B"],
              ["prongAuthorityToChange", "authorityToChange", "C"],
            ] as const
          ).map(([field, labelKey, letter]) => (
            <div
              key={field}
              className="rounded-md border border-border p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {t("ui.prongLetter", { letter })}
                </Badge>
                <span className="text-sm">{t(`prong.${labelKey}`)}</span>
              </div>
              {canWrite ? (
                <Select
                  value={form[field]}
                  onValueChange={(v) =>
                    set(field, v as AdmtProngStatusValue)
                  }
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRONG_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`prong.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">{t(`prong.${form[field]}`)}</Badge>
              )}
            </div>
          ))}
        </div>

        {/* Derived conclusion, naming the prong that decided it. */}
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-medium">
            {liveDetermination.isAdmt === null
              ? t("determination.unresolved")
              : liveDetermination.isAdmt
                ? t("determination.isAdmt")
                : t("determination.isNotAdmt")}
          </p>
          {liveDetermination.failedProng && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("ui.prongDecided", { letter: liveDetermination.failedProng })}
            </p>
          )}
        </div>

        {/* An explicit determination overrides the prongs. */}
        <div className="space-y-1.5">
          <Label className="text-xs">{t("determination.label")}</Label>
          {canWrite ? (
            <Select
              value={form.determination}
              onValueChange={(v) =>
                set("determination", v as AdmtDeterminationValue)
              }
            >
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DETERMINATIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {t(`ui.determinationOption.${d}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline">
              {t(`ui.determinationOption.${form.determination}`)}
            </Badge>
          )}
        </div>
      </section>

      {/* ── § 7001(ddd) significant-decision domains ──────────────── */}
      <section className="space-y-2">
        <p className="text-sm font-medium">{t("ui.sectionDomains")}</p>
        <p className="text-xs text-muted-foreground">{t("domain.legend")}</p>
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <p className="text-[11px] text-muted-foreground">
            {t("ui.advertisingExcluded")}
          </p>
        </div>
        <div className="space-y-1.5">
          {SIGNIFICANT_DECISION_DOMAINS.map((domain) => (
            <div key={domain} className="flex items-center gap-2">
              <Checkbox
                id={`domain-${domain}`}
                checked={form.significantDecisionDomains.includes(domain)}
                disabled={!canWrite}
                onCheckedChange={(checked) =>
                  toggleDomain(domain, checked === true)
                }
              />
              <Label
                htmlFor={`domain-${domain}`}
                className="text-xs font-normal"
              >
                {t(`domain.${domain}`)}
              </Label>
            </div>
          ))}
        </div>
      </section>

      {/* ── § 7150(b) risk-assessment triggers ────────────────────── */}
      <section className="space-y-2">
        <p className="text-sm font-medium">{t("ui.sectionTriggers")}</p>
        <p className="text-xs text-muted-foreground">{t("trigger.legend")}</p>
        <div className="rounded-md border border-warning/40 bg-warning/10 p-2">
          <p className="text-[11px]">{t("ui.article10LiveSince")}</p>
        </div>
        <div className="space-y-1.5">
          {RISK_ASSESSMENT_TRIGGERS.map((trigger) => (
            <div key={trigger} className="flex items-center gap-2">
              <Checkbox
                id={`trigger-${trigger}`}
                checked={form.riskAssessmentTriggers.includes(trigger)}
                disabled={!canWrite}
                onCheckedChange={(checked) =>
                  toggleTrigger(trigger, checked === true)
                }
              />
              <Label
                htmlFor={`trigger-${trigger}`}
                className="text-xs font-normal"
              >
                {t(`trigger.${trigger}`)}
              </Label>
            </div>
          ))}
        </div>
      </section>

      {/* ── § 7221 opt-out basis ──────────────────────────────────── */}
      <section className="space-y-2">
        <p className="text-sm font-medium">{t("ui.sectionOptOut")}</p>
        <p className="text-xs text-muted-foreground">{t("optOutBasis.legend")}</p>

        {/* The error this closed list exists to prevent. */}
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px]">{t("ui.securityFraudNotAnException")}</p>
        </div>

        {canWrite ? (
          <Select
            value={form.optOutBasis}
            onValueChange={(v) => set("optOutBasis", v as AdmtOptOutBasisValue)}
          >
            <SelectTrigger className="w-full sm:w-96">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPT_OUT_BASES.map((basis) => (
                <SelectItem key={basis} value={basis}>
                  {t(`optOutBasis.${basis}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline">{t(`optOutBasis.${form.optOutBasis}`)}</Badge>
        )}

        {form.optOutBasis === "HUMAN_APPEAL_7221_B_1" && (
          <div className="rounded-md border border-border p-3 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              {t("ui.humanAppealRequires")}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="admt-reviewer" className="text-xs">
                {t("field.designatedReviewer")}
              </Label>
              <Input
                id="admt-reviewer"
                value={form.designatedReviewer}
                disabled={!canWrite}
                onChange={(e) => set("designatedReviewer", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admt-appeal" className="text-xs">
                {t("field.appealRouteDescription")}
              </Label>
              <Textarea
                id="admt-appeal"
                rows={3}
                value={form.appealRouteDescription}
                disabled={!canWrite}
                onChange={(e) => set("appealRouteDescription", e.target.value)}
              />
            </div>
          </div>
        )}

        {reliesOnTwoPartException && (
          <div className="rounded-md border border-border p-3 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              {t("ui.twoPartTest")}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="admt-works" className="text-xs">
                {t("field.worksForPurposeEvidence")}
              </Label>
              <Textarea
                id="admt-works"
                rows={3}
                value={form.worksForPurposeEvidence}
                disabled={!canWrite}
                onChange={(e) => set("worksForPurposeEvidence", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admt-nondisc" className="text-xs">
                {t("field.nonDiscriminationEvidence")}
              </Label>
              <Textarea
                id="admt-nondisc"
                rows={3}
                value={form.nonDiscriminationEvidence}
                disabled={!canWrite}
                onChange={(e) =>
                  set("nonDiscriminationEvidence", e.target.value)
                }
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Output role, timing, notes ────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-sm font-medium">{t("ui.sectionOutput")}</p>

        <div className="space-y-1.5">
          <Label className="text-xs">{t("soleFactor.legend")}</Label>
          {canWrite ? (
            <Select
              value={form.soleFactor}
              onValueChange={(v) => set("soleFactor", v as AdmtSoleFactorValue)}
            >
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOLE_FACTORS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`soleFactor.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline">{t(`soleFactor.${form.soleFactor}`)}</Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admt-human-role" className="text-xs">
            {t("field.nonQualifyingHumanRole")}
          </Label>
          <Textarea
            id="admt-human-role"
            rows={2}
            value={form.nonQualifyingHumanRole}
            disabled={!canWrite}
            onChange={(e) => set("nonQualifyingHumanRole", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admt-initiated" className="text-xs">
            {t("field.processingInitiatedAt")}
          </Label>
          <Input
            id="admt-initiated"
            type="date"
            className="w-52"
            value={form.processingInitiatedAt}
            disabled={!canWrite}
            onChange={(e) => set("processingInitiatedAt", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("ui.processingInitiatedHelp")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admt-notes" className="text-xs">
            {t("field.notes")}
          </Label>
          <Textarea
            id="admt-notes"
            rows={3}
            value={form.notes}
            disabled={!canWrite}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </section>

      {/* ── Statutory clocks ──────────────────────────────────────── */}
      {deadlines.entries.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-medium">{t("ui.sectionDeadlines")}</p>
          <div className="space-y-1">
            {deadlines.entries.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-xs border-b border-border py-1.5 last:border-0"
              >
                <span>{t(`deadline.${d.id}`)}</span>
                <span className="text-muted-foreground flex items-center gap-2">
                  {d.unit && (
                    <Badge variant="outline" className="text-[10px]">
                      {d.unit === "business_days"
                        ? t("deadline.unitBusiness")
                        : t("deadline.unitCalendar")}
                    </Badge>
                  )}
                  {d.status === "not_assessed" ? (
                    <span className="italic">{t("deadline.notAssessed")}</span>
                  ) : (
                    <span
                      className={
                        d.status === "overdue"
                          ? "bg-destructive/20 text-foreground px-1.5 py-0.5"
                          : ""
                      }
                    >
                      {d.date ? formatDate(d.date) : ""}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      {canWrite && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? t("ui.saving") : t("ui.save")}
          </Button>
          <Button
            variant="outline"
            disabled={!positiveScope || sync.isPending}
            onClick={() => sync.mutate({ organizationId, aiSystemId })}
          >
            {sync.isPending ? t("ui.syncing") : t("ui.syncRequirements")}
          </Button>
          {!positiveScope && (
            <span className="text-[11px] text-muted-foreground">
              {t("ui.syncUnavailable")}
            </span>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/80 italic">
        {t("reviewMarkerNote")} {ADMT_RULES_REVIEW_MARKER[locale]}
      </p>
    </div>
  );
}

/**
 * Mirror of evaluateAdmtDefinition over the in-progress form, so the panel can
 * show the conclusion before anything is saved. The server remains the
 * authority; this only makes the conjunction visible while the user edits.
 */
function evaluateLocally(form: FormState): {
  isAdmt: boolean | null;
  failedProng: "A" | "B" | "C" | null;
} {
  if (form.determination === "ADMT")
    return { isAdmt: true, failedProng: null };
  if (form.determination === "NOT_ADMT" || form.determination === "ADMT_EXCLUDED_7001_E_3")
    return { isAdmt: false, failedProng: null };

  if (form.prongInterpretOutput === "NOT_SATISFIED")
    return { isAdmt: true, failedProng: "A" };
  if (form.prongReviewsOutputAndOtherInfo === "NOT_SATISFIED")
    return { isAdmt: true, failedProng: "B" };
  if (form.prongAuthorityToChange === "NOT_SATISFIED")
    return { isAdmt: true, failedProng: "C" };

  const allSatisfied =
    form.prongInterpretOutput === "SATISFIED" &&
    form.prongReviewsOutputAndOtherInfo === "SATISFIED" &&
    form.prongAuthorityToChange === "SATISFIED";

  return allSatisfied
    ? { isAdmt: false, failedProng: null }
    : { isAdmt: null, failedProng: null };
}
