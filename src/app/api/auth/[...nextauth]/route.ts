// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { withAuthRateLimit, type AuthRouteHandler } from "@/lib/auth-rate-limit";

const handler = NextAuth(authOptions);

// Credential sign-in and magic-link requests are counted before NextAuth sees
// them; every other auth path passes through untouched. See auth-rate-limit.ts.
const limited = withAuthRateLimit(handler as AuthRouteHandler);

export { limited as GET, limited as POST };
