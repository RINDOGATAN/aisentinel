"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { writeLocaleCookie } from "@/lib/locale-cookie";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const toggleLocale = () => {
    const next = locale === "es" ? "en" : "es";
    writeLocaleCookie(next);
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      className="text-xs text-muted-foreground hover:text-foreground"
    >
      {locale === "es" ? "EN" : "ES"}
    </Button>
  );
}
