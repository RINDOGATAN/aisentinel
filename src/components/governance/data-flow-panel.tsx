"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Data flow for one AI system: in, out, and the terms.
 *
 * Three things the register never held: the role the organisation plays for
 * this processing, which sensitive categories are actually present, and who
 * receives the data under what contract and for how long. They are the facts an
 * impact assessment, a record of processing and a US risk assessment all turn
 * on, and the ones that are hardest to reconstruct after the fact.
 *
 * The panel says plainly what is missing (a recipient with no contract, a
 * disclosure with no retention), because an empty field here is the finding.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";
import {
  DATA_ROLES,
  RECIPIENT_TYPES,
  SENSITIVE_CATEGORIES,
  isBeyondOurControl,
  sensitiveCategoryLabel,
  type SensitiveCategoryId,
} from "@/config/data-categories";

export function DataFlowPanel({
  organizationId,
  aiSystemId,
  canWrite,
}: {
  organizationId: string;
  aiSystemId: string;
  canWrite: boolean;
}) {
  const t = useTranslations("dataFlow");
  const locale = useLocale();
  const lang = locale === "es" ? "es" : "en";
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.dataFlow.getForSystem.useQuery(
    { organizationId, aiSystemId },
    { enabled: !!organizationId && !!aiSystemId },
  );

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof RECIPIENT_TYPES)[number]>("ADVERTISING_PLATFORM");
  const [purpose, setPurpose] = useState("");
  const [contractRef, setContractRef] = useState("");
  const [retentionPeriod, setRetentionPeriod] = useState("");
  const [transferMechanism, setTransferMechanism] = useState("");
  const [categories, setCategories] = useState<SensitiveCategoryId[]>([]);

  const invalidate = () => utils.dataFlow.getForSystem.invalidate({ organizationId, aiSystemId });

  const setFacts = trpc.dataFlow.setSystemFlowFacts.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      void invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const setSourceFacts = trpc.dataFlow.setSourceFacts.useMutation({
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const addRecipient = trpc.dataFlow.addRecipient.useMutation({
    onSuccess: () => {
      toast.success(t("recipientAdded"));
      setName("");
      setPurpose("");
      setContractRef("");
      setRetentionPeriod("");
      setTransferMechanism("");
      setCategories([]);
      setAdding(false);
      void invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeRecipient = trpc.dataFlow.removeRecipient.useMutation({
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
  }

  const gapCount =
    data.summary.recipientsWithoutContract + data.summary.recipientsWithoutRetention;

  return (
    <div className="space-y-4">
      {/* Roles and retention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("rolesTitle")}</CardTitle>
          <CardDescription>{t("rolesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("dataRole")}</Label>
            <Select
              value={data.dataRole}
              disabled={!canWrite}
              onValueChange={(v) =>
                setFacts.mutate({
                  organizationId,
                  aiSystemId,
                  dataRole: v as (typeof DATA_ROLES)[number],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`role.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="transaction-role">
              {t("transactionRole")}
            </Label>
            <Input
              id="transaction-role"
              defaultValue={data.transactionRole ?? ""}
              disabled={!canWrite}
              placeholder={t("transactionRolePlaceholder")}
              onBlur={(e) =>
                setFacts.mutate({
                  organizationId,
                  aiSystemId,
                  transactionRole: e.target.value || null,
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="retention">
              {t("retention")}
            </Label>
            <Input
              id="retention"
              defaultValue={data.retentionPeriod ?? ""}
              disabled={!canWrite}
              placeholder={t("retentionPlaceholder")}
              onBlur={(e) =>
                setFacts.mutate({
                  organizationId,
                  aiSystemId,
                  retentionPeriod: e.target.value || null,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* What comes in */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-primary" />
            {t("inboundTitle")}
          </CardTitle>
          <CardDescription>{t("inboundDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.dataSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noSources")}</p>
          ) : (
            data.dataSources.map((s) => (
              <div key={s.id} className="border rounded-md p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{s.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {s.sourceType}
                  </Badge>
                  {s.containsPersonalData && (
                    <Badge variant="outline" className="text-[10px] border-warning text-warning">
                      {t("personalData")}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    className="h-8 text-xs"
                    defaultValue={s.origin ?? ""}
                    disabled={!canWrite}
                    placeholder={t("originPlaceholder")}
                    onBlur={(e) =>
                      setSourceFacts.mutate({
                        organizationId,
                        dataSourceId: s.id,
                        origin: e.target.value || null,
                      })
                    }
                  />
                  <Input
                    className="h-8 text-xs"
                    defaultValue={s.retentionPeriod ?? ""}
                    disabled={!canWrite}
                    placeholder={t("retentionPlaceholder")}
                    onBlur={(e) =>
                      setSourceFacts.mutate({
                        organizationId,
                        dataSourceId: s.id,
                        retentionPeriod: e.target.value || null,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">{t("sensitiveHere")}</p>
                  <div className="flex flex-wrap gap-2">
                    {SENSITIVE_CATEGORIES.map((c) => {
                      const on = s.sensitiveCategories.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-1.5 text-xs cursor-pointer"
                        >
                          <Checkbox
                            checked={on}
                            disabled={!canWrite}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...s.sensitiveCategories, c.id]
                                : s.sensitiveCategories.filter((x) => x !== c.id);
                              setSourceFacts.mutate({
                                organizationId,
                                dataSourceId: s.id,
                                sensitiveCategories: next as SensitiveCategoryId[],
                              });
                            }}
                          />
                          {c.label[lang]}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Where it goes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpFromLine className="w-4 h-4 text-primary" />
                {t("outboundTitle")}
              </CardTitle>
              <CardDescription>{t("outboundDescription")}</CardDescription>
            </div>
            {canWrite && !adding && (
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                {t("addRecipient")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {gapCount > 0 && (
            <p className="text-xs text-warning">
              {t("gaps", {
                contracts: data.summary.recipientsWithoutContract,
                retention: data.summary.recipientsWithoutRetention,
              })}
            </p>
          )}

          {data.summary.sensitiveDisclosedBeyondControl.length > 0 && (
            <p className="text-xs text-destructive">
              {t("sensitiveLeaves", {
                categories: data.summary.sensitiveDisclosedBeyondControl
                  .map((c) => sensitiveCategoryLabel(c, lang))
                  .join(", "),
              })}
            </p>
          )}

          {data.dataRecipients.length === 0 && !adding ? (
            <p className="text-sm text-muted-foreground">{t("noRecipients")}</p>
          ) : (
            data.dataRecipients.map((r) => (
              <div key={r.id} className="border rounded-md p-3 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{r.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {t(`recipientType.${r.type}`)}
                  </Badge>
                  {isBeyondOurControl(r.type) && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-warning text-warning"
                    >
                      {t("beyondControl")}
                    </Badge>
                  )}
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
                      onClick={() => removeRecipient.mutate({ organizationId, id: r.id })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                {r.purpose && <p className="text-xs text-muted-foreground">{r.purpose}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {r.sensitiveCategories.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px]">
                      {sensitiveCategoryLabel(c, lang)}
                    </Badge>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {r.contractRef ? `${t("contract")}: ${r.contractRef}` : t("noContract")}
                  {" · "}
                  {r.retentionPeriod
                    ? `${t("retention")}: ${r.retentionPeriod}`
                    : t("noRetention")}
                  {r.transferMechanism ? ` · ${r.transferMechanism}` : ""}
                </p>
              </div>
            ))
          )}

          {adding && (
            <div className="border rounded-md p-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("recipientName")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("recipientTypeLabel")}</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as (typeof RECIPIENT_TYPES)[number])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECIPIENT_TYPES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {t(`recipientType.${r}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{t("purpose")}</Label>
                <Textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={t("purposePlaceholder")}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("contract")}</Label>
                  <Input
                    value={contractRef}
                    onChange={(e) => setContractRef(e.target.value)}
                    placeholder={t("contractPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("retention")}</Label>
                  <Input
                    value={retentionPeriod}
                    onChange={(e) => setRetentionPeriod(e.target.value)}
                    placeholder={t("retentionPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("transfer")}</Label>
                  <Input
                    value={transferMechanism}
                    onChange={(e) => setTransferMechanism(e.target.value)}
                    placeholder={t("transferPlaceholder")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">{t("sensitiveSent")}</p>
                <div className="flex flex-wrap gap-2">
                  {SENSITIVE_CATEGORIES.map((c) => (
                    <label key={c.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox
                        checked={categories.includes(c.id)}
                        onCheckedChange={(checked) =>
                          setCategories((prev) =>
                            checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                          )
                        }
                      />
                      {c.label[lang]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!name.trim() || addRecipient.isPending}
                  onClick={() =>
                    addRecipient.mutate({
                      organizationId,
                      aiSystemId,
                      name: name.trim(),
                      type,
                      purpose: purpose || undefined,
                      contractRef: contractRef || undefined,
                      retentionPeriod: retentionPeriod || undefined,
                      transferMechanism: transferMechanism || undefined,
                      sensitiveCategories: categories,
                    })
                  }
                >
                  {addRecipient.isPending && (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  )}
                  {t("save")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
