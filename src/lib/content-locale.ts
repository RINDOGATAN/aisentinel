// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

"use client";

import { useLocale } from "next-intl";
import type { ContentLocale } from "@/config/lawfirm-ai-toolkit";

/**
 * The locale to read bilingual content in, on the client. The product has two
 * content languages; anything that is not Spanish reads as English, matching
 * the server's resolveContentLocale (src/config/lawfirm-ai-toolkit.ts).
 */
export function useContentLocale(): ContentLocale {
  return useLocale() === "es" ? "es" : "en";
}
