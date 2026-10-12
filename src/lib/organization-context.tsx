"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";

type OrganizationRole = "OWNER" | "ADMIN" | "AI_OFFICER" | "MEMBER" | "VIEWER";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: OrganizationRole;
  /** The hosted plan: "EU_CLOUD" is the paid plan; anything else the pilot. */
  plan?: string | null;
}

interface OrganizationContextType {
  organization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  /** Current user's role in the selected organization */
  userRole: OrganizationRole | null;
  /**
   * Whether the current user can perform write operations: not a VIEWER, and
   * the organisation is not read-only (a hosted pilot past its editing window).
   */
  canWrite: boolean;
  /**
   * Whether the current user can approve, decide and publish (OWNER, ADMIN,
   * AI_OFFICER), the roles the server checks for those mutations.
   */
  canDecide: boolean;
  /**
   * Whether the current user can delete register records (OWNER, ADMIN), the
   * roles src/server/services/authz/delete-roles.ts accepts.
   */
  canDelete: boolean;
  setOrganization: (org: Organization) => void;
  refetchOrganizations: () => void;
}

/**
 * The signed-in user's role in the selected organisation. The selected object
 * may come from a create call or a client switch, which carry no role; the
 * organisation list does, so it fills the gap. Without this a brand-new
 * organisation read as no role (so read-only, and the quick start hid its
 * first choice) until the page was reloaded.
 */
export function resolveRole(
  selected: Pick<Organization, "id" | "role"> | null,
  list: readonly Pick<Organization, "id" | "role">[],
): OrganizationRole | null {
  if (!selected) return null;
  return selected.role ?? list.find((o) => o.id === selected.id)?.role ?? null;
}

/** The roles the server lets approve, decide and publish. */
export const DECIDER_ROLES: readonly OrganizationRole[] = ["OWNER", "ADMIN", "AI_OFFICER"];

/** The roles the server lets delete register records. */
export const DELETER_ROLES: readonly OrganizationRole[] = ["OWNER", "ADMIN"];

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganizationState] = useState<Organization | null>(null);

  // Signed out (the sign-in page, the docs), there is nothing to ask for: the
  // call would only answer 401 and put an error in the browser console.
  const { status: sessionStatus } = useSession();
  const { data: orgsData, isLoading: listLoading, refetch } = trpc.organization.list.useQuery(
    undefined,
    { retry: false, enabled: sessionStatus === "authenticated" },
  );
  const isLoading = sessionStatus === "loading" || listLoading;

  const organizations = useMemo(() => orgsData ?? [], [orgsData]);

  useEffect(() => {
    if (!organization && organizations.length > 0) {
      const savedOrgId = localStorage.getItem("currentOrganizationId");
      const savedOrg = organizations.find((o) => o.id === savedOrgId);
      // Restores the persisted org selection once the org list query
      // resolves; localStorage cannot be read during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrganizationState(savedOrg ?? organizations[0]);
    }
  }, [organizations, organization]);

  const setOrganization = (org: Organization) => {
    setOrganizationState(org);
    localStorage.setItem("currentOrganizationId", org.id);
  };

  const userRole = resolveRole(organization, organizations);
  // The hosted pilot's editing window: once it is over the server refuses every
  // write (src/server/services/pilot/caps.ts), so the screens stop offering them.
  // Off the pilot the query answers { active: false } without counting anything.
  const { data: pilot } = trpc.pilot.status.useQuery(
    { organizationId: organization?.id ?? "" },
    { enabled: !!organization?.id, staleTime: 60 * 1000 },
  );
  const readOnly = pilot?.active === true && pilot.readOnly;
  const canWrite = userRole !== null && userRole !== "VIEWER" && !readOnly;
  const canDecide = canWrite && userRole !== null && DECIDER_ROLES.includes(userRole);
  const canDelete = canWrite && userRole !== null && DELETER_ROLES.includes(userRole);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        organizations,
        isLoading,
        userRole,
        canWrite,
        canDecide,
        canDelete,
        setOrganization,
        refetchOrganizations: refetch,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

/** The context when inside the provider, else undefined (components that also render without the app shell). */
export function useOptionalOrganization() {
  return useContext(OrganizationContext);
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
