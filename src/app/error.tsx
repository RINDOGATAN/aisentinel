// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

"use client";

// Catches what the route groups' own error pages cannot: a failure in a
// group's layout, and the pages outside any group.
import { ErrorScreen } from "@/components/error-screen";

export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorScreen error={error} retry={retry} back="home" />;
}
