// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The members card lists memberships that came from a DPO Central firm team
 * apart from the organisation's own members, one group per consultant, with
 * no controls: those memberships are managed in DPO Central only (the server
 * refuses changes to them in organization.updateMember / removeMember).
 */

export type CardMember = {
  firmTeamMemberId?: string | null;
  firmTeamMember?: { ownerEmail: string } | null;
};

export type FirmGroup<M> = { ownerEmail: string; members: M[] };

export function splitFirmMembers<M extends CardMember>(members: M[]): { own: M[]; firmGroups: FirmGroup<M>[] } {
  const own: M[] = [];
  const groups = new Map<string, FirmGroup<M>>();
  for (const m of members) {
    const ownerEmail = m.firmTeamMemberId ? m.firmTeamMember?.ownerEmail : undefined;
    if (!ownerEmail) {
      own.push(m);
      continue;
    }
    const g = groups.get(ownerEmail) ?? { ownerEmail, members: [] };
    g.members.push(m);
    groups.set(ownerEmail, g);
  }
  return { own, firmGroups: [...groups.values()] };
}
