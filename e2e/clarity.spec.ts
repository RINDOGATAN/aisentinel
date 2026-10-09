// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The clarity walk (the work carried from DPO Central, owner's decision d10,
 * 9 October 2026), in English and in Spanish, against a local database:
 *
 *   1. one organisation: empty, after the quick start, after confirming its
 *      drafts. At each point the program figure reads the same on the
 *      dashboard, in the menu, on the Program page and on All clients; the
 *      documents panel gives each document a state; the pack downloads.
 *   2. a consultancy with three clients at different stages: All clients
 *      sorts them by the nearest deadline and each row says what the
 *      client's own dashboard says.
 *
 * The quick start, the places and the incident are made through the
 * product's own API from the signed-in page (the same calls the wizard and
 * the forms make); what is checked is what a person sees.
 *
 * Set CLARITY_SHOTS to a directory to keep a screenshot of each point.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import en from "../src/i18n/messages/en.json";
import es from "../src/i18n/messages/es.json";

type Locale = "en" | "es";
const MESSAGES = { en, es } as const;
const SHOTS = process.env.CLARITY_SHOTS;

/** "{done} of {total} steps confirmed" as a pattern, with the two numbers captured. */
function figurePattern(locale: Locale): RegExp {
  const line = MESSAGES[locale].guided.figure.line;
  const escaped = line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace("\\{done\\}", "(\\d+)").replace("\\{total\\}", "(\\d+)")}$`);
}

function readFigure(text: string, locale: Locale): { done: number; total: number } {
  const match = figurePattern(locale).exec(text.trim());
  if (!match) throw new Error(`not a program figure: "${text}"`);
  return { done: Number(match[1]), total: Number(match[2]) };
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  const project = test.info().project.name;
  await page.screenshot({ path: join(SHOTS, `${project}-${name}.png`), fullPage: true });
}

/** Calls the product's API as the signed-in person (tRPC over superjson). */
async function api<T = unknown>(page: Page, path: string, input: unknown, kind: "query" | "mutation"): Promise<T> {
  const result = await page.evaluate(
    async ({ path, input, kind }) => {
      const body = JSON.stringify({ json: input });
      const response =
        kind === "query"
          ? await fetch(`/api/trpc/${path}?input=${encodeURIComponent(body)}`)
          : await fetch(`/api/trpc/${path}`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body,
            });
      return { status: response.status, json: await response.json() };
    },
    { path, input, kind },
  );
  if (result.status !== 200) throw new Error(`${path} answered ${result.status}: ${JSON.stringify(result.json)}`);
  return (result.json as { result: { data: { json: T } } }).result.data.json;
}

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 1024;

async function signIn(page: Page, locale: Locale, email: string, orgName: string, forClients: boolean) {
  const m = MESSAGES[locale];
  await page.context().addCookies([{ name: "locale", value: locale, url: test.info().project.use.baseURL! }]);
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(/\/governance/);
  await expect(page.getByText(m.onboarding.personaTitle)).toBeVisible();
  if (forClients) await page.getByText(m.onboarding.personaClientsTitle, { exact: true }).click();
  await page.getByRole("button", { name: m.onboarding.continue, exact: true }).click();
  await page.locator("#org-name").fill(orgName);
  await page.getByRole("button", { name: m.onboarding.createAndContinue }).click();
  await page.waitForURL(/\/governance\/quickstart/);
}

/** The figure the menu shows: the left menu on a wide screen, the side sheet on a phone. */
async function menuFigure(page: Page, locale: Locale, name?: string): Promise<string> {
  if (!isPhone(page)) {
    const text = (await page.getByTestId("menu-program-figure").first().textContent()) ?? "";
    return text.trim();
  }
  await page.getByRole("button", { name: MESSAGES[locale].nav.openMenu, exact: true }).click();
  const sheet = page.getByRole("dialog");
  const figure = sheet.getByTestId("menu-program-figure");
  await expect(figure).toHaveText(figurePattern(locale));
  const text = ((await figure.textContent()) ?? "").trim();
  if (name) await shot(page, `${name}-menu`);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  return text;
}

async function dashboardFigure(page: Page, locale: Locale): Promise<string> {
  await page.goto("/governance");
  const figure = page.getByTestId("program-figure-card").getByTestId("program-figure");
  await expect(figure).toHaveText(figurePattern(locale));
  // The documents panel has answered before the figure is compared.
  await expect(page.getByTestId("documents-panel")).toHaveAttribute("aria-busy", "false");
  return ((await figure.textContent()) ?? "").trim();
}

async function noSidewaysScroll(page: Page) {
  if (!isPhone(page)) return;
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(wide, "the page is wider than the screen").toBeLessThanOrEqual(0);
}

async function quickStart(page: Page, organizationId: string, industryId = "saas") {
  await api(page, "organization.setJurisdictions", { organizationId, jurisdictions: ["EU"] }, "mutation");
  await api(page, "quickstart.execute", { organizationId, industryId }, "mutation");
}

async function confirmEverything(page: Page, locale: Locale) {
  const m = MESSAGES[locale].provenance.queue;
  await page.goto("/governance/review");
  const empty = page.getByText(m.empty, { exact: true });
  const selectAll = page.getByRole("button", { name: m.selectAll, exact: true });
  for (let round = 0; round < 10; round += 1) {
    await expect(empty.or(selectAll)).toBeVisible();
    if (await empty.isVisible()) return;
    await selectAll.click();
    const done = page.waitForResponse((r) => r.url().includes("provenance.confirm") && r.ok());
    const refetched = page.waitForResponse((r) => r.url().includes("provenance.listQueue") && r.ok());
    await page.getByRole("button", { name: new RegExp(`^${m.confirmSelected}`) }).click();
    await done;
    await refetched;
  }
  await expect(empty).toBeVisible();
}

/** The file names inside a ZIP, read from its central directory. */
function zipNames(buffer: Buffer): string[] {
  const names: string[] = [];
  let at = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buffer.readUInt16LE(at + 10);
  at = buffer.readUInt32LE(at + 16);
  for (let i = 0; i < count; i += 1) {
    const nameLength = buffer.readUInt16LE(at + 28);
    const extra = buffer.readUInt16LE(at + 30);
    const comment = buffer.readUInt16LE(at + 32);
    names.push(buffer.toString("utf8", at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extra + comment;
  }
  return names;
}

async function downloadPack(page: Page, label: string): Promise<string[]> {
  const download = page.waitForEvent("download");
  await page.getByTestId("pack-button").click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.zip$/);
  const path = await file.path();
  const names = zipNames(readFileSync(path));
  if (SHOTS) writeFileSync(join(SHOTS, `${test.info().project.name}-${label}.txt`), names.join("\n"));
  return names;
}

for (const locale of ["en", "es"] as const) {
  test(`one organisation, empty, after the quick start and after confirming (${locale})`, async ({ page }, testInfo) => {
    const m = MESSAGES[locale];
    const run = `${testInfo.project.name}-${locale}-${Date.now()}`;
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      // WebKit reports a request cancelled by a navigation this way; not a fault.
      if (/due to access control checks/.test(e.message)) return;
      errors.push(e.message);
    });
    page.on("response", (r) => {
      if (new URL(r.url()).pathname.startsWith("/api/") && r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
    });

    await signIn(page, locale, `clarity-${run}@example.test`, `Clarity org ${run}`, false);
    const orgs = await api<{ id: string }[] | { organizations: { id: string }[] }>(page, "organization.list", undefined, "query");
    const organizationId = (Array.isArray(orgs) ? orgs : orgs.organizations)[0].id;

    // 1. Empty
    const empty = await dashboardFigure(page, locale);
    expect(readFigure(empty, locale).done).toBe(0);
    expect(await menuFigure(page, locale, `${locale}-1-empty`)).toBe(empty);
    await expect(page.getByTestId("doc-plan")).toHaveAttribute("data-state", "needsInput");
    await expect(page.getByTestId("doc-systemRegister")).toHaveAttribute("data-state", "needsInput");
    await expect(page.getByTestId("doc-not-yet")).toContainText(m.documentRegister.items.literacyRecord);
    await expect(page.getByTestId("menu-not-yet").first()).toContainText(m.documentRegister.items.prohibitedScreen);
    await expect(page.getByTestId("pack-button")).toBeDisabled();
    await expect(page.getByTestId("area-tiles").locator("li")).toHaveCount(6);
    await noSidewaysScroll(page);
    await shot(page, `${locale}-1-empty-dashboard`);

    // 2. After the quick start
    await quickStart(page, organizationId);
    const afterStart = await dashboardFigure(page, locale);
    expect(await menuFigure(page, locale, `${locale}-2-quickstart`)).toBe(afterStart);
    await expect(page.getByTestId("program-figure-card")).toContainText(
      m.guided.figure.toConfirm.replace("{count}", ""),
    );
    await expect(page.getByTestId("doc-riskClassification")).toHaveAttribute("data-state", "draft");
    await expect(page.getByTestId("doc-plan")).toHaveAttribute("data-state", "ready");
    await expect(page.getByTestId("step-docs-classification").first()).toContainText(
      m.documentRegister.items.riskClassification,
    );
    await expect(page.getByTestId("next-action")).toHaveCount(3);
    await noSidewaysScroll(page);
    await shot(page, `${locale}-2-quickstart-dashboard`);
    await page.goto("/governance/program");
    await expect(page.getByTestId("program-figure-card").getByTestId("program-figure")).toHaveText(afterStart);
    await shot(page, `${locale}-2-quickstart-program`);
    await page.goto("/governance/portfolio");
    await expect(page.getByTestId(isPhone(page) ? "client-card" : "client-row").first().getByTestId("program-figure")).toHaveText(afterStart);
    await noSidewaysScroll(page);
    await shot(page, `${locale}-2-quickstart-clients`);

    // The pack: ready documents only, then with the drafts.
    await page.goto("/governance");
    await expect(page.getByTestId("documents-panel")).toHaveAttribute("aria-busy", "false");
    const readyOnly = await downloadPack(page, `${locale}-pack-ready`);
    expect(readyOnly[0]).toBe(locale === "es" ? "00-LEEME.md" : "00-README.md");
    expect(readyOnly.at(-1)).toBe(locale === "es" ? "99-MANIFIESTO.txt" : "99-MANIFEST.txt");
    const mark = locale === "es" ? "BORRADOR-" : "DRAFT-";
    expect(readyOnly.some((n) => n.includes(mark))).toBe(false);
    await page.getByTestId("pack-drafts").click();
    const withDrafts = await downloadPack(page, `${locale}-pack-drafts`);
    expect(withDrafts.some((n) => n.includes(mark))).toBe(true);
    expect(withDrafts.length).toBeGreaterThan(readyOnly.length);

    // 3. After confirming the drafts
    await confirmEverything(page, locale);
    const confirmed = await dashboardFigure(page, locale);
    expect(readFigure(confirmed, locale).done).toBeGreaterThan(readFigure(afterStart, locale).done);
    expect(readFigure(confirmed, locale).total).toBe(readFigure(afterStart, locale).total);
    expect(await menuFigure(page, locale, `${locale}-3-confirmed`)).toBe(confirmed);
    await expect(page.getByTestId("doc-riskClassification")).toHaveAttribute("data-state", "ready");
    await noSidewaysScroll(page);
    await shot(page, `${locale}-3-confirmed-dashboard`);
    await page.goto("/governance/program");
    await expect(page.getByTestId("program-figure-card").getByTestId("program-figure")).toHaveText(confirmed);

    expect(errors).toEqual([]);
  });

  test(`a consultancy with three clients, sorted by the nearest deadline (${locale})`, async ({ page }, testInfo) => {
    const m = MESSAGES[locale];
    const run = `${testInfo.project.name}-${locale}-${Date.now()}`;
    const names = { a: `Client A ${run}`, b: `Client B ${run}`, c: `Client C ${run}` };
    await signIn(page, locale, `firm-${run}@example.test`, names.a, true);

    const create = async (name: string) =>
      (await api<{ id: string }>(page, "organization.create", { name, slug: `c-${Date.now()}` }, "mutation")).id;
    const b = await create(names.b);
    const c = await create(names.c);
    // B: the quick start (its plan's day 30 milestone is its deadline).
    await quickStart(page, b, "professional");
    // C: the quick start and a personal-data incident: the 72-hour clock comes first.
    await quickStart(page, c, "healthcare");
    const incident = await api<{ id: string }>(
      page,
      "incident.create",
      {
        organizationId: c,
        title: `Exposure ${run}`,
        description: "Recorded by the clarity walk.",
        type: "PRIVACY_VIOLATION",
        severity: "HIGH",
      },
      "mutation",
    );
    await api(page, "incident.setStatutoryFacts", { organizationId: c, id: incident.id, personalDataBreach: true }, "mutation");

    await page.goto("/governance/portfolio");
    await expect(page.getByRole("button", { name: m.guided.portfolio.addClient })).toBeVisible();
    const rows = page.getByTestId(isPhone(page) ? "client-card" : "client-row");
    await expect(rows).toHaveCount(3);
    expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-client")))).toEqual([
      names.c,
      names.b,
      names.a,
    ]);
    await expect(rows.nth(0).getByTestId("client-deadline")).toContainText(`Exposure ${run}`);
    await expect(rows.nth(2).getByTestId("client-deadline")).toHaveText(m.guided.portfolio.noDeadline);
    await noSidewaysScroll(page);
    await shot(page, `${locale}-4-firm-clients`);

    // Each row says what the client's own dashboard says.
    for (const name of [names.c, names.b, names.a]) {
      await page.goto("/governance/portfolio");
      const row = page.getByTestId(isPhone(page) ? "client-card" : "client-row").filter({ hasText: name });
      const rowFigure = ((await row.getByTestId("program-figure").textContent()) ?? "").trim();
      const rowDocs = ((await row.getByTestId("client-docs").textContent()) ?? "").trim();
      await row.getByTestId("client-open").click();
      await page.waitForURL(/\/governance$/);
      const figure = page.getByTestId("program-figure-card").getByTestId("program-figure");
      await expect(figure).toHaveText(rowFigure);
      await expect(page.getByTestId("documents-panel")).toHaveAttribute("aria-busy", "false");
      const ready = await page.locator('[data-testid^="doc-"][data-state="ready"]').count();
      expect(rowDocs.startsWith(`${ready} `), `${name}: ${rowDocs} vs ${ready} ready`).toBe(true);
    }
    await shot(page, `${locale}-5-firm-client-dashboard`);
  });
}
