# Security Policy

This file covers how to report vulnerabilities and which versions are
supported. For the full, code-referenced description of what this build
actually implements (authentication, multi-tenant scoping, RBAC, the honest
dev-auth caveat, the OWASP table and known gaps), see
[`docs/security.md`](docs/security.md). That document is the source of truth
for the security posture; this one is deliberately short.

## Reporting a vulnerability

Email **info@rindogatan.com** with subject `SECURITY: <short summary>`.
Include reproduction steps and your deployment mode (hosted vs.
sovereign/self-hosted).

- You will get an acknowledgement within 5 business days.
- Please practice coordinated disclosure: give us 90 days before publishing.
- There is no bug bounty program.

## Supported versions

Only the latest tagged release is supported (currently `0.5.x`, published as
`ghcr.io/rindogatan/aisentinel:vX.Y.Z` and `:latest`). The hosted instance
runs `main`, which is always ahead of or equal to the latest tag. There are no
maintained release branches: a fix ships in the next tag, not as a backport.

## Two postures, one codebase

The same code runs the hosted instance and the sovereign self-host bundle; the
differences live in environment flags only and are set out in section 11 of
[`docs/security.md`](docs/security.md). Two consequences matter most:

- The local credentials provider is passwordless and works in sovereign
  production builds when `NEXT_PUBLIC_LOCAL_AUTH_ENABLED=true`. Never expose
  such an instance to the public internet. See the hardening section of
  [`deploy/sovereign/README.md`](deploy/sovereign/README.md).
- This is AGPL-3.0-or-later software. Network operators must offer
  Corresponding Source (AGPL §13); the app footer carries a source link,
  configurable via the brand config for white-label deployments.

## Known gaps in this build

Disclosed in `docs/security.md`, and open items rather than settled
protections:

- No Content-Security-Policy yet.
- Rate limiting counts per process rather than across a fleet. On a
  self-hosted install that is exact, because there is one process. On a
  serverless deployment each warm instance keeps its own counter, so the
  effective ceiling is a multiple of the configured limit. It bounds the
  trivial loop; it is not a distributed quota. On a self-hosted install the
  limiter's address can be forged through a platform header the kit's proxy
  does not strip; see section 6 of `docs/security.md`.
- OAuth tokens are stored unencrypted in the database (the NextAuth adapter
  default).
- Passwordless local sign-in is disabled on hosted by environment checks read
  at run time, not removed from the build.
- The dependency audit runs in CI but does not yet fail the build (see
  `.github/workflows/ci.yml`).
- Self-hosted installs follow `:latest` by default, so an update is not pinned
  to a reviewed version unless the operator pins it (`docs/releasing.md`).
- Hosted has no documented backup restore rehearsal; self-host has one
  (`docs/releasing.md`).
