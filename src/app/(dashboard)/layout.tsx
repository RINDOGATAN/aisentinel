// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { MENU_COOKIE, SKIN_COOKIE, parseMenuCollapsed, parseSkin } from "@/lib/skin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { hostedPilotActive } from "@/config/pilot";
import { HostedPilotBanner } from "@/components/pilot/hosted-pilot-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/sign-in");
  }

  // Decided on the server: the platform signals that mark the hosted pilot
  // are not visible to the client bundle. The pilot banner is mounted here
  // and only here, so a visitor who has not signed in never sees it.
  // The layout choice is a cookie, read here so the first paint is already in
  // the chosen layout (src/lib/skin.ts). No cookie is Guided, so a new
  // visitor's very first render is already Guided.
  const cookieStore = await cookies();
  const skin = parseSkin(cookieStore.get(SKIN_COOKIE)?.value);
  const menuCollapsed = parseMenuCollapsed(cookieStore.get(MENU_COOKIE)?.value);

  return (
    <>
      <HostedPilotBanner />
      <DashboardShell hostedPilot={hostedPilotActive()} skin={skin} menuCollapsed={menuCollapsed}>
        {children}
      </DashboardShell>
    </>
  );
}
