// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { withAuthRateLimit, type AuthRouteHandler } from "@/lib/auth-rate-limit";
import { withEmailPolicy } from "@/lib/auth-email-policy";

const handler = NextAuth(authOptions);

// Credential sign-in and magic-link requests are counted before NextAuth sees
// them; every other auth path passes through untouched. See auth-rate-limit.ts.
// A refused address (src/lib/email-policy.ts) gets a 400 before any e-mail
// is sent or any account is created.
const limited = withAuthRateLimit(withEmailPolicy(handler as AuthRouteHandler));

export { limited as GET, limited as POST };
