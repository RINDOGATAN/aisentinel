// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one switch for the customer-facing chatbot overlay
 * (src/config/chatbot-overlay.ts).
 *
 * CHATBOT_OVERLAY_ENABLED is read at request time on the server. Unset, or any
 * value other than the exact string "true", means off: the four questions are
 * not asked, no control row is added to any system, the overlay's framework
 * is hidden, and the places that exist only for the overlay are not offered
 * by the pickers or accepted by the server.
 */

export function chatbotOverlayEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.CHATBOT_OVERLAY_ENABLED === "true";
}
