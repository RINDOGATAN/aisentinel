// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A row of actions must fit a phone.
 *
 * The defect this guards: the AI registry header held its actions in a row
 * that could not wrap (`flex gap-2 flex-none`), and two of the actions were
 * `w-full` on a phone. The shared Button is `shrink-0` and
 * `whitespace-nowrap`, so a full-width button takes the whole row and gives
 * none of it back: the next action is pushed outside the screen and the page
 * scrolls sideways. One of the two full-width buttons was not even on the
 * page: it was the trigger inside InventoryImportDialog, a file away.
 *
 * phone-width.test.ts reads lines. This rule needs to know which element is
 * inside which, and what a component renders at its root, so it reads the
 * syntax tree instead. Two patterns fail:
 *
 *   full-width-in-row   a row that cannot wrap holds two or more items and
 *                       one of them is `w-full` on a phone
 *   crowded-row         a row that cannot wrap holds more than two buttons
 *                       that show text on a phone
 *
 * "Cannot wrap" means: `flex` or `inline-flex` on a phone, not `flex-col`, no
 * `flex-wrap`, and not a strip that scrolls inside itself. Like the line
 * scan, this is a source check: it keeps a fix fixed and knows only the
 * patterns it has been taught. It is not a measurement of a rendered page.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const ROOTS = ["src/app/(dashboard)", "src/components"] as const;
const SKIPPED_DIRECTORIES = ["src/components/docs"];

type RuleId = "full-width-in-row" | "crowded-row";

/** Each waiver names the file, the rule and a reason a reader can check. */
const ALLOWED: { file: string; rule: RuleId; because: string }[] = [];

interface Violation {
  file: string;
  line: number;
  rule: RuleId;
  text: string;
}

/** What one child of a row amounts to on a phone. */
interface Item {
  fullWidth: boolean;
  textButton: boolean;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (SKIPPED_DIRECTORIES.some((d) => path.startsWith(d))) continue;
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith(".tsx") && !path.endsWith(".test.tsx")) out.push(path);
  }
  return out;
}

const FILES = ROOTS.flatMap((r) => walk(r)).sort();

/**
 * Elements that draw nothing of their own: they pass their child through, so
 * the child is the item in the row.
 */
const PASS_THROUGH =
  /^(Link|a|Dialog|AlertDialog|Sheet|Popover|DropdownMenu|Tooltip|TooltipProvider|HoverCard|Collapsible)$|Trigger$/;
/** Drawn in a layer above the page: never an item of the row that opens it. */
const OVERLAY = /Content$|Portal$/;

function parse(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function tagName(el: ts.JsxOpeningLikeElement): string {
  return el.tagName.getText();
}

function opening(node: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxOpeningLikeElement {
  return ts.isJsxElement(node) ? node.openingElement : node;
}

/**
 * The classes an element carries on a phone: every class written in its
 * className, in any branch of a condition, that has no breakpoint or state in
 * front of it. Null when the element has no className at all.
 */
function phoneClasses(el: ts.JsxOpeningLikeElement): Set<string> | null {
  const attr = el.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === "className",
  );
  if (!attr || !attr.initializer) return null;
  const words: string[] = [];
  const collect = (node: ts.Node) => {
    if (ts.isStringLiteralLike(node)) words.push(node.text);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) words.push(node.text);
    ts.forEachChild(node, collect);
  };
  collect(attr.initializer);
  return new Set(words.join(" ").split(/\s+/).filter((w) => w && !w.includes(":")));
}

function hiddenOnPhone(classes: Set<string> | null): boolean {
  return !!classes && (classes.has("hidden") || classes.has("sr-only"));
}

/** A row whose children sit side by side on a phone and cannot move to a second line. */
function cannotWrap(classes: Set<string> | null): boolean {
  if (!classes) return false;
  if (!classes.has("flex") && !classes.has("inline-flex")) return false;
  if (classes.has("flex-col") || classes.has("flex-col-reverse")) return false;
  if (classes.has("flex-wrap") || classes.has("flex-wrap-reverse")) return false;
  if (classes.has("overflow-x-auto") || classes.has("overflow-auto")) return false;
  return !hiddenOnPhone(classes);
}

/** The JSX elements an expression can produce, not looking inside any of them. */
function elementsIn(node: ts.Node, out: (ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment)[] = []) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
    out.push(node);
    return out;
  }
  ts.forEachChild(node, (child) => void elementsIn(child, out));
  return out;
}

