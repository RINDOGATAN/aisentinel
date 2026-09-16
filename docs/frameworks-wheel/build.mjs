// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC
//
// Builds docs/frameworks-wheel/index.html from frameworks.json.
// One self-contained page: inline CSS and JS, no external libraries or fonts.
// Usage: node docs/frameworks-wheel/build.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, "frameworks.json"), "utf8"));

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// JSON inside a script element: neutralise "<" so no "</script>" can close it.
const embedded = JSON.stringify(data).replace(/</g, "\\u003c");

const css = String.raw`
:root{--ink:#1f2328;--ink2:#4a525c;--muted:#5f6873;--line:#d9dde2;--bg:#fafaf8;--card:#fff;
--d0:#eceae6;--d1:#86b6ef;--d2:#3987e5;--d3:#184f95;--accent:#184f95;--warn:#8a5a00}
*{box-sizing:border-box}
html{font-size:16px}
body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.5}
header,main,footer{max-width:1240px;margin:0 auto;padding:0 1rem}
header{padding-top:1.2rem}
h1{font-size:1.6rem;margin:0 0 .25rem}
h2{font-size:1.2rem;margin:1rem 0 .5rem}
h3{font-size:1rem;margin:.8rem 0 .3rem}
p{margin:.3rem 0 .6rem}
.lede{color:var(--ink2);max-width:60rem}
.note{font-size:.85rem;color:var(--muted)}
.asof{display:inline-block;font-size:.85rem;background:#fff4dc;color:#5a3d00;border:1px solid #f0d9a8;border-radius:6px;padding:.1rem .5rem;margin-right:.5rem}
nav.tabs{display:flex;flex-wrap:wrap;gap:.4rem;margin:1rem 0;border-bottom:1px solid var(--line)}
nav.tabs button{font:inherit;font-size:.95rem;border:1px solid var(--line);border-bottom:none;background:#f1f2f4;color:var(--ink);padding:.45rem .9rem;border-radius:8px 8px 0 0;cursor:pointer}
nav.tabs button[aria-selected=true]{background:var(--card);font-weight:600;color:var(--accent);position:relative;top:1px}
section.view{display:none}
section.view.active{display:block}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:1rem}
.wheel-layout{display:grid;grid-template-columns:minmax(0,1fr) 20rem;gap:1rem;align-items:start}
@media (max-width:900px){.wheel-layout{grid-template-columns:1fr}}
svg.wheel{width:100%;height:auto;display:block;touch-action:manipulation}
svg.wheel .cell{stroke:#fff;stroke-width:1.2;cursor:pointer}
svg.wheel .cell:focus{outline:none;stroke:#111;stroke-width:3}
svg.wheel .cell.dim{opacity:.18}
svg.wheel .cell.sel{stroke:#111;stroke-width:3}
svg.wheel .flabel{font-size:28px;fill:var(--ink);cursor:pointer}
svg.wheel .flabel:hover{text-decoration:underline}
svg.wheel .fnum{display:none;font-size:56px;font-weight:600;fill:var(--ink)}
svg.wheel .center{font-size:24px;fill:var(--ink2)}
ol.fkey{display:none;columns:2;font-size:.85rem;margin:.4rem 0;padding-left:1.4rem}
@media (max-width:600px){svg.wheel .flabel,svg.wheel .center{display:none}svg.wheel .fnum{display:inline}ol.fkey{display:block}}
.legend{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;font-size:.85rem;color:var(--ink2);margin:.5rem 0}
.sw{display:inline-block;width:1.1rem;height:1.1rem;border-radius:3px;vertical-align:middle;margin-right:.3rem;border:1px solid #c9cdd2}
.sw.hatch{background:repeating-linear-gradient(45deg,#fff 0 3px,#8a5a00 3px 5px)}
.rings{list-style:none;margin:0;padding:0;font-size:.85rem}
.rings li button{width:100%;text-align:left;font:inherit;background:none;border:1px solid transparent;border-radius:6px;padding:.25rem .4rem;cursor:pointer;color:var(--ink)}
.rings li button:hover{background:#f1f5fb}
.rings li button[aria-pressed=true]{background:#e4eefb;border-color:#9ec5f4;font-weight:600}
.rings .n{display:inline-block;width:1.6rem;color:var(--muted)}
#tip{position:fixed;pointer-events:none;background:#1f2328;color:#fff;font-size:.8rem;padding:.4rem .6rem;border-radius:6px;max-width:18rem;display:none;z-index:20}
.panel{position:fixed;right:0;top:0;bottom:0;width:min(28rem,100%);background:var(--card);border-left:1px solid var(--line);box-shadow:-6px 0 18px rgba(0,0,0,.08);padding:1rem 1.2rem;overflow:auto;transform:translateX(100%);transition:transform .15s;z-index:30}
.panel.open{transform:none}
.panel .close{float:right;font:inherit;border:1px solid var(--line);background:#f4f5f7;border-radius:6px;padding:.2rem .6rem;cursor:pointer}
.kv{font-size:.9rem;margin:.4rem 0}
.kv b{display:block;font-size:.8rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.03em}
.depth{display:inline-flex;align-items:center;gap:.35rem;font-size:.85rem}
.tv{display:inline-block;font-size:.78rem;color:var(--warn);border:1px solid #e6c98a;background:#fff8e6;border-radius:4px;padding:0 .35rem}
a{color:#1c5cab}
.scroll{overflow:auto;max-width:100%;border:1px solid var(--line);border-radius:10px;background:var(--card)}
table{border-collapse:separate;border-spacing:0;font-size:.82rem}
th,td{border-bottom:1px solid var(--line);padding:.4rem .5rem;vertical-align:top;text-align:left}
thead th{position:sticky;top:0;background:#f4f5f7;z-index:2;cursor:pointer;white-space:nowrap}
thead th[aria-sort]::after{content:" \2195";color:var(--muted)}
thead th[aria-sort=ascending]::after{content:" \2191"}
thead th[aria-sort=descending]::after{content:" \2193"}
.sticky{position:sticky;left:0;background:var(--card);z-index:1;min-width:9rem;font-weight:600}
thead .sticky{z-index:3;background:#f4f5f7}
#table-view .scroll{max-height:75vh}
#table-view td.c{min-width:11rem;cursor:pointer}
#table-view td.c:hover{background:#f1f5fb}
.chip{display:inline-block;min-width:1.4rem;text-align:center;border-radius:4px;font-weight:600;margin-right:.3rem}
.chip.d0{background:var(--d0);color:#333}.chip.d1{background:var(--d1);color:#0d2340}.chip.d2{background:var(--d2);color:#fff}.chip.d3{background:var(--d3);color:#fff}
.chip.tvc{outline:2px dashed #8a5a00;outline-offset:1px}
.picks{display:flex;flex-wrap:wrap;gap:.4rem .9rem;font-size:.9rem;margin:.5rem 0}
.picks label{white-space:nowrap}
#compare-view table{width:100%}
#compare-view td{min-width:14rem}
form.picker{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.8rem}
fieldset{border:1px solid var(--line);border-radius:8px;padding:.5rem .8rem;margin:0}
legend{font-weight:600;font-size:.9rem;padding:0 .3rem}
fieldset label{display:block;font-size:.9rem}
ol.results{padding-left:1.3rem}
ol.results li{margin:.45rem 0}
.tag{display:inline-block;font-size:.78rem;border-radius:4px;padding:0 .4rem;margin-left:.3rem;border:1px solid var(--line);color:var(--ink2)}
.tag.binding{background:#fdecea;border-color:#f3b8b0;color:#7a1f12}
.stack{border-left:4px solid var(--d2);padding-left:.8rem}
details.rules{margin-top:1rem}
details.rules summary{cursor:pointer;font-weight:600}
footer{padding:1.5rem 1rem 2rem;font-size:.85rem;color:var(--muted)}
button.link{font:inherit;background:none;border:none;color:#1c5cab;text-decoration:underline;cursor:pointer;padding:0}
@media (max-width:480px){h1{font-size:1.3rem}nav.tabs button{padding:.4rem .6rem}}
@media print{nav.tabs,.panel,#tip{display:none}section.view{display:block}}
`;

