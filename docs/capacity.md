# Capacity: what one instance carries, and what breaks first

Written 14 September 2026 from the code in this repository. **No load test has been run
against either posture.** Every figure below is either derived from a limit written in the
code, or marked "unknown, to measure". Nothing here is a promise to a customer.

## The two postures

| | Hosted | Self-hosted (sovereign kit) |
|---|---|---|
| App | Next.js on a serverless platform: many short-lived instances, scaled by the platform | One Node.js container (`deploy/sovereign/docker-compose.yml`), one process |
| Database | Managed PostgreSQL (serverless compute) | One `postgres:16-alpine` container on the same host |
| Resource limits | Set by the platform plan; the plan is not recorded in this repository | None set in the compose file; the container takes what the host gives it |
| Per-process state | Rate-limit counters, health probe cache | The same, and exact, because there is one process |
| File storage | None. No upload is stored; evidence is text and links; exports are generated per request and streamed back | Same |

## Per-instance ceiling

| Dimension | Ceiling we can defend | Reasoning |
|---|---|---|
| Organisations | Not the limiting factor; unknown, to measure above 1,000 | Every tenant row carries `organizationId` and is read through indexed, org-scoped queries. Row counts per organisation are small (systems, assessments, policies in the tens to hundreds). Hosted carries 14 organisations today. |
| AI systems per organisation | About 500 before screens slow noticeably; unknown, to measure | The registry, assessment and vendor lists paginate (at most 50 per page). The compliance screens and the program report do not: they load every mapping of the organisation. At 294 requirements per system across eight frameworks, 100 systems is up to roughly 29,000 mapping rows in one request. Spreadsheet import is capped at 500 rows per file (`MAX_IMPORT_ROWS`). |
| Users | Not the limiting factor | Sessions are JWT (`src/lib/auth.ts`), so a signed-in request does not read a session table. Each tRPC call still reads the membership row. |
| Documents (exports) | Hosted: a program pack must stay under the platform's response body limit (4.5 MB on the current serverless functions). Self-hosted: bounded by host memory | The program pack, PDF reports and ZIP are built entirely in memory (`renderToBuffer`, `src/lib/zip.ts`) and returned in one response. The audit CSV is capped at 50,000 rows. Program snapshots are capped at 2 MB each. |
| Requests per minute, hosted | Unknown, to measure | Bounded by the database connection limit rather than by the app: each warm instance opens its own Prisma pool (default `num_cpus * 2 + 1` connections). Whether the hosted connection string uses the provider's pooled endpoint is not recorded here (see Needs checking). |
| Requests per minute, self-hosted | Unknown, to measure; ordinary page and API traffic for a single firm (tens of concurrent users) is well within one process | One Node.js event loop. Database queries are asynchronous and cheap; PDF rendering is synchronous CPU work that blocks the loop while it runs. |
| Unauthenticated routes | Fixed by configuration | `RATE_LIMIT_SIGNIN` 10/900 s, `RATE_LIMIT_MAGIC_LINK` 5/3600 s, `RATE_LIMIT_HEALTH` 60/60 s, `RATE_LIMIT_IMPORT` 120/60 s, per process. On hosted the effective limit is a multiple of these, one counter per warm instance. The limiter tracks at most 10,000 keys. |

## What breaks first

1. **Concurrent exports on a self-hosted install.** A program pack or a PDF report renders on
   the one event loop. While it renders, every other user of the install waits. Two or three
   large exports at once will make the whole install feel stalled. Not measured; the first
   thing to measure.
2. **Large program packs on hosted.** An organisation with many systems and assessments can
   produce a pack larger than the serverless response limit, or slower than the function's
   maximum duration. The request then fails; nothing is corrupted. The size at which this
   happens is unknown, to measure.
3. **Database connections on hosted under a burst.** Many warm instances times a per-instance
   pool can exceed the database's direct connection limit if the connection string is not
   pooled. Symptom: intermittent connection errors, and `/api/health` returning 503.
4. **Unpaginated compliance reads for a very large organisation.** Slow screens rather than
   failures, well before any hard limit.

## Hosted scaling plan

In order, each step taken only when a measurement calls for it.

1. **Measure first.** A scripted load run against a preview deployment with a copy of the
   demo organisation scaled to 100 and 500 systems: page p95, program pack size and time,
   connection count at the database.
2. **Pooling.** Use the database provider's pooled (PgBouncer) endpoint for the app and the
   direct endpoint only for `prisma migrate deploy`. Set `connection_limit` in the pooled URL
   so instances cannot exhaust the pool.
3. **Database tier.** Raise the minimum compute of the managed database once p95 query time
   under the load run, not organisation count, says so. Autosuspend should stay off for the
   production branch so the first request of the day does not pay a cold start.
4. **Exports out of the request.** Move the program pack and PDF reports to a background job
   that writes the file to object storage and returns a signed link. This removes the response
   size limit on hosted and the event-loop stall on self-hosted. It needs object storage,
   which the product does not use today; on self-hosted the natural choice is a volume on the
   same host.
5. **Replace per-process state.** The rate-limit counters are the only per-process state that
   matters. On hosted, replace them with a shared store (a managed key-value service) or with
   the platform's firewall rules in front of the app. The health probe cache can stay per
   process: it only saves database load. Self-hosted keeps the in-process counters, which are
   exact there.
6. **Paginate the compliance reads** once an organisation passes a few hundred systems.

## Self-hosted sizing guidance

Unknown, to measure. Until then, the conservative starting point for one firm is 2 vCPU and
4 GB of memory for the whole stack (app, database, optional proxy), with the database volume on
local SSD. This is a starting point chosen to leave headroom for PDF rendering, not a measured
figure.

## Needs checking

- The hosted platform plan (function memory, maximum duration, response size).
- Whether the hosted database URL is the pooled endpoint, and the database compute size.
- A first load run, as in step 1 above, to replace the "unknown" cells.
