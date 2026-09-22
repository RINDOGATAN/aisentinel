// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// A page that fails on purpose, so the smoke walk can prove a person sees the
// error page (a sentence, a reference, a way back) and never a blank page or a
// stack trace. Behind AISENTINEL_TEST_FAILURES; without it the path does not exist.
import { notFound } from "next/navigation";
import { testFailuresEnabled } from "@/server/routers/diagnostics";

export const dynamic = "force-dynamic";

export default function TestFailurePage() {
  if (!testFailuresEnabled()) notFound();
  throw new Error("deliberate page failure for the smoke walk");
}
