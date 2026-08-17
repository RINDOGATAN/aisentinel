// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Locale-aware "3 months ago" / "hace 3 meses".
 *
 * Built on Intl.RelativeTimeFormat rather than translation keys: it already
 * knows every language's pluralisation and word order, so Spanish gets
 * "hace 3 meses" (preposition first) instead of a key-per-bucket that would
 * have to be written twice and kept in sync.
 *
 * `numeric: "auto"` is what produces "yesterday"/"ayer" rather than
 * "1 day ago"/"hace 1 día".
 *
 * Pass the active locale from `useLocale()`; it defaults to English so a
 * missed call site degrades to the previous behaviour rather than throwing.
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
  locale: string = "en"
): string {
  if (!date) return "N/A";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  // Negative values read as the past ("hace 3 meses"), which is what every
  // caller here displays.
  if (diffDays === 0) {
    if (diffHours === 0) {
      if (diffMinutes <= 1) return rtf.format(0, "minute"); // "this minute"/"ahora"
      return rtf.format(-diffMinutes, "minute");
    }
    return rtf.format(-diffHours, "hour");
  }
  if (diffDays < 7) return rtf.format(-diffDays, "day");
  if (diffDays < 30) return rtf.format(-Math.floor(diffDays / 7), "week");
  if (diffDays < 365) return rtf.format(-Math.floor(diffDays / 30), "month");
  return rtf.format(-Math.floor(diffDays / 365), "year");
}

export function getDaysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
