// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The one list pattern (record-list.tsx): heading, title, badges and actions
 * in one box; the title is the one link; an action is never inside the link.
 * And the four record lists use it rather than a card of their own.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RecordCard, RecordGrid } from "./record-list";

describe("record card", () => {
  const html = renderToStaticMarkup(
    <RecordGrid>
      <RecordCard
        href="/governance/ai-registry/s1"
        heading="AIS-001"
        title="Chat assistant"
        badges={<span data-badge="status">Deployed</span>}
        description="Answers questions"
        footer="Updated today"
        actions={<button type="button">Archive</button>}
      />
    </RecordGrid>,
  );

  it("holds the heading, the title, the badges, the footer and the actions in one box", () => {
    const box = html.slice(html.indexOf('data-testid="record-card"'));
    for (const part of ["AIS-001", "Chat assistant", 'data-badge="status"', "Answers questions", "Updated today", "Archive"]) {
      expect(box, part).toContain(part);
    }
  });

  it("links the title to the record, once, and keeps the action outside the link", () => {
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="/governance/ai-registry/s1"');
    const link = html.slice(html.indexOf("<a "), html.indexOf("</a>"));
    expect(link).not.toContain("<button");
  });

  it("is used by the four record lists", () => {
    const root = join(__dirname, "../../app/(dashboard)/governance");
    for (const list of ["ai-registry", "shadow-ai", "vendors", "policies"]) {
      const src = readFileSync(join(root, list, "page.tsx"), "utf8");
      expect(src, list).toContain("<RecordCard");
      expect(src, list).toContain("<RecordGrid>");
    }
  });
});
