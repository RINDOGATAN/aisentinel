"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// The "for my department" choice, shared between the menu switch and the
// dashboard. It is a per-organization preference kept in localStorage, so it
// survives a reload and does not leak between organizations. localStorage is an
// external store, so it is read through useSyncExternalStore: a custom event
// keeps every reader in step within the tab, and the native storage event keeps
// other tabs in step. Null means the whole organization (a limited member is
// still narrowed to their departments by the server).

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "aisentinel:department-scope";
const storageKey = (organizationId: string) => `departmentScope:${organizationId}`;

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useDepartmentScope(organizationId: string | undefined) {
  const getSnapshot = useCallback(
    () => (organizationId ? localStorage.getItem(storageKey(organizationId)) : null),
    [organizationId],
  );
  // The server has no localStorage; it always reads the whole organization.
  const departmentId = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const setDepartmentId = useCallback(
    (id: string | null) => {
      if (!organizationId) return;
      if (id) localStorage.setItem(storageKey(organizationId), id);
      else localStorage.removeItem(storageKey(organizationId));
      window.dispatchEvent(new Event(EVENT));
    },
    [organizationId],
  );

  return { departmentId, setDepartmentId };
}
