// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { Mail } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function VerifyRequestPage() {
  const t = await getTranslations("signIn");
  return (
    <div className="w-full max-w-md">
      <div className="card-brutal text-center">
        <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t("verifyTitle")}</h1>
        <p className="text-muted-foreground mb-6">{t("verifyBody")}</p>
        <p className="text-sm text-muted-foreground">
          {t("verifyDidntReceive")}{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            {t("verifyTryAgain")}
          </Link>
        </p>
      </div>
    </div>
  );
}
