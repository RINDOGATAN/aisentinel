// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

// The pure logic behind "select a dimension to highlight it across every
// framework; select it again to clear." Kept out of the client component so it
// can be tested under the node environment the rest of the suite uses.

/** Toggle the highlighted dimension: selecting the same one again clears it. */
export function toggleHighlight(current: string | null, ringId: string): string | null {
  return current === ringId ? null : ringId;
}

/**
 * A cell is dimmed when a dimension is highlighted and this cell is not on it.
 * With nothing highlighted, no cell is dimmed. The highlighted dimension stays
 * at full strength across every framework; only the other rings recede.
 */
export function isCellDimmed(highlight: string | null, ringId: string): boolean {
  return highlight !== null && highlight !== ringId;
}
