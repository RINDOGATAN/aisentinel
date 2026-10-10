// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * The designer logo as the sign-in screen and the persona step show it: the
 * white TODO.LAW wordmark (public/logo-negative.svg, 28 px high) with the
 * product name in capitals right next to it, in Jost 600. Shared by the
 * public landing header, the sign-in layout and the persona step, so they
 * cannot drift. The caller supplies the wrapping element and its layout (a
 * flex row, items centred, gap-2).
 */

import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

const BRAND_STYLE = { fontFamily: "var(--font-jost), 'Jost', sans-serif", fontWeight: 600 } as const;

export function BrandMark({ nameClassName }: { nameClassName?: string }) {
  return (
    <>
      <img src="/logo-negative.svg" alt="TODO.LAW" style={{ height: "28px", width: "auto" }} />
      <span className={cn("text-lg tracking-tight whitespace-nowrap", nameClassName)} style={BRAND_STYLE}>
        {brand.name.toUpperCase()}
      </span>
    </>
  );
}