// Client script. Plain ES2019, no dependencies.
const js = String.raw`
(function(){
"use strict";
var D = JSON.parse(document.getElementById("data").textContent);
var F = D.frameworks, R = D.rings, M = D.modules || {};
var byId = {}; F.forEach(function(f){ byId[f.id] = f; });
function el(tag, attrs, kids){
  var e = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function(k){
    if (k === "text") e.textContent = attrs[k];
    else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  });
  (kids || []).forEach(function(c){ if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
  return e;
}
function isTV(cell){ return !cell.source || cell.source.status === "to verify"; }
function chip(cell){
  return el("span", {"class": "chip d" + cell.depth + (isTV(cell) ? " tvc" : ""), title: D.depthScale[cell.depth], text: String(cell.depth)});
}
var ringById = {}; R.forEach(function(r){ ringById[r.id] = r; });

// ---------- tabs
var tabs = document.querySelectorAll("nav.tabs button");
function show(name){
  tabs.forEach(function(b){ b.setAttribute("aria-selected", b.dataset.view === name ? "true" : "false"); });
  document.querySelectorAll("section.view").forEach(function(s){ s.classList.toggle("active", s.id === name + "-view"); });
  if (history.replaceState) history.replaceState(null, "", "#" + name);
}
tabs.forEach(function(b){ b.addEventListener("click", function(){ show(b.dataset.view); }); });

// ---------- panel
var panel = document.getElementById("panel"), pbody = document.getElementById("panel-body");
var lastFocus = null;
function openCell(fid, rid){
  var f = byId[fid], r = ringById[rid], c = f.cells[rid];
  lastFocus = document.activeElement;
  pbody.innerHTML = "";
  pbody.appendChild(el("p", {"class": "note", text: r.label}));
  pbody.appendChild(el("h2", {id: "panel-title", text: f.name}));
  pbody.appendChild(el("div", {"class": "kv"}, [el("b", {text: "Depth"}), el("span", {"class": "depth"}, [chip(c), D.depthScale[c.depth]])]));
  pbody.appendChild(el("div", {"class": "kv"}, [el("b", {text: "In one sentence"}), el("span", {text: c.summary})]));
  if (r.depthMeaning) pbody.appendChild(el("p", {"class": "note", text: "How depth is read on this ring: " + r.depthMeaning}));
  var src = el("div", {"class": "kv"}, [el("b", {text: "Source"})]);
  if (isTV(c)) {
    src.appendChild(el("span", {"class": "tv", text: "to verify"}));
    if (c.source && c.source.ref) src.appendChild(el("div", {text: c.source.ref}));
  } else {
    src.appendChild(el("div", {text: c.source.ref}));
  }
  if (c.source && c.source.url) src.appendChild(el("div", {}, [el("a", {href: c.source.url, target: "_blank", rel: "noopener", text: c.source.url})]));
  if (c.source && c.source.file) src.appendChild(el("div", {"class": "note", text: "Found in: " + c.source.file}));
  pbody.appendChild(src);
  if (c.note) pbody.appendChild(el("div", {"class": "kv"}, [el("b", {text: "Note"}), el("span", {text: c.note})]));
  if (c.modules && c.modules.length) {
    var mods = el("div", {"class": "kv"}, [el("b", {text: "AI Sentinel module that supports it"})]);
    c.modules.forEach(function(m){ if (M[m]) mods.appendChild(el("div", {text: M[m].label + " (" + M[m].path + ")"})); });
    pbody.appendChild(mods);
  }
  pbody.appendChild(el("div", {"class": "kv"}, [el("b", {text: "Framework"}), el("span", {text: f.summary})]));
  if (f.url) pbody.appendChild(el("div", {"class": "kv"}, [el("a", {href: f.url, target: "_blank", rel: "noopener", text: "Official text"})]));
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  document.getElementById("panel-close").focus();
  document.querySelectorAll("svg.wheel .cell").forEach(function(p){ p.classList.toggle("sel", p.dataset.f === fid && p.dataset.r === rid); });
}
function closePanel(){
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  document.querySelectorAll("svg.wheel .cell.sel").forEach(function(p){ p.classList.remove("sel"); });
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
document.getElementById("panel-close").addEventListener("click", closePanel);
document.addEventListener("keydown", function(e){ if (e.key === "Escape") closePanel(); });

// ---------- wheel
var NS = "http://www.w3.org/2000/svg";
var svg = document.getElementById("wheel");
var R0 = 64, R1 = 330, n = F.length, k = R.length, step = (R1 - R0) / k;
function pt(r, a){ return [r * Math.sin(a), -r * Math.cos(a)]; }
function arc(ri, ro, a0, a1){
  var p0 = pt(ro, a0), p1 = pt(ro, a1), p2 = pt(ri, a1), p3 = pt(ri, a0);
  var large = (a1 - a0) > Math.PI ? 1 : 0;
  return "M" + p0 + "A" + ro + "," + ro + " 0 " + large + " 1 " + p1 + "L" + p2 + "A" + ri + "," + ri + " 0 " + large + " 0 " + p3 + "Z";
}
var defs = document.createElementNS(NS, "defs");
defs.innerHTML = '<pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="none"/><line x1="0" y1="0" x2="0" y2="7" stroke="#8a5a00" stroke-width="2.4"/></pattern>';
svg.appendChild(defs);
var tip = document.getElementById("tip");
var gap = 0.012;
var fkey = document.getElementById("fkey");
F.forEach(function(f, i){
  var a0 = i * 2 * Math.PI / n + gap, a1 = (i + 1) * 2 * Math.PI / n - gap;
  R.forEach(function(r, j){
    var ro = R1 - j * step, ri = ro - step;
    var c = f.cells[r.id];
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", arc(ri, ro, a0, a1));
    p.setAttribute("class", "cell");
    p.setAttribute("fill", "var(--d" + c.depth + ")");
    p.setAttribute("tabindex", "0");
    p.setAttribute("role", "button");
    p.setAttribute("aria-label", f.short + ", " + r.label + ": depth " + c.depth + (isTV(c) ? ", to verify" : ""));
    p.dataset.f = f.id; p.dataset.r = r.id;
    p.addEventListener("click", function(){ openCell(f.id, r.id); });
    p.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCell(f.id, r.id); } });
    p.addEventListener("mousemove", function(e){
      tip.style.display = "block";
      tip.textContent = f.short + " · " + r.label + " · depth " + c.depth + (isTV(c) ? " (to verify)" : "") + ". " + c.summary;
      var x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
      var y = Math.min(e.clientY + 14, window.innerHeight - tip.offsetHeight - 8);
      tip.style.left = x + "px"; tip.style.top = y + "px";
    });
    p.addEventListener("mouseleave", function(){ tip.style.display = "none"; });
    svg.appendChild(p);
    if (isTV(c)) {
      var h = document.createElementNS(NS, "path");
      h.setAttribute("d", arc(ri + 1, ro - 1, a0 + 0.004, a1 - 0.004));
      h.setAttribute("fill", "url(#hatch)");
      h.setAttribute("pointer-events", "none");
      h.setAttribute("class", "hatchover");
      h.dataset.r = r.id;
      svg.appendChild(h);
    }
  });
  var mid = (a0 + a1) / 2, lp = pt(R1 + 18, mid);
  var t = document.createElementNS(NS, "text");
  var s = Math.sin(mid);
  t.setAttribute("x", lp[0]); t.setAttribute("y", lp[1] + (Math.cos(mid) < -0.3 ? 22 : Math.cos(mid) > 0.3 ? -4 : 10));
  t.setAttribute("text-anchor", Math.abs(s) < 0.2 ? "middle" : s > 0 ? "start" : "end");
  t.setAttribute("class", "flabel");
  t.textContent = f.short;
  t.addEventListener("click", function(){ show("compare"); setCompare([f.id]); });
  svg.appendChild(t);
  var np = pt(R1 + 44, mid);
  var num = document.createElementNS(NS, "text");
  num.setAttribute("x", np[0]); num.setAttribute("y", np[1] + 20);
  num.setAttribute("text-anchor", "middle");
  num.setAttribute("class", "fnum");
  num.textContent = String(i + 1);
  svg.appendChild(num);
  fkey.appendChild(el("li", {}, [f.short]));
});
var ct = document.createElementNS(NS, "text");
ct.setAttribute("text-anchor", "middle"); ct.setAttribute("class", "center"); ct.setAttribute("y", "-4");
ct.textContent = "rim: " + R[0].short;
var ct2 = ct.cloneNode(); ct2.setAttribute("y", "26"); ct2.textContent = "core: " + R[k - 1].short;
svg.appendChild(ct); svg.appendChild(ct2);

var ringList = document.getElementById("ring-list"), hi = null;
R.forEach(function(r, j){
  var b = el("button", {type: "button", "aria-pressed": "false", title: r.question || r.label}, [el("span", {"class": "n", text: String(j + 1)}), r.label]);
  b.addEventListener("click", function(){
    hi = hi === r.id ? null : r.id;
    ringList.querySelectorAll("button").forEach(function(x){ x.setAttribute("aria-pressed", "false"); });
    if (hi) b.setAttribute("aria-pressed", "true");
    svg.querySelectorAll(".cell, .hatchover").forEach(function(p){ p.classList.toggle("dim", !!hi && p.dataset.r !== hi); });
    document.getElementById("ring-help").textContent = hi ? (r.question || "") + (r.depthMeaning ? " Depth: " + r.depthMeaning : "") : "";
  });
  ringList.appendChild(el("li", {}, [b]));
});

// ---------- table
var tbl = document.getElementById("grid");
var sortKey = null, sortDir = 1;
function renderTable(){
  tbl.innerHTML = "";
  var head = el("tr");
  var nameTh = el("th", {"class": "sticky", scope: "col", "aria-sort": sortKey === "name" ? (sortDir > 0 ? "ascending" : "descending") : "none", text: "Framework"});
  nameTh.addEventListener("click", function(){ sortBy("name"); });
  head.appendChild(nameTh);
  R.forEach(function(r){
    var th = el("th", {scope: "col", title: r.question || "", "aria-sort": sortKey === r.id ? (sortDir > 0 ? "ascending" : "descending") : "none", text: r.label});
    th.addEventListener("click", function(){ sortBy(r.id); });
    head.appendChild(th);
  });
  tbl.appendChild(el("thead", {}, [head]));
  var rows = F.slice();
  if (sortKey === "name") rows.sort(function(a, b){ return sortDir * a.name.localeCompare(b.name); });
  else if (sortKey) rows.sort(function(a, b){ return sortDir * (a.cells[sortKey].depth - b.cells[sortKey].depth) || a.name.localeCompare(b.name); });
  var tb = el("tbody");
  rows.forEach(function(f){
    var tr = el("tr", {}, [el("th", {"class": "sticky", scope: "row", text: f.name})]);
    R.forEach(function(r){
      var c = f.cells[r.id];
      var td = el("td", {"class": "c", tabindex: "0"}, [chip(c), c.summary]);
      if (isTV(c)) td.appendChild(el("span", {"class": "tv", text: "to verify"}));
      td.addEventListener("click", function(){ openCell(f.id, r.id); });
      td.addEventListener("keydown", function(e){ if (e.key === "Enter") openCell(f.id, r.id); });
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  tbl.appendChild(tb);
}
function sortBy(key){
  if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = key === "name" ? 1 : -1; }
  renderTable();
}
renderTable();

// ---------- compare
var picks = document.getElementById("compare-picks"), cmp = document.getElementById("compare-grid"), cmpMsg = document.getElementById("compare-msg");
F.forEach(function(f){
  var cb = el("input", {type: "checkbox", value: f.id});
  cb.addEventListener("change", renderCompare);
  picks.appendChild(el("label", {}, [cb, " " + f.short]));
});
function selected(){ return Array.prototype.filter.call(picks.querySelectorAll("input"), function(i){ return i.checked; }).map(function(i){ return i.value; }); }
function setCompare(ids){
  picks.querySelectorAll("input").forEach(function(i){ i.checked = ids.indexOf(i.value) >= 0; });
  renderCompare();
}
function renderCompare(){
  var ids = selected();
  var boxes = picks.querySelectorAll("input");
  boxes.forEach(function(i){ i.disabled = !i.checked && ids.length >= 3; });
  cmp.innerHTML = "";
  cmpMsg.textContent = ids.length < 2 ? "Pick two or three frameworks." : "";
  if (!ids.length) return;
  var head = el("tr", {}, [el("th", {"class": "sticky", scope: "col", text: "Dimension"})]);
  ids.forEach(function(id){ head.appendChild(el("th", {scope: "col", text: byId[id].name})); });
  cmp.appendChild(el("thead", {}, [head]));
  var tb = el("tbody");
  R.forEach(function(r){
    var tr = el("tr", {}, [el("th", {"class": "sticky", scope: "row", text: r.label})]);
    ids.forEach(function(id){
      var c = byId[id].cells[r.id];
      var srcTxt = isTV(c) ? "to verify" : c.source.ref;
      var td = el("td", {}, [chip(c), c.summary, el("div", {"class": "note"}, [
        isTV(c) ? el("span", {"class": "tv", text: "to verify"}) : null,
        isTV(c) ? null : (c.source.url ? el("a", {href: c.source.url, target: "_blank", rel: "noopener", text: srcTxt}) : srcTxt)
      ])]);
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  cmp.appendChild(tb);
}
renderCompare();

// ---------- picker
var P = D.picker, form = document.getElementById("picker");
P.inputs.forEach(function(inp){
  var fs = el("fieldset", {}, [el("legend", {text: inp.label})]);
  inp.options.forEach(function(o, idx){
    var attrs = {type: inp.multiple ? "checkbox" : "radio", name: inp.id, value: o.id};
    if (!inp.multiple && idx === (inp.defaultIndex || 0)) attrs.checked = "checked";
    var box = el("input", attrs);
    box.addEventListener("change", runPicker);
    fs.appendChild(el("label", {}, [box, " " + o.label]));
  });
  form.appendChild(fs);
});
function answers(){
  var a = {};
  P.inputs.forEach(function(inp){
    var vals = Array.prototype.filter.call(form.querySelectorAll('input[name="' + inp.id + '"]'), function(i){ return i.checked; }).map(function(i){ return i.value; });
    a[inp.id] = vals;
  });
  return a;
}
function matches(when, a){
  return Object.keys(when || {}).every(function(key){
    var want = when[key];
    var have = a[key] || [];
    return want.some(function(w){ return have.indexOf(w) >= 0; });
  });
}
function describe(when){
  var parts = Object.keys(when || {}).map(function(key){
    var inp = P.inputs.filter(function(i){ return i.id === key; })[0];
    var labels = when[key].map(function(v){ var o = inp.options.filter(function(x){ return x.id === v; })[0]; return o ? o.label : v; });
    return inp.label.toLowerCase() + " is " + labels.join(" or ");
  });
  return parts.length ? "when " + parts.join(", and ") : "always";
}
var out = document.getElementById("picker-out");
function runPicker(){
  var a = answers();
  out.innerHTML = "";
  if (!a.jurisdictions.length) { out.appendChild(el("p", {text: "Tick at least one jurisdiction."})); return; }
  var scores = {};
  P.rules.forEach(function(rule){
    if (!matches(rule.when, a)) return;
    var s = scores[rule.framework] || (scores[rule.framework] = {score: 0, reasons: [], binding: false});
    s.score += rule.score;
    s.reasons.push(rule.reason);
    if (rule.binding) s.binding = true;
  });
  var ranked = Object.keys(scores).filter(function(id){ return scores[id].score > 0; })
    .sort(function(x, y){ return (scores[y].binding - scores[x].binding) || (scores[y].score - scores[x].score) || byId[x].name.localeCompare(byId[y].name); });
  out.appendChild(el("h3", {text: "Frameworks that apply or fit, ranked"}));
  var ol = el("ol", {"class": "results"});
  ranked.forEach(function(id){
    var s = scores[id];
    ol.appendChild(el("li", {}, [
      el("strong", {text: byId[id].name}),
      el("span", {"class": "tag" + (s.binding ? " binding" : ""), text: s.binding ? "applies (binding law)" : byId[id].nature}),
      el("div", {text: s.reasons[0]}),
      s.reasons.length > 1 ? el("div", {"class": "note", text: "Also: " + s.reasons.slice(1).join(" ")}) : null
    ]));
  });
  if (!ranked.length) ol.appendChild(el("li", {text: "No rule matched. Add a jurisdiction or a sector."}));
  out.appendChild(ol);
  // Suggested stack
  var st = el("div", {"class": "stack"}, [el("h3", {text: "Suggested stack"})]);
  var laws = ranked.filter(function(id){ return scores[id].binding; });
  st.appendChild(el("p", {}, [el("strong", {text: "Binding laws: "}), laws.length ? laws.map(function(id){ return byId[id].short; }).join(", ") : "none of the laws in this aid, on these answers (other law may still apply)"]));
  ["managementSystem", "riskMethod"].forEach(function(slot){
    var rule = P.stack[slot].filter(function(x){ return matches(x.when, a); })[0];
    st.appendChild(el("p", {}, [el("strong", {text: P.stackLabels[slot] + ": "}), rule ? byId[rule.pick].short + ". " + rule.reason : "no suggestion"]));
  });
  out.appendChild(st);
  out.appendChild(el("p", {"class": "note", text: P.caveat}));
}
runPicker();
var rl = document.getElementById("rules-list");
P.rules.forEach(function(rule){
  rl.appendChild(el("li", {}, [el("strong", {text: byId[rule.framework].short}), " +" + rule.score + (rule.binding ? " (binding) " : " ") + describe(rule.when) + ": " + rule.reason]));
});
["managementSystem", "riskMethod"].forEach(function(slot){
  P.stack[slot].forEach(function(x, i){
    rl.appendChild(el("li", {}, [el("strong", {text: P.stackLabels[slot] + " (" + (i + 1) + ")"}), " " + byId[x.pick].short + " " + describe(x.when) + ": " + x.reason]));
  });
});

var h = (location.hash || "").slice(1);
if (["wheel", "table", "compare", "picker"].indexOf(h) >= 0) show(h);
})();
`;

