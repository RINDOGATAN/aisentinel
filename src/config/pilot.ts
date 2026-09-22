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
  en: "Keep going on your own instance",
  es: "Sigue en tu propia instancia",
};

/** The keep-going sentence, closing every message a pilot limit writes. */
export function pilotKeepGoing(locale: PilotLocale): string {
  return `${PILOT_KEEP_GOING[locale]} (${PILOT_MANAGED_URL[locale]}).`;
}

/** Editing window, in days, from the organisation's first sign-in. */
export const PILOT_EDIT_DAYS = 90;

/**
 * The day the pilot terms go live. The clock never starts before it.
 *
 * The rule is the same across the suite: ninety days of editing counted from
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
 * line under the pilot sentence on the sign-up screens and in Settings; the
 * banner keeps to the sentence so it stays one line on a desktop.
 */
export const PILOT_TERMS: Record<PilotLocale, string> = {
  en: `${PILOT_EDIT_DAYS} days of editing from your first sign-in, then read-only with export.`,
  es: `${PILOT_EDIT_DAYS} días de edición desde tu primer inicio de sesión y después solo lectura con exportación.`,
};

export interface PilotSentence {
  before: string;
  /** Link text leading to DISCLOSURE_DOCS_PATH, the hosted-pilot documentation page. */
  docs: string;
  middle: string;
  /** Link text leading to PILOT_RUN_URL. */
  link: string;
  after: string;
}

/**
 * The one sentence the pilot shows everywhere: the banner, the sign-up screen
 * and the Settings card. It carries two links: the docs part leads to
 * DISCLOSURE_DOCS_PATH, the link part to PILOT_RUN_URL. What the service holds by
 * way of certification is stated in the disclosure, not here.
 */
export const PILOT_SENTENCE: Record<PilotLocale, PilotSentence> = {
  en: {
    before: "Hosted pilot: free, capped (",
    docs: "see docs",
    middle: "), and with no contractual safeguards. To deploy real customer details, ",
    link: "run your own instance",
    after: ".",
  },
  es: {
    before: "Piloto alojado: gratuito, limitado (",
    docs: "ver documentación",
    middle: ") y sin garantías contractuales. Para manejar datos reales de clientes, ",
    link: "usa tu propia instancia",
    after: ".",
  },
};

/** The sentence as plain text, for metadata and anywhere a link cannot go. */
export function pilotSentenceText(locale: PilotLocale): string {
  const s = PILOT_SENTENCE[locale];
  return s.before + s.docs + s.middle + s.link + s.after;
}

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
      : `Hosted pilot: this organisation has reached its ceiling of ${max} ${label}.`;
  return `${lead} ${waysOut(locale, exportUrl)} ${pilotKeepGoing(locale)}`;
}

export function pilotOneOrganizationMessage(locale: PilotLocale): string {
  return locale === "es"
    ? `Piloto alojado: una organización por cuenta. Para llevar varias organizaciones, ejecuta tu propia instancia (${PILOT_RUN_URL}).`
    : `Hosted pilot: one organisation per account. To run several organisations, run your own instance (${PILOT_RUN_URL}).`;
}
