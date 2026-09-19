// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { describe, expect, it, vi } from "vitest";
import {
  downloadExport,
  exportFailureKind,
  filenameFromDisposition,
  pricingUrl,
} from "./export-download";

const URL_ = "/api/export/governance-program?organizationId=o1&locale=en";

function fetchReturning(res: Response) {
  return vi.fn(async () => res) as unknown as typeof fetch;
}

describe("downloadExport", () => {
  it("saves the file on a 2xx answer, using the server's file name", async () => {
    const save = vi.fn();
    const res = new Response("%PDF-1.7", {
      status: 200,
      headers: { "Content-Disposition": 'attachment; filename="program.pdf"' },
    });
    const out = await downloadExport(URL_, { fetchImpl: fetchReturning(res), save });
    expect(out).toEqual({ ok: true, filename: "program.pdf" });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1]).toBe("program.pdf");
  });

  it("reports a 402 as a licensed module and never saves the JSON body", async () => {
    const save = vi.fn();
    const res = Response.json({ error: "Premium deliverable" }, { status: 402 });
    const out = await downloadExport(URL_, { fetchImpl: fetchReturning(res), save });
    expect(out).toEqual({ ok: false, kind: "locked", status: 402 });
    expect(save).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403, 404, 429, 500, 503])(
    "reports %i as a generation failure and never saves",
    async (status) => {
      const save = vi.fn();
      const res = Response.json({ error: "x" }, { status });
      const out = await downloadExport(URL_, { fetchImpl: fetchReturning(res), save });
      expect(out).toEqual({ ok: false, kind: "failed", status });
      expect(save).not.toHaveBeenCalled();
    },
  );

  it("reports a network error as a generation failure", async () => {
    const save = vi.fn();
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network");
    }) as unknown as typeof fetch;
    const out = await downloadExport(URL_, { fetchImpl, save });
    expect(out).toEqual({ ok: false, kind: "failed", status: null });
    expect(save).not.toHaveBeenCalled();
  });

  it("sends the session cookie with the request", async () => {
    const fetchImpl = fetchReturning(new Response("x"));
    await downloadExport(URL_, { fetchImpl, save: vi.fn() });
    expect(fetchImpl).toHaveBeenCalledWith(URL_, { credentials: "same-origin" });
  });

  it("falls back to the route name when no file name is sent", async () => {
    const save = vi.fn();
    const out = await downloadExport(URL_, {
      fetchImpl: fetchReturning(new Response("x")),
      save,
    });
    expect(out).toEqual({ ok: true, filename: "governance-program" });
  });
});

describe("helpers", () => {
  it("classifies only 402 as locked", () => {
    expect(exportFailureKind(402)).toBe("locked");
    expect(exportFailureKind(403)).toBe("failed");
    expect(exportFailureKind(null)).toBe("failed");
  });

  it("points to the pricing page in the reader's language", () => {
    expect(pricingUrl("en")).toBe("https://www.todo.law/pricing");
    expect(pricingUrl("es")).toBe("https://www.todo.law/es/precios");
  });

  it("reads plain and encoded file names", () => {
    expect(filenameFromDisposition('attachment; filename="a b.zip"', "f")).toBe("a b.zip");
    expect(filenameFromDisposition("attachment; filename=a.csv", "f")).toBe("a.csv");
    expect(
      filenameFromDisposition("attachment; filename*=UTF-8''evaluaci%C3%B3n.md", "f"),
    ).toBe("evaluación.md");
    expect(filenameFromDisposition(null, "f")).toBe("f");
  });
});
