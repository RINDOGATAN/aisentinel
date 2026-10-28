// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The members card and a DPO Central firm team (team-card.tsx): firm rows are
 * listed apart, one group per consultant, with no role picker and no remove
 * button; the group says it is managed in DPO Central, with the way there
 * for the consultant only. EN and ES.
 */

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import { splitFirmMembers } from "@/lib/firm-members";

const members = vi.hoisted(() => [
  { id: "m1", userId: "cons", role: "OWNER", user: { name: "Consultant", email: "cons@firm.example" } },
  { id: "m2", userId: "client", role: "ADMIN", user: { name: "Client admin", email: "admin@client.example" } },
  {
    id: "m3",
    userId: "staff",
    role: "AI_OFFICER",
    firmTeamMemberId: "f1",
    firmTeamMember: { ownerEmail: "cons@firm.example" },
    user: { name: "Firm staff", email: "staff@firm.example" },
  },
]);

vi.mock("@/lib/trpc", () => {
  const query = (data: unknown) => ({ useQuery: () => ({ data }) });
  const mutation = { useMutation: () => ({ mutate: vi.fn(), isPending: false }) };
  return {
    trpc: {
      useUtils: () => ({}),
      organization: { getById: query({ members }), updateMember: mutation, removeMember: mutation },
      team: { invitations: query([]), invite: mutation, resend: mutation, revoke: mutation },
      businessUnit: { listForScope: query({ departments: [] }) },
    },
  };
});

import { TeamCard } from "./team-card";

function render(locale: "en" | "es", currentUserId: string, currentRole: "OWNER" | "ADMIN") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en} timeZone="Europe/Madrid">
      <TeamCard organizationId="o1" currentRole={currentRole} currentUserId={currentUserId} />
    </NextIntlClientProvider>,
  );
}

// From the firm group to the invitation form that follows it.
const firmBlock = (html: string) => html.slice(html.indexOf('data-testid="firm-group"'), html.indexOf('for="team-invite-email"'));

describe("the members card with a firm team", () => {
  it("splits firm rows from the organisation's own members, by consultant", () => {
    const { own, firmGroups } = splitFirmMembers(members);
    expect(own.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(firmGroups).toEqual([{ ownerEmail: "cons@firm.example", members: [members[2]] }]);
  });

  it("shows the client a separate group without controls, managed in DPO Central", () => {
    const html = render("en", "client", "ADMIN");
    const block = firmBlock(html);
    expect(block).toContain("Consultant&#x27;s firm team");
    expect(block).toContain("managed in DPO Central");
    expect(block).toContain("staff@firm.example");
    expect(block).not.toContain("<button");
    expect(block).not.toContain('role="combobox"');
    expect(block).not.toContain("href=");
  });

  it("gives the consultant the way to the team in DPO Central", () => {
    const block = firmBlock(render("en", "cons", "OWNER"));
    expect(block).toContain("Your firm team");
    expect(block).toContain("Managed in DPO Central");
    expect(block).toContain('href="https://dpocentral.todo.law/privacy/settings#firm-team"');
    expect(block).not.toContain("<button");
  });

  it("says the same in Spanish, with tú and no long dashes", () => {
    const block = firmBlock(render("es", "cons", "OWNER"));
    expect(block).toContain("Tu equipo");
    expect(block).toContain("Se gestiona en DPO Central: cambia su rol o quítalas en");
    const client = firmBlock(render("es", "client", "ADMIN"));
    expect(client).toContain("Equipo de Consultant");
    for (const key of ["firmGroup", "firmGroupOwner", "firmManaged", "firmManagedOwner", "firmManagedOwnerNoLink"] as const) {
      expect(es.team[key]).not.toMatch(/[—–]/);
      expect(en.team[key]).not.toMatch(/[—–]/);
      expect(es.team[key]).not.toMatch(/\busted\b/i);
    }
  });
});
