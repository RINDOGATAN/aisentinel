# Releasing AI SENTINEL

How a tagged release reaches the two lanes, and what has to be done by hand.

`main` is always releasable. The hosted instance deploys from it automatically and is
the daily canary; self-hosters only move when a semver tag is pushed.

Nothing here needs a specific machine — any checkout with `gh`, the Vercel CLI
and repository push rights can run it.

---

## The two lanes

| | Hosted (`aisentinel.todo.law`) | Self-hosted (the suite kit) |
|---|---|---|
| Ships on | every push to `main` | a `vX.Y.Z` tag |
| Code | Vercel builds from source | `ghcr.io/rindogatan/aisentinel` |
| Schema | `prisma migrate deploy` in the build | migrator image, every boot |
| Regulatory content | **manual — see below** | migrator image, every boot |

The asymmetry in the last row is the thing most easily forgotten. The content
seeds (frameworks, California ADMT, cross-framework mappings, templates,
Shadow-AI tools, vendor catalog) run automatically for self-hosters because
`deploy/sovereign/migrate.sh` runs them on every migrator boot. **Hosted has no
equivalent**: its build runs migrations only. A release that changes seeded
content is not finished on hosted until the seeds are run against its database.

---

## 1. Pre-tag gates

Run all of these from a clean checkout of the commit you intend to tag:

```bash
npm run lint
npm run lint:security      # required CI gate (org-isolation linter)
npx tsc --noEmit
npm run test
npm run build
npm run test -- license-crypto   # Ed25519 golden parity — see below
```

`npm run build` starts with `prisma migrate deploy`, so it needs a reachable
database. On a machine without one, build the way CI and the Dockerfile do —
no database is contacted:

```bash
ais_DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public" \
  npx prisma generate && npx next build
```

If `tsc` or the tests fail on a checkout that CI reports green, suspect a
stale generated Prisma client (`npx prisma generate`) or stale `.next` route
types left behind by a deleted page (`rm -rf .next`), not the working tree.

The parity test is not optional. The licence canonical bytes are a cross-app
contract with the storefront and both sibling apps; a tag that breaks parity
breaks paid activation everywhere at once, and self-hosters pull `:latest`
automatically.

Also confirm the most recent `suite-integration.yml` run in the `todolaw-suite`
repository is green — it boots all three suite apps together. A red run means
stop tagging until it is fixed.

```bash
gh run list --repo RINDOGATAN/todolaw-suite \
  --workflow suite-integration.yml --limit 3 \
  --json status,conclusion,createdAt
```

Finally, make sure CI is green on the exact commit being tagged:

```bash
gh run list --branch main --limit 3 --json headSha,status,conclusion
```

## 2. Tag and push

```bash
git tag -a vX.Y.Z -F -   # annotated; write what changed and why
git push origin vX.Y.Z
```

`publish-image.yml` triggers on `v*.*.*`. It builds `linux/amd64` and
`linux/arm64` natively, then merges them into one manifest published as **both**
`:vX.Y.Z` and `:latest`, for `aisentinel` and `aisentinel-migrator` alike.

Move the matching `[Unreleased]` block in `CHANGELOG.md` under a version heading
in the same commit that precedes the tag, so the tag and the changelog agree.

## 3. Verify what was published

`:latest` is what the kit pulls on `./suite.sh update`, so confirm it actually
points at this release rather than assuming:

```bash
for img in aisentinel aisentinel-migrator; do
  for ref in vX.Y.Z latest; do
    docker buildx imagetools inspect "ghcr.io/rindogatan/$img:$ref" \
      | awk -v t="$img:$ref" '/^Digest:/{print t, $2; exit}'
  done
done
```

The two digests per image must match. Also check each manifest lists both
`linux/amd64` and `linux/arm64`.

## 4. Hosted: run the content seeds

Only needed when the release changes seeded content — framework requirements,
applicability tags, cross-framework mappings, templates or catalogs. Run the
whole block, not only the seeds the release touched: it is the same list
`migrate.sh` runs for self-hosters on every boot, and running part of it is how
hosted drifted (on 2026-09-11 it had 67 Shadow AI tools against 89 fresh, and
vendor data older than the committed snapshot, because this block used to stop
at the cross-framework mappings).

The Prisma datasource reads `ais_DATABASE_URL` (a Vercel-scoped name, not
`DATABASE_URL`). Pull production values into a **scratch file**, never over
`.env.local`:

```bash
npx vercel env pull /tmp/prod.env --environment=production --yes
export ais_DATABASE_URL="$(grep '^ais_POSTGRES_URL_NON_POOLING=' /tmp/prod.env \
  | cut -d= -f2- | tr -d '"')"

npm run db:reconcile-requirements -- --dry-run   # read-only: what the next step will move
npm run db:seed-frameworks
npm run db:seed-admt
npm run db:seed-regimes
npm run db:seed-cross-mappings -- --strict
npm run db:seed-templates
npm run db:seed-shadow-ai-tools
npm run db:seed-vendor-catalog -- --prune

rm -f /tmp/prod.env          # it holds every production secret
```

`db:seed-frameworks` ends with a `[reconcile]` block: it moves organisations'
compliance links off requirement codes that were retired or re-used (listed in
`src/config/requirement-supersessions.ts`) and deletes the retired rows. Read
what it prints. On a database that is already reconciled it prints `superseded
requirement codes: nothing to do.` Any line ending `left in place for review`
names a link it could not safely move; it is also recorded in that
organisation's audit log.

