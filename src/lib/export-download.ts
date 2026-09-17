// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * How every download button fetches a generated document.
 *
 * The export routes answer with a file, or with a JSON error (402 when the
 * deliverable is licensed, 4xx/5xx otherwise). Navigating straight to the route
 * shows that JSON to a person on a blank page. So the file is fetched first,
 * and only a successful answer is handed to the browser as a download; any
 * other answer is returned to the caller, which stays on the page and says
 * what happened.
 *
 * Pure apart from the injected `fetch` and `save`, so the rule is testable in
 * Node without a browser.
 */

export type ExportFailureKind = "locked" | "failed";

export type ExportResult =
  | { ok: true; filename: string }
  | { ok: false; kind: ExportFailureKind; status: number | null };

/** 402 means "licensed module"; anything else is a generation failure. */
export function exportFailureKind(status: number | null): ExportFailureKind {
  return status === 402 ? "locked" : "failed";
}

/** Where the "See pricing" action goes, in the reader's language. */
export function pricingUrl(locale: string): string {
  return locale === "es"
    ? "https://www.todo.law/es/precios"
    : "https://www.todo.law/pricing";
}

/** The file name from a Content-Disposition header, or the fallback. */
export function filenameFromDisposition(
  header: string | null | undefined,
  fallback: string,
): string {
  if (!header) return fallback;
  const encoded = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // Fall through to the plain form.
    }
  }
  const plain = /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i.exec(header);
  const name = (plain?.[1] ?? plain?.[2] ?? "").trim();
  return name || fallback;
}

/** The last path segment of the export URL, used when no name is sent. */
function fallbackName(url: string): string {
  const path = url.split("?")[0];
  return path.split("/").filter(Boolean).pop() || "download";
}

export interface ExportDeps {
  fetchImpl?: typeof fetch;
  save?: (blob: Blob, filename: string) => void;
}

export async function downloadExport(
  url: string,
  { fetchImpl = fetch, save = saveBlob }: ExportDeps = {},
): Promise<ExportResult> {
  let res: Response;
  try {
    res = await fetchImpl(url, { credentials: "same-origin" });
  } catch {
    return { ok: false, kind: "failed", status: null };
  }
  if (!res.ok) {
    return { ok: false, kind: exportFailureKind(res.status), status: res.status };
  }
  try {
    const blob = await res.blob();
    const filename = filenameFromDisposition(
      res.headers.get("Content-Disposition"),
      fallbackName(url),
    );
    save(blob, filename);
    return { ok: true, filename };
  } catch {
    return { ok: false, kind: "failed", status: res.status };
  }
}

/** Browser implementation: hand the blob to the browser as a download. */
export function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before the URL is released.
  setTimeout(() => URL.revokeObjectURL(href), 30_000);
}
