// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The AI governance frameworks learning aid: data types, the data checks and
 * the selector. Ported from the local alpha (docs/frameworks-wheel on its own
 * branch: check.mjs and the picker in build.mjs); the rules are the same, so
 * the online pages rank exactly as the alpha did.
 *
 * Pure module: no React, no Next.
 */
import raw from "@/content/frameworks/frameworks.json";

export type Depth = 0 | 1 | 2 | 3;

export interface CellSource {
  ref?: string;
  url?: string;
  file?: string;
  status?: "to verify";
}

export interface FrameworkCell {
  depth: Depth;
  summary: string;
  source?: CellSource;
  note?: string;
  modules?: string[];
}

export interface Ring {
  id: string;
  label: string;
  short: string;
  question?: string;
  depthMeaning?: string;
}

export interface Framework {
  id: string;
  name: string;
  short: string;
  nature: string;
  summary: string;
  url: string;
  cells: Record<string, FrameworkCell>;
}

export type When = Record<string, string[]>;

export interface PickerRule {
  framework: string;
  score: number;
  binding?: boolean;
  when: When;
  reason: string;
}

export interface StackRule {
  when: When;
  pick: string;
  reason: string;
}

export interface PickerInput {
  id: string;
  label: string;
  multiple?: boolean;
  defaultIndex?: number;
  options: { id: string; label: string }[];
}

export interface FrameworksData {
  title: string;
  subtitle: string;
  asOf: string;
  disclaimer: string;
  method: string;
  footer: string;
  depthScale: string[];
  rings: Ring[];
  modules: Record<string, { label: string; path: string }>;
  frameworks: Framework[];
  picker: {
    intro: string;
    caveat: string;
    inputs: PickerInput[];
    rules: PickerRule[];
    stackLabels: { managementSystem: string; riskMethod: string };
    stack: { managementSystem: StackRule[]; riskMethod: StackRule[] };
  };
}

export const frameworksData = raw as unknown as FrameworksData;

/** A cell whose source could not be checked: drawn hatched, no summary claim. */
export function isUnderReview(cell: FrameworkCell): boolean {
  return !cell.source || cell.source.status === "to verify";
}

export function underReviewCount(data: FrameworksData = frameworksData): number {
  return data.frameworks.reduce(
    (n, f) => n + Object.values(f.cells).filter(isUnderReview).length,
    0,
  );
}

