// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Export integrity.
 *
 * An exported document is evidence only if a reader can tell, later, what
 * produced it. Every export therefore carries the same stamp: when it was
 * generated, from which build of the application, and the version and legal
 * review date of every rule pack in force at that moment. The program pack
 * additionally carries a manifest with a SHA-256 digest per file, so a single
 * altered file inside a delivered archive is detectable.
 *
 * This proves what the application produced, not that nobody altered the file
 * afterwards. Digital signing would be the next step; the manifest is the part
 * that is useful without a key ceremony, because the digests can be quoted in
 * a cover letter or a production log and checked with any standard tool.
 */

import { createHash } from "crypto";
import { rulePackList } from "@/config/rule-pack-versions";
import { version as appVersion } from "../../../../package.json";

export interface ExportStamp {
  generatedAt: string;
  appVersion: string;
  /** Short commit of the running build, where the platform provides it. */
  commit: string | null;
  rulePacks: Array<{
    id: string;
    version: string;
    lawReviewedAsOf: string;
    signOff: string;
  }>;
}

export async function exportStamp(): Promise<ExportStamp> {
  return {
    generatedAt: new Date().toISOString(),
    appVersion,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    rulePacks: rulePackList().map((p) => ({
      id: p.id,
      version: p.version,
      lawReviewedAsOf: p.lawReviewedAsOf,
      signOff: p.signOff,
    })),
  };
}

/** The stamp as plain lines, for a document footer or a CSV preamble. */
export function stampLines(stamp: ExportStamp, locale: "en" | "es" = "en"): string[] {
  const build = `${stamp.appVersion}${stamp.commit ? ` (${stamp.commit})` : ""}`;
  const pending = stamp.rulePacks.filter((p) => p.signOff !== "signed-off").length;
  return locale === "es"
    ? [
        `Generado el ${stamp.generatedAt}`,
        `Versión de la aplicación: ${build}`,
        `Paquetes de reglas: ${stamp.rulePacks.length} (${pending} pendientes de validación jurídica)`,
      ]
    : [
        `Generated at ${stamp.generatedAt}`,
        `Application version: ${build}`,
        `Rule packs: ${stamp.rulePacks.length} (${pending} pending legal sign-off)`,
      ];
}

export function sha256(data: string | Uint8Array): string {
  return createHash("sha256")
    .update(typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data))
    .digest("hex");
}

export interface ManifestEntry {
  name: string;
  bytes: number;
  sha256: string;
}

/**
 * The manifest text placed inside an exported archive. Plain text on purpose:
 * it has to be readable by whoever receives the archive, without tooling.
 */
export function renderManifest(
  stamp: ExportStamp,
  entries: ManifestEntry[],
  locale: "en" | "es" = "en",
): string {
  const t =
    locale === "es"
      ? {
          title: "MANIFIESTO DE INTEGRIDAD",
          intro:
            "Este archivo enumera cada fichero del paquete con su huella SHA-256. Para comprobar un fichero, calcula su huella (por ejemplo, con `shasum -a 256 <fichero>`) y compárala con la que figura aquí.",
          packs: "Paquetes de reglas en vigor en el momento de la generación",
          files: "Ficheros",
          note: "El manifiesto acredita lo que produjo la aplicación. No acredita que el archivo no se haya modificado después: para eso haría falta una firma.",
          cols: ["Huella SHA-256", "Bytes", "Fichero"],
          packCols: ["Paquete", "Versión", "Derecho revisado a", "Validación"],
        }
      : {
          title: "INTEGRITY MANIFEST",
          intro:
            "This file lists every file in the pack with its SHA-256 digest. To check a file, compute its digest (for example with `shasum -a 256 <file>`) and compare it with the value here.",
          packs: "Rule packs in force at the time of generation",
          files: "Files",
          note: "The manifest evidences what the application produced. It does not evidence that the archive was not altered afterwards; that would need a signature.",
          cols: ["SHA-256", "Bytes", "File"],
          packCols: ["Pack", "Version", "Law reviewed as of", "Sign-off"],
        };

  const lines: string[] = [];
  lines.push(t.title, "=".repeat(t.title.length), "");
  lines.push(...stampLines(stamp, locale), "");
  lines.push(t.intro, "");
  lines.push(t.packs, "-".repeat(t.packs.length));
  lines.push(t.packCols.join(" | "));
  for (const p of stamp.rulePacks) {
    lines.push([p.id, p.version, p.lawReviewedAsOf, p.signOff].join(" | "));
  }
  lines.push("");
  lines.push(t.files, "-".repeat(t.files.length));
  lines.push(t.cols.join(" | "));
  for (const e of entries) {
    lines.push([e.sha256, String(e.bytes), e.name].join(" | "));
  }
  lines.push("");
  lines.push(t.note);
  return lines.join("\n") + "\n";
}
