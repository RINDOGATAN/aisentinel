// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";
import { FrameworksFooter, FrameworksHeader } from "@/components/docs/frameworks/header";
import { FrameworksCompare } from "@/components/docs/frameworks/compare";

export async function generateMetadata() {
  const t = await getTranslations("docs.frameworks.meta");
  return { title: t("compareTitle"), description: t("description") };
}

// ?f=eu-ai-act&f=texas preselects up to three frameworks (the wheel's labels link here).
export default async function FrameworksComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { f } = await searchParams;
  const initial = (Array.isArray(f) ? f : f ? [f] : []).flatMap((v) => v.split(","));
  return (
    <div className="space-y-8">
      <FrameworksHeader active="compare" />
      <FrameworksCompare key={initial.join(",")} initial={initial} />
      <FrameworksFooter />
    </div>
  );
}
