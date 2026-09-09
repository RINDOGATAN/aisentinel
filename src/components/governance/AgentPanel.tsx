"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Agent governance for one AI system.
 *
 * The autonomy answer is the spine: it decides whether the agentic overlay
 * applies, which controls are expected, and whether the stress test runs. The
 * controls below it are asked progressively, because a system that only
 * proposes an action does not need a reversal window, and asking for one would
 * teach people to type something rather than think.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bot, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Autonomy = "NOT_ASSESSED" | "NONE" | "SUGGESTS" | "ACTS_WITH_APPROVAL" | "ACTS_AUTONOMOUSLY";

interface Form {
  autonomy: Autonomy;
  actionScope: string;
  downstreamAgents: string;
  tools: string;
  humanSponsor: string;
  killSwitch: string;
  killSwitchTestedAt: string;
  reversalWindow: string;
  traceability: string;
  notes: string;
}

/** Which fields are worth asking at each autonomy level. */
const FIELDS_FOR: Record<Autonomy, (keyof Form)[]> = {
  NOT_ASSESSED: [],
  NONE: [],
  SUGGESTS: ["actionScope", "downstreamAgents", "humanSponsor", "notes"],
  ACTS_WITH_APPROVAL: [
    "actionScope", "downstreamAgents", "tools", "humanSponsor",
    "killSwitch", "traceability", "notes",
  ],
  ACTS_AUTONOMOUSLY: [
    "actionScope", "downstreamAgents", "tools", "humanSponsor",
    "killSwitch", "killSwitchTestedAt", "reversalWindow", "traceability", "notes",
  ],
};