// ---------------------------------------------------------------------------
// Checks (ported from check.mjs)
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const validIso = (s: string) => ISO_DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** Every problem with the data, as readable lines. Empty means valid. */
export function validateFrameworks(data: FrameworksData, rawText = JSON.stringify(data)): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);

  const dash = rawText.match(/[–—―]/g);
  if (dash) err(`long dash found ${dash.length} time(s); use a comma, colon or parentheses`);
  for (const word of ["compliant", "certified by AI Sentinel", "guarantees compliance"]) {
    if (rawText.toLowerCase().includes(word.toLowerCase())) err(`banned wording: "${word}"`);
  }
  if (!validIso(data.asOf)) err(`asOf is not an ISO date: ${data.asOf}`);
  if (!data.disclaimer || !/learning aid, not legal advice/i.test(data.disclaimer)) err("disclaimer missing");
  const bad = rawText.match(/\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/g);
  if (bad) err(`non-ISO date form(s): ${[...new Set(bad)].join(", ")}`);

  const ringIds = data.rings.map((r) => r.id);
  if (new Set(ringIds).size !== ringIds.length) err("duplicate ring id");
  const modules = data.modules || {};
  const fwIds = new Set<string>();

  for (const f of data.frameworks) {
    if (fwIds.has(f.id)) err(`duplicate framework id ${f.id}`);
    fwIds.add(f.id);
    for (const k of ["name", "short", "nature", "summary", "url"] as const) if (!f[k]) err(`${f.id}: missing ${k}`);
    const cellIds = Object.keys(f.cells || {});
    for (const r of ringIds) if (!cellIds.includes(r)) err(`${f.id}: missing ring ${r}`);
    for (const c of cellIds) if (!ringIds.includes(c)) err(`${f.id}: unknown ring ${c}`);
    for (const r of ringIds) {
      const c = f.cells?.[r];
      if (!c) continue;
      const where = `${f.id}/${r}`;
      if (!Number.isInteger(c.depth) || c.depth < 0 || c.depth > 3) err(`${where}: depth must be 0-3`);
      if (!c.summary || typeof c.summary !== "string") err(`${where}: missing summary`);
      else if (c.summary.length > 260) err(`${where}: summary over 260 characters`);
      const s = c.source;
      if (!s) err(`${where}: missing source`);
      else if (s.status !== "to verify") {
        if (!s.ref) err(`${where}: source has no ref`);
        if (!s.url || !/^https:\/\//.test(s.url)) err(`${where}: source has no https url`);
      }
      for (const m of c.modules || []) if (!modules[m]) err(`${where}: unknown module ${m}`);
      for (const d of JSON.stringify(c).match(/\d{4}-\d{2}-\d{2}/g) || []) {
        if (!validIso(d)) err(`${where}: invalid date ${d}`);
      }
    }
  }

  const P = data.picker;
  const opts = Object.fromEntries(P.inputs.map((i) => [i.id, new Set(i.options.map((o) => o.id))]));
  const checkWhen = (when: When, where: string) => {
    for (const [k, vals] of Object.entries(when || {})) {
      if (!opts[k]) err(`${where}: unknown input ${k}`);
      else for (const v of vals) if (!opts[k].has(v)) err(`${where}: unknown option ${k}=${v}`);
    }
  };
  P.rules.forEach((r, i) => {
    if (!fwIds.has(r.framework)) err(`rule ${i}: unknown framework ${r.framework}`);
    if (!r.reason) err(`rule ${i}: missing reason`);
    if (typeof r.score !== "number") err(`rule ${i}: missing score`);
    checkWhen(r.when, `rule ${i}`);
  });
  for (const slot of ["managementSystem", "riskMethod"] as const) {
    (P.stack[slot] || []).forEach((r, i) => {
      if (!fwIds.has(r.pick)) err(`stack ${slot} ${i}: unknown framework ${r.pick}`);
      checkWhen(r.when, `stack ${slot} ${i}`);
    });
    const last = P.stack[slot]?.at(-1);
    if (!last || Object.keys(last.when || {}).length) err(`stack ${slot}: last rule must be unconditional`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Selector (ported from the picker in build.mjs)
// ---------------------------------------------------------------------------

export type Answers = Record<string, string[]>;

/** The alpha's starting state: the first option (or defaultIndex) of each single-choice input. */
export function defaultAnswers(data: FrameworksData = frameworksData): Answers {
  return Object.fromEntries(
    data.picker.inputs.map((inp) => [
      inp.id,
      inp.multiple ? [] : [inp.options[inp.defaultIndex ?? 0].id],
    ]),
  );
}

export function whenMatches(when: When, answers: Answers): boolean {
  return Object.keys(when || {}).every((key) => {
    const have = answers[key] || [];
    return when[key].some((w) => have.includes(w));
  });
}

export interface RankedFramework {
  id: string;
  score: number;
  binding: boolean;
  /** The reasons of every matching rule, in rule order. */
  reasons: string[];
}

export interface SelectorResult {
  /** False when no jurisdiction is ticked: the alpha asks for one first. */
  ready: boolean;
  ranked: RankedFramework[];
  binding: string[];
  stack: {
    managementSystem: StackRule | null;
    riskMethod: StackRule | null;
  };
}

export function runSelector(answers: Answers, data: FrameworksData = frameworksData): SelectorResult {
  const P = data.picker;
  const empty: SelectorResult = { ready: false, ranked: [], binding: [], stack: { managementSystem: null, riskMethod: null } };
  if (!(answers.jurisdictions || []).length) return empty;

  const scores = new Map<string, RankedFramework>();
  for (const rule of P.rules) {
    if (!whenMatches(rule.when, answers)) continue;
    const s = scores.get(rule.framework) ?? { id: rule.framework, score: 0, binding: false, reasons: [] };
    s.score += rule.score;
    s.reasons.push(rule.reason);
    if (rule.binding) s.binding = true;
    scores.set(rule.framework, s);
  }
  const nameOf = new Map(data.frameworks.map((f) => [f.id, f.name]));
  const ranked = [...scores.values()]
    .filter((s) => s.score > 0)
    .sort(
      (x, y) =>
        Number(y.binding) - Number(x.binding) ||
        y.score - x.score ||
        (nameOf.get(x.id) ?? "").localeCompare(nameOf.get(y.id) ?? ""),
    );
  const firstMatch = (rules: StackRule[]) => rules.find((r) => whenMatches(r.when, answers)) ?? null;
  return {
    ready: true,
    ranked,
    binding: ranked.filter((r) => r.binding).map((r) => r.id),
    stack: {
      managementSystem: firstMatch(P.stack.managementSystem),
      riskMethod: firstMatch(P.stack.riskMethod),
    },
  };
}

/** The condition of a rule as structured parts, so the page can label them in either language. */
export function describeWhen(when: When, data: FrameworksData = frameworksData): { input: string; values: string[] }[] {
  return Object.keys(when || {}).map((key) => {
    const inp = data.picker.inputs.find((i) => i.id === key);
    const values = when[key].map((v) => inp?.options.find((o) => o.id === v)?.label ?? v);
    return { input: inp?.label ?? key, values };
  });
}
