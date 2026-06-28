# Security Policy

## Supported versions

Tyravel publishes security fixes for the **latest minor** on each supported major line.

| Version | Supported |
|---------|-----------|
| `1.x` (latest minor) | Yes — security patches |
| `0.16.x` | No — upgrade to `1.x` |
| `0.15.x` and older | No — upgrade to `1.x` |

See [STABILITY.md](STABILITY.md) for the long-term support (LTS) window on the `1.x` line.

## Reporting a vulnerability

**Do not** open public GitHub issues for security vulnerabilities.

1. Email **security@tyravel.dev** (or, if unavailable, open a private [GitHub security advisory](https://github.com/thesimonharms/tyravel/security/advisories/new) on this repository).
2. Include:
   - Affected package(s) and version(s)
   - Steps to reproduce or a minimal proof of concept
   - Impact assessment (data exposure, RCE, auth bypass, etc.)
   - Suggested fix if you have one
3. You should receive an acknowledgement within **5 business days**.

## Disclosure timeline

| Milestone | Target |
|-----------|--------|
| Initial acknowledgement | 5 business days |
| Severity assessment & triage | 10 business days |
| Fix or mitigation plan | 30 days for high/critical; 90 days for medium/low |
| Coordinated release | After fix is ready; credit offered unless you prefer anonymity |

We may request an extension for complex issues. We will keep you informed of progress.

## Scope

In scope:

- `@tyravel/*` packages published to npm from this monorepo
- Official CLI (`tyravel`) and documented stable APIs in [STABILITY.md](STABILITY.md)
- Example applications under `examples/` when the flaw is in framework code they exercise

Out of scope:

- Applications built with Tyravel (report to the app maintainer first)
- Optional third-party drivers (`pg`, `mysql2`, `redis`, AWS SDK) — report upstream
- Experimental APIs marked in [STABILITY.md](STABILITY.md) unless the flaw also affects stable surfaces
- Denial-of-service from intentionally unbounded user input without a framework defect

## Safe harbor

We support good-faith security research. Do not access data that is not yours, degrade production services, or violate applicable law. We will not pursue legal action for research that follows this policy.

## Security hardening guides

Framework feature documentation covers secure defaults:

- [Authentication](docs/guide/auth.md) — CSRF, session hardening, token abilities
- [Post-quantum crypto](docs/guide/crypto.md) — session encryption, signed OAuth tokens
- [API stability](docs/guide/api-stability.md) — supported public surfaces

## PGP (optional)

Contact us for a PGP key if you need encrypted communication. Include your own key in the initial report if you require encrypted replies.