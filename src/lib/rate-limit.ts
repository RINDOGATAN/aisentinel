// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 Rindogatan LLC

/**
 * A fixed-window rate limiter for the handful of routes that are reachable
 * without a session.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT
 *
 * The counter lives in the process. On a self-hosted install that is exact:
 * one container, one counter, and the configured limit is the limit. On a
 * serverless deployment each warm instance keeps its own counter, so a
 * determined attacker spread across instances can reach a multiple of the
 * limit. It is a cap on the trivial loop, not a distributed quota.
 *
 * That trade is deliberate. The alternative is a shared store, which means
 * either a database write on every request to the very routes we are trying to
 * keep cheap, or a new external dependency that a self-hoster would have to run.
 * An operator who needs a hard distributed limit should put one in front of the
 * app (Caddy, nginx, Cloudflare) and set RATE_LIMIT_DISABLED=true here.
 *
 * CONFIGURATION
 *
 * Every policy is read from the environment as "count/seconds", so the same
 * build behaves differently per instance without a rebuild:
 *
 *   RATE_LIMIT_SIGNIN=10/900        ten sign-in attempts per fifteen minutes
 *   RATE_LIMIT_MAGIC_LINK=5/3600    five magic links per hour
 *   RATE_LIMIT_HEALTH=60/60         sixty health probes per minute
 *   RATE_LIMIT_IMPORT=120/60        one hundred and twenty imports per minute
 *   RATE_LIMIT_DISABLED=true        turn the whole thing off
 *
 * An unparseable value falls back to the built-in default rather than throwing:
 * a typo in an operator's .env must not take the site down.
 */

/** A parsed policy: `limit` requests allowed per `windowMs`. */
export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Whole seconds until the window resets. Zero when `ok` is true. */
  retryAfterSeconds: number;
}

/**
 * The limiter's own memory must be bounded, or it becomes the denial of
 * service it is meant to prevent: one entry per spoofed address would grow
 * without end. At the cap we drop the entries closest to expiry.
 */
const MAX_TRACKED_KEYS = 10_000;

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Built-in defaults, used when the environment says nothing or says nonsense. */
export const DEFAULT_POLICIES = {
  signin: { limit: 10, windowMs: 15 * 60_000 },
  magicLink: { limit: 5, windowMs: 60 * 60_000 },
  health: { limit: 60, windowMs: 60_000 },
  import: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

export type PolicyName = keyof typeof DEFAULT_POLICIES;

const ENV_VAR: Record<PolicyName, string> = {
  signin: "RATE_LIMIT_SIGNIN",
  magicLink: "RATE_LIMIT_MAGIC_LINK",
  health: "RATE_LIMIT_HEALTH",
  import: "RATE_LIMIT_IMPORT",
};

/** `"10/900"` → 10 requests per 900 seconds. Returns null if unusable. */
export function parsePolicy(raw: string | undefined): RateLimitPolicy | null {
  if (!raw) return null;
  const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(raw);
  if (!match) return null;
  const limit = Number(match[1]);
  const seconds = Number(match[2]);
  if (limit <= 0 || seconds <= 0) return null;
  return { limit, windowMs: seconds * 1000 };
}

export function policyFor(name: PolicyName): RateLimitPolicy {
  return parsePolicy(process.env[ENV_VAR[name]]) ?? DEFAULT_POLICIES[name];
}

export function rateLimitDisabled(): boolean {
  return process.env.RATE_LIMIT_DISABLED === "true";
}

/** Drop expired windows, then the soonest-to-expire, until under the cap. */
function evictIfNeeded(now: number): void {
  if (windows.size < MAX_TRACKED_KEYS) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  if (windows.size < MAX_TRACKED_KEYS) return;
  const byExpiry = [...windows.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  const excess = windows.size - MAX_TRACKED_KEYS + 1;
  for (let i = 0; i < excess; i++) windows.delete(byExpiry[i][0]);
}

/**
 * Count one request against `key`.
 *
 * `now` is injectable so the tests can move time without sleeping.
 */
export function consume(
  key: string,
  policy: RateLimitPolicy,
  now: number = Date.now(),
): RateLimitResult {
  if (rateLimitDisabled()) {
    return { ok: true, limit: policy.limit, remaining: policy.limit, retryAfterSeconds: 0 };
  }

  evictIfNeeded(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + policy.windowMs });
    return { ok: true, limit: policy.limit, remaining: policy.limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > policy.limit) {
    return {
      ok: false,
      limit: policy.limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return {
    ok: true,
    limit: policy.limit,
    remaining: policy.limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Test helper. Never call this from application code. */
export function __resetRateLimitStore(): void {
  windows.clear();
}

/**
 * The caller's address, as far as it can be trusted.
 *
 * The order here is the whole security of the limiter, because whatever value
 * is chosen becomes the bucket key. If the caller can choose it, the caller can
 * have a fresh allowance on every request and the limit means nothing.
 *
 *   1. `x-vercel-forwarded-for` — set by the platform on every hosted request
 *      and overwritten if a client sends it, so it cannot be forged.
 *   2. `x-real-ip` — set by the reverse proxy in the self-hosted posture.
 *   3. The RIGHTMOST `x-forwarded-for` entry. A client that sends its own
 *      header has its value appended to the left by the nearest proxy, so the
 *      rightmost entry is the one that proxy observed. Taking the leftmost,
 *      which reads naturally as "the original client", is exactly the mistake
 *      that lets an attacker rotate a header and evade the limit entirely.
 *
 * With no proxy at all, none of these is trustworthy. That is why the sovereign
 * README tells operators to put one in front, and why the store is bounded: a
 * forged address costs the attacker a limiter entry, not the site.
 */
export function clientIp(request: Request): string {
  const platform = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (platform) return platform;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
    const nearest = hops[hops.length - 1];
    if (nearest) return nearest;
  }

  return "unknown";
}

/** A 429 carrying the headers a well-behaved client needs to back off. */
export function tooManyRequests(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests", retryAfterSeconds: result.retryAfterSeconds }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
        "RateLimit-Limit": String(result.limit),
        "RateLimit-Remaining": "0",
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Count a request and return a 429 to send back, or null to continue.
 * `scope` separates the policies so one route's traffic cannot exhaust another.
 */
export function enforce(request: Request, name: PolicyName, scope = ""): Response | null {
  const result = consume(`${name}:${scope}:${clientIp(request)}`, policyFor(name));
  return result.ok ? null : tooManyRequests(result);
}
