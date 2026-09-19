// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { beforeEach, describe, expect, it, vi } from "vitest";

let cookieHeader = "";
vi.mock("next/headers", () => ({
  headers: async () => new Headers(cookieHeader ? { cookie: cookieHeader } : {}),
}));
// The server build of getRequestConfig returns the callback unchanged; the
// test runner resolves the client build, which throws.
vi.mock("next-intl/server", () => ({ getRequestConfig: <T>(fn: T) => fn }));

import getRequestConfig from "./request";

async function renderedLocale(cookie: string) {
  cookieHeader = cookie;
  const config = await (getRequestConfig as unknown as (p: unknown) => Promise<{ locale: string }>)({
    requestLocale: Promise.resolve(undefined),
  });
  return config.locale;
}

describe("page locale (docs and dashboard)", () => {
  beforeEach(() => {
    cookieHeader = "";
  });

  it("renders English when the header carries locale=es; locale=en", async () => {
    expect(await renderedLocale("locale=es; locale=en")).toBe("en");
  });

  it("renders Spanish when the last value is es", async () => {
    expect(await renderedLocale("locale=en; locale=es")).toBe("es");
  });

  it("renders English with no cookie", async () => {
    expect(await renderedLocale("")).toBe("en");
  });
});
