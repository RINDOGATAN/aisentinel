// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { GDPR_PACK } from "./gdpr-requirements";
import { COLORADO_PACK } from "./colorado-requirements";
import { TEXAS_PACK } from "./texas-requirements";
import { WASHINGTON_PACK } from "./washington-requirements";
import type { RegimeFrameworkCode, RegimePack } from "./types";

export const REGIME_PACKS: readonly RegimePack[] = [GDPR_PACK, COLORADO_PACK, TEXAS_PACK, WASHINGTON_PACK];

export const REGIME_CODES: readonly RegimeFrameworkCode[] = REGIME_PACKS.map((p) => p.framework.code);

export function regimePack(code: string): RegimePack | undefined {
  return REGIME_PACKS.find((p) => p.framework.code === code);
}

export function isRegimeCode(code: string): code is RegimeFrameworkCode {
  return REGIME_CODES.includes(code as RegimeFrameworkCode);
}

export * from "./types";
export * from "./regime-rules";
