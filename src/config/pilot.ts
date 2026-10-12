// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot: what it is, how it is recognised, and where its limits are.
 *
 * The hosted service (aisentinel.todo.law) is a free, capped pilot and it says
 * so. Nobody pays for a module there: every module is open to every
 * organisation, and instead the pilot has three caps, each defined here:
 *
 *   1. one organisation per account;
 *   2. edits for PILOT_EDIT_DAYS from the organisation's first sign-in after
 *      the pilot went live, after which the organisation is read-only but can
 *      still export everything (PILOT_TERMS says so in one line);
 *   3. a records ceiling per organisation (PILOT_CEILINGS).
 *
 * Premium modules are sold only for the kit (self-hosted, offline licence
 * activation). The kit build is unchanged: no caps, entitlements as before.
 *
 * Hosted is recognised with the same signals the auth guards use: the
 * platform's production environment variable, or the hosted cookie domain
 * that the session cookie is scoped to. An explicit NEXT_PUBLIC_HOSTED_PILOT
 * wins in either direction, so a preview or a local build can be put into
 * pilot mode for a test, and the hosted instance can be taken out of it
 * without a code change.
 *
 * Pure leaf module: no Prisma, no Next, no React.
 */

import type { Currency } from "@/lib/currency";

export type PilotEnv = Partial<Record<string, string | undefined>>;

/** The cookie domain the hosted instance scopes its session cookie to. */
export const HOSTED_COOKIE_DOMAIN = ".todo.law";

/**
 * The session cookie domain a deployment resolves to. Mirrors the rule in
 * src/lib/auth.ts, which imports it from here so the two cannot drift:
 * AUTH_COOKIE_DOMAIN when set ("" meaning host-only), else the hosted domain
 * on the platform, else host-only.
 */
export function resolveCookieDomain(env: PilotEnv = process.env): string | undefined {
  if (env.AUTH_COOKIE_DOMAIN !== undefined) return env.AUTH_COOKIE_DOMAIN || undefined;
  return env.VERCEL ? HOSTED_COOKIE_DOMAIN : undefined;
}

/** Is this deployment the hosted pilot? */
export function hostedPilotActive(env: PilotEnv = process.env): boolean {
  if (env.NEXT_PUBLIC_HOSTED_PILOT === "false") return false;
  if (env.NEXT_PUBLIC_HOSTED_PILOT === "true") return true;
  if (env.VERCEL_ENV === "production") return true;
  return resolveCookieDomain(env) === HOSTED_COOKIE_DOMAIN;
}

/** Where a pilot organisation goes for a paid plan or a managed instance. */
export const PILOT_RUN_URL = "https://www.todo.law/run";

/**
 * The one link a limit message carries to keep going: the storefront's wizard
 * for the managed service (not the deployment engagement), in the reader's
 * language. A firm at a limit is the one we know is serious.
 */
export const PILOT_MANAGED_URL: Record<PilotLocale, string> = {
  en: "https://www.todo.law/contact/managed",
  es: "https://www.todo.law/es/contact/managed",
};

export const PILOT_KEEP_GOING: Record<PilotLocale, string> = {
  en: "For a managed instance or your own hardware, ask for a quote",
  es: "Para una instancia gestionada o tu propio hardware, pide presupuesto",
};

/** The keep-going sentence, closing every message a pilot limit writes. */
export function pilotKeepGoing(locale: PilotLocale): string {
  return `${PILOT_KEEP_GOING[locale]} (${PILOT_MANAGED_URL[locale]}).`;
}

/**
 * Editing window, in days, from the organisation's first sign-in (it was
 * ninety before PILOT_WINDOW_SHORTENED_AT); organisations already in their pilot
 * then keep the transition rule in pilotClock.
 */
export const PILOT_EDIT_DAYS = 15;

/** The editing window before 11 Oct 2026, kept only for the transition rule. */
export const PILOT_EDIT_DAYS_BEFORE_SHORTENING = 90;

/**
 * When the shorter window took effect: the end of its release day (11 Oct
 * 2026, UTC), so that an organisation already in its pilot has at least
 * PILOT_EDIT_DAYS full days from the release. An organisation whose first
 * sign-in is before this instant keeps whichever ends EARLIER of its original
 * ninety-day end and PILOT_EDIT_DAYS from this instant: nobody becomes
 * read-only at the release, and nobody keeps more than the new window from it.
 * Computed, not stored: no data migration.
 */
export const PILOT_WINDOW_SHORTENED_AT = new Date("2026-10-12T00:00:00.000Z");

