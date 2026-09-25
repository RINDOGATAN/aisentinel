"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Small pieces shared by the AIUC-1 pages: the "ready for audit" badge, a
 * requirement's state badge, and one domain's line ("B Security · 7 of 12
 * tested, 1 fail"). The status is always in words; the colour only repeats it.
 */

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { RequirementState, Tally } from "@/config/aiuc1-evidence";

export function ReadinessBadge({ ready }: { ready: boolean }) {
  const t = useTranslations("agentTesting");
  return (
    <Badge variant={ready ? "success" : "outline"} className="text-[11px]">
      {ready ? t("ready") : t("notReady")}
    </Badge>
  );
}

const STATE_VARIANT: Record<RequirementState, "success" | "warning" | "destructive" | "outline" | "info"> = {
  pass: "success",
  retest: "warning",
  partial: "warning",
  fail: "destructive",
  "not-tested": "outline",
  "not-applicable": "info",
};

export function StateBadge({ state, accepted }: { state: RequirementState; accepted: boolean }) {
  const t = useTranslations("agentTesting");
  const label = state === "partial" && accepted ? t("state.acceptedPartial") : t(`state.${state}`);
  return (
    <Badge variant={state === "partial" && accepted ? "success" : STATE_VARIANT[state]} className="text-[11px]">
      {label}
    </Badge>
  );
}

export function TallyLine({ code, tally }: { code: string; tally: Tally }) {
  const t = useTranslations("agentTesting");
  const parts = [
    t("tally.tested", { tested: tally.tested, total: tally.applicable }),
    ...(tally.fail > 0 ? [t("tally.fail", { count: tally.fail })] : []),
    ...(tally.partial - tally.acceptedPartial > 0
      ? [t("tally.partial", { count: tally.partial - tally.acceptedPartial })]
      : []),
    ...(tally.retest > 0 ? [t("tally.retest", { count: tally.retest })] : []),
    ...(tally.notApplicable > 0 ? [t("tally.notApplicable", { count: tally.notApplicable })] : []),
  ];
  return (
    <span className="break-words">
      <span className="font-medium">
        {code} {t(`domains.${code}`)}
      </span>
      <span aria-hidden="true"> · </span>
      <span className="sr-only">: </span>
      <span className="text-muted-foreground tabular-nums">{parts.join(", ")}</span>
    </span>
  );
}
