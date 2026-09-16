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
 *   2. edits for PILOT_EDIT_DAYS from the organisation's first sign-in, after
 *      which the organisation is read-only but can still export everything;
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

/** Where a pilot organisation goes to run its own instance. */
export const PILOT_RUN_URL = "https://www.todo.law/run";

/** Editing window, in days, from the organisation's first sign-in. */
export const PILOT_EDIT_DAYS = 90;

/**
 * The clock never starts before this date. Organisations that existed on the
 * hosted service before the pilot terms were published were never told of a
 * clock, so their ninety days count from the day the terms took effect, not
 * from a creation date months earlier. New organisations start on creation.
 */
export const PILOT_CLOCK_EPOCH = new Date("2026-09-16T00:00:00.000Z");

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PilotClock {
  startedAt: Date;
  endsAt: Date;
  /** Whole days left, never negative. */
  daysLeft: number;
  readOnly: boolean;
}

/**
 * Where an organisation stands on the editing clock. The organisation's
 * first sign-in is its creation (the onboarding creates it on the first
 * visit), floored at PILOT_CLOCK_EPOCH.
 */
export function pilotClock(organizationCreatedAt: Date, now: Date = new Date()): PilotClock {
  const startedAt =
    organizationCreatedAt.getTime() > PILOT_CLOCK_EPOCH.getTime()
      ? organizationCreatedAt
      : PILOT_CLOCK_EPOCH;
  const endsAt = new Date(startedAt.getTime() + PILOT_EDIT_DAYS * DAY_MS);
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
 * mapping of an organisation (294 requirements per system across eight
 * frameworks), board reports each store a program snapshot of up to 2 MB, and
 * the program pack is built in memory in one request. Twenty-five systems
 * keeps the largest unpaginated read under about 7,500 rows and the pack
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
 * The one sentence the pilot shows everywhere: the banner, the sign-up screen
 * and the documents. The link text is the part that leads to PILOT_RUN_URL.
 */
export const PILOT_SENTENCE: Record<PilotLocale, { before: string; link: string; after: string }> = {
  en: {
    before: "Hosted pilot: free, capped, no security certification. For real client data, ",
    link: "run your own instance",
    after: ".",
  },
  es: {
    before: "Piloto alojado: gratuito, con límites y sin certificación de seguridad. Para datos reales de clientes, ",
    link: "ejecuta tu propia instancia",
    after: ".",
  },
};

/**
 * The banner is dismissible per session: a session cookie (no max-age) with
 * this name and value hides it until the browser is closed. The server reads
 * it so a dismissed banner never renders and then vanishes.
 */
export const PILOT_BANNER_COOKIE = "ais.pilot-banner";
export const PILOT_BANNER_DISMISSED = "dismissed";

/** Show the banner on this page load? Hosted pilot, and not dismissed this session. */
export function pilotBannerVisible(env: PilotEnv, dismissCookie: string | undefined): boolean {
  return hostedPilotActive(env) && dismissCookie !== PILOT_BANNER_DISMISSED;
}

/** The two ways out, spelled out wherever a cap stops someone. */
function waysOut(locale: PilotLocale, exportUrl: string): string {
  return locale === "es"
    ? `Dos salidas: ejecuta tu propia instancia (${PILOT_RUN_URL}) o exporta todo lo que has creado (${exportUrl}).`
    : `Two ways out: run your own instance (${PILOT_RUN_URL}) or export everything you created (${exportUrl}).`;
}

export function pilotReadOnlyMessage(locale: PilotLocale, exportUrl: string): string {
  const lead =
    locale === "es"
      ? `Piloto alojado: los ${PILOT_EDIT_DAYS} días de edición de esta organización han terminado y ahora es de solo lectura.`
      : `Hosted pilot: this organisation's ${PILOT_EDIT_DAYS} editing days are over and it is now read-only.`;
  return `${lead} ${waysOut(locale, exportUrl)}`;
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
      : `Hosted pilot: this organisation has reached its ceiling of ${max} ${label}.`;
  return `${lead} ${waysOut(locale, exportUrl)}`;
}

export function pilotOneOrganizationMessage(locale: PilotLocale): string {
  return locale === "es"
    ? `Piloto alojado: una organización por cuenta. Para llevar varias organizaciones, ejecuta tu propia instancia (${PILOT_RUN_URL}).`
    : `Hosted pilot: one organisation per account. To run several organisations, run your own instance (${PILOT_RUN_URL}).`;
}