const counts = data.frameworks.map((f) => ({
  f,
  tv: Object.values(f.cells).filter((c) => !c.source || c.source.status === "to verify").length,
}));
const tvTotal = counts.reduce((n, x) => n + x.tv, 0);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(data.title)}</title>
<meta name="description" content="${esc(data.subtitle)}">
<style>${css}</style>
</head>
<body>
<header>
  <h1>${esc(data.title)}</h1>
  <p class="lede">${esc(data.subtitle)}</p>
  <p><span class="asof">As of ${esc(data.asOf)}</span><strong>${esc(data.disclaimer)}</strong></p>
  <p class="note">${data.frameworks.length} frameworks, ${data.rings.length} dimensions, ${data.frameworks.length * data.rings.length} cells, ${tvTotal} marked "to verify". ${esc(data.method)}</p>
  <nav class="tabs" role="tablist" aria-label="Views">
    <button type="button" role="tab" data-view="wheel" aria-selected="true">Wheel</button>
    <button type="button" role="tab" data-view="table" aria-selected="false">Table</button>
    <button type="button" role="tab" data-view="compare" aria-selected="false">Compare</button>
    <button type="button" role="tab" data-view="picker" aria-selected="false">Which frameworks?</button>
  </nav>
</header>
<main>
<section id="wheel-view" class="view active" aria-label="Wheel">
  <div class="wheel-layout">
    <div class="card">
      <svg id="wheel" class="wheel" viewBox="-600 -430 1200 860" role="group" aria-label="Wheel: one slice per framework, one ring per dimension; colour intensity shows depth"></svg>
      <ol class="fkey" id="fkey" aria-label="Slice numbers, clockwise from the top"></ol>
      <div class="legend" aria-label="Legend">
        <span><span class="sw" style="background:var(--d0)"></span>0 ${esc(data.depthScale[0])}</span>
        <span><span class="sw" style="background:var(--d1)"></span>1 ${esc(data.depthScale[1])}</span>
        <span><span class="sw" style="background:var(--d2)"></span>2 ${esc(data.depthScale[2])}</span>
        <span><span class="sw" style="background:var(--d3)"></span>3 ${esc(data.depthScale[3])}</span>
        <span><span class="sw hatch"></span>to verify</span>
      </div>
      <p class="note">Hover a cell for its summary; click or press Enter to open its panel. Click a framework name to open it in Compare. The table view carries the same data in text.</p>
    </div>
    <div class="card">
      <h2>Rings, rim to core</h2>
      <p class="note">Click a ring to highlight it across every framework; click again to clear.</p>
      <ol class="rings" id="ring-list"></ol>
      <p class="note" id="ring-help" aria-live="polite"></p>
    </div>
  </div>