/** Does this element show words on a phone? An icon alone does not. */
function showsText(node: ts.JsxElement | ts.JsxSelfClosingElement): boolean {
  if (ts.isJsxSelfClosingElement(node)) return false;
  return node.children.some((child) => {
    if (ts.isJsxText(child)) return child.text.trim().length > 0;
    if (ts.isJsxExpression(child)) {
      if (!child.expression) return false;
      const inner = elementsIn(child.expression);
      // {t("save")} is text; {saving && <Loader2 />} is an icon.
      if (inner.length === 0) return true;
      return inner.some((el) => !ts.isJsxFragment(el) && !hiddenOnPhone(phoneClasses(opening(el))) && showsText(el));
    }
    if (ts.isJsxElement(child)) return !hiddenOnPhone(phoneClasses(child.openingElement)) && showsText(child);
    return false;
  });
}

/** What each component renders at its root, by name: filled before the scan. */
const COMPONENT_ROOTS = new Map<string, Item>();

/** Flatten the children of a row into the items that take part in its layout. */
function itemsOf(children: readonly ts.Node[]): Item[] {
  const items: Item[] = [];
  for (const child of children) {
    if (ts.isJsxText(child)) continue;
    if (ts.isJsxExpression(child)) {
      if (child.expression) items.push(...itemsOf(elementsIn(child.expression)));
      continue;
    }
    if (ts.isJsxFragment(child)) {
      items.push(...itemsOf(child.children));
      continue;
    }
    if (!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child)) continue;

    const open = opening(child);
    const name = tagName(open);
    const classes = phoneClasses(open);
    if (OVERLAY.test(name) || hiddenOnPhone(classes)) continue;
    // A backdrop or a badge pinned to a corner is out of the flow of the row.
    if (classes && (classes.has("absolute") || classes.has("fixed"))) continue;

    if (PASS_THROUGH.test(name) && ts.isJsxElement(child)) {
      const inner = itemsOf(child.children);
      // A link with classes of its own is the item, and a full-width button
      // inside it fills the link, not the row; its button still counts as text.
      if (classes) {
        items.push({ fullWidth: classes.has("w-full"), textButton: inner.some((i) => i.textButton) });
      } else items.push(...inner);
      continue;
    }

    const known = COMPONENT_ROOTS.get(name);
    const isButton = name === "Button" || name === "button";
    items.push({
      fullWidth: !!classes?.has("w-full") || (!classes && !!known?.fullWidth),
      textButton: isButton ? showsText(child) : !!known?.textButton,
    });
  }
  return items;
}

