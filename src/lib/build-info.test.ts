// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCommit, latestMigrationName } from "@/lib/build-info";

describe("latestMigrationName", () => {
  it("picks the newest migration folder and ignores the other files", () => {
    expect(
      latestMigrationName([
        "0_init",
        "20260919140000_sample_records",
        "20260101000000_first",
        "migration_lock.toml",
        "README.md",
      ]),
    ).toBe("20260919140000_sample_records");
  });

  it("finds a migration in this tree, so the health route has something to compare", () => {
    const name = latestMigrationName(readdirSync("prisma/migrations"));
    expect(name).toMatch(/^\d{14}_\w+$/);
  });

  it("returns null for an empty listing", () => {
    expect(latestMigrationName(["migration_lock.toml"])).toBeNull();
  });
});

describe("buildCommit", () => {
  it("shortens whichever commit the build system provides", () => {
    expect(buildCommit({ VERCEL_GIT_COMMIT_SHA: "b79f2c9aaaaaaaa" })).toBe("b79f2c9");
    expect(buildCommit({ SOURCE_COMMIT: "0123456789abcdef" })).toBe("0123456");
    expect(buildCommit({})).toBeNull();
  });
});
