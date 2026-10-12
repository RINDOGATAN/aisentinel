// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Pilot-ending reminders, run once a day by /api/cron/pilot-reminders
 * (off until its feature switch is set).
 *
 * Two e-mails per organisation on the hosted pilot, to its owners and
 * administrators only (not every member):
 *
 *   - "fiveDays": at the daily run that falls between 5 and 4 days before
 *     the end of the editing window (pilotEndsAt in src/config/pilot.ts);
 *   - "lastDay":  at the daily run that falls in the last 24 hours before it.
 *
 * The send rule counts hours to the end, not calendar days, so it holds in
 * every time zone: a run is daily, so exactly one run falls in each 24-hour
 * slot. With the run at 07:15 UTC that is the end's own calendar day unless
 * the window ends between 00:00 and 07:15 UTC (then the run the day before).
 * The end is shown in Spain's peninsular time in the Spanish e-mail and in
 * UTC in the English one.
 *
 * Language: the app keeps no language setting per person or organisation,
 * so Spanish for an organisation in the EU or EEA (it declares the EU or
 * the EEA and no US jurisdiction), else English.
 *
 * The paid plan: an organisation whose row carries plan = EU_CLOUD (set by an
 * operator with scripts/set-org-plan.ts) is never reminded.
 *
 * Never twice: before sending, the job writes an audit-log row whose id is
 * derived from the kind, the end of the window and the organisation, so a
 * second run (even a concurrent one) collides on the primary key and sends
 * nothing. If no e-mail could be delivered, the row is removed so the next
 * run tries again. No new table, no migration.
 *
 * Off unless PILOT_REMINDERS_ENABLED=true, only on the hosted pilot, and
 * nothing without a mail service.
 */

import { Resend } from "resend";
import type { PrismaClient } from "@prisma/client";
import { brand } from "@/config/brand";
import { logger } from "@/lib/logger";
import { mailFrom } from "@/lib/mail-from";
import { isPaidPlan } from "@/server/services/pilot/caps";
import {
  hostedPilotActive,
  PILOT_MANAGED_URL,
  pilotEndsAt,
  pilotFirstSignInStamp,
  type PilotEnv,
  type PilotLocale,
} from "@/config/pilot";

type Locale = PilotLocale;

export type PilotReminderKind = "fiveDays" | "lastDay";

/** The audit action of a sent reminder. */
export const PILOT_REMINDER_SENT = "PILOT_REMINDER_SENT";

/** Roles that receive the reminders. */
export const PILOT_REMINDER_ROLES = ["OWNER", "ADMIN"] as const;


/** Where the price is stated, per language. */
export const PRICING_URL: Record<Locale, string> = {
  en: "https://www.todo.law/pricing",
  es: "https://www.todo.law/es/precios",
};

/** Where a reply goes when CONTACT_EMAIL is not set. */
export const DEFAULT_REPLY_TO = "info@todo.law";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The switch: off unless set to "true". */
export function pilotRemindersEnabled(env: PilotEnv = process.env): boolean {
  return (env.PILOT_REMINDERS_ENABLED ?? "").trim().toLowerCase() === "true";
}

/** Which reminder is due at `now` for a window ending at `endsAt`, if any. */
export function pilotReminderKind(endsAt: Date, now: Date): PilotReminderKind | null {
  const left = endsAt.getTime() - now.getTime();
  if (left <= 0) return null;
  if (left <= DAY_MS) return "lastDay";
  if (left > 4 * DAY_MS && left <= 5 * DAY_MS) return "fiveDays";
  return null;
}

/** The euro market: the EU or the EEA declared, and no US jurisdiction. */
export function isEuroMarket(jurisdictions: readonly string[]): boolean {
  return (
    jurisdictions.some((j) => j === "EU" || j === "EEA") &&
    !jurisdictions.some((j) => j.startsWith("US_"))
  );
}

/** The e-mail's language. */
export function reminderLocale(jurisdictions: readonly string[]): Locale {
  return isEuroMarket(jurisdictions) ? "es" : "en";
}

