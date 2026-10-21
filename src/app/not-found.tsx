// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The page for an address that does not exist, in the reader's language and
 * the app's own style (instead of the framework's English default), with a way
 * to the dashboard and to the start page. Same card as the error screens
 * (src/components/error-screen.tsx).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notFound");
  return { title: t("pageTitle") };
}

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <p className="text-lg mb-6 font-semibold uppercase tracking-wide">{brand.name}</p>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="text-xs font-mono text-muted-foreground">{t("code")}</p>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("body")}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href="/governance"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("dashboard")}
          </Link>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted/50"
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
