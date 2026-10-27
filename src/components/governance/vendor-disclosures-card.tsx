"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The provider's own published documents about its models, on the vendor
 * page (src/config/provider-disclosures.ts): links, two yes / no / unknown
 * answers and the date they were last checked. Read first; "Edit" opens the
 * fields and "Save" writes them through `vendor.update`.
 */

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, FileSearch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useFormatDate } from "@/lib/use-format-date";
import {
  DISCLOSURE_ANSWERS,
  DISCLOSURE_ANSWER_FIELDS,
  DISCLOSURE_LINK_FIELDS,
  cleanDisclosureUrl,
  hasDisclosures,
  type DisclosureAnswerValue,
  type ProviderDisclosures,
} from "@/config/provider-disclosures";

/** The guide on frontier-model rules (src/config/help/guides.ts, "frontier-ai"). */
const FRONTIER_GUIDE_HREF = "/docs/guides/frontier-ai";

interface Draft {
  safetyFrameworkUrl: string;
  transparencyReportUrl: string;
  modelCardUrl: string;
  signedGpaiCode: DisclosureAnswerValue;
  frontierDeveloper: DisclosureAnswerValue;
  disclosuresCheckedAt: string;
}

function toDraft(v: ProviderDisclosures): Draft {
  const checked = v.disclosuresCheckedAt ? new Date(v.disclosuresCheckedAt) : null;
  return {
    safetyFrameworkUrl: v.safetyFrameworkUrl ?? "",
    transparencyReportUrl: v.transparencyReportUrl ?? "",
    modelCardUrl: v.modelCardUrl ?? "",
    signedGpaiCode: v.signedGpaiCode ?? "UNKNOWN",
    frontierDeveloper: v.frontierDeveloper ?? "UNKNOWN",
    disclosuresCheckedAt: checked && !Number.isNaN(checked.getTime()) ? checked.toISOString().slice(0, 10) : "",
  };
}

export function VendorDisclosuresCard({
  organizationId,
  vendorId,
  disclosures,
  canWrite,
}: {
  organizationId: string;
  vendorId: string;
  disclosures: ProviderDisclosures;
  canWrite: boolean;
}) {
  const t = useTranslations("vendorDetail.disclosures");
  const { formatDate } = useFormatDate();
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<Draft | null>(null);
  const update = trpc.vendor.update.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      void utils.vendor.getById.invalidate({ organizationId, id: vendorId });
    },
    onError: (err) => toast.error(err.message),
  });

  const badLinks = draft ? DISCLOSURE_LINK_FIELDS.filter((f) => cleanDisclosureUrl(draft[f]) === undefined) : [];

  const save = () => {
    if (!draft || badLinks.length > 0) return;
    update.mutate({
      organizationId,
      id: vendorId,
      safetyFrameworkUrl: draft.safetyFrameworkUrl,
      transparencyReportUrl: draft.transparencyReportUrl,
      modelCardUrl: draft.modelCardUrl,
      signedGpaiCode: draft.signedGpaiCode,
      frontierDeveloper: draft.frontierDeveloper,
      disclosuresCheckedAt: draft.disclosuresCheckedAt || null,
    });
  };

  return (
    <Card data-testid="vendor-disclosures">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-primary" aria-hidden="true" />
            {t("title")}
          </CardTitle>
          <CardDescription>
            {t("help")}{" "}
            <Link href={FRONTIER_GUIDE_HREF} className="text-primary underline underline-offset-2 hover:text-primary/80">
              {t("guide")}
            </Link>
          </CardDescription>
        </div>
        {canWrite && !draft && (
          <Button variant="outline" size="sm" onClick={() => setDraft(toDraft(disclosures))}>
            {t("edit")}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {draft ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {DISCLOSURE_LINK_FIELDS.map((field) => {
                const invalid = badLinks.includes(field);
                return (
                  <div key={field} className="space-y-1.5 min-w-0">
                    <Label htmlFor={`disclosure-${field}`}>{t(`fields.${field}`)}</Label>
                    <Input
                      id={`disclosure-${field}`}
                      type="url"
                      inputMode="url"
                      placeholder="https://"
                      value={draft[field]}
                      aria-invalid={invalid || undefined}
                      aria-describedby={invalid ? `disclosure-${field}-error` : undefined}
                      onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                    />
                    {invalid && (
                      <p id={`disclosure-${field}-error`} className="text-xs text-destructive">
                        {t("badLink")}
                      </p>
                    )}
                  </div>
                );
              })}
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="disclosure-checked">{t("fields.disclosuresCheckedAt")}</Label>
                <Input
                  id="disclosure-checked"
                  type="date"
                  value={draft.disclosuresCheckedAt}
                  onChange={(e) => setDraft({ ...draft, disclosuresCheckedAt: e.target.value })}
                />
              </div>
            </div>
            {DISCLOSURE_ANSWER_FIELDS.map((field) => (
              <fieldset key={field} className="space-y-1.5">
                <legend className="text-sm font-medium">{t(`fields.${field}`)}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {DISCLOSURE_ANSWERS.map((answer) => (
                    <label key={answer} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`disclosure-${field}`}
                        value={answer}
                        checked={draft[field] === answer}
                        onChange={() => setDraft({ ...draft, [field]: answer })}
                        className="peer sr-only"
                      />
                      <span className="inline-flex min-h-11 sm:min-h-8 items-center rounded-md border px-3 text-xs border-input peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                        {t(`answers.${answer}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDraft(null)} disabled={update.isPending}>
                {t("cancel")}
              </Button>
              <Button onClick={save} disabled={update.isPending || badLinks.length > 0}>
                {t("save")}
              </Button>
            </div>
          </div>
        ) : hasDisclosures(disclosures) ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DISCLOSURE_LINK_FIELDS.map((field) => (
              <div key={field} className="min-w-0">
                <dt className="text-sm text-muted-foreground">{t(`fields.${field}`)}</dt>
                <dd className="text-sm break-all">
                  {disclosures[field] ? (
                    <a
                      href={disclosures[field]!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                    >
                      {disclosures[field]}
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{t("notRecorded")}</span>
                  )}
                </dd>
              </div>
            ))}
            {DISCLOSURE_ANSWER_FIELDS.map((field) => (
              <div key={field} className="min-w-0">
                <dt className="text-sm text-muted-foreground">{t(`fields.${field}`)}</dt>
                <dd className="text-sm">{t(`answers.${disclosures[field] ?? "UNKNOWN"}`)}</dd>
              </div>
            ))}
            <div className="min-w-0">
              <dt className="text-sm text-muted-foreground">{t("fields.disclosuresCheckedAt")}</dt>
              <dd className="text-sm">
                {disclosures.disclosuresCheckedAt
                  ? formatDate(disclosures.disclosuresCheckedAt)
                  : t("notRecorded")}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        )}
      </CardContent>
    </Card>
  );
}