/** The operator's inbox, for Reply-To: CONTACT_EMAIL, else the standing address. */
export function replyToAddresses(env: PilotEnv = process.env): string[] {
  const list = (env.CONTACT_EMAIL ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [DEFAULT_REPLY_TO];
}

const ZONE: Record<Locale, string> = { en: "UTC", es: "Europe/Madrid" };

function zonedTime(date: Date, locale: Locale) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE[locale],
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { hour: get("hour"), minute: get("minute") };
}

function longDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
    timeZone: ZONE[locale],
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * When the window ends, as a phrase: "on 28 October 2026 at 15:00 UTC", or
 * "at the end of 26 October 2026 (UTC)" when it ends at midnight. In Spanish,
 * in peninsular time.
 */
export function endPhrase(endsAt: Date, locale: Locale): string {
  const z = zonedTime(endsAt, locale);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (z.hour === 0 && z.minute === 0) {
    const dayBefore = longDate(new Date(endsAt.getTime() - 1), locale);
    return locale === "es"
      ? `al final del ${dayBefore} (hora peninsular)`
      : `at the end of ${dayBefore} (UTC)`;
  }
  const time = `${pad(z.hour)}:${pad(z.minute)}`;
  return locale === "es"
    ? `el ${longDate(endsAt, locale)} ${z.hour === 1 ? "a la" : "a las"} ${time} (hora peninsular)`
    : `on ${longDate(endsAt, locale)} at ${time} UTC`;
}

/** The paid plan's price, in the currency of the e-mail's language. */
export const PLAN_PRICE: Record<Locale, string> = {
  en: "$1,800 a year or $179 a month",
  es: "1.800 € al año o 179 € al mes",
};

export interface PilotReminderEmailInput {
  locale: Locale;
  kind: PilotReminderKind;
  orgName: string;
  endsAt: Date;
}

export interface PilotReminderMail {
  to: string;
  replyTo: string[];
  subject: string;
  html: string;
  text: string;
}

/** Sends one e-mail; throws when it was not accepted. */
export interface PilotReminderMailer {
  send(mail: PilotReminderMail): Promise<void>;
}

/** Where the export is: the Settings page, whose pilot card lists it. */
function settingsUrl(): string {
  return `${brand.siteUrl.replace(/\/$/, "")}/governance/settings`;
}

