// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * When to offer to empty a test account, and where that offer leads.
 *
 * The moment a person has their file is the moment the offer makes sense: the
 * work is safe on their machine and the copy on our servers has served its
 * purpose. So a successful export on the hosted pilot ends with one line saying
 * the account can now be emptied.
 *
 * Two conditions, both necessary:
 *   - the hosted pilot, because it is our servers the data is sitting on. On a
 *     kit installation the data is already on the customer's own machine and
 *     nobody needs prompting to clear it;
 *   - the owner, because only an owner can delete an organisation.
 *
 * The offer never deletes anything itself. It leads to the Settings card, where
 * the organisation's name still has to be typed. A one-click wipe from a toast
 * next to a download button is how someone loses work they meant to keep.
 *
 * Pure leaf module: no React, no Prisma, so the rule is testable on its own.
 */

/** Roles that can delete an organisation. Mirrors organization.delete. */
const CAN_DELETE = ["OWNER"] as const;

export function shouldOfferWipe(opts: {
  hostedPilot: boolean;
  role: string | null | undefined;
}): boolean {
  if (!opts.hostedPilot) return false;
  return CAN_DELETE.includes((opts.role ?? "") as (typeof CAN_DELETE)[number]);
}

/** The anchor the Settings delete card carries, so the offer lands on it. */
export const WIPE_ANCHOR = "delete-organization";

export const WIPE_TARGET = `/governance/settings#${WIPE_ANCHOR}`;