/**
 * The day the pilot terms go live. The clock never starts before it.
 *
 * The rule is the same across the suite: PILOT_EDIT_DAYS of editing counted from
 * the organisation's FIRST SIGN-IN after the pilot is live. The creation date
 * plays no part: an organisation made months before the terms were published
 * was never told of a clock. The first sign-in is recorded on the
 * organisation (`pilotFirstSignInAt`) the first time a member signs in, or
 * opens it with a session that predates the pilot; see
 * src/server/services/pilot/first-sign-in.ts.
 */
export const PILOT_LIVE_FROM = new Date("2026-09-19T00:00:00.000Z");

const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant to record as a first sign-in happening at `now`: never before the pilot went live. */
export function pilotFirstSignInStamp(now: Date = new Date()): Date {
  return now.getTime() > PILOT_LIVE_FROM.getTime() ? now : PILOT_LIVE_FROM;
}

/**
 * The end of the editing window for a pilot that started at `startedAt`.
 * A start on or after PILOT_WINDOW_SHORTENED_AT gets PILOT_EDIT_DAYS; an
 * earlier start (an organisation already in its pilot when the window was
 * shortened) gets the earlier of its original ninety-day end and
 * PILOT_EDIT_DAYS from PILOT_WINDOW_SHORTENED_AT.
 */
export function pilotEndsAt(startedAt: Date): Date {
  const start = startedAt.getTime();
  const shortenedAt = PILOT_WINDOW_SHORTENED_AT.getTime();
  if (start >= shortenedAt) return new Date(start + PILOT_EDIT_DAYS * DAY_MS);
  return new Date(
    Math.min(start + PILOT_EDIT_DAYS_BEFORE_SHORTENING * DAY_MS, shortenedAt + PILOT_EDIT_DAYS * DAY_MS),
  );
}

export interface PilotClock {
  startedAt: Date;
  endsAt: Date;
  /** Whole days left, never negative. */
  daysLeft: number;
  readOnly: boolean;
}

/**
 * Where an organisation stands on the editing clock. `firstSignInAt` is the
 * recorded first sign-in; when none is recorded yet, the window has not
 * started and runs from now (the sign-in being made), in full. Either way it
 * is floored at PILOT_LIVE_FROM.
 */
export function pilotClock(firstSignInAt: Date | null | undefined, now: Date = new Date()): PilotClock {
  const startedAt = pilotFirstSignInStamp(firstSignInAt ?? now);
  const endsAt = pilotEndsAt(startedAt);
  const remainingMs = endsAt.getTime() - now.getTime();
  return {
    startedAt,
    endsAt,
    daysLeft: Math.max(0, Math.ceil(remainingMs / DAY_MS)),
    readOnly: remainingMs <= 0,
  };
}

/**
 * The records ceiling, per organisation. Chosen from the data model to protect
 * the service: the compliance screens and the program report load every
 * mapping of an organisation (294 requirements per system, 351 where AIUC-1
 * is chosen, across nine frameworks), board reports each store a program
 * snapshot of up to 2 MB, and the program pack is built in memory in one
 * request. Twenty-five systems keeps the largest unpaginated read under about
 * 9,000 rows and the pack
 * well inside the serverless response limit. See docs/capacity.md.
 */
export const PILOT_CEILING_KEYS = [
  "systems",
  "vendors",
  "assessments",
  "incidents",
  "policies",
  "oversightGates",
  "threatModels",
  "shadowAiReports",
  "proceedings",
  "boardReports",
  "members",
] as const;

export type PilotCeilingKey = (typeof PILOT_CEILING_KEYS)[number];

export const PILOT_CEILINGS: Record<PilotCeilingKey, number> = {
  systems: 25,
  vendors: 50,
  assessments: 50,
  incidents: 25,
  policies: 25,
  oversightGates: 50,
  threatModels: 10,
  shadowAiReports: 50,
  proceedings: 10,
  boardReports: 10,
  members: 5,
};

export type PilotLocale = "en" | "es";

/** What each ceiling counts, for the counters and the messages. */
export const PILOT_CEILING_LABELS: Record<PilotCeilingKey, Record<PilotLocale, string>> = {
  systems: { en: "AI systems", es: "sistemas de IA" },
  vendors: { en: "vendors", es: "proveedores" },
  assessments: { en: "assessments", es: "evaluaciones" },
  incidents: { en: "incidents", es: "incidentes" },
  policies: { en: "policies", es: "políticas" },
  oversightGates: { en: "oversight gates", es: "puntos de control" },
  threatModels: { en: "threat models", es: "modelos de amenazas" },
  shadowAiReports: { en: "shadow AI reports", es: "informes de IA en la sombra" },
  proceedings: { en: "proceedings", es: "procedimientos" },
  boardReports: { en: "board reports", es: "informes al consejo" },
  members: { en: "members", es: "miembros" },
};

