// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { hostedPilotActive } from "@/config/pilot";

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
  // are not visible to the client bundle.
  return <DashboardShell hostedPilot={hostedPilotActive()}>{children}</DashboardShell>;
}
