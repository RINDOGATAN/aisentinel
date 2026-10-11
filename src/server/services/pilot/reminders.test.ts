// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Pilot-ending reminders (reminders.ts): the two send days, the transition
 * end (26 Oct 2026), never twice, owners and administrators only, the
 * language, and nothing when the switch is off, off the hosted pilot or for
 * an organisation on the paid plan.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import {
  endPhrase,
  isEuroMarket,
  pilotReminderKind,
  pilotRemindersEnabled,
  reminderLocale,
  renderPilotReminderEmail,
  replyToAddresses,
  runPilotReminders,
  type PilotReminderDb,
  type PilotReminderMail,
  type PilotReminderMailer,
} from "./reminders";
import { pilotEndsAt } from "@/config/pilot";

const DAY = 24 * 60 * 60 * 1000;
const ON = { PILOT_REMINDERS_ENABLED: "true", VERCEL_ENV: "production" };
const run = (isoDay: string) => new Date(`${isoDay}T07:15:00Z`);

type Role = "OWNER" | "ADMIN" | "AI_OFFICER" | "MEMBER" | "VIEWER";
interface Org {
  id: string;
  name: string;
  plan?: string;
  pilotFirstSignInAt: Date | null;
  operatingJurisdictions: string[];
  members: { role: Role; email: string }[];
}

function makeDb(orgs: Org[]) {
  const rows = new Map<string, Record<string, unknown>>();
  const findMany = vi.fn(async (args: { where: { pilotFirstSignInAt: { not: null } } }) => {
    void args;
    return orgs
      .filter((o) => o.pilotFirstSignInAt)
      .map((o) => ({ ...o, members: o.members.map((m) => ({ role: m.role, user: { email: m.email } })) }));
  });
  return {
    rows,
    organization: { findMany },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = data.id as string;
        if (rows.has(id)) throw Object.assign(new Error("Unique constraint"), { code: "P2002" });
        rows.set(id, data);
        return data;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        rows.delete(where.id);
        return {};
      }),
    },
  };
}
const asDb = (db: ReturnType<typeof makeDb>) => db as unknown as PilotReminderDb;

function makeMailer(fail = false) {
  const sent: PilotReminderMail[] = [];
  const mailer: PilotReminderMailer = {
    send: vi.fn(async (mail: PilotReminderMail) => {
      if (fail) throw new Error("refused");
      sent.push(mail);
    }),
  };
  return { mailer, sent };
}

const fresh = (over: Partial<Org> = {}): Org => ({
  id: "org-fresh",
  name: "Acme",
  pilotFirstSignInAt: new Date("2026-10-13T15:00:00Z"),
  operatingJurisdictions: [],
  members: [{ role: "OWNER", email: "owner@example.com" }],
  ...over,
});

async function sendDays(db: ReturnType<typeof makeDb>, from: string, to: string) {
  const { mailer, sent } = makeMailer();
  const days: string[] = [];
  for (let t = run(from).getTime(); t <= run(to).getTime(); t += DAY) {
    const before = sent.length;
    await runPilotReminders(asDb(db), mailer, new Date(t), ON);
    if (sent.length > before) days.push(new Date(t).toISOString().slice(0, 10));
  }
  return { days, sent };
}

describe("the send days", () => {
  it("is the run between 5 and 4 days before the end, and the run in the last 24 hours", () => {
    const end = new Date("2026-10-28T15:00:00Z");
    expect(pilotReminderKind(end, run("2026-10-23"))).toBeNull();
    expect(pilotReminderKind(end, run("2026-10-24"))).toBe("fiveDays");
    expect(pilotReminderKind(end, run("2026-10-27"))).toBeNull();
    expect(pilotReminderKind(end, run("2026-10-28"))).toBe("lastDay");
    expect(pilotReminderKind(end, run("2026-10-29"))).toBeNull();
  });

  it("sends exactly two e-mails over a whole pilot, on those two days", async () => {
    const { days, sent } = await sendDays(makeDb([fresh()]), "2026-10-12", "2026-11-02");
    expect(days).toEqual(["2026-10-24", "2026-10-28"]);
    expect(sent.map((m) => m.subject)).toEqual([
      "Your AI Sentinel pilot ends in 5 days",
      "Last day of your AI Sentinel pilot",
    ]);
  });
});

describe("the transition (pilots begun before 12 Oct 2026)", () => {
  it("ends with 26 October and is reminded on 22 and 26 October", async () => {
    const started = new Date("2026-09-25T09:00:00Z");
    expect(pilotEndsAt(started).toISOString()).toBe("2026-10-27T00:00:00.000Z");
    const { days } = await sendDays(makeDb([fresh({ pilotFirstSignInAt: started })]), "2026-10-12", "2026-10-30");
    expect(days).toEqual(["2026-10-22", "2026-10-26"]);
  });

  it("states the end in UTC in English and in peninsular time in Spanish", () => {
    const end = new Date("2026-10-27T00:00:00Z");
    expect(endPhrase(end, "en")).toBe("at the end of 26 October 2026 (UTC)");
    expect(endPhrase(end, "es")).toBe("el 27 de octubre de 2026 a la 01:00 (hora peninsular)");
  });
});

