// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC
//
// Validates docs/frameworks-wheel/frameworks.json.
// Usage: node docs/frameworks-wheel/check.mjs   (exit code 1 on any error)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, "frameworks.json"), "utf8");
const data = JSON.parse(raw);
const errors = [];
const err = (m) => errors.push(m);

// No long dash anywhere in the data (em dash, en dash, horizontal bar).
const dash = raw.match(new RegExp("[\\u2013\\u2014\\u2015]", "g"));
if (dash) err(`long dash found ${dash.length} time(s); use a comma, colon or parentheses`);

// Banned words about the app.
for (const word of ["compliant", "certified by AI Sentinel", "guarantees compliance"]) {
  if (raw.toLowerCase().includes(word.toLowerCase())) err(`banned wording: "${word}"`);
}

// Dates: every string that looks like a date must be ISO (YYYY-MM-DD).
const isoRe = /^\d{4}-\d{2}-\d{2}$/;
const validIso = (s) => isoRe.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
if (!validIso(data.asOf)) err(`asOf is not an ISO date: ${data.asOf}`);
if (!data.disclaimer || !/learning aid, not legal advice/i.test(data.disclaimer)) err("disclaimer missing");
const nonIsoDate = /\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/g;
const bad = raw.match(nonIsoDate);
if (bad) err(`non-ISO date form(s): ${[...new Set(bad)].join(", ")}`);

const ringIds = data.rings.map((r) => r.id);
if (new Set(ringIds).size !== ringIds.length) err("duplicate ring id");
const modules = data.modules || {};
const fwIds = new Set();
const report = [];

for (const f of data.frameworks) {
  if (fwIds.has(f.id)) err(`duplicate framework id ${f.id}`);
  fwIds.add(f.id);
  for (const k of ["name", "short", "nature", "summary", "url"]) if (!f[k]) err(`${f.id}: missing ${k}`);
  const cellIds = Object.keys(f.cells || {});
  for (const r of ringIds) if (!cellIds.includes(r)) err(`${f.id}: missing ring ${r}`);
  for (const c of cellIds) if (!ringIds.includes(c)) err(`${f.id}: unknown ring ${c}`);
  let tv = 0;
  const tvRings = [];
  for (const r of ringIds) {
    const c = f.cells?.[r];
    if (!c) continue;
    const where = `${f.id}/${r}`;
    if (!Number.isInteger(c.depth) || c.depth < 0 || c.depth > 3) err(`${where}: depth must be 0-3`);
    if (!c.summary || typeof c.summary !== "string") err(`${where}: missing summary`);
    else if (c.summary.length > 260) err(`${where}: summary over 260 characters`);
    const s = c.source;
    if (!s) err(`${where}: missing source`);
    else if (s.status === "to verify") {
      tv += 1;
      tvRings.push(r);
    } else {
      if (!s.ref) err(`${where}: source has no ref`);
      if (!s.url || !/^https:\/\//.test(s.url)) err(`${where}: source has no https url`);
    }
    for (const m of c.modules || []) if (!modules[m]) err(`${where}: unknown module ${m}`);
    for (const d of JSON.stringify(c).match(/\d{4}-\d{2}-\d{2}/g) || []) if (!validIso(d)) err(`${where}: invalid date ${d}`);
  }
  report.push({ id: f.id, tv, tvRings });
}

// Picker rules reference real frameworks and real options.
const P = data.picker;
const opts = Object.fromEntries(P.inputs.map((i) => [i.id, new Set(i.options.map((o) => o.id))]));
const checkWhen = (when, where) => {
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
for (const slot of ["managementSystem", "riskMethod"]) {
  (P.stack[slot] || []).forEach((r, i) => {
    if (!fwIds.has(r.pick)) err(`stack ${slot} ${i}: unknown framework ${r.pick}`);
    checkWhen(r.when, `stack ${slot} ${i}`);
  });
  const last = P.stack[slot]?.at(-1);
  if (!last || Object.keys(last.when || {}).length) err(`stack ${slot}: last rule must be unconditional`);
}

console.log(`frameworks: ${data.frameworks.length}, rings: ${ringIds.length}, cells: ${data.frameworks.length * ringIds.length}`);
console.log('"to verify" cells per framework:');
for (const r of report) console.log(`  ${r.id.padEnd(22)} ${r.tv}${r.tv ? `  (${r.tvRings.join(", ")})` : ""}`);
console.log(`  total                  ${report.reduce((n, r) => n + r.tv, 0)}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK");
