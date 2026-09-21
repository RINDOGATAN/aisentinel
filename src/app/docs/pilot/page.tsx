// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot, published. The same five points a person acknowledges on
 * their first sign-in, so nobody has to remember a pop-up, plus the two caps
 * and the two ways out.
 *
 * Every word of the disclosure is read from src/config/pilot-disclosure.ts and
 * src/config/pilot.ts. This page holds no copy of it: a page that restates the
 * disclosure in its own words is a page that will one day contradict it.
 */

import { getLocale } from "next-intl/server";
import { DisclosureList } from "@/components/pilot/pilot-disclosure";
import {
  DISCLOSURE_CHROME,
  DISCLOSURE_REVIEWED_AS_OF,
  DISCLOSURE_VERSION,
} from "@/config/pilot-disclosure";
import {
  PILOT_CEILING_KEYS,
  PILOT_CEILING_LABELS,
  PILOT_CEILINGS,
  PILOT_EDIT_DAYS,
  PILOT_RUN_URL,
  PILOT_SENTENCE,
  PILOT_TERMS,
  pilotSentenceText,
  type PilotLocale,
} from "@/config/pilot";

export async function generateMetadata() {
  const locale: PilotLocale = (await getLocale()) === "es" ? "es" : "en";
  return {
    title: DISCLOSURE_CHROME[locale].title,
    description: pilotSentenceText(locale),
  };
}

const COPY: Record<
  PilotLocale,
  {
    capsTitle: string;
    capsIntro: string;
    editingTitle: string;
    ceilingsTitle: string;
    oneOrgTitle: string;
    oneOrg: string;
    waysOutTitle: string;
    waysOut: string;
    versionLine: (version: string, reviewed: string) => string;
  }
> = {
  en: {
    capsTitle: "The limits of the pilot",
    capsIntro:
      "Nobody pays for a module on the hosted pilot. Instead it has three limits, and they are the same for every account.",
    editingTitle: "Editing window",
    ceilingsTitle: "Records per organisation",
    oneOrgTitle: "One organisation per account",
    oneOrg:
      "The hosted pilot holds one organisation per account. To carry several organisations, run your own instance.",
    waysOutTitle: "The two ways out",
    waysOut:
      "Whenever a limit stops you, there are two ways on: export everything you created as a program pack, or run your own instance, where there are no limits.",
    versionLine: (version, reviewed) => `Disclosure version ${version}, reviewed ${reviewed}.`,
  },
  es: {
    capsTitle: "Los límites del piloto",
    capsIntro:
      "En el piloto alojado nadie paga por un módulo. En su lugar tiene tres límites, iguales para todas las cuentas.",
    editingTitle: "Periodo de edición",
    ceilingsTitle: "Registros por organización",
    oneOrgTitle: "Una organización por cuenta",
    oneOrg:
      "El piloto alojado admite una organización por cuenta. Si necesitas llevar varias organizaciones, ejecuta tu propia instancia.",
    waysOutTitle: "Las dos salidas",
    waysOut:
      "Cuando un límite te detenga, tienes dos caminos: exportar todo lo que has creado como paquete del programa, o ejecutar tu propia instancia, que no tiene límites.",
    versionLine: (version, reviewed) => `Versión ${version} del aviso, revisada el ${reviewed}.`,
  },
};

export default async function PilotDocsPage() {
  const locale: PilotLocale = (await getLocale()) === "es" ? "es" : "en";
  const chrome = DISCLOSURE_CHROME[locale];
  const copy = COPY[locale];

  return (
    <div className="space-y-16">
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">{chrome.title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">{chrome.lead}</p>
      </section>

      <section>
        <div className="rounded-xl border border-border bg-card p-6 max-w-3xl">
          <DisclosureList locale={locale} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {copy.versionLine(DISCLOSURE_VERSION, DISCLOSURE_REVIEWED_AS_OF)}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-display tracking-tight mb-4">{copy.capsTitle}</h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">{copy.capsIntro}</p>

        <div className="space-y-6 max-w-3xl">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-2">{copy.editingTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{PILOT_TERMS[locale]}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-2">{copy.oneOrgTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{copy.oneOrg}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-3">{copy.ceilingsTitle}</h3>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {PILOT_CEILING_KEYS.map((key) => (
                <div key={key} className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">{PILOT_CEILING_LABELS[key][locale]}</dt>
                  <dd className="tabular-nums">{PILOT_CEILINGS[key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-display tracking-tight mb-4">{copy.waysOutTitle}</h2>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          {copy.waysOut}{" "}
          <a
            href={PILOT_RUN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            {PILOT_SENTENCE[locale].link}
          </a>
          .
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          {locale === "es"
            ? `El periodo de edición es de ${PILOT_EDIT_DAYS} días.`
            : `The editing window is ${PILOT_EDIT_DAYS} days.`}
        </p>
      </section>
    </div>
  );
}
