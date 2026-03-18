"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type OrganizationRole = "OWNER" | "ADMIN" | "AI_OFFICER" | "MEMBER" | "VIEWER";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: OrganizationRole;
}

interface OrganizationContextType {
  organization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  /** Current user's role in the selected organization */
  userRole: OrganizationRole | null;
  /** Whether the current user can perform write operations (non-VIEWER) */
  canWrite: boolean;
  setOrganization: (org: Organization) => void;
  refetchOrganizations: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganizationState] = useState<Organization | null>(null);

  const { data: orgsData, isLoading, refetch } = trpc.organization.list.useQuery(undefined, {
    retry: false,
  });

  const organizations = orgsData ?? [];

  useEffect(() => {
    if (!organization && organizations.length > 0) {
      const savedOrgId = localStorage.getItem("currentOrganizationId");
      const savedOrg = organizations.find((o) => o.id === savedOrgId);
      setOrganizationState(savedOrg ?? organizations[0]);
    }
  }, [organizations, organization]);

  const setOrganization = (org: Organization) => {
    setOrganizationState(org);
    localStorage.setItem("currentOrganizationId", org.id);
  };

  const userRole = organization?.role ?? null;
  const canWrite = userRole !== null && userRole !== "VIEWER";

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        organizations,
        isLoading,
        userRole,
        canWrite,
        setOrganization,
        refetchOrganizations: refetch,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
