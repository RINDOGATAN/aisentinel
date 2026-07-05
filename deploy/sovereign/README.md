# AI SENTINEL — Sovereign bundle

The full AI SENTINEL stack on firm hardware, one command. Same app code as
the cloud deployment — only environment differs (portability doctrine: one
codebase, two postures, switched by env, never forked).

```
Postgres 16      firm AI-governance data        db
migrator         prisma db push + first-boot seed (one-shot)
Next.js app      the SAME app the cloud runs    app  → http://localhost:8487
```

Posture differences from cloud, all env-driven:

- **Auth:** local credentials login (email, no password, no external
  services) via `NEXT_PUBLIC_LOCAL_AUTH_ENABLED=true`. Google OAuth and
  Resend magic links are cloud-tier options, off by default. Session cookies
  are host-only (`AUTH_COOKIE_DOMAIN` empty) instead of the cloud's
  `.todo.law` SSO domain.
- **Stripe:** off. Self-service module upgrades are the cloud tier; the app
  boots and functions fully with empty `STRIPE_*` vars and
  `NEXT_PUBLIC_STRIPE_ENABLED=false`.
- **AI:** AI Sentinel makes no LLM calls — it is a governance
  registry/assessment tool; there is nothing to point at a gateway.
- **Brand:** `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_ACCENT`,
  `NEXT_PUBLIC_BRAND_LOGO_URL` (plus the fine-grained `NEXT_PUBLIC_COLOR_*`
  set in `src/config/brand.ts`). Same UI, your name on it — no clones.

## First run

```sh
cd deploy/sovereign
cp .env.example .env       # set POSTGRES_PASSWORD, NEXTAUTH_SECRET, PUBLIC_URL
chmod 600 .env
docker compose up -d --build
docker compose logs migrator   # wait for "[migrate] done."
open http://localhost:8487
```

Sign in at `/sign-in` with the local login box (any email creates an
account). The first-run seed is content-only — compliance frameworks,
assessment templates, and the tool/vendor catalogs; no demo organization
and no pre-created accounts (demo data is opt-in via `DEMO_SEED=true`,
which the sovereign bundle never sets). Port 8487 — 8484/85/86 are
LexBooks / DPO Central / DealRoom on this hardware.

## Day-2 operations

- **Schema after `git pull`:** `docker compose run --rm migrator` — re-runs
  `prisma db push`; the seed is skipped once the instance has users.
- **Rebuild after an update or brand/posture change:**
  `docker compose up -d --build app`. All `NEXT_PUBLIC_*` vars are baked in
  at build time — editing them in `.env` without a rebuild does nothing.
- **Backups:** `./backup.sh` — encrypted (AES-256) pg_dump, 14-day local
  retention, optional off-machine push via `BACKUP_RCLONE_REMOTE`. Set
  `BACKUP_PASSPHRASE` in `.env`. Schedule daily:
  `crontab -e` → `25 3 * * * cd <this dir> && ./backup.sh >> backups/backup.log 2>&1`
  (No storage volume: AI Sentinel keeps everything in Postgres.)
- **Restore:** `./restore.sh <db.enc>` — wipes the target instance and
  restores (type RESTORE to confirm).
- **Vendor catalog refresh:** the cloud runs a weekly cron
  (`/api/cron/sync-catalog`) against the VendorWatch API. Locally, either
  leave the seeded catalog as-is or set `VENDORWATCH_CATALOG_API_URL/KEY`
  and hit that route by hand.

## Sync & travel replica (cloud + local copies)

**Local is primary.** Same discipline as the LexBooks bundle: the replica is
this same compose stack elsewhere, seeded with `./restore.sh` from the latest
backup, one active side at a time. Two-way merge of concurrent edits is
deliberately unsupported.

## Hardening (beyond localhost)

The full checklist lives in the LexBooks template
(`APPS/LexBooks/deploy/sovereign/HARDENING.md`) — same pattern applies here.
The short version:

1. **Network:** default `BIND_ADDR=127.0.0.1` needs nothing. Office LAN:
   `BIND_ADDR=0.0.0.0` + firewall the box to the office subnet. Never expose
   8487 to the internet raw.
2. **TLS:** `TLS_DOMAIN=sentinel.firm.example`,
   `PUBLIC_URL=https://sentinel.firm.example`, then
   `docker compose --profile tls up -d --build app` (PUBLIC_URL is the
   NextAuth origin). Public DNS → Let's Encrypt; LAN hostname → Caddy
   internal CA.
3. **Auth:** the local login creates an account for ANY email typed into it —
   that is fine behind 127.0.0.1 or a firewalled LAN, and exactly why this
   port must never face the internet. For a public-facing replica, disable it
   (`NEXT_PUBLIC_LOCAL_AUTH_ENABLED=false`) and use the Resend/Google
   cloud-tier options instead.
4. **Secrets:** `chmod 600 .env`. Rotating `NEXTAUTH_SECRET` signs everyone
   out (JWT sessions) — rotate deliberately.
5. **Data:** nightly `./backup.sh` on cron; quarterly, actually run
   `./restore.sh` somewhere disposable. An untested backup is a hope, not a
   backup.
6. **Updates:** `git pull` → `docker compose run --rm migrator` →
   `docker compose up -d --build app`. Images are version-pinned; bump
   deliberately, snapshot a backup first.

## Notes & limits

- Single-firm posture. The seed ships reference content only (frameworks,
  templates, catalogs) — create your own organization on first sign-in.
- The Prisma datasource reads `ais_DATABASE_URL` (a Vercel-scoped variable
  name) — the compose file sets it; keep that name if you wire your own DB.
- License: AGPL-3.0-or-later (see repo LICENSE) — self-hosting your own
  instance is exactly the intended use.
