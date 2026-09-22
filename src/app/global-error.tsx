// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

"use client";

// Replaces the root layout when the root layout itself fails, so it brings
// its own document, styles and dark theme.
import "./globals.css";
import { ErrorScreen } from "@/components/error-screen";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        <title>AI SENTINEL</title>
        <ErrorScreen error={error} retry={retry} back="home" />
      </body>
    </html>
  );
}
