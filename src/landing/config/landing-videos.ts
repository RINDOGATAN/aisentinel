// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The Spanish landing's demo videos ("Descubre cómo funciona").
 *
 * Each entry names a set of four files under public/videos/es/, all with the
 * same base name:
 *
 *   <file>.webm   played first where the browser supports it
 *   <file>.mp4    the fallback
 *   <file>.png    the poster, shown until the visitor presses play
 *   <file>.vtt    the Spanish captions track
 *
 * The title and the caption are the visitor-facing text, in Spanish, taken
 * exactly from the recording's captions.json. Titles are plain and say what
 * the visitor will see.
 *
 * While this list is empty the landing shows no videos section at all. A
 * test (src/landing/landing-es.test.tsx) checks that every listed video has
 * its four files.
 */

export interface LandingVideo {
  /** Base file name under public/videos/es/, without extension. */
  file: string;
  title: string;
  caption: string;
}

export const LANDING_VIDEOS_ES: readonly LandingVideo[] = [
  {
    file: "01-inicio-rapido",
    title: "Tu programa de gobernanza de la IA en minutos",
    caption: "Tu organización, dónde operas y una plantilla de tu sector para empezar.",
  },
  {
    file: "02-aplicabilidad",
    title: "Qué normas de IA se te aplican",
    caption: "Unas preguntas sobre cómo usas la IA deciden qué normas te aplican y sus fechas.",
  },
  {
    file: "03-clasificacion-riesgo",
    title: "Clasifica el riesgo de cada sistema de IA",
    caption: "Eliges el nivel de riesgo de cada sistema y dejas escrito el motivo.",
  },
  {
    file: "04-evidencias",
    title: "Las pruebas de tus agentes de IA, en orden",
    caption: "Cada agente de IA frente a AIUC-1, con sus pruebas y su preparación para la auditoría.",
  },
  {
    file: "05-plan-30-60-90",
    title: "Tu plan de 30, 60 y 90 días",
    caption: "En qué punto del plan estás y qué toca hacer en cada área.",
  },
];
