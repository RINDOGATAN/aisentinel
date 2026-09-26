// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The sign-in (and sign-up: a first magic link creates the account) screen.
 * A server component so the hosted-pilot sentence is decided where the
 * platform signals are visible, then the client form renders it.
 */

import { hostedPilotActive } from "@/config/pilot";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reason?: string }>;
}) {
  const { callbackUrl, reason } = await searchParams;
  // Only accept a same-app return path, never an absolute URL to elsewhere.
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/governance";
  return (
    <SignInForm
      hostedPilot={hostedPilotActive()}
      callbackUrl={safeCallback}
      showSignInRequired={reason === "signin-required"}
    />
  );
}
