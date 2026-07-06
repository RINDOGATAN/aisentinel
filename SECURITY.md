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

Only the latest release on `main` (currently `1.0.x`) is supported. There are
no maintained release branches; self-hosters should track `main` or a tagged
state they have reviewed themselves.

## Two postures, one codebase

The same code runs the hosted instance and the sovereign self-host bundle.
Two consequences matter for security:

- The local credentials provider is passwordless and works in sovereign
  production builds when `NEXT_PUBLIC_LOCAL_AUTH_ENABLED=true`. Never expose
  such an instance to the public internet. See the hardening section of
  [`deploy/sovereign/README.md`](deploy/sovereign/README.md).
- This is AGPL-3.0-or-later software. Network operators must offer
  Corresponding Source (AGPL §13); the app footer carries a source link,
  configurable via the brand config for white-label deployments.

## Known gaps in this build

Disclosed honestly in `docs/security.md`: no application-level rate limiting
and no Content-Security-Policy yet. Treat both as open items, not settled
protections.