/** The parts of one reminder, before layout. */
export function pilotReminderCopy(input: PilotReminderEmailInput) {
  const { locale, kind, orgName } = input;
  const when = endPhrase(input.endsAt, locale);
  const product = brand.emailName;
  if (locale === "es") {
    return {
      subject:
        kind === "fiveDays"
          ? `Tu piloto de ${product} termina en 5 días`
          : `Último día de tu piloto de ${product}`,
      heading: kind === "fiveDays" ? "Tu piloto termina en 5 días" : "Tu piloto termina en menos de 24 horas",
      intro: `El periodo de edición del piloto de ${orgName} en ${product} termina ${when}.`,
      after:
        "Después, la organización pasa a ser de solo lectura: puedes abrir y exportar todo lo que has creado, pero no añadir ni cambiar registros.",
      keepGoing: "Para seguir trabajando:",
      options: [
        {
          text: `Plan nube UE: ${PLAN_PRICE.es}. Levanta los límites del piloto y conserva tus registros tal como están. Activamos el plan de pago en tu organización tras el pago.`,
          label: "Ver precios",
          url: PRICING_URL.es,
        },
        {
          text: "Una instancia gestionada o tu propio hardware, previo presupuesto.",
          label: "Pedir presupuesto",
          url: PILOT_MANAGED_URL.es,
        },
      ],
      exportLine: "La exportación está siempre disponible, también después del piloto.",
      exportLabel: "Exportar",
      exportUrl: settingsUrl(),
      whyYou: `Recibes este correo porque eres propietario o administrador de ${orgName}. Si tienes alguna pregunta, responde a este mensaje.`,
    };
  }
  return {
    subject:
      kind === "fiveDays" ? `Your ${product} pilot ends in 5 days` : `Last day of your ${product} pilot`,
    heading: kind === "fiveDays" ? "Your pilot ends in 5 days" : "Your pilot ends within 24 hours",
    intro: `The editing window of the ${orgName} pilot on ${product} ends ${when}.`,
    after:
      "After that, the organization becomes read-only: you can open and export everything you created, but you cannot add or change records.",
    keepGoing: "To keep working:",
    options: [
      {
        text: `Cloud Plan: ${PLAN_PRICE.en}. It lifts the pilot's limits and keeps your records as they are. We activate the paid plan on your organization after payment.`,
        label: "See pricing",
        url: PRICING_URL.en,
      },
      {
        text: "A managed instance or your own hardware, on quotation.",
        label: "Ask for a quote",
        url: PILOT_MANAGED_URL.en,
      },
    ],
    exportLine: "The export is always available, including after the pilot.",
    exportLabel: "Export",
    exportUrl: settingsUrl(),
    whyYou: `You receive this e-mail as an owner or administrator of ${orgName}. If you have a question, reply to this message.`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Subject, HTML and plain text of one reminder. */
export function renderPilotReminderEmail(
  input: PilotReminderEmailInput,
): Pick<PilotReminderMail, "subject" | "html" | "text"> {
  const c = pilotReminderCopy(input);
  const col = brand.colors;
  const p = (text: string, extra = "") =>
    `<p style="color: #e5e5e5; font-size: 15px; line-height: 1.6; margin: 0 0 16px;${extra}">${escapeHtml(text)}</p>`;
  const link = (label: string, url: string) =>
    `<a href="${escapeHtml(url)}" style="color: ${col.primary}; font-weight: 600; text-decoration: none;">${escapeHtml(label)}</a>`;
  const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: ${col.background}; border-radius: 12px; overflow: hidden;">
          <div style="padding: 24px 24px 16px; border-bottom: 1px solid #2a2a2a;">
            <span style="font-size: 20px; font-weight: 700; color: #ffffff;">${escapeHtml(brand.emailName)}</span>
          </div>
          <div style="padding: 32px 24px;">
            <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0 0 12px;">${escapeHtml(c.heading)}</p>
            ${p(c.intro)}
            ${p(c.after)}
            ${p(c.keepGoing, " font-weight: 600; margin-bottom: 8px;")}
            <ul style="color: #e5e5e5; font-size: 15px; line-height: 1.6; margin: 0 0 16px; padding-left: 20px;">
              ${c.options.map((o) => `<li style="margin: 0 0 8px;">${escapeHtml(o.text)} ${link(o.label, o.url)}</li>`).join("")}
            </ul>
            ${p(c.exportLine)}
            <p style="margin: 0 0 24px;">${link(c.exportLabel, c.exportUrl)}</p>
            <p style="color: #a6a6a6; font-size: 13px; line-height: 1.6; margin: 0;">${escapeHtml(c.whyYou)}</p>
          </div>
          <div style="padding: 16px 24px; border-top: 1px solid #2a2a2a;">
            <p style="color: #666666; font-size: 11px; margin: 0;">${escapeHtml(brand.companyName)}™ · ${escapeHtml(brand.emailName)} · <a href="${escapeHtml(brand.siteUrl)}" style="color: ${col.primary}; text-decoration: none;">${escapeHtml(brand.siteUrl.replace(/^https?:\/\//, ""))}</a></p>
          </div>
        </div>
      `;
  const text = [
    c.heading,
    "",
    c.intro,
    "",
    c.after,
    "",
    c.keepGoing,
    ...c.options.map((o) => `- ${o.text} ${o.label}: ${o.url}`),
    "",
    `${c.exportLine} ${c.exportLabel}: ${c.exportUrl}`,
    "",
    c.whyYou,
  ].join("\n");
  return { subject: c.subject, html, text };
}

/** The app's transactional mail path (Resend), or null when not configured. */
export function pilotReminderMailerFromEnv(): PilotReminderMailer | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const resend = new Resend(key);
  return {
    async send(mail) {
      const result = await resend.emails.send({
        from: mailFrom(),
        to: mail.to,
        replyTo: mail.replyTo,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      if (result && "error" in result && result.error) {
        throw new Error(result.error.message ?? "The mail service refused the message");
      }
    },
  };
}

export interface PilotReminderRunSummary {
  skipped?: "switched-off" | "not-hosted" | "email-not-configured";
  checked: number;
  sent: number;
  emails: number;
  alreadySent: number;
  noRecipients: number;
  errors: number;
}

export type PilotReminderDb = Pick<PrismaClient, "organization" | "auditLog">;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/** The marker's id: one per organisation, kind and end of window. */
export function pilotReminderMarkerId(kind: PilotReminderKind, endsAt: Date, organizationId: string): string {
  return `pilot-reminder-${kind}-${endsAt.toISOString().slice(0, 16)}-${organizationId}`;
}

/** One run of the daily job. `now`, `env` and the mailer are injected for tests. */
export async function runPilotReminders(
  db: PilotReminderDb,
  mailer: PilotReminderMailer | null,
  now: Date = new Date(),
  env: PilotEnv = process.env,
): Promise<PilotReminderRunSummary> {
  const summary: PilotReminderRunSummary = {
    checked: 0,
    sent: 0,
    emails: 0,
    alreadySent: 0,
    noRecipients: 0,
    errors: 0,
  };
  if (!pilotRemindersEnabled(env)) return { ...summary, skipped: "switched-off" };
  if (!hostedPilotActive(env)) return { ...summary, skipped: "not-hosted" };
  if (!mailer) {
    logger.info("Pilot reminders: e-mail is not configured; nothing sent");
    return { ...summary, skipped: "email-not-configured" };
  }

  // Paid organisations are skipped (see the header).
  const orgs = await db.organization.findMany({
    where: { pilotFirstSignInAt: { not: null } },
    include: {
      members: {
        where: { role: { in: [...PILOT_REMINDER_ROLES] } },
        include: { user: { select: { email: true } } },
      },
    },
  });

  const replyTo = replyToAddresses(env);

  for (const org of orgs) {
    if (isPaidPlan(org)) continue;
    if (!org.pilotFirstSignInAt) continue;
    const endsAt = pilotEndsAt(pilotFirstSignInStamp(org.pilotFirstSignInAt));
    summary.checked++;
    const kind = pilotReminderKind(endsAt, now);
    if (!kind) continue;

    const locale = reminderLocale(org.operatingJurisdictions ?? []);
    const recipients = org.members
      .filter((m) => (PILOT_REMINDER_ROLES as readonly string[]).includes(m.role) && !!m.user?.email)
      .map((m) => m.user.email);
    if (recipients.length === 0) {
      summary.noRecipients++;
      continue;
    }

    const markerId = pilotReminderMarkerId(kind, endsAt, org.id);
    try {
      await db.auditLog.create({
        data: {
          id: markerId,
          organizationId: org.id,
          entityType: "Organization",
          entityId: org.id,
          action: PILOT_REMINDER_SENT,
          metadata: { kind, endsAt: endsAt.toISOString(), recipients: recipients.length },
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        summary.alreadySent++;
        continue;
      }
      logger.error("Pilot reminder: could not record the reminder", err, { organizationId: org.id, kind });
      summary.errors++;
      continue;
    }

    const mail = renderPilotReminderEmail({ locale, kind, orgName: org.name, endsAt });
    let delivered = 0;
    for (const to of recipients) {
      try {
        await mailer.send({ to, replyTo, ...mail });
        delivered++;
      } catch (err) {
        logger.error("Pilot reminder e-mail failed", err, { organizationId: org.id, kind });
      }
    }

    if (delivered === 0) {
      try {
        await db.auditLog.delete({ where: { id: markerId } });
      } catch (err) {
        logger.error("Pilot reminder: could not remove the record after a failed send", err, {
          organizationId: org.id,
          kind,
        });
      }
      summary.errors++;
      continue;
    }
    summary.sent++;
    summary.emails += delivered;
  }

  return summary;
}