</section>
<section id="table-view" class="view" aria-label="Table">
  <p class="note">Click a column heading to sort by depth; click a cell to open its panel. The table scrolls inside its box.</p>
  <div class="scroll"><table id="grid"></table></div>
</section>
<section id="compare-view" class="view" aria-label="Compare">
  <div class="picks" id="compare-picks" aria-label="Frameworks to compare"></div>
  <p class="note" id="compare-msg" aria-live="polite"></p>
  <div class="scroll"><table id="compare-grid"></table></div>
</section>
<section id="picker-view" class="view" aria-label="Which frameworks">
  <p class="lede">${esc(data.picker.intro)}</p>
  <form id="picker" class="picker" onsubmit="return false"></form>
  <div class="card" id="picker-out" aria-live="polite" style="margin-top:1rem"></div>
  <details class="rules"><summary>Why this result: the rules</summary>
    <p class="note">Each rule adds its score to a framework when every listed condition matches (any of the listed values). Binding laws rank first, then by score. The stack takes the first matching rule in each list.</p>
    <ul id="rules-list" class="note"></ul>
  </details>
</section>
</main>
<aside id="panel" class="panel" aria-hidden="true" aria-labelledby="panel-title" role="dialog">
  <button type="button" class="close" id="panel-close">Close</button>
  <div id="panel-body"></div>
</aside>
<div id="tip" role="tooltip"></div>
<footer>
  <p><strong>${esc(data.disclaimer)}</strong> ${esc(data.footer)}</p>
  <p>"To verify" cells per framework: ${counts.map((x) => `${esc(x.f.short)} ${x.tv}`).join(" · ")}.</p>
  <p>Data: <code>frameworks.json</code> (reusable). Built by <code>build.mjs</code>.</p>
</footer>
<script type="application/json" id="data">${embedded}</script>
<script>${js}</script>
</body>
</html>
`;

writeFileSync(join(here, "index.html"), html);
console.log(`wrote index.html: ${data.frameworks.length} frameworks x ${data.rings.length} rings, ${tvTotal} to verify, ${html.length} bytes`);
