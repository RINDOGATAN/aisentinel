// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { getTranslations } from "next-intl/server";
import { FrameworksFooter, FrameworksHeader } from "@/components/docs/frameworks/header";
import { FrameworksTable } from "@/components/docs/frameworks/table";

export async function generateMetadata() {
  const t = await getTranslations("docs.frameworks.meta");
  return { title: t("tableTitle"), description: t("description") };
}

export default function FrameworksTablePage() {
  return (
    <div className="space-y-8 min-w-0">
      <FrameworksHeader active="table" />
      <FrameworksTable />
      <FrameworksFooter />
    </div>
  );
}
