"use client";

import { useSession } from "next-auth/react";

export function useUserType() {
  const { data: session, status, update } = useSession();
  const isLoading = status === "loading";
  return {
    userType: session?.user?.userType ?? null,
    isBusinessUser: session?.user?.userType === "BUSINESS_USER",
    isConsultant: session?.user?.userType === "AI_GOVERNANCE_CONSULTANT",
    // Only trigger onboarding when session is loaded and userType is null
    needsOnboarding: !isLoading && status === "authenticated" && session?.user?.userType == null,
    isLoading,
    refreshSession: update,
  };
}
