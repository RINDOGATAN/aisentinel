// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";
import { FrameworksFooter, FrameworksHeader } from "@/components/docs/frameworks/header";
import { FrameworksWheel } from "@/components/docs/frameworks/wheel";

export async function generateMetadata() {
  const t = await getTranslations("docs.frameworks.meta");
  return { title: t("overviewTitle"), description: t("description") };
}

export default function FrameworksOverviewPage() {
  return (
    <div className="space-y-8">
      <FrameworksHeader active="overview" showMethod />
      <FrameworksWheel />
      <FrameworksFooter />
    </div>
  );
}
