// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";
import { FrameworksFooter, FrameworksHeader } from "@/components/docs/frameworks/header";
import { FrameworksSelector } from "@/components/docs/frameworks/selector";

export async function generateMetadata() {
  const t = await getTranslations("docs.frameworks.meta");
  return { title: t("selectorTitle"), description: t("description") };
}

export default function FrameworksSelectorPage() {
  return (
    <div className="space-y-8">
      <FrameworksHeader active="selector" />
      <FrameworksSelector />
      <FrameworksFooter />
    </div>
  );
}
