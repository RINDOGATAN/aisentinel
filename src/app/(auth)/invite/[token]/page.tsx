// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The link in an invitation e-mail. A visitor who is not signed in goes to
 * sign-in first and comes back here; a signed-in visitor sees what the
 * invitation offers and accepts it (src/server/services/team/invitations.ts).
 */

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InviteAccept } from "./invite-accept";

export const metadata = { robots: { index: false, follow: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    const query = new URLSearchParams({ callbackUrl: `/invite/${encodeURIComponent(token)}` });
    redirect(`/sign-in?${query.toString()}`);
  }
  return <InviteAccept token={token} email={session.user?.email ?? null} />;
}