/** The export that carries everything an organisation created. */
export function pilotExportUrl(organizationId: string): string {
  return `/api/export/program-pack?organizationId=${encodeURIComponent(organizationId)}`;
}

/**
 * The editing terms, word for word as the other two suite apps state them, so
 * a visitor reads the same rule wherever the pilot runs. Shown as their own
 * line under the pilot sentence on the sign-in screen and in Settings (not on the landing); the
 * banner keeps to the sentence so it stays one line on a desktop.
 */
export const PILOT_TERMS: Record<PilotLocale, string> = {
  en: `${PILOT_EDIT_DAYS} days of editing from your first sign-in, then read-only with export.`,
  es: `${PILOT_EDIT_DAYS} días de edición desde tu primer inicio de sesión; después, solo lectura con exportación.`,
};

/**
 * The sign-in screen's one line: the editing terms, no
 * more. The same line as DPO Central's sign-in screen.
 */
export const PILOT_SIGN_IN_LINE: Record<PilotLocale, string> = {
  en: `Free pilot: ${PILOT_TERMS.en}`,
  es: `Piloto gratuito: ${PILOT_TERMS.es}`,
};

/** The Settings card's lead, before the editing terms: DPO Central's words. */
export const PILOT_DESCRIPTION: Record<PilotLocale, string> = {
  en: "The hosted service is a free pilot. Every module is included, within the limits below.",
  es: "El servicio alojado es un piloto gratuito. Incluye todos los módulos, dentro de los límites que ves abajo.",
};

/**
 * The pilot bar on signed-in pages. For
 * the WHOLE pilot, to every member (owners, admins and members alike), a
 * slim top bar gives the end date and the Cloud Plan's price in the reader's
 * currency (English $, Spanish €), with a link to the landing's pricing
 * block. In the last PILOT_END_BAR_DAYS days it switches to the stronger
 * "ending" wording; once the organisation is read-only it says so and that
 * the export stays open. Never off the hosted pilot, nor for an organisation
 * on the paid plan. A pilot begun before the window was shortened (the
 * transition) is told "Free until {date}", not "for 15 days".
 */
export const PILOT_END_BAR_DAYS = 5;

export type PilotEndBarState = "hidden" | "trial" | "ending" | "readOnly";

/** What the bar needs: the Settings card's status (pilot.status) and whether the organisation pays. */
export interface PilotEndBarInput {
  active: boolean;
  endsAt?: Date | string | null;
  readOnly?: boolean;
  /** The organisation is on the paid plan: no pilot, no bar. */
  paid?: boolean;
}

export function pilotEndBarState(
  status: PilotEndBarInput | null | undefined,
  now: Date = new Date(),
): PilotEndBarState {
  if (!status || !status.active || status.paid) return "hidden";
  if (status.readOnly) return "readOnly";
  if (!status.endsAt) return "hidden";
  const remaining = new Date(status.endsAt).getTime() - now.getTime();
  if (remaining <= 0) return "readOnly";
  return remaining <= PILOT_END_BAR_DAYS * DAY_MS ? "ending" : "trial";
}

/**
 * A plan value that is not the pilot. The organisation record carries no plan
 * yet; once it does (a "PILOT" or a paid value), a paid organisation never
 * sees the bar.
 */
export function isPaidPlanValue(plan: string | null | undefined): boolean {
  return !!plan && plan !== "PILOT";
}

/** The storefront's prices page in the reader's language: the end bar, the Settings card and the limit messages link here. */
export const PILOT_PRICING_URL: Record<PilotLocale, string> = {
  en: "https://www.todo.law/pricing",
  es: "https://www.todo.law/es/precios",
};

/** A pilot begun before the window was shortened (it keeps the transition rule). */
export function isTransitionPilot(startedAt: Date | string | null | undefined): boolean {
  return !!startedAt && new Date(startedAt).getTime() < PILOT_WINDOW_SHORTENED_AT.getTime();
}

/**
 * Where the bar's link goes: the pricing block on this product's own landing,
 * in the reader's language. Relative, so it stays on
 * the app's own domain. The `lang` parameter makes the landing show in that
 * language and lets a signed-in person see it (src/app/page.tsx sends a
 * signed-in visitor without it to the application).
 */
