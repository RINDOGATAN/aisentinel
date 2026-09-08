// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Pure tests for the vendor supply-chain helpers: the tolerant reader for
 * the catalog's untyped `subprocessors` column, and the portfolio
 * concentration that the vendor risk page renders.
 */

import { describe, it, expect } from "vitest";
import {
  parseSubprocessors,
  subprocessorKey,
  summarizeSupplyChain,
  computeSharedSubprocessors,
} from "./supply-chain";

describe("parseSubprocessors", () => {
  it("reads the vendor.watch structured shape", () => {
    const subs = parseSubprocessors([
      {
        name: "Mixpanel",
        source: "ai-enriched",
        purpose: "Platform usage analysis",
        catalogVendorSlug: "mixpanel",
      },
      {
        name: "AWS",
        source: "subprocessor-page",
        location: "EU (Ireland)",
        sourceUrl: "https://example.test/subprocessors",
      },
    ]);
    expect(subs).toHaveLength(2);
    expect(subs[0]).toEqual({
      name: "Mixpanel",
      purpose: "Platform usage analysis",
      location: null,
      source: "ai-enriched",
      sourceUrl: null,
      catalogVendorSlug: "mixpanel",
    });
    expect(subs[1].location).toBe("EU (Ireland)");
    expect(subs[1].catalogVendorSlug).toBeNull();
  });

  it("accepts the legacy JSON-string and bare-name shapes", () => {
    expect(parseSubprocessors('[{"name":"Twilio"}]')).toEqual([
      { name: "Twilio", purpose: null, location: null, source: null, sourceUrl: null, catalogVendorSlug: null },
    ]);
    expect(parseSubprocessors(["Stripe", "  ", 42]).map((s) => s.name)).toEqual(["Stripe"]);
  });

  it("returns an empty list for null, objects, malformed strings and nameless entries", () => {
    expect(parseSubprocessors(null)).toEqual([]);
    expect(parseSubprocessors(undefined)).toEqual([]);
    expect(parseSubprocessors({ name: "not a list" })).toEqual([]);
    expect(parseSubprocessors("{oops")).toEqual([]);
    expect(parseSubprocessors([{ purpose: "no name" }, { name: "" }])).toEqual([]);
  });

  it("de-duplicates on slug, then on normalised name", () => {
    const subs = parseSubprocessors([
      { name: "Amazon Web Services", catalogVendorSlug: "amazon-web-services" },
      { name: "AWS", catalogVendorSlug: "amazon-web-services" },
      { name: "Snowflake, Inc." },
      { name: "snowflake inc" },
      { name: "AWS" },
    ]);
    expect(subs.map((s) => s.name)).toEqual(["Amazon Web Services", "Snowflake, Inc.", "AWS"]);
  });
});

describe("subprocessorKey", () => {
  it("prefers the catalog slug and otherwise normalises the name", () => {
    expect(subprocessorKey({ name: "Whatever", catalogVendorSlug: "openai" })).toBe("slug:openai");
    expect(subprocessorKey({ name: "  New Relic, Inc. ", catalogVendorSlug: null })).toBe("name:new relic inc");
  });
});

describe("summarizeSupplyChain", () => {
  it("counts linked entries and groups locations by frequency", () => {
    const summary = summarizeSupplyChain(
      parseSubprocessors([
        { name: "A", location: "US", catalogVendorSlug: "a" },
        { name: "B", location: "EU" },
        { name: "C", location: "US" },
        { name: "D" },
      ]),
    );
    expect(summary.total).toBe(4);
    expect(summary.linked).toBe(1);
    expect(summary.locations).toEqual([
      { location: "US", count: 2 },
      { location: "EU", count: 1 },
    ]);
  });
});

describe("computeSharedSubprocessors", () => {
  const vendors = [
    {
      id: "v1",
      name: "Chatbot Co",
      catalogSlug: "chatbot-co",
      subprocessors: [
        { name: "OpenAI", catalogVendorSlug: "openai" },
        { name: "Amazon Web Services", catalogVendorSlug: "amazon-web-services" },
        { name: "Amazon Web Services", catalogVendorSlug: "amazon-web-services" },
      ],
    },
    {
      id: "v2",
      name: "Analytics Ltd",
      catalogSlug: "analytics-ltd",
      subprocessors: [
        { name: "AWS", catalogVendorSlug: "amazon-web-services" },
        { name: "Snowflake" },
        // A vendor listing itself (reseller pages do this) is not a dependency.
        { name: "Analytics Ltd", catalogVendorSlug: "analytics-ltd" },
      ],
    },
    { id: "v3", name: "Manual vendor", catalogSlug: null, subprocessors: null },
  ];

  it("ranks subprocessors by how many portfolio vendors depend on them", () => {
    const shared = computeSharedSubprocessors(vendors);
    expect(shared.map((s) => [s.name, s.dependents.map((d) => d.id)])).toEqual([
      ["Amazon Web Services", ["v1", "v2"]],
      ["OpenAI", ["v1"]],
      ["Snowflake", ["v2"]],
    ]);
    expect(shared[0].catalogVendorSlug).toBe("amazon-web-services");
  });

  it("returns nothing for a portfolio with no catalog data", () => {
    expect(computeSharedSubprocessors([vendors[2]])).toEqual([]);
  });
});
