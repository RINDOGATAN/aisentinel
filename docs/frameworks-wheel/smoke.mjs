// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC
//
// Smoke test for the built page, with no browser: runs the inline script of
// index.html against a minimal fake DOM, then exercises the picker.
// Usage: node docs/frameworks-wheel/smoke.mjs   (run build.mjs first)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "index.html"), "utf8");
const json = html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/)[1];
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attrs = {};
    this.dataset = {};
    this.listeners = {};
    this.style = {};
    this._text = "";
    this.checked = false;
    this.disabled = false;
    const cls = new Set();
    this.classList = {
      add: (c) => cls.add(c),
      remove: (c) => cls.delete(c),
      contains: (c) => cls.has(c),
      toggle: (c, on) => ((on ?? !cls.has(c)) ? cls.add(c) : cls.delete(c)),
      _set: cls,
    };
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === "class") String(v).split(/\s+/).forEach((c) => c && this.classList.add(c));
    if (k === "type" || k === "name" || k === "value" || k === "id") this[k] = String(v);
    if (k === "checked") this.checked = true;
  }
  getAttribute(k) { return this.attrs[k]; }
  appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  fire(t, e = {}) { (this.listeners[t] || []).forEach((f) => f({ preventDefault() {}, key: "", ...e })); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); }
  set innerHTML(v) { this.children = []; this._text = ""; }
  cloneNode() { const n = new El(this.tagName); Object.assign(n.attrs, this.attrs); return n; }
  focus() {}
  get offsetWidth() { return 100; }
  get offsetHeight() { return 40; }
  all() { return this.children.flatMap((c) => (c instanceof El ? [c, ...c.all()] : [])); }
  querySelectorAll(sel) {
    const parts = sel.split(",").map((s) => s.trim().split(/\s+/).pop());
    return this.all().filter((e) => parts.some((p) => matches(e, p)));
  }
}
function matches(e, p) {
  const m = p.match(/^([a-z]*)((?:\.[\w-]+)*)(?:\[name="([^"]+)"\])?$/i);
  if (!m) return false;
  const [, tag, classes, name] = m;
  if (tag && e.tagName !== tag.toUpperCase()) return false;
  for (const c of classes.split(".").filter(Boolean)) if (!e.classList.contains(c)) return false;
  if (name && e.name !== name) return false;
  return true;
}
class Text { constructor(t) { this.t = t; } get textContent() { return this.t; } }

const root = new El("body");
const byId = {};
const mk = (id, tag = "div") => { const e = new El(tag); e.id = id; byId[id] = e; root.appendChild(e); return e; };
const script = new El("script"); script._text = json; byId.data = script;
const nav = mk("nav", "nav"); nav.classList.add("tabs");
for (const v of ["wheel", "table", "compare", "picker"]) {
  const b = new El("button"); b.dataset.view = v; nav.appendChild(b);
  const s = mk(`${v}-view`, "section"); s.classList.add("view");
}
["panel", "panel-body", "tip", "ring-list", "ring-help", "grid", "compare-picks", "compare-msg", "compare-grid", "picker-out", "rules-list", "fkey"].forEach((id) => mk(id));
mk("panel-close", "button");
mk("picker", "form");
const svg = mk("wheel", "svg"); svg.classList.add("wheel");

const document = {
  getElementById: (id) => byId[id],
  querySelectorAll: (sel) => root.querySelectorAll(sel),
  createElement: (t) => new El(t),
  createElementNS: (_ns, t) => new El(t),
  createTextNode: (t) => new Text(t),
  addEventListener() {},
  activeElement: null,
};
const ctx = { document, window: { innerWidth: 1280, innerHeight: 800 }, history: { replaceState() {} }, location: { hash: "" }, JSON, Math, Object, Array, String };
vm.runInNewContext(code, ctx);

const data = JSON.parse(json);
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const cells = svg.all().filter((e) => e.classList.contains("cell"));
ok(cells.length === data.frameworks.length * data.rings.length, `wheel has ${cells.length} cells`);
const hatches = svg.all().filter((e) => e.classList.contains("hatchover"));
const tv = data.frameworks.flatMap((f) => Object.values(f.cells)).filter((c) => c.source.status === "to verify").length;
ok(hatches.length === tv, `hatched ${hatches.length}, expected ${tv}`);
ok(byId.fkey.children.length === data.frameworks.length, "phone key lists every slice");
ok(byId.grid.querySelectorAll("tr").length === data.frameworks.length + 1, "table rows");

// Open a panel.
cells[0].fire("click");
ok(byId.panel.classList.contains("open"), "panel opens on click");
ok(byId["panel-body"].textContent.includes(data.frameworks[0].name), "panel shows framework name");

// Picker: tick EU + Texas, deployer, employment, high risk.
const form = byId.picker;
const pick = (name, value) => form.querySelectorAll(`input[name="${name}"]`).forEach((i) => { i.checked = i.value === value || (i.type === "checkbox" && (i.checked || i.value === value)); });
pick("jurisdictions", "eu");
pick("jurisdictions", "tx");
pick("sector", "employment");
pick("risk", "high");
pick("assurance", "yes");
form.querySelectorAll("input")[0].fire("change");
const out = byId["picker-out"].textContent;
ok(out.includes("EU AI Act") && out.includes("Texas"), "picker lists EU AI Act and Texas");
ok(/Binding laws: EU AI Act, Texas TRAIGA|Binding laws: Texas TRAIGA, EU AI Act/.test(out), `binding stack: ${out.match(/Binding laws: [^O]*/)?.[0]}`);
ok(out.includes("One management system: ISO/IEC 42001"), "management system is 42001 when assurance is needed");
ok(out.includes("One risk method: NIST AI RMF"), "risk method is NIST when a US state is ticked");
ok(!out.includes("New York City Local Law"), "NYC not listed without NYC");
ok(byId["rules-list"].children.length === data.picker.rules.length + data.picker.stack.managementSystem.length + data.picker.stack.riskMethod.length, "rules listed");

// Compare: pick three, the fourth is disabled.
const boxes = byId["compare-picks"].querySelectorAll("input");
boxes.slice(0, 3).forEach((b) => { b.checked = true; });
boxes[0].fire("change");
ok(boxes[3].disabled, "fourth framework disabled after three picks");
ok(byId["compare-grid"].querySelectorAll("tr").length === data.rings.length + 1, "compare rows");

if (fails.length) { console.error("FAIL\n  " + fails.join("\n  ")); process.exit(1); }
console.log(`smoke OK: ${cells.length} cells, ${hatches.length} hatched, picker and compare work`);
