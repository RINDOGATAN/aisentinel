// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function AuthErrorPage() {
  const t = await getTranslations("signIn");
  return (
    <div className="w-full max-w-md">
      <div className="card-brutal text-center">
        <div className="w-16 h-16 bg-destructive/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t("errorTitle")}</h1>
        <p className="text-muted-foreground mb-6">{t("errorBody")}</p>
        <Link href="/sign-in" className="btn-brutal inline-block px-6 py-3">
          {t("errorTryAgain")}
        </Link>
      </div>
    </div>
  );
}
