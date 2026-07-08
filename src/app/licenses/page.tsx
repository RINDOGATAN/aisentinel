// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Licences & source — AI Sentinel",
  description:
    "AI Sentinel is licensed under the GNU Affero General Public License v3 or later. Complete corresponding source is available.",
  robots: { index: false, follow: true },
};

// AGPL section 13: the "Complete corresponding source" offer. Point at YOUR
// fork if you deploy a modified version; the exact commit is pinned when a
// build SHA is available so users get the source of *this* running version.
const SOURCE = process.env.NEXT_PUBLIC_SOURCE_URL || "https://github.com/RINDOGATAN/aisentinel";
const COMMIT = process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
const SOURCE_HREF = COMMIT ? `${SOURCE}/tree/${COMMIT}` : SOURCE;

export default function LicensesPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">
          Licences &amp; source
        </h1>

        <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">AI Sentinel</strong>
          </p>
          <p>Copyright (C) 2025-2026 Rindogatan LLC</p>
          <p>
            Licensed under the GNU Affero General Public License, version 3 or
            later (AGPL-3.0-or-later). A copy of the licence ships with the
            source as the <code>LICENSE</code> file.
          </p>
          <p>This program comes with ABSOLUTELY NO WARRANTY.</p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight mb-3 text-foreground">
            Complete corresponding source code
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Under AGPL-3.0 section 13, users interacting with this program over a
            network are offered the complete corresponding source code of the
            version running here:
          </p>
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
          {COMMIT && (
            <p className="mt-2 text-xs text-muted-foreground">
              Running commit: <code>{COMMIT}</code>
            </p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight mb-3 text-foreground">
            Premium skills
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Optional premium skills and commercial add-ons are separately
            licensed by Rindogatan LLC and are not covered by the AGPL. See
            the source repository for details.
          </p>
        </section>

        <div className="mt-12 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to AI Sentinel
          </Link>
        </div>
      </main>
    </div>
  );
}
