// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A warning before leaving a page with typed changes that are not saved.
 *
 * Any number of forms on a page register whether they hold unsaved text; one
 * pair of listeners serves them all, so two dirty forms ask once, not twice.
 *
 * - Closing the tab, reloading or typing a new address: the browser's own
 *   "leave site?" prompt (`beforeunload`).
 * - Following a link inside the app: a confirm before the router moves. The
 *   click listener runs in the capture phase on `window`, ahead of the
 *   router's own handler on the React root, so cancelling stops the move.
 *
 * Choices that save as they are made (see `save-queue.ts`) never register:
 * there is nothing to lose.
 */

const dirty = new Set<string>();
let message = "";
let installed = false;

/** Mark one form as holding unsaved changes, or clear it. */
export function setUnsaved(id: string, isDirty: boolean, warning?: string): void {
  if (isDirty) dirty.add(id);
  else dirty.delete(id);
  if (warning) message = warning;
}

export function hasUnsaved(): boolean {
  return dirty.size > 0;
}

/** Test helper: forget every registration. */
export function resetUnsaved(): void {
  dirty.clear();
  message = "";
}

export interface ClickFacts {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  /** The clicked link's attributes, or null when no link was clicked. */
  link: { href: string; target: string | null; download: boolean } | null;
}

/**
 * Whether a click would take the reader away from this page inside the same
 * tab. A new tab, a download, a modified click or a jump within the page
 * (only the hash changes) keeps the page and its typing, so it is not asked.
 */
export function isLeavingClick(click: ClickFacts, current: string): boolean {
  if (!click.link || click.defaultPrevented) return false;
  if (click.button !== 0) return false;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false;
  if (click.link.download) return false;
  if (click.link.target && click.link.target !== "_self") return false;
  let here: URL;
  let next: URL;
  try {
    here = new URL(current);
    next = new URL(click.link.href, here);
  } catch {
    return false;
  }
  if (next.protocol !== "http:" && next.protocol !== "https:") return false;
  return !(
    next.origin === here.origin &&
    next.pathname === here.pathname &&
    next.search === here.search
  );
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsaved()) return;
  event.preventDefault();
  // Older browsers need a returnValue to show their prompt.
  event.returnValue = "";
}

function onClick(event: MouseEvent) {
  if (!hasUnsaved()) return;
  const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  const facts: ClickFacts = {
    button: event.button,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    defaultPrevented: event.defaultPrevented,
    link: anchor
      ? {
          href: anchor.getAttribute("href") ?? "",
          target: anchor.getAttribute("target"),
          download: anchor.hasAttribute("download"),
        }
      : null,
  };
  if (!isLeavingClick(facts, window.location.href)) return;
  if (window.confirm(message)) {
    // The reader chose to leave: the forms are going away with the page.
    dirty.clear();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}

/** Installs the two listeners once per window. */
export function installUnsavedListeners(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("click", onClick, true);
}
