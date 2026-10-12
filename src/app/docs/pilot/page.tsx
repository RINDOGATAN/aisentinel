// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The hosted pilot, published: the caps, the ways on (export, a paid plan, a
 * managed instance or your own hardware) and the three hosting options worded
 * as on the landing pages. The pilot's own terms are read from
 * src/config/pilot.ts, so this page and the screens say the same thing.
 */

import { getLocale } from "next-intl/server";
import {
  PILOT_CEILING_KEYS,
  PILOT_CEILING_LABELS,
  PILOT_CEILINGS,
  PILOT_DESCRIPTION,
  PILOT_EDIT_DAYS,
  PILOT_SIGN_IN_LINE,
  PILOT_TERMS,
  type PilotLocale,
} from "@/config/pilot";

export async function generateMetadata() {
  const locale: PilotLocale = (await getLocale()) === "es" ? "es" : "en";
  return {
    title: COPY[locale].title,
    description: PILOT_SIGN_IN_LINE[locale],
  };
}

const COPY: Record<
  PilotLocale,
  {
    title: string;
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
  }
> = {
  en: {
    title: "The hosted pilot",
    capsTitle: "The limits of the pilot",
    capsIntro:
      "Nobody pays for a module on the hosted pilot. Instead it has three limits, and they are the same for every account.",
    editingTitle: "Editing window",
    ceilingsTitle: "Records per organization",
    oneOrgTitle: "One organization per account",
    oneOrg:
      "The hosted pilot holds one organization per account. To carry several organizations, choose a managed instance or your own hardware.",
    waysOutTitle: "When you reach a limit",
    waysOut:
      "The Cloud Plan lifts the limits and keeps your records; a managed instance or your own hardware is on quotation. You can also export everything you created as a program pack at any time.",
    pricingLink: "See the plans and prices",
    pricingUrl: "https://www.todo.law/pricing",
    hostingTitle: "Three hosting options",
    hostingIntro: "Three hosting options, with different safeguards and levels of control.",
    hosting: [
      {
        title: "TODO.LAW cloud",
        body: "You use it in the browser, on desktop or mobile. Nothing to install, and you can take your program elsewhere whenever you like with a simple export.",
      },
      {
        title: "Managed instance",
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
  },
  es: {
    title: "El piloto alojado",
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
      "El Plan nube UE elimina los límites y conserva tus registros; una instancia gestionada o tu propio hardware se ofrecen bajo presupuesto. También puedes exportar todo lo que has creado como paquete del programa cuando quieras.",
    pricingLink: "Consulta los planes y precios",
    pricingUrl: "https://www.todo.law/es/precios",
    hostingTitle: "Tres modalidades de alojamiento",
    hostingIntro: "Te ofrecemos tres modalidades de alojamiento con diferentes garantías y niveles de control.",
    hosting: [
      {
        title: "En la nube de TODO.LAW",
        body: "Lo usas desde el navegador, en el ordenador o en el móvil. No instalas nada y puedes llevarte tu programa a otro sitio cuando quieras, mediante una sencilla exportación. Los datos se guardan en la Unión Europea (Fráncfort).",
      },
      {
        title: "Instancia gestionada",
        body: "Una instancia aislada que operamos nosotros desde Asturias, con disponibilidad de LLM abiertos y SLA a medida.",
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
  },
};

export default async function PilotDocsPage() {
  const locale: PilotLocale = (await getLocale()) === "es" ? "es" : "en";
  const copy = COPY[locale];

  return (
    <div className="space-y-16">
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">{copy.title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">{PILOT_DESCRIPTION[locale]}</p>
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
