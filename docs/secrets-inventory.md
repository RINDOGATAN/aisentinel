# Secrets and configuration inventory

Every environment variable AI SENTINEL reads, where it is set, what it unlocks, and who
rotates it. **Names only: no value belongs in this file or anywhere else in the
repository.**

Compiled 14 September 2026 by cross-checking every `process.env` read under `src/`,
`scripts/`, `prisma/` and `next.config.ts`, the dynamic reads in
`src/lib/rate-limit.ts` and `src/server/services/ai/llm-door.ts`, the Prisma datasource,
both `.env.example` files, `deploy/sovereign/docker-compose.yml`,
`deploy/sovereign/Dockerfile` and `.github/workflows/`. When you add a read, add a row.

**Where it lives.**
*Hosted* = the hosted project's environment variables on the platform.
*Kit* = the self-hosted install's `.env` (`deploy/sovereign/.env`, or the suite kit's `.env`),
passed through `docker-compose.yml`.
*Build arg* = baked into the published image by `deploy/sovereign/Dockerfile`; a runtime
value does not change the client bundle.
*CI* = GitHub Actions.
*Local* = a developer's `.env.local` / `.env.development.local` only.

**Who rotates.** *Hosted operator* = whoever administers the hosted project for TODO.LAW.
*Install operator* = the customer's administrator of a self-hosted install.
*Issuer* = the party that issued the credential (a sibling app, a provider).

**Last rotation.** Not recorded anywhere in this repository for any secret. Every cell
reads "unknown" until the operator starts a rotation log; that gap is itself an open item.

**Kind.** *S* = secret (grants access or signs). *P* = sensitive but not a credential
(identifies a person or a private endpoint). *C* = plain configuration.

