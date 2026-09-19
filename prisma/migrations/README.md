# Migrations

## Provenance of `0_init`

`0_init/migration.sql` is a baseline generated on 2026-07-05 from the schema
that was previously deployed everywhere via `prisma db push`:

```sh
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

From this point on, schema changes go through `prisma migrate dev` (which
appends a new timestamped migration here) and are applied with
`prisma migrate deploy`. Do not use `prisma db push` against any instance you
care about: push has no history and can drop columns on drift.

## Baselining an EXISTING database (one-time)

A database created before migrations existed (any pre-baseline install, and the
hosted Neon instance) already has all the tables but no `_prisma_migrations`
bookkeeping. Mark the baseline as applied WITHOUT running it, then deploy:

```sh
npx prisma migrate resolve --applied 0_init
npx prisma migrate deploy   # no-op today; applies future migrations
```

The sovereign migrator (`deploy/sovereign/migrate.sh`) detects this case and
runs the resolve step automatically. For the hosted database, run the two
commands above once, manually, with `ais_DATABASE_URL` pointed at it.

Fresh databases need nothing special: `prisma migrate deploy` applies
`0_init` like any other migration.

## Forward-only, forever

A migration that has been merged to `main` is never edited, renamed, reordered
or deleted. Self-hosted installs jump from any published version straight to
the latest and replay every migration they have not yet applied, and the hosted
database applies each one on the next deploy. Prisma records a checksum of each
applied file, so an edited migration fails `migrate deploy` on every database
that already ran the old text.

- To change something a merged migration did, add a new migration that changes
  it.
- Prefer additive steps: a new nullable column, a new table, a new index. A
  rename or a type change is an add, a backfill and (in a later release) a drop.
- Every enum value goes in its own migration file (PostgreSQL cannot use a new
  enum value in the same transaction that adds it).
- There is no down migration. Rollback is a restore from a backup taken before
  the upgrade, not an older image: an older app is not guaranteed to run against
  a newer schema.

## Rehearsing an upgrade before it reaches real data

A new migration is applied to a copy first, never first to a live database.

1. **On an empty database** (every change). Start a throwaway PostgreSQL and
   apply the whole history, the way a new install does:

   ```sh
   docker run -d --name ais-rehearsal -e POSTGRES_PASSWORD=rehearsal -p 55432:5432 postgres:16
   ais_DATABASE_URL="postgresql://postgres:rehearsal@localhost:55432/postgres" npx prisma migrate deploy
   ais_DATABASE_URL="postgresql://postgres:rehearsal@localhost:55432/postgres" npx prisma migrate diff \
     --from-url "postgresql://postgres:rehearsal@localhost:55432/postgres" \
     --to-schema-datamodel prisma/schema.prisma --exit-code
   docker rm -f ais-rehearsal
   ```

   `migrate diff --exit-code` exits 0 only when the migrated database matches
   `schema.prisma`; exit 2 means a schema change has no migration.

2. **On a copy of an older install** (every release). Restore a self-hosted
   backup taken on an older release into a scratch database and run the
   published or locally built migrator against it. The procedure and the
   counts to compare are in `docs/releasing.md`, section 5, check 5.

3. **On a copy of the hosted database** (owner only; any migration that
   rewrites or drops data). Create a branch of the production database on the
   hosting provider, point `ais_DATABASE_URL` at the branch, run
   `npx prisma migrate deploy`, check the application against it, then delete
   the branch. The hosted build runs `prisma migrate deploy` on every push to
   `main`, so this step must happen before the merge, not after.