describe("never twice", () => {
  it("a second run the same day sends nothing", async () => {
    const db = makeDb([fresh()]);
    const { mailer, sent } = makeMailer();
    await runPilotReminders(asDb(db), mailer, run("2026-10-24"), ON);
    const second = await runPilotReminders(asDb(db), mailer, new Date(run("2026-10-24").getTime() + 3600_000), ON);
    expect(second.alreadySent).toBe(1);
    expect(sent).toHaveLength(1);
    expect([...db.rows.values()][0]).toMatchObject({ action: "PILOT_REMINDER_SENT", organizationId: "org-fresh" });
  });

  it("a failed delivery is retried at the next run", async () => {
    const db = makeDb([fresh()]);
    await runPilotReminders(asDb(db), makeMailer(true).mailer, run("2026-10-24"), ON);
    expect(db.rows.size).toBe(0);
    const ok = makeMailer();
    await runPilotReminders(asDb(db), ok.mailer, new Date(run("2026-10-24").getTime() + 3600_000), ON);
    expect(ok.sent).toHaveLength(1);
  });
});

describe("recipients", () => {
  it("are the owners and administrators only, with the operator as Reply-To", async () => {
    const db = makeDb([
      fresh({
        members: [
          { role: "OWNER", email: "owner@example.com" },
          { role: "ADMIN", email: "admin@example.com" },
          { role: "AI_OFFICER", email: "officer@example.com" },
          { role: "MEMBER", email: "member@example.com" },
          { role: "VIEWER", email: "viewer@example.com" },
        ],
      }),
    ]);
    const { mailer, sent } = makeMailer();
    await runPilotReminders(asDb(db), mailer, run("2026-10-24"), { ...ON, CONTACT_EMAIL: "ops@example.com" });
    expect(sent.map((m) => m.to).sort()).toEqual(["admin@example.com", "owner@example.com"]);
    expect(sent[0].replyTo).toEqual(["ops@example.com"]);
    const args = db.organization.findMany.mock.calls[0][0] as unknown as {
      include: { members: { where: { role: { in: string[] } } } };
    };
    expect(args.include.members.where.role.in).toEqual(["OWNER", "ADMIN"]);
    expect(replyToAddresses({})).toEqual(["info@todo.law"]);
  });
});

describe("language", () => {
  it("is Spanish for the euro market, else English", async () => {
    expect(isEuroMarket(["EU"])).toBe(true);
    expect(isEuroMarket(["EEA"])).toBe(true);
    expect(isEuroMarket(["EU", "US_CA"])).toBe(false);
    expect(isEuroMarket(["UK"])).toBe(false);
    expect(reminderLocale([])).toBe("en");
    const db = makeDb([fresh({ operatingJurisdictions: ["EU"] })]);
    const { mailer, sent } = makeMailer();
    await runPilotReminders(asDb(db), mailer, run("2026-10-24"), ON);
    expect(sent[0].subject).toBe("Tu piloto de AI Sentinel termina en 5 días");
    expect(sent[0].text).toContain("1.800 € al año o 179 € al mes");
    expect(sent[0].text).toContain("Activamos el plan de pago en tu organización tras el pago.");
    expect(sent[0].text).toContain("https://www.todo.law/es/contact/managed");
  });

  it("the English e-mail links the storefront's pricing page and promises no instant activation", () => {
    const mail = renderPilotReminderEmail({ locale: "en", kind: "lastDay", orgName: "Acme", endsAt: new Date("2026-10-28T15:00:00Z") });
    expect(mail.text).toContain("https://www.todo.law/pricing");
    expect(mail.text).toContain("$1,800 a year or $179 a month");
    expect(mail.text).toContain("We activate the paid plan on your organisation after payment.");
    expect(mail.text).not.toMatch(/instant|immediately/i);
  });
});

describe("nothing is sent", () => {
  it("when the switch is off (the default)", async () => {
    const db = makeDb([fresh()]);
    expect(pilotRemindersEnabled({})).toBe(false);
    const summary = await runPilotReminders(asDb(db), makeMailer().mailer, run("2026-10-24"), { VERCEL_ENV: "production" });
    expect(summary.skipped).toBe("switched-off");
    expect(db.organization.findMany).not.toHaveBeenCalled();
  });

  it("off the hosted pilot, or without a mail service", async () => {
    const db = makeDb([fresh()]);
    const off = await runPilotReminders(asDb(db), makeMailer().mailer, run("2026-10-24"), {
      PILOT_REMINDERS_ENABLED: "true",
      NEXT_PUBLIC_HOSTED_PILOT: "false",
    });
    expect(off.skipped).toBe("not-hosted");
    expect((await runPilotReminders(asDb(db), null, run("2026-10-24"), ON)).skipped).toBe("email-not-configured");
  });

  it("for an organisation on the paid plan", async () => {
    const { sent } = await sendDays(makeDb([fresh({ plan: "EU_CLOUD" })]), "2026-10-12", "2026-11-02");
    expect(sent).toHaveLength(0);
  });
});

describe("the copy", () => {
  it("has no long dashes and states read-only and the export", () => {
    for (const locale of ["en", "es"] as const) {
      for (const kind of ["fiveDays", "lastDay"] as const) {
        const mail = renderPilotReminderEmail({ locale, kind, orgName: "Acme", endsAt: new Date("2026-10-27T00:00:00Z") });
        expect(mail.subject + mail.text).not.toMatch(/[–—]/);
        expect(mail.text).toContain("/governance/settings");
        expect(mail.text).toContain(locale === "es" ? "solo lectura" : "read-only");
      }
    }
  });
});
