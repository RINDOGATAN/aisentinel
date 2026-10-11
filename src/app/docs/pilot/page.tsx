// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot, published. The same five points a person acknowledges on
 * their first sign-in, so nobody has to remember a pop-up, plus the caps, the
 * ways on (export, a paid plan, a managed instance or your own hardware) and the
 * three hosting options in the owner's wording of 10 Oct 2026, the same as the
 * landing pages.
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
    pricingLink: string;
    pricingUrl: string;
    hostingTitle: string;
    hostingIntro: string;
    hosting: { title: string; body: string }[];
    hostingLink: string;
    hostingUrl: string;
    leavingTitle: string;
    leaving: string;
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
      "The hosted pilot holds one organisation per account. To carry several organisations, choose a managed instance or your own hardware.",
    waysOutTitle: "When you reach a limit",
    waysOut:
      "The pilot is for trying the tool with invented data. For real data, choose a paid plan or a managed instance, where the limits of the pilot do not apply. You can also export everything you created as a program pack at any time.",
    pricingLink: "See the plans and prices",
    pricingUrl: "https://www.todo.law/pricing",
    hostingTitle: "Three hosting options",
    hostingIntro: "Three hosting options, with different safeguards, certifications and levels of control.",
    hosting: [
      {
        title: "In the TODO.LAW cloud",
        body: "You use it in the browser, on desktop or mobile. Nothing to install, and you can take your program elsewhere whenever you like with a simple export. The data is stored in the European Union (Frankfurt).",
      },
      {
        title: "Managed virtual server",
        body: "An isolated instance we run for you from Asturias, Spain, with open LLMs available and a tailored SLA.",
      },
      {
        title: "Your own hardware",
        body: "The TODO.LAW suite on a machine in your organization. Your data never leaves your premises unless you connect an outside AI provider.",
      },
    ],
    hostingLink: "Compare the hosting options",
    hostingUrl: "https://www.todo.law/run",
    leavingTitle: "Taking your program elsewhere",
    leaving:
      "Your program is yours. Export it in full as a program pack from Settings whenever you like. If you move to an enterprise governance platform, we help you with the migration.",
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
      "El piloto alojado admite una organización por cuenta. Si necesitas llevar varias organizaciones, elige una instancia gestionada o tu propio hardware.",
    waysOutTitle: "Cuando llegues a un límite",
    waysOut:
      "El piloto sirve para probar la herramienta con datos inventados. Para datos reales, elige un plan de pago (el Plan nube UE cuesta 179 € al mes o 1.800 € al año por organización) o una instancia gestionada, donde no se aplican los límites del piloto. También puedes exportar todo lo que has creado como paquete del programa cuando quieras.",
    pricingLink: "Consulta los planes y precios",
    pricingUrl: "https://www.todo.law/es/precios",
    hostingTitle: "Tres modalidades de alojamiento",
    hostingIntro: "Te ofrecemos tres modalidades de alojamiento con diferentes garantías, certificaciones y niveles de control.",
    hosting: [
      {
        title: "En la nube de TODO.LAW",
        body: "Lo usas desde el navegador, en desktop o móvil. No instalas nada y puedes llevarte tu programa a otro sitio cuando quieras, mediante una sencilla exportación. Los datos se guardan en la Unión Europea (Fráncfort).",
      },
      {
        title: "Servidor virtual gestionado",
        body: "Una instancia aislada que operamos nosotros desde Asturias, con disponibilidad de LLMs abiertos y SLA a medida.",
      },
      {
        title: "Tu propio hardware",
        body: "La suite de TODO.LAW en un equipo de tu organización. Los datos no salen de tus instalaciones, salvo que conectes con un proveedor de IA externo.",
      },
    ],
    hostingLink: "Compara las modalidades de alojamiento",
    hostingUrl: "https://www.todo.law/es/a-tu-manera",
    leavingTitle: "Llevarte tu programa a otro sitio",
    leaving:
      "Tu programa es tuyo. Expórtalo completo como paquete del programa desde Configuración cuando quieras. Si pasas a una plataforma de gobernanza empresarial, te ayudamos con la migración.",
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
            href={copy.pricingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            {copy.pricingLink}
          </a>
          .
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          {locale === "es"
            ? `El periodo de edición es de ${PILOT_EDIT_DAYS} días.`
            : `The editing window is ${PILOT_EDIT_DAYS} days.`}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-display tracking-tight mb-4">{copy.hostingTitle}</h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">{copy.hostingIntro}</p>
        <div className="grid gap-4 sm:grid-cols-3 max-w-4xl">
          {copy.hosting.map((h) => (
            <div key={h.title} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-2">{h.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{h.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm">
          <a
            href={copy.hostingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            {copy.hostingLink}
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-display tracking-tight mb-4">{copy.leavingTitle}</h2>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">{copy.leaving}</p>
      </section>
    </div>
  );
}
