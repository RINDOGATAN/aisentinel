// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * Every page asks for a number of rows the server accepts.
 *
 * Found by the smoke walk (2026-09-22): four pages asked `aiSystem.list` or
 * `vendor.list` for 100 rows while the input rule allowed 50. The server
 * refused each call, the pickers on those pages were silently empty, and the
 * refusal hid inside a batched response. This reads every `useQuery` call in
 * the pages and components that passes a literal `limit`, and checks it
 * against the procedure's own input rule.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

vi.mock("@/lib/prisma", () => ({ default: {}, prisma: {} }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { appRouter } from "@/server/routers";

type Parser = { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[] }[] } } };
const procedures = (
  appRouter as unknown as { _def: { procedures: Record<string, { _def: { inputs: Parser[] } }> } }
)._def.procedures;

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sources(full));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const ROOT = join(__dirname, "../../..");
// trpc.<router>.<procedure>.useQuery( { ... limit: N ... }
const CALL = /trpc\.(\w+)\.(\w+)\.useQuery\(\s*\{([^}]*?)\blimit:\s*(\d+)/g;

describe("list limits the pages ask for", () => {
  const calls = [...sources(join(ROOT, "app")), ...sources(join(ROOT, "components"))].flatMap(
    (file) =>
      [...readFileSync(file, "utf8").matchAll(CALL)].map((m) => ({
        where: relative(ROOT, file),
        path: `${m[1]}.${m[2]}`,
        limit: Number(m[4]),
      })),
  );

  it("finds the calls it is meant to check", () => {
    expect(calls.length).toBeGreaterThanOrEqual(15);
  });

  it("are all accepted by the procedure's input rule", () => {
    const refused = calls.filter(({ path, limit }) => {
      const parser = procedures[path]?._def.inputs[0];
      if (!parser) return true;
      const result = parser.safeParse({ organizationId: "org", limit });
      return !result.success && result.error!.issues.some((i) => i.path[0] === "limit");
    });
    expect(refused).toEqual([]);
  });
});
