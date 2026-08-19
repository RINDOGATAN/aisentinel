// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Font registration for the modern report design system.
 *
 * Registers Inter 400/500/600/700 from vendored TTFs (see ../fonts/ and its
 * LICENSE.txt) so server rendering is deterministic — no system-font lookup.
 * Reports call registerReportFonts() before rendering; the module-level
 * guard makes repeated calls free.
 */
import path from "node:path";
import { Font } from "@react-pdf/renderer";

const fontsDir = path.join(process.cwd(), "src/server/services/export/fonts");

let registered = false;

export function registerReportFonts(): void {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(fontsDir, "Inter-Regular.ttf"), fontWeight: 400 },
      { src: path.join(fontsDir, "Inter-Medium.ttf"), fontWeight: 500 },
      { src: path.join(fontsDir, "Inter-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(fontsDir, "Inter-Bold.ttf"), fontWeight: 700 },
    ],
  });

  // Never hyphenate — labels and legal terms must not break mid-word.
  Font.registerHyphenationCallback((word) => [word]);
}