| Variable | Kind | Where it lives | What it unlocks | Who rotates | Last rotation |
|---|---|---|---|---|---|
| `ais_DATABASE_URL` | S | Hosted (platform database integration); Kit (built from `POSTGRES_PASSWORD`); CI uses a dummy value; Build arg uses a dummy value | Full read and write access to every tenant's data | Hosted operator (database provider console); install operator | unknown |
| `POSTGRES_PASSWORD` | S | Kit | The bundled PostgreSQL superuser for the install | Install operator | unknown |
| `NEXTAUTH_SECRET` | S | Hosted; Kit | Signs and encrypts session tokens; whoever holds it can mint a session for any user | Hosted operator; install operator (rotation signs everyone out) | unknown |
| `NEXTAUTH_URL` | C | Hosted; Kit (from `PUBLIC_URL`) | Callback and link base URL; decides `__Secure-` cookie prefix | n/a | n/a |
| `PUBLIC_URL` | C | Kit | Sets `NEXTAUTH_URL` for the install | n/a | n/a |
| `AUTH_COOKIE_DOMAIN` | C | Hosted; Kit (empty by default) | Widens the session cookie to a parent domain for suite sign-on | n/a | n/a |
| `CROSS_LOGIN_ENABLED` | C | Hosted | Registers the cross-app sign-on provider | n/a | n/a |
| `CROSS_LOGIN_GOOGLE_CLIENT_IDS` | C | Hosted | Google client ids whose access tokens cross-login accepts; unset or empty refuses every Google token | Hosted operator | n/a |
| `CROSS_LOGIN_SECRET` | S | Hosted (shared with the sibling apps) | Verifies cross-app sign-on tokens; whoever holds it can sign a user in | Hosted operator, in step with the sibling apps | unknown |
| `GOOGLE_CLIENT_ID` | C | Hosted; Kit (off by default) | Identifies the OAuth client | n/a | n/a |
| `GOOGLE_CLIENT_SECRET` | S | Hosted; Kit (off by default) | Google sign-in for the OAuth client | Hosted operator (provider console) | unknown |
| `RESEND_API_KEY` | S | Hosted; Kit (optional) | Sends email as the configured sender: magic links and billing mail | Hosted operator (provider console) | unknown |
| `EMAIL_FROM` | C | Hosted; Kit | Sender address | n/a | n/a |
| `DISABLE_DEV_AUTH` | C | Local | Turns off the development credentials provider | n/a | n/a |
| `ADMIN_EMAILS` | P | Hosted; Kit | Grants platform-admin procedures to the listed addresses (`src/server/trpc.ts`) | Hosted operator; install operator (edit the list) | n/a |
| `STRIPE_SECRET_KEY` | S | Hosted (Stripe off today); Kit (empty) | Creates charges, customers and portal sessions on the Stripe account | Hosted operator (provider console) | unknown |
| `STRIPE_WEBHOOK_SECRET` | S | Hosted; Kit (empty) | Verifies Stripe webhook signatures; whoever holds it can forge a payment event | Hosted operator | unknown |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | C | Hosted | Public Stripe key, shipped to browsers by design | n/a | n/a |
| `STRIPE_PRICE_ID`, `STRIPE_PRICE_ID_USD`, `STRIPE_PRICE_CONFORMITY`, `STRIPE_PRICE_BIAS`, `STRIPE_PRICE_SHADOW`, `STRIPE_PRICE_VENDOR_CATALOG`, `STRIPE_PRICE_IMPACT_ASSESSMENT`, `STRIPE_PRICE_PROGRAM_REPORT` | C | Hosted; seed runs | Price identifiers attached to skill packages | n/a | n/a |
| `CRON_SECRET` | S | Hosted | Bearer token for `/api/cron/sync-catalog` | Hosted operator | unknown |
| `VENDORWATCH_CATALOG_API_KEY` | S | Hosted; Kit (optional); operator shell for `db:sync-vendor-catalog` | Outbound pull of the vendor.watch catalogue | Issuer (vendor.watch operator), then updated here | unknown |
| `VENDORWATCH_CATALOG_API_URL` | C | Hosted; Kit (optional) | Catalogue endpoint | n/a | n/a |
| `VW_IMPORT_API_KEYS` | S | Hosted; Kit (optional) | Inbound pushes to `/api/import/*` from vendor.watch and DPO Central: create AI systems and vendors in an organisation | Hosted operator and install operator, in step with the sending app | unknown |
| `SKILL_SIGNING_PUBLIC_KEY` | C | Hosted; Kit | Public key that verifies offline skill licences. Public, but replacing it lets a forged licence verify, so treat changes as sensitive | Storefront key owner; only on a storefront key change | n/a |
| `AISENTINEL_INSTANCE_ID` | C | Kit (optional) | Stable instance identity for licence activation limits | n/a | n/a |
| `LLM_GATEWAY_URL`, `LLM_MODEL_ALIAS` (and the `_LOCAL`, `_EU`, `_US` variants) | C | Hosted; Kit (optional) | Which AI engine drafting calls go to | n/a | n/a |
| `LLM_GATEWAY_KEY` (and the `_LOCAL`, `_EU`, `_US` variants) | S | Hosted; Kit (optional) | Spend on the configured AI gateway | Issuer (gateway operator) | unknown |
| `OPENAI_API_KEY` | S | Hosted; Kit (optional) | Spend on the OpenAI account when no gateway is set | Issuer (provider console) | unknown |
| `ANTHROPIC_API_KEY` | S | Hosted; Kit (optional) | Spend on the Anthropic account when no gateway or OpenAI key is set | Issuer (provider console) | unknown |
| `BACKUP_PASSPHRASE` | S | Kit | Decrypts every backup taken by `deploy/sovereign/backup.sh`; losing it loses the backups | Install operator (rotation needs a fresh backup) | unknown |
| `BACKUP_RCLONE_REMOTE` | P | Kit (optional) | Off-host destination for encrypted backups | n/a | n/a |
| `TLS_DOMAIN`, `BIND_ADDR`, `PORT` | C | Kit | Proxy hostname, listen address and port | n/a | n/a |
| `GITHUB_TOKEN` | S | CI (issued per run by GitHub) | Pushes images to `ghcr.io/rindogatan` in `publish-image.yml` | GitHub, automatically per run | per run |
| `RATE_LIMIT_SIGNIN`, `RATE_LIMIT_MAGIC_LINK`, `RATE_LIMIT_HEALTH`, `RATE_LIMIT_IMPORT`, `RATE_LIMIT_DISABLED` | C | Hosted; Kit (optional) | Rate-limit windows, or none | n/a | n/a |
| `NEXT_PUBLIC_LOCAL_AUTH_ENABLED` | C | Build arg (`true` in images); Kit (runtime copy); must be unset on Hosted | Passwordless local sign-in, which creates an account for any email | n/a | n/a |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`, `NEXT_PUBLIC_EMAIL_AUTH_ENABLED` | C | Build arg; Hosted; Kit | Which sign-in buttons show | n/a | n/a |
| `NEXT_PUBLIC_STRIPE_ENABLED`, `NEXT_PUBLIC_ALL_SKILLS_FREE`, `NEXT_PUBLIC_SELF_SERVICE_UPGRADE` | C | Build arg; Hosted | Billing posture and the entitlement bypass (`src/config/features.ts`) | n/a | n/a |
| `NEXT_PUBLIC_AI_ASSIST_ENABLED` | C | Hosted; Build arg | Shows embedded AI drafting | n/a | n/a |
| `NEXT_PUBLIC_MARKETPLACE_URL`, `NEXT_PUBLIC_DPO_CENTRAL_URL` | C | Hosted; Build arg; Kit | Links to the storefront and the sibling app | n/a | n/a |
| `NEXT_PUBLIC_BRAND_*`, `NEXT_PUBLIC_COLOR_*`, `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_COMPANY_WEBSITE`, `NEXT_PUBLIC_TERMS_URL`, `NEXT_PUBLIC_PRIVACY_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SECURITY_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_LOGO_PATH`, `NEXT_PUBLIC_FAVICON_PATH` | C | Hosted; Build arg; Kit | Branding (`src/config/brand.ts`) | n/a | n/a |
| `NEXT_PUBLIC_SOURCE_URL`, `NEXT_PUBLIC_SOURCE_PUBLIC`, `NEXT_PUBLIC_LICENSE_URL`, `NEXT_PUBLIC_COMMIT_SHA` | C | Hosted; Build arg | AGPL source offer on `/licenses` | n/a | n/a |
| `NEXT_PUBLIC_EXPERT_DIRECTORY_ENABLED` | C | Build arg only (no longer read by the app) | Nothing; a leftover of the removed directory | n/a | n/a |
| `VERCEL`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA` | C | Hosted (set by the platform) | Detects the hosted instance: the hosted pilot and its caps (`src/config/pilot.ts`), premium showcase, cross-login default, the runtime refusal of local sign-in, the export integrity stamp | Platform | n/a |
| `NEXT_PUBLIC_HOSTED_PILOT` | C | Hosted or Kit (optional override) | Forces the hosted pilot on (`true`) or off (`false`); unset, the pilot follows the platform signals above and the cookie domain | n/a | n/a |
| `NODE_ENV` | C | Set by the runtime and the Dockerfile | Development providers and logging | n/a | n/a |
| `ENABLE_PREVIEW_ROUTES` | C | Local | Exposes the `/preview/*` pages | n/a | n/a |
| `NEXT_OUTPUT_STANDALONE` | C | Build arg | Standalone output for the image | n/a | n/a |
| `DEMO_SEED` | C | Operator shell for seed runs | Seeds the demo organisation and users | n/a | n/a |
| `OUT`, `VITEST` | C | Operator shell; test runner | Output path for `scripts/signoff/extract.ts`; test detection in `prisma/seed.ts` | n/a | n/a |

## Open items found while compiling

- No rotation dates are recorded for any secret, on either posture.
- `deploy/sovereign/docker-compose.yml` passes `NEXT_PUBLIC_ALL_SKILLS_FREE` to the runtime
  with a default of `false`, while the image bakes `true`. The client bundle follows the
  build value; server-rendered checks read the runtime value. Worth aligning the default.
- `deploy/sovereign/.env.example` still carries `NEXT_PUBLIC_ALL_SKILLS_FREE=false`
  (noted as stale in the project notes); a runtime value there does not change the bundle.
- Neither `.env.example` lists the AI engine variables, `CROSS_LOGIN_*`, `CRON_SECRET` (kit),
  `RATE_LIMIT_*` or `NEXT_PUBLIC_AI_ASSIST_ENABLED`; this table is the complete list.
