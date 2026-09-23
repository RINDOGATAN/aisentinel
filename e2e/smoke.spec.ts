// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The smoke walk: the paths a new user takes on a fresh self-hosted install,
 * from a real browser, at 1280 px and at 390 px.
 *
 * Sign in with the local sign-in, pass the first-run screens, reach the
 * dashboard and the main list, create one record of each principal kind
 * (system, vendor, policy, incident, assessment), open it, edit it, export,
 * and sign out. Every step asserts:
 *
 *   - no page answers 500;
 *   - no uncaught exception and no error in the browser console;
 *   - no request to the product's own API answers 4xx or 5xx, except the ones
 *     the step expects;
 *   - at 390 px, nothing is wider than the screen
 *     (document.documentElement.scrollWidth <= window.innerWidth).
 *
 * Two steps fail on purpose, behind AISENTINEL_TEST_FAILURES (see e2e/env.ts),
 * to prove what a person sees when something breaks.
 */
import { test, expect, type Page, type Response } from "@playwright/test";

interface Problem {
  kind: "page-500" | "api-error" | "uncaught" | "console-error";
  detail: string;
}

/** Watches one page for the four kinds of failure; each step reads and clears it. */
class Watch {
  private problems: Problem[] = [];

  constructor(
    private page: Page,
    private origin: string,
  ) {
    page.on("pageerror", (error) =>
      this.problems.push({ kind: "uncaught", detail: `${error.name}: ${error.message}` }),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        this.problems.push({ kind: "console-error", detail: message.text() });
    });
    page.on("response", (response) => this.onResponse(response));
  }

  private onResponse(response: Response) {
    const url = new URL(response.url());
    // The product's own pages and API only; fonts and the like are not ours.
    if (url.origin !== this.origin) return;
    const status = response.status();
    const isDocument = response.request().resourceType() === "document";
    if (isDocument && status >= 500) {
      this.problems.push({ kind: "page-500", detail: `${status} ${url.pathname}` });
    } else if (url.pathname.startsWith("/api/") && status >= 400) {
      this.problems.push({ kind: "api-error", detail: `${status} ${url.pathname}${url.search}` });
    } else if (url.pathname.startsWith("/api/trpc/") && status === 207) {
      // A batch in which some calls failed: the failure hides behind a 2xx.
      this.problems.push({ kind: "api-error", detail: `207 ${url.pathname}${url.search}` });
    }
  }

  /** The problems since the last call, minus the ones this step expects. */
  take(expected: RegExp[] = []): Problem[] {
    const found = this.problems.filter((p) => !expected.some((re) => re.test(p.detail)));
    this.problems = [];
    return found;
  }
}

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 640;

/** Runs one step of the walk and applies the four checks to it. */
async function step(
  page: Page,
  watch: Watch,
  name: string,
  body: () => Promise<void>,
  expected: RegExp[] = [],
) {
  await test.step(name, async () => {
    await body();
    await page.waitForLoadState("networkidle").catch(() => {});
    // Soft: the walk goes on, so one run reports every failure it meets. The
    // test still fails at the end if any check did.
    const problems = watch.take(expected);
    expect.soft(problems, `${name}: ${JSON.stringify(problems, null, 2)}`).toEqual([]);
    if (isPhone(page)) {
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect
        .soft(scrollWidth, `${name}: page is wider than the phone screen`)
        .toBeLessThanOrEqual(innerWidth);
    }
  });
}

