// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The sign-in (and sign-up: a first magic link creates the account) screen.
 * A server component so the hosted-pilot sentence is decided where the
 * platform signals are visible, then the client form renders it.
 */

import { hostedPilotActive } from "@/config/pilot";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return <SignInForm hostedPilot={hostedPilotActive()} />;
}