/** The root a component returns, for every function in a file that returns JSX. */
function recordComponentRoots(sf: ts.SourceFile) {
  const visit = (node: ts.Node) => {
    const name =
      ts.isFunctionDeclaration(node) && node.name
        ? node.name.text
        : ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
            (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
          ? node.name.text
          : null;
    if (name && /^[A-Z]/.test(name)) {
      // The last top-level return is the render; early returns are loading states.
      let root: ts.Expression | undefined;
      const body = ts.isFunctionDeclaration(node) ? node.body : (node as ts.VariableDeclaration).initializer;
      const find = (n: ts.Node) => {
        if (n !== body && ts.isFunctionLike(n)) return;
        if (ts.isReturnStatement(n) && n.expression && elementsIn(n.expression).length > 0) root = n.expression;
        ts.forEachChild(n, find);
      };
      if (body) find(body);
      if (root) {
        const items = itemsOf(elementsIn(root));
        if (items.length === 1) COMPONENT_ROOTS.set(name, items[0]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function scanSource(file: string, source: string): Violation[] {
  const sf = parse(file, source);
  const found: Violation[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && cannotWrap(phoneClasses(node.openingElement))) {
      const items = itemsOf(node.children);
      const start = node.openingElement.getStart(sf);
      const at = (rule: RuleId) =>
        found.push({
          file,
          line: sf.getLineAndCharacterOfPosition(start).line + 1,
          rule,
          text: node.openingElement.getText(sf).replace(/\s+/g, " ").slice(0, 120),
        });
      if (items.length >= 2 && items.some((i) => i.fullWidth)) at("full-width-in-row");
      if (items.filter((i) => i.textButton).length > 2) at("crowded-row");
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function scan(): Violation[] {
  const sources = FILES.map((file) => ({ file, source: readFileSync(file, "utf8") }));
  COMPONENT_ROOTS.clear();
  for (const { file, source } of sources) recordComponentRoots(parse(file, source));
  return sources
    .flatMap(({ file, source }) => scanSource(file, source))
    .filter((v) => !ALLOWED.some((a) => a.file === v.file && a.rule === v.rule));
}

/** The registry header as it stood on main when the owner saw it run off the screen. */
const REGISTRY_HEADER_AS_IT_WAS = `
export default function Page() {
  return (
    <div className="flex gap-2 flex-none">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 sm:size-auto sm:px-4 sm:py-2">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{tc("export")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>{t("exportRegisterPdf")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {canWrite && (
        <>
          {organization && <InventoryImportDialog organizationId={organization.id} />}
          <Link href="/governance/ai-registry/new">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("registerAiSystem")}</span>
              <span className="sm:hidden">{t("registerShort")}</span>
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}`;

describe("rows of actions fit a phone", () => {
  it("reads every signed-in component", () => {
    expect(FILES.length).toBeGreaterThan(60);
    expect(FILES).toContain("src/app/(dashboard)/governance/ai-registry/page.tsx");
    expect(FILES).toContain("src/components/governance/InventoryImportDialog.tsx");
  });

  it("finds no row that cannot wrap and holds a full-width item or more than two text buttons", () => {
    const report = scan()
      .map((v) => `  ${v.rule}  ${v.file}:${v.line}\n    ${v.text}`)
      .join("\n");
    expect(report, `Rows that can run off a phone:\n${report}`).toBe("");
  });

  it("states a reason for every exception, and keeps each one real", () => {
    for (const a of ALLOWED) {
      expect(a.because.length).toBeGreaterThan(40);
      expect(FILES).toContain(a.file);
    }
  });

  it("fails on the registry header as it stood on main", () => {
    const rules = scanSource("registry.tsx", REGISTRY_HEADER_AS_IT_WAS).map((v) => v.rule);
    expect(rules).toContain("full-width-in-row");
  });

  it("follows a dialog trigger into its own file", () => {
    COMPONENT_ROOTS.clear();
    recordComponentRoots(
      parse(
        "ImportDialog.tsx",
        `export function ImportDialog() {
           return (
             <Dialog>
               <DialogTrigger asChild>
                 <Button className="w-full sm:w-auto"><FileSpreadsheet /></Button>
               </DialogTrigger>
               <DialogContent>…</DialogContent>
             </Dialog>
           );
         }`,
      ),
    );
    expect(COMPONENT_ROOTS.get("ImportDialog")).toEqual({ fullWidth: true, textButton: false });
    const row = `const P = () => <div className="flex gap-2"><Button size="icon"><X /></Button><ImportDialog /></div>;`;
    expect(scanSource("p.tsx", row).map((v) => v.rule)).toEqual(["full-width-in-row"]);
  });

  it("leaves alone the rows that are safe", () => {
    COMPONENT_ROOTS.clear();
    const safe = [
      // It wraps.
      `<div className="flex flex-wrap gap-2"><Button className="w-full">{a}</Button><Button>{b}</Button></div>`,
      // It is a column on a phone.
      `<div className="flex flex-col sm:flex-row gap-2"><Button className="w-full sm:w-auto">{a}</Button><Button className="w-full">{b}</Button></div>`,
      // One full-width child is the whole row.
      `<div className="flex"><Button className="w-full">{a}</Button></div>`,
      // Full width only from a breakpoint up.
      `<div className="flex gap-2"><Button className="sm:w-full">{a}</Button><Button>{b}</Button></div>`,
      // Two text buttons and an icon.
      `<div className="flex gap-2"><Button>{a}</Button><Button>{b}</Button><Button size="icon"><X /></Button></div>`,
      // The third label is hidden on a phone.
      `<div className="flex gap-2"><Button>{a}</Button><Button>{b}</Button><Button><X /><span className="hidden sm:inline">{c}</span></Button></div>`,
      // A modal: the backdrop is out of the flow, so the panel is the only item.
      `<div className="fixed inset-0 flex items-center justify-center"><div className="fixed inset-0 bg-black/50" /><Card className="relative w-full max-w-md mx-4">{a}</Card></div>`,
      // The primary action shares the width through its link; the button fills the link.
      `<div className="flex gap-2"><Button size="icon"><X /></Button><Link href="/n" className="flex-1 min-w-0"><Button className="w-full">{a}</Button></Link></div>`,
      // Not shown on a phone at all.
      `<div className="hidden sm:flex gap-2"><Button>{a}</Button><Button>{b}</Button><Button>{c}</Button></div>`,
    ];
    for (const jsx of safe) expect(scanSource("s.tsx", `const S = () => ${jsx};`), jsx).toEqual([]);
  });

  it("catches three text buttons side by side", () => {
    const jsx = `const S = () => <div className="flex items-center gap-2"><Button>{a}</Button><Link href="/x"><Button>{b}</Button></Link>{ok && <Button>Save</Button>}</div>;`;
    expect(scanSource("s.tsx", jsx).map((v) => v.rule)).toEqual(["crowded-row"]);
  });
});
