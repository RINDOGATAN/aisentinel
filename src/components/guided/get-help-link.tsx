"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * "Get help", in the page header on every page: a small link to the
 * company behind the product (brand.companyWebsite, so a white-label
 * deployment points at its own). It opens in a new tab, so the page in
 * progress stays where it is.
 */

import { useTranslations } from "next-intl";
import { LifeBuoy } from "lucide-react";
import { brand } from "@/config/brand";

export function GetHelpLink() {
  const t = useTranslations("nav");
  const title = t("getHelpTitle", { company: brand.companyName });
  return (
    <a
      href={`${brand.companyWebsite}/contact`}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="get-help-link"
    >
      <LifeBuoy className="size-4 shrink-0" aria-hidden="true" />
      <span className="hidden md:inline">{t("getHelp")}</span>
      <span className="sr-only">{title}</span>
    </a>
  );
}
