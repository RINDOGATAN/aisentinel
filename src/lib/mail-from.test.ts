// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mailAddress, mailFrom, signInSubject } from "./mail-from";

const base = { emailName: "AI Sentinel", companyName: "TODO.LAW", emailFrom: "noreply@todo.law" };

describe("mailFrom", () => {
  it("builds the default sender in title case", () => {
    expect(mailFrom(base)).toBe("AI Sentinel by TODO.LAW <noreply@todo.law>");
  });

  it("keeps only the address when EMAIL_FROM already carries a display name", () => {
    expect(mailFrom({ ...base, emailFrom: "AI SENTINEL <alerts@example.org>" })).toBe(
      "AI Sentinel by TODO.LAW <alerts@example.org>",
    );
    expect(mailFrom({ ...base, emailFrom: '"noreply todo.law" <noreply@todo.law>' })).toBe(
      "AI Sentinel by TODO.LAW <noreply@todo.law>",
    );
  });

  it("falls back to noreply@todo.law when the address is empty or unusable", () => {
    expect(mailAddress("")).toBe("noreply@todo.law");
    expect(mailAddress(undefined)).toBe("noreply@todo.law");
    expect(mailAddress("not an address")).toBe("noreply@todo.law");
  });

  it("keeps a white-label name and company", () => {
    expect(mailFrom({ emailName: "Firm AI", companyName: "Firm", emailFrom: "it@firm.example" })).toBe(
      "Firm AI by Firm <it@firm.example>",
    );
  });

  it("builds the sign-in subject", () => {
    expect(signInSubject(base)).toBe("Sign in to AI Sentinel");
  });
});

describe("no literal sender left in the source", () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return files(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
  }

  it("every send call builds its From header through mailFrom()", () => {
    const offenders = files(join(process.cwd(), "src")).filter((path) =>
      /from:\s*[`"'][^`"'\n]*(<[^>]*@|\$\{[^}]*emailFrom)/.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
