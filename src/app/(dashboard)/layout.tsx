// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { MENU_COOKIE, parseMenuCollapsed } from "@/lib/menu-cookie";
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
    // A signed-in session lasts 12 hours; once it ends (or was never there)
    // the visitor is sent to sign-in with a plain message and comes back to
    // the page they were on. The path is set on the request by the middleware.
    const requestHeaders = await headers();
    const current = requestHeaders.get("x-pathname") ?? "/governance";
    const params = new URLSearchParams({ callbackUrl: current, reason: "signin-required" });
    redirect(`/sign-in?${params.toString()}`);
  }

  // Decided on the server: the platform signals that mark the hosted pilot
  // are not visible to the client bundle. The pilot banner is mounted here
  // and only here, so a visitor who has not signed in never sees it.
  // Whether the left menu is collapsed is a cookie, read here so the first
  // paint is already right (src/lib/menu-cookie.ts).
  const cookieStore = await cookies();
  const menuCollapsed = parseMenuCollapsed(cookieStore.get(MENU_COOKIE)?.value);

  return (
    <>
      <HostedPilotBanner />
      <DashboardShell hostedPilot={hostedPilotActive()} menuCollapsed={menuCollapsed}>
        {children}
      </DashboardShell>
    </>
  );
}
