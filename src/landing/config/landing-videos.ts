// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The landing's demo videos, per language ("Descubre cómo funciona" in
 * Spanish, "See how it works" in English).
 *
 * Each entry names a set of four files under public/videos/<locale>/, all
 * with the same base name:
 *
 *   <file>.webm   played first where the browser supports it
 *   <file>.mp4    the fallback
 *   <file>.png    the poster, shown until the visitor presses play
 *   <file>.vtt    the captions track (offered, never on by default: the
 *                 subtitles are already in the picture)
 *
 * The title and the caption are the visitor-facing text, in the entry's
 * language. Titles are plain and say what the visitor will see.
 *
 * `published` says whether the card shows. A card that is not published
 * renders nothing, and while no card of a language is published the page
 * shows no videos section at all. tests/landing-en.test.tsx holds
 * `published` to the files on disk: it is true exactly when all four files
 * exist. So when the English recordings land in public/videos/en/, set
 * their entries to true in the same change.
 */

export type LandingLocale = "en" | "es";

export interface LandingVideo {
  /** Base file name under public/videos/<locale>/, without extension. */
  file: string;
  title: string;
  caption: string;
  published: boolean;
}

export const LANDING_VIDEOS: Record<LandingLocale, readonly LandingVideo[]> = {
  es: [
    {
      file: "01-inicio-rapido",
      title: "Tu programa de gobernanza de la IA en minutos",
      caption: "Tu organización, dónde operas y una plantilla de tu sector para empezar.",
      published: true,
    },
    {
      file: "02-aplicabilidad",
      title: "Qué normas de IA se te aplican",
      caption: "Unas preguntas sobre cómo usas la IA deciden qué normas te aplican y sus fechas.",
      published: true,
    },
    {
      file: "03-clasificacion-riesgo",
      title: "Clasifica el riesgo de cada sistema de IA",
      caption: "Eliges el nivel de riesgo de cada sistema y dejas escrito el motivo.",
      published: true,
    },
    {
      file: "04-evidencias",
      title: "Las pruebas de tus agentes de IA, en orden",
      caption: "Cada agente de IA frente a AIUC-1, con sus pruebas y su preparación para la auditoría.",
      published: true,
    },
    {
      file: "05-plan-30-60-90",
      title: "Tu plan de 30, 60 y 90 días",
      caption: "En qué punto del plan estás y qué toca hacer en cada área.",
      published: true,
    },
  ],
  en: [
    {
      file: "01-inicio-rapido",
      title: "Your AI governance program in minutes",
      caption: "Your organization, where you operate and a template for your sector to start from.",
      published: true,
    },
    {
      file: "02-aplicabilidad",
      title: "Which AI laws apply to you",
      caption: "A few questions about how you use AI decide which rules apply and from when.",
      published: true,
    },
    {
      file: "03-clasificacion-riesgo",
      title: "Classify the risk of each AI system",
      caption: "You choose each system's risk level and record the reason.",
      published: true,
    },
    {
      file: "04-evidencias",
      title: "Evidence for your AI agents, in order",
      caption: "Each AI agent against AIUC-1, with its evidence and its readiness for audit.",
      published: true,
    },
    {
      file: "05-plan-30-60-90",
      title: "Your 30, 60 and 90-day plan",
      caption: "Where you are in the plan and what comes next in each area.",
      published: true,
    },
  ],
};

/** The Spanish list, kept under its earlier name. */
export const LANDING_VIDEOS_ES = LANDING_VIDEOS.es;
