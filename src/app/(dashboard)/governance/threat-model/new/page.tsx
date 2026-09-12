"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The thirty-minute session.
 *
 * Three screens, no blank pages. Say what you are building, tick what it can
 * see and do, and the scenarios appear with their controls and a test for each
 * before anything is saved. The team's work is arguing with the list.
 *
 * The capability step is the whole trick: it is the only place where a person
 * has to think, and it takes about four minutes.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useOrganization } from "@/lib/organization-context";
import {
  CAPABILITIES,
  CAPABILITY_GROUPS,
  CAPABILITY_GROUP_LABELS,
  CATEGORY_QUESTIONS,
  SESSION_QUESTIONS,
  priorityFor,
  suggestScenarios,
} from "@/config/threat-model";
import { CapabilityMap, LoopStrip } from "@/components/governance/threat-model-visuals";

const NONE = "__none__";

export default function NewThreatModelPage() {
  const t = useTranslations("threatModel");
  const locale = useLocale();
  const lang = locale === "es" ? "es" : "en";
  const router = useRouter();
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [systemId, setSystemId] = useState<string>(NONE);
  const [capabilities, setCapabilities] = useState<string[]>([]);

  const { data: systems } = trpc.aiSystem.list.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId },
  );

  const create = trpc.threatModel.create.useMutation({
    onSuccess: (model) => {
      toast.success(t("created", { count: model.scenariosAdded }));
      router.push(`/governance/threat-model/${model.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  // Proposed locally so the list moves as the boxes are ticked. The server
  // applies the same function, so what is shown is what gets saved.
  const proposed = useMemo(() => suggestScenarios(capabilities), [capabilities]);

  const toggle = (id: string) =>
    setCapabilities((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const steps = [t("loop.map"), t("loop.imagine"), t("loop.prioritise"), t("loop.control"), t("loop.test")];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          {t("newTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("newSubtitle")}</p>
      </div>

      <LoopStrip steps={steps} active={step === 0 ? 0 : step === 1 ? 0 : 1} />

      {/* ── Step 1: what are you building */}
      {step === 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="tm-name">
                {t("nameLabel")}
              </Label>
              <Input
                id="tm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="tm-summary">
                {t("summaryLabel")}
              </Label>
              <Textarea
                id="tm-summary"
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t("summaryPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("systemLabel")}</Label>
              <Select value={systemId} onValueChange={setSystemId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("systemPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("systemNone")}</SelectItem>
                  {(Array.isArray(systems) ? systems : (systems?.items ?? [])).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border p-3 space-y-1.5">
              <p className="text-xs font-medium">{t("sessionTitle")}</p>
              {SESSION_QUESTIONS.map((q) => (
                <p key={q.en} className="text-xs text-muted-foreground">
                  · {q[lang]}
                </p>
              ))}
            </div>

            <Button disabled={!name.trim()} onClick={() => setStep(1)}>
              {t("next")}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: what can it see and do */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium">{t("mapTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("mapHint")}</p>
              </div>

              {CAPABILITY_GROUPS.map((group) => (
                <div key={group} className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {CAPABILITY_GROUP_LABELS[group][lang]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CAPABILITIES.filter((c) => c.group === group).map((c) => {
                      const on = capabilities.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggle(c.id)}
                          title={c.note[lang]}
                          className={`text-xs rounded-full border px-3 py-1.5 transition-colors ${
                            on
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {c.label[lang]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {capabilities.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <CapabilityMap capabilities={capabilities} lang={lang} title={name || t("title")} />
                <p className="text-sm">
                  {t("willPropose", { count: proposed.length })}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t("back")}
            </Button>
            <Button disabled={capabilities.length === 0} onClick={() => setStep(2)}>
              {t("seeScenarios")}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: argue with the list, then save */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-sm font-medium">{t("proposedTitle", { count: proposed.length })}</p>
              <p className="text-xs text-muted-foreground">{t("proposedHint")}</p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {proposed.map((s) => {
              const p = priorityFor(s.defaults.impact, s.defaults.likelihood, s.defaults.blastRadius);
              return (
                <Card key={s.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          p.priority === "ACT_NOW"
                            ? "border-destructive/50 text-destructive"
                            : p.priority === "PLAN"
                              ? "border-warning/50 text-warning"
                              : "text-muted-foreground"
                        }`}
                      >
                        {t(`priority.${p.priority}`)}
                      </Badge>
                      <span className="text-sm font-medium">{s.title[lang]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.story[lang]}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("bringsControls", { count: s.controls.length })}
                    </p>
                    <p className="text-[11px] text-muted-foreground italic">
                      {CATEGORY_QUESTIONS[s.category][lang]}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t("back")}
            </Button>
            <Button
              disabled={create.isPending}
              onClick={() =>
                create.mutate({
                  organizationId: orgId,
                  name: name.trim(),
                  systemSummary: summary || undefined,
                  aiSystemId: systemId === NONE ? undefined : systemId,
                  capabilities,
                  acceptProposed: true,
                })
              }
            >
              {create.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {t("createWith", { count: proposed.length })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
