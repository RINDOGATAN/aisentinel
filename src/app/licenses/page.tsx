// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("licenses");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: true },
  };
}

// AGPL section 13: the "Complete corresponding source" offer. Point at YOUR
// fork if you deploy a modified version; the exact commit is pinned when a
// build SHA is available so users get the source of *this* running version.
const SOURCE = process.env.NEXT_PUBLIC_SOURCE_URL || "https://github.com/RINDOGATAN/aisentinel";
const COMMIT = process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
const SOURCE_HREF = COMMIT ? `${SOURCE}/tree/${COMMIT}` : SOURCE;
// The source repo is public, so link the exact-commit source by default. Set
// NEXT_PUBLIC_SOURCE_PUBLIC=false to fall back to the offer-on-request text
// (e.g. when deploying a private fork).
const SOURCE_PUBLIC = process.env.NEXT_PUBLIC_SOURCE_PUBLIC !== "false";

const SUPPORT_EMAIL = "support@rindogatan.com";

export default async function LicensesPage() {
  const t = await getTranslations("licenses");
  const code = (chunks: React.ReactNode) => <code>{chunks}</code>;
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">
          {t("title")}
        </h1>

        <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">AI Sentinel</strong>
          </p>
          <p>Copyright (C) 2025-2026 Rindogatan LLC</p>
          <p>{t.rich("license", { code })}</p>
          <p>{t("warranty")}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight mb-3 text-foreground">
            {t("sourceTitle")}
          </h2>
          {SOURCE_PUBLIC ? (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("sourcePublic")}</p>
              <p className="mt-3 text-sm">
                <a
                  href={SOURCE_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 break-all hover:text-foreground transition-colors"
                >
                  {SOURCE_HREF}
                </a>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.rich("sourceOnRequest", {
                email: SUPPORT_EMAIL,
                mail: (chunks) => (
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=AGPL%20corresponding%20source%20request`}
                    className="text-primary underline underline-offset-4 hover:text-foreground transition-colors"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          )}
          {COMMIT && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t.rich("runningCommit", { commit: COMMIT, code })}
            </p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight mb-3 text-foreground">
            {t("premiumTitle")}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("premium")}</p>
        </section>

        <div className="mt-12 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; {t("back")}
          </Link>
        </div>
      </main>
    </div>
  );
}
