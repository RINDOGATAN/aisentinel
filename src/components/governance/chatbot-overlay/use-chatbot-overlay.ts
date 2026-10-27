"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Whether the customer-facing chatbot overlay is switched on, for the screens.
 * The switch is a server setting (CHATBOT_OVERLAY_ENABLED); until the answer
 * arrives, and on any error, the overlay counts as off.
 */

import { trpc } from "@/lib/trpc";

export function useChatbotOverlayEnabled(): boolean {
  const { data } = trpc.chatbotOverlay.status.useQuery(undefined, {
    staleTime: Infinity,
    retry: false,
  });
  return data?.enabled === true;
}
