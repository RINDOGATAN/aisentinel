// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * How a person reports a problem, what the reference on an error page is for,
 * and that their exports stay available. Linked from every error page
 * (src/components/error-screen.tsx). The same text, for the repository, is in
 * docs/status-and-support.md.
 */

import { getLocale } from "next-intl/server";

type Locale = "en" | "es";

const COPY: Record<
  Locale,
  {
    title: string;
    lead: string;
    sections: { title: string; body: string[] }[];
  }
> = {
  en: {
    title: "Reporting a problem",
    lead: "If something in AI SENTINEL does not work as it should, this page tells you how to let us know and what to include.",
    sections: [
      {
        title: "How to report it",
        body: [
          "Use the feedback form inside the application: the Feedback button (a speech bubble with an exclamation mark) at the top of every page, or Feedback in the side menu on a phone. On the hosted service, what you write reaches us in a daily summary. On your own instance, it is kept in your instance for your administrator.",
          "Say what you were doing, what you expected and what happened instead. If an error page showed a reference, include it.",
        ],
      },
      {
        title: "The reference on an error page",
        body: [
          "When a page or an action fails, you see a short reference, for example E-7K3M9Q2P. The same reference is written in our log next to the technical detail of the failure.",
          "It contains nothing about you or your records. Its only purpose is to let us find exactly what went wrong from your report, without asking you for screenshots or technical detail.",
        ],
      },
      {
        title: "Your work and your exports",
        body: [
          "An error page means one page or one action failed. It does not delete or change anything you saved.",
          "Your exports are always available, including on the hosted pilot after its editing period: the program pack and the PDF reports can be downloaded at any time.",
        ],
      },
      {
        title: "Try again first",
        body: [
          "Many failures are brief. Use Try again on the error page, or reload the page. If the same thing fails twice, please report it.",
        ],
      },
    ],
  },
  es: {
    title: "Cómo informar de un problema",
    lead: "Si algo en AI SENTINEL no funciona como debería, esta página te explica cómo decírnoslo y qué incluir.",
    sections: [
      {
        title: "Cómo informar",
        body: [
          "Usa el formulario de sugerencias de la aplicación: el botón Sugerencias (un bocadillo con un signo de exclamación) en la parte superior de cada página, o Sugerencias en el menú lateral del móvil. En el servicio alojado, lo que escribas nos llega en un resumen diario. En tu propia instancia, se guarda en ella para tu administrador.",
          "Cuenta qué estabas haciendo, qué esperabas y qué ha pasado. Si una página de error mostraba una referencia, inclúyela.",
        ],
      },
      {
        title: "La referencia de una página de error",
        body: [
          "Cuando falla una página o una acción, ves una referencia corta, por ejemplo E-7K3M9Q2P. La misma referencia queda escrita en nuestro registro junto al detalle técnico del fallo.",
          "No contiene nada sobre ti ni sobre tus registros. Solo sirve para que podamos localizar exactamente qué ha fallado a partir de tu aviso, sin pedirte capturas ni detalles técnicos.",
        ],
      },
      {
        title: "Tu trabajo y tus exportaciones",
        body: [
          "Una página de error significa que ha fallado una página o una acción. No borra ni cambia nada de lo que hayas guardado.",
          "Tus exportaciones están siempre disponibles, también en el piloto alojado una vez terminado su periodo de edición: puedes descargar en cualquier momento el paquete del programa y los informes en PDF.",
        ],
      },
      {
        title: "Primero, vuelve a intentarlo",
        body: [
          "Muchos fallos son pasajeros. Usa Volver a intentarlo en la página de error, o recarga la página. Si lo mismo falla dos veces, infórmanos.",
        ],
      },
    ],
  },
};

export async function generateMetadata() {
  const locale: Locale = (await getLocale()) === "es" ? "es" : "en";
  return { title: COPY[locale].title, description: COPY[locale].lead };
}

export default async function SupportDocsPage() {
  const locale: Locale = (await getLocale()) === "es" ? "es" : "en";
  const copy = COPY[locale];

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-4">{copy.title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">{copy.lead}</p>
      </section>
      {copy.sections.map((section) => (
        <section key={section.title} className="max-w-3xl">
          <h2 className="text-2xl font-display tracking-tight mb-4">{section.title}</h2>
          <div className="space-y-3">
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