export const PILOT_BAR_PRICING_URL: Record<PilotLocale, string> = {
  en: "/?lang=en#pricing",
  es: "/?lang=es#precios",
};

/** The session key that remembers a dismissed trial bar until the tab is closed. */
export const PILOT_BAR_DISMISS_KEY = "pilot-bar-dismissed";

/**
 * The Cloud Plan's price in English, in the visitor's currency
 * (src/lib/currency.ts). The Spanish copy is always in euros.
 */
export const CLOUD_PLAN_PRICE_EN: Record<Currency, string> = {
  USD: "$179 a month or $1,800 a year",
  EUR: "€179 a month or €1,800 a year",
};

export const PILOT_END_BAR_COPY: Record<
  PilotLocale,
  {
    trial: (days: number, date: string, currency?: Currency) => string;
    trialTransition: (date: string, currency?: Currency) => string;
    ending: (date: string) => string;
    readOnly: string;
    pricing: string;
    /** The automatic upgrade's button, for an owner or administrator only. */
    upgrade: string;
    dismiss: string;
  }
> = {
  en: {
    trial: (days, date, currency = "USD") =>
      `Free for ${days} days, until ${date}. Then export your program or keep going on the Cloud Plan: ${CLOUD_PLAN_PRICE_EN[currency]}.`,
    trialTransition: (date, currency = "USD") =>
      `Free until ${date}. Then export your program or keep going on the Cloud Plan: ${CLOUD_PLAN_PRICE_EN[currency]}.`,
    ending: (date) => `Your pilot ends on ${date}. Move to the paid plan to keep editing with all your records.`,
    readOnly: "Your pilot has ended: the organization is read-only and you can export it at any time.",
    pricing: "See pricing",
    upgrade: "Move to the paid plan",
    dismiss: "Close",
  },
  es: {
    trial: (days, date) =>
      `Gratis durante ${days} días, hasta el ${date}. Después, exporta tu programa o sigue con el Plan nube UE: 179 € al mes o 1.800 € al año.`,
    trialTransition: (date) =>
      `Gratis hasta el ${date}. Después, exporta tu programa o sigue con el Plan nube UE: 179 € al mes o 1.800 € al año.`,
    ending: (date) => `Tu piloto termina el ${date}. Pasa al plan de pago para seguir editando con todos tus registros.`,
    readOnly: "Tu piloto ha terminado: la organización está en solo lectura y puedes exportarla cuando quieras.",
    pricing: "Ver precios",
    upgrade: "Pasar al plan de pago",
    dismiss: "Cerrar",
  },
};

/** The end date as the bar and the Settings card write it: "26 October 2026" / "26 de octubre de 2026". */
export function pilotEndBarDate(endsAt: Date | string, locale: PilotLocale): string {
  return new Date(endsAt).toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The two ways out, spelled out wherever a cap stops someone. */
function waysOut(locale: PilotLocale, exportUrl: string): string {
  return locale === "es"
    ? `Dos salidas: pasa al plan de pago (${PILOT_PRICING_URL.es}) o exporta todo lo que has creado (${exportUrl}).`
    : `Two ways out: move to the paid plan (${PILOT_PRICING_URL.en}) or export everything you created (${exportUrl}).`;
}

export function pilotReadOnlyMessage(locale: PilotLocale, exportUrl: string): string {
  const lead =
    locale === "es"
      ? "Piloto alojado: el periodo de edición de esta organización ha terminado y ahora es de solo lectura."
      : "Hosted pilot: this organization's editing window is over and it is now read-only.";
  return `${lead} ${waysOut(locale, exportUrl)} ${pilotKeepGoing(locale)}`;
}

export function pilotCeilingMessage(
  locale: PilotLocale,
  key: PilotCeilingKey,
  exportUrl: string,
): string {
  const max = PILOT_CEILINGS[key];
  const label = PILOT_CEILING_LABELS[key][locale];
  const lead =
    locale === "es"
      ? `Piloto alojado: esta organización ha alcanzado su límite de ${max} ${label}.`
      : `Hosted pilot: this organization has reached its ceiling of ${max} ${label}.`;
  return `${lead} ${waysOut(locale, exportUrl)} ${pilotKeepGoing(locale)}`;
}

export function pilotOneOrganizationMessage(locale: PilotLocale): string {
  return locale === "es"
    ? `Piloto alojado: una organización por cuenta. Para llevar varias organizaciones, pide una instancia gestionada (${PILOT_MANAGED_URL.es}).`
    : `Hosted pilot: one organization per account. To run several organizations, ask for a managed instance (${PILOT_MANAGED_URL.en}).`;
}