/** Picks an option in a Radix select, found by the placeholder its trigger shows. */
async function choose(page: Page, placeholder: string, option: string) {
  await page.getByRole("combobox").filter({ hasText: placeholder }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("a new user's first session, end to end", async ({ page }, testInfo) => {
  const run = `${testInfo.project.name}-${Date.now()}`;
  const email = `smoke-${run}@example.test`;
  const systemName = `Smoke system ${run}`;
  const watch = new Watch(page, new URL(testInfo.project.use.baseURL ?? "http://localhost").origin);

  await step(page, watch, "the landing page leads a signed-out visitor to sign in", async () => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByText("Local sign-in")).toBeVisible();
  });

  await step(page, watch, "sign in with the local sign-in", async () => {
    // Wait for React to take over the form, or it submits natively.
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(email);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/governance/);
  });

  await step(page, watch, "the first-run screens: persona, then the organisation", async () => {
    await expect(page.getByText("How will you use AI SENTINEL?")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("#org-name").fill(`Smoke firm ${run}`);
    await page.getByRole("button", { name: "Create organization and continue" }).click();
    await page.waitForURL(/\/governance\/quickstart/);
  });

  await step(page, watch, "the dashboard", async () => {
    await page.goto("/governance");
    await expect(page.locator("main").first()).toBeVisible();
  });

  await step(page, watch, "the main list: the AI registry", async () => {
    await page.goto("/governance/ai-registry");
    await expect(page.locator("main").first()).toBeVisible();
  });

  await step(page, watch, "create an AI system and open it", async () => {
    await page.goto("/governance/ai-registry/new");
    await page.locator("#name").fill(systemName);
    await choose(page, "Select technique", "Generative AI");
    await choose(page, "Select role", "Deployer");
    await page.getByRole("button", { name: "Register System" }).click();
    await page.waitForURL(/\/governance\/ai-registry\/(?!new)[^/]+$/);
    await expect(page.getByRole("heading", { name: systemName }).first()).toBeVisible();
  });

  await step(page, watch, "edit the AI system", async () => {
    await page.getByRole("button", { name: "Edit", exact: true }).first().click();
    await page.locator("#edit-description").fill("Edited by the smoke walk.");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  await step(page, watch, "create a vendor and open it", async () => {
    await page.goto("/governance/vendors/new");
    await page.locator("#name").fill(`Smoke vendor ${run}`);
    await page.getByRole("button", { name: "Add Vendor" }).click();
    await page.waitForURL(/\/governance\/vendors\/(?!new)[^/]+$/);
  });

  await step(page, watch, "create a policy, open it and edit it", async () => {
    await page.goto("/governance/policies/new");
    await page.locator("#title").fill(`Smoke policy ${run}`);
    await choose(page, "Select policy type", "AI Usage");
    await page.getByRole("button", { name: "Create Policy" }).click();
    await page.waitForURL(/\/governance\/policies\/(?!new)[^/]+$/);
    await page.getByRole("button", { name: "Edit Content" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("textarea").first().fill("Edited by the smoke walk.");
    await dialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(dialog).toBeHidden();
  });

  await step(page, watch, "report an incident, open it and edit it", async () => {
    await page.goto("/governance/incidents/new");
    await page.locator("#title").fill(`Smoke incident ${run}`);
    await page.locator("#description").fill("Reported by the smoke walk.");
    await choose(page, "Select incident type", "Hallucination");
    await choose(page, "Select severity", "High");
    await page.getByRole("button", { name: "Report Incident" }).click();
    await page.waitForURL(/\/governance\/incidents\/(?!new)[^/]+$/);
    await page.getByRole("tab", { name: "Root Cause" }).click();
    await page.locator("#rootCauseDescription").fill("Found by the smoke walk.");
    await page.getByRole("button", { name: "Save Root Cause" }).click();
    await expect(page.locator("#rootCauseDescription")).toHaveValue("Found by the smoke walk.");
  });

  await step(page, watch, "create an assessment, open it and edit it", async () => {
    await page.goto("/governance/assessments/new");
    await page.getByRole("button", { name: new RegExp(systemName) }).click();
    await page.locator("button:not([disabled])").filter({ hasText: "AI Risk" }).first().click();
    await page.getByRole("button", { name: "Create Assessment" }).click();
    await page.waitForURL(/\/governance\/assessments\/(?!new)[^/]+$/);
    const field = page.locator("main textarea").first();
    await field.fill("Answered by the smoke walk.");
    await page.getByRole("button", { name: "Save", exact: true }).first().click();
    await expect(field).toHaveValue("Answered by the smoke walk.");
  });

  await step(page, watch, "export the AI system register", async () => {
    await page.goto("/governance/ai-registry");
    await page.getByRole("button", { name: "Export" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "AI system register (PDF)" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  });

  await step(page, watch, "the compliance page offers AIUC-1 beside the other frameworks", async () => {
    await page.goto("/governance/compliance");
    await choose(page, "Select AI System...", systemName);
    await page.getByRole("tab", { name: /^AIUC-1 \(57\)$/ }).click();
    const panel = page.getByRole("tabpanel");
    await expect(panel.getByText("Data & Privacy", { exact: true })).toBeVisible();
    await expect(panel.getByText("Society", { exact: true })).toBeVisible();
  });

  await step(page, watch, "the health route answers 200 with the version", async () => {
    const response = await page.request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  await step(
    page,
    watch,
    "a failing procedure tells the person what to do, with a reference",
    async () => {
      const response = await page.request.post("/api/trpc/diagnostics.fail", {
        data: { json: null },
      });
      expect(response.status()).toBe(500);
      const text = await response.text();
      expect(text).toContain("This could not be completed because of a problem on our side.");
      expect(text).not.toContain("secret_internal_table");
      expect(text).not.toMatch(/Internal server error/i);
    },
  );

  await step(
    page,
    watch,
    "a failing page shows the error page, never a blank page or a stack",
    async () => {
      await page.goto("/governance/test-failure");
      await expect(page.getByText("Something went wrong")).toBeVisible();
      await expect(page.getByTestId("error-reference")).toHaveText(/^[DE]-\S+$/);
      await expect(page.getByRole("link", { name: "Back to the dashboard" })).toBeVisible();
      await expect(page.getByRole("link", { name: "How to report a problem" })).toBeVisible();
      await expect(page.locator("body")).not.toContainText("deliberate page failure");
      await expect(page.locator("body")).not.toContainText(/at \w+ \(.*:\d+:\d+\)/);
    },
    // The page answers 500; React reports the server error (#441 is its
    // production placeholder for one) and the error page logs it under its
    // reference.
    [/^500 \/governance\/test-failure$/, /\[error [DE]-/, /status of 500/, /React error #441/],
  );

  await step(page, watch, "sign out", async () => {
    await page.goto("/governance");
    await page.getByTitle("Sign out").click();
    await page.waitForURL(/\/sign-in/);
  });
});
