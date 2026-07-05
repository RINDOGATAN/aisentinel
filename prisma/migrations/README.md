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

A database created before migrations existed (any pre-1.0.0 install, and the
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
