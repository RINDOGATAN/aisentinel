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

export const LANDING_VIDEOS_ES: readonly LandingVideo[] = [];
