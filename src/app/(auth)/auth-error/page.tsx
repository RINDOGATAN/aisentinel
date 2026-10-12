// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { blockedEmailMessage } from "@/lib/email-policy";
import { EMAIL_NOT_ACCEPTED_ERROR } from "@/lib/auth-email-policy";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const t = await getTranslations("signIn");
  const { error } = await searchParams;
  // A sign-in refused by the e-mail policy (Google, cross-login) says so in
  // one calm sentence, the same one the e-mail field shows.
  const refused = error === EMAIL_NOT_ACCEPTED_ERROR;
  const body = refused ? blockedEmailMessage(await getLocale()) : t("errorBody");
  return (
    <div className="w-full max-w-md">
      <div className="card-brutal text-center">
        <div className="w-16 h-16 bg-destructive/20 flex items-center justify-center mx-auto mb-6 text-foreground">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t("errorTitle")}</h1>
        <p className="text-muted-foreground mb-6" data-testid={refused ? "email-not-accepted" : undefined}>{body}</p>
        <Link href="/sign-in" className="btn-brutal inline-block px-6 py-3">
          {t("errorTryAgain")}
        </Link>
      </div>
    </div>
  );
}