export function AgentPanel({
  organizationId,
  aiSystemId,
  canWrite,
}: {
  organizationId: string;
  aiSystemId: string;
  canWrite: boolean;
}) {
  const t = useTranslations("agent");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  // Edits overlaid on what is saved, rather than state seeded from an effect:
  // seeding in an effect cascades renders, and it goes stale the moment the
  // query refetches after a save.
  const [edits, setEdits] = useState<Partial<Form>>({});

  const { data: options } = trpc.agent.options.useQuery({ organizationId });
  const { data, isLoading } = trpc.agent.getProfile.useQuery({ organizationId, aiSystemId });

  const save = trpc.agent.upsertProfile.useMutation({
    onSuccess: () => {
      setEdits({});
      toast.success(t("saved"));
      void utils.agent.getProfile.invalidate();
      // Autonomy decides the agentic overlay, so everything downstream of
      // scope has to be refetched, not just this panel.
      void utils.regimes.getScope.invalidate();
      void utils.unified.getTemplate.invalidate();
      void utils.unified.stressTest.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const p = data.profile;
  const saved: Form = {
    autonomy: (p?.autonomy as Autonomy) ?? "NOT_ASSESSED",
    actionScope: p?.actionScope ?? "",
    downstreamAgents: p?.downstreamAgents ?? "",
    tools: (p?.tools ?? []).join("\n"),
    humanSponsor: p?.humanSponsor ?? "",
    killSwitch: p?.killSwitch ?? "",
    killSwitchTestedAt: p?.killSwitchTestedAt
      ? new Date(p.killSwitchTestedAt).toISOString().slice(0, 10)
      : "",
    reversalWindow: p?.reversalWindow ?? "",
    traceability: p?.traceability ?? "",
    notes: p?.notes ?? "",
  };
  const form: Form = { ...saved, ...edits };
  const setForm = (next: Form) => setEdits({ ...edits, ...next });
  const shown = FIELDS_FOR[form.autonomy];
  const assessment = data.assessment;
  const controlLabel = (id: string) =>
    options?.controls.find((c) => c.id === id)?.label ?? id;

  const field = (
    key: keyof Form,
    labelKey: string,
    helpKey: string | null,
    kind: "text" | "textarea" | "date" = "textarea",
  ) => (
    <div key={key} className="space-y-1.5">
      <label className="text-sm font-medium">{t(labelKey)}</label>
      {helpKey && <p className="text-xs text-muted-foreground">{t(helpKey)}</p>}
      {kind === "textarea" ? (
        <Textarea
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          disabled={!canWrite || save.isPending}
          rows={key === "tools" ? 4 : 3}
        />
      ) : (
        <Input
          type={kind === "date" ? "date" : "text"}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          disabled={!canWrite || save.isPending}
        />
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Autonomy: the one answer everything else follows from. */}
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("autonomyLabel")}</p>
          <div className="space-y-1.5">
            {(options?.autonomy ?? []).map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={!canWrite || save.isPending}
                onClick={() => setForm({ ...form, autonomy: option.value as Autonomy })}
                className={[
                  "w-full text-left rounded-md border px-3 py-2 transition-colors disabled:opacity-50",
                  form.autonomy === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40",
                ].join(" ")}
              >
                <span
                  className={
                    form.autonomy === option.value
                      ? "text-sm font-medium text-primary"
                      : "text-sm"
                  }
                >
                  {option.label}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">{option.help}</span>
              </button>
            ))}
          </div>
        </div>

        {/* What the current answer means, stated before the fields. */}
        <div
          className={[
            "rounded-md border p-3 text-xs",
            assessment.undetermined
              ? "border-warning/40 bg-warning/5 text-warning"
              : assessment.isAgentic
                ? "border-primary/40 bg-primary/5 text-muted-foreground"
                : "border-border bg-muted/20 text-muted-foreground",
          ].join(" ")}
        >
          {assessment.undetermined
            ? t("undetermined")
            : assessment.isAgentic
              ? t("isAgentic")
              : t("notAgentic")}
        </div>

        {shown.length > 0 && (
          <div className="space-y-5 border-t border-border pt-5">
            {shown.includes("actionScope") && field("actionScope", "fieldActionScope", "fieldActionScopeHelp")}
            {shown.includes("downstreamAgents") && field("downstreamAgents", "fieldDownstream", "fieldDownstreamHelp")}
            {shown.includes("tools") && field("tools", "fieldTools", "fieldToolsHelp")}
            {shown.includes("humanSponsor") && field("humanSponsor", "fieldSponsor", "fieldSponsorHelp", "text")}
            {shown.includes("killSwitch") && field("killSwitch", "fieldKillSwitch", "fieldKillSwitchHelp")}
            {shown.includes("killSwitchTestedAt") &&
              field("killSwitchTestedAt", "fieldKillSwitchTested", "fieldKillSwitchTestedHelp", "date")}
            {shown.includes("reversalWindow") && field("reversalWindow", "fieldReversal", "fieldReversalHelp", "text")}
            {shown.includes("traceability") && field("traceability", "fieldTraceability", "fieldTraceabilityHelp")}
            {shown.includes("notes") && field("notes", "fieldNotes", null)}
          </div>
        )}

        {/* What is still missing, from the saved profile rather than the form,
            so it reflects what is recorded and not what is typed. */}
        {!assessment.undetermined && (assessment.missing.length > 0 || assessment.recorded.length > 0) && (
          <div className="border-t border-border pt-4 space-y-3">
            {assessment.missing.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-warning flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t("controlsTitle")}
                </p>
                <ul className="space-y-1">
                  {assessment.missing.map((id) => (
                    <li key={id} className="text-xs text-muted-foreground">
                      {controlLabel(id)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-success flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t("controlsNone")}
              </p>
            )}
            {assessment.recorded.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {assessment.recorded.map((id) => (
                  <Badge key={id} variant="outline" className="text-[10px] border-success/50 text-success">
                    {controlLabel(id)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {canWrite && (
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  organizationId,
                  aiSystemId,
                  autonomy: form.autonomy,
                  actionScope: form.actionScope || null,
                  downstreamAgents: form.downstreamAgents || null,
                  tools: form.tools.split("\n").map((s) => s.trim()).filter(Boolean),
                  humanSponsor: form.humanSponsor || null,
                  killSwitch: form.killSwitch || null,
                  killSwitchTestedAt: form.killSwitchTestedAt
                    ? new Date(form.killSwitchTestedAt).toISOString()
                    : null,
                  reversalWindow: form.reversalWindow || null,
                  traceability: form.traceability || null,
                  notes: form.notes || null,
                })
              }
            >
              {save.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              {tc("save")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