Notes that have cost time before:

- **Use the non-pooling URL.** The pooled endpoint goes through pgbouncer, which
  does not play well with the seeds' prepared statements.
- **Pull fresh every time.** A previously pulled `.env.local` goes stale when the
  database password rotates, and the failure looks like a permissions problem.
- **Never overwrite `.env.local`** with production values on a development box:
  it points local dev at the production database and breaks dev sign-in. See
  `.env.development.local`.
- **`--strict` matters.** Without it an unresolved cross-mapping target is a
  warning and the script still exits 0, silently dropping the mapping.
- The seeds are idempotent upserts against catalog tables. The destructive
  operations are the requirement reconciliation at the end of
  `db:seed-frameworks` (moves links, then deletes retired rows; one
  transaction), the cross-mapping reconciliation (which prunes rows the config
  no longer asserts, and refuses to run if anything was skipped) and
  `db:seed-vendor-catalog -- --prune` (which keeps any row an organisation's
  vendor links to).

Then verify, and check `/api/health` reports the expected commit:

```bash
curl -s https://aisentinel.todo.law/api/health
```

Expected framework counts after a full content seed: EU AI Act 83, NIST AI RMF
23, ISO 42001 33, California CCPA ADMT 92, EU GDPR 26, Colorado SB 26-189 10,
Texas TRAIGA 11, Washington 16 — 294 requirements, 115 cross-framework
mappings. A fresh install and an upgraded one must report the same numbers; if
they differ, the seeds did not all run, or a code was retired without an entry
in `src/config/requirement-supersessions.ts`. The query is in section 5.

## 5. Self-hosted: confirm the upgrade path

Customers get the release on their next `./suite.sh update`. Worth confirming
against the *published* migrator rather than a local build, because the image
carries its own copy of the seed scripts and their inputs:

```bash
docker run --rm \
  -e ais_DATABASE_URL="postgresql://…/scratch_db" \
  ghcr.io/rindogatan/aisentinel-migrator:latest
```

Check these things:

1. A clean database reaches the counts above and creates **no demo data**
   (demo rows are gated behind `DEMO_SEED`, which the bundle never sets).
2. A database that already has users logs `existing users found — skipping
   first-boot bootstrap`, still refreshes regulatory content, and leaves
   accounts and organisation-owned rows untouched.
3. A third run changes nothing — the whole chain is idempotent.
4. A database created before the `0_init` baseline (apply
   `prisma/migrations/0_init/migration.sql` by hand, insert one user, no
   `_prisma_migrations` table) logs `pre-migrations install detected;
   baselining 0_init`, then applies the later migrations and the content
   refresh. Skipping this check is what let the baseline path ship broken.

5. **An upgraded database reports the same counts as a fresh one.** Restore a
   backup taken on an older release into a scratch database, run the migrator
   against it, and run the migrator against an empty scratch database. Then run
   this query on both and compare the output line by line:

   ```sql
   select 'framework ' || f.code, count(r.id) from compliance_frameworks f
     left join compliance_requirements r on r."frameworkId" = f.id group by 1
   union all select 'requirements', count(*) from compliance_requirements
   union all select 'cross_framework_mappings', count(*) from cross_framework_mappings
   union all select 'vendor_catalog', count(*) from vendor_catalog
   union all select 'assessment_templates', count(*) from ai_assessment_templates
   union all select 'shadow_ai_tools', count(*) from shadow_ai_tools
   order by 1;
   ```

   Every line must match. The only permitted difference is `vendor_catalog`,
   and only by rows the prune protects on purpose: rows an organisation's
   vendor still links to (the migrator logs `Kept N catalogue row(s)` when that
   happens) and rows marked verified. A self-hosted backup restores
   with `openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:$BACKUP_PASSPHRASE"
   -in <file>.sql.gz.enc | gunzip | psql <scratch-db-url>`, the passphrase
   being `BACKUP_PASSPHRASE` in that install's `.env`. The migrator's log shows
   what the reconciliation moved (`[reconcile] ...`); a second run must log
   `superseded requirement codes: nothing to do.` This is the check that caught
   the Art. 113 rows left behind by the Digital Omnibus change: an upgraded
   v0.3.0 install reported 84 EU AI Act requirements and 295 in total, against
   83 and 294 fresh.

Last run in full: 2026-09-07 against the published `v0.2.5` migrator (all four
checks green after the `migrate.sh` baseline fix). Check 5 was first run on
2026-09-11 against a local build of the migrator, with a real v0.3.0 backup.

---

## Hard rules

- **Prisma migrations are append-only, forever.** Self-hosters jump from any
  version straight to the latest and replay the whole history blind.
- **Cross-app contracts are sacred**: the Ed25519 licence canonical bytes, and
  the DPO Central to AI Sentinel bridge, where this app is the receiver.
- **Hosted and self-host divergence lives in environment flags only** — never in
  branches. `NEXT_PUBLIC_*` values are baked at build time, so changing one for
  self-hosters means rebuilding with a different `--build-arg`.
- **This repository is public.** Screen every diff before pushing. Never commit
  `.env*`, and never commit `CLAUDE.md` — it is gitignored on purpose.
