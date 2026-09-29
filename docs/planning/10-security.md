# 10 · Security, Roles & Audit

## 1. Roles (spec "Who may touch what", made enforceable)

| Permission | OWNER | MANAGER | DESK | HOUSEKEEPING | GUEST |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard / Today | ✓ | ✓ | ✓ (desk view) | — | — |
| Website content (pages, rooms, destination, progress, FAQs, nav, redirects) | ✓ | ✓ | — | — | — |
| Media library | ✓ | ✓ | upload only | — | — |
| Inbox & waitlist | ✓ | ✓ | ✓ | — | — |
| Settings: hotel, contact, SEO | ✓ | ✓ | — | — | — |
| Settings: features, currencies | ✓ | — | — | — | — |
| Users & roles | ✓ | — | — | — | — |
| Integrations vault (bank/Pesapal keys, WA token) | ✓ | — | — | — | — |
| Audit log | ✓ | ✓ | — | — | — |
| Rate plans & rates (II) | ✓ | ✓ | read | — | — |
| Reservations (II) | ✓ | ✓ | ✓ | — | own (lookup) |
| Payments & refunds (II) | ✓ | ✓ (no refunds > setting limit) | take payment | — | pay own |
| Owner brief & money view | ✓ | ✓ | — | — | — |
| Desk: arrivals, walk-in, folio, notes (IV) | ✓ | ✓ | ✓ | — | — |
| Room status (IV) | ✓ | ✓ | ✓ | ✓ | — |
| Guest profiles (IV) | ✓ | ✓ | ✓ | name + room only | — |

Implemented as **permissions** (`content:write`, `settings:features`, `vault:manage`, `payments:refund`…) mapped to roles in `packages/contracts/permissions.ts`; the API guard checks permissions, the admin hides what the role can't use. The API is the wall; the UI is a courtesy.

## 2. Authentication

- Passwords: argon2id (m=64 MB, t=3, p=1), min 12 chars, checked against a breached-password list (k-anonymity or offline top-100k).
- Sessions: 15-min JWT access (EdDSA), 30-day rotating opaque refresh tokens stored hashed; reuse detection revokes the family.
- Cookies: `httpOnly; Secure; SameSite=Lax`; CSRF double-submit on mutations.
- MFA: TOTP, required for OWNER once vault is enabled (Phase 2), optional before.
- Lockout: 5 failures → 15 min per account+IP; generic error messages.
- Guest access (II): code + phone → one-time code via SMS/WhatsApp → 2-hour scoped token.

## 3. Data protection (Uganda Data Protection and Privacy Act, 2019)

- Collect minimum: forms ask only what the spec lists; consent checkbox with link to privacy page on every form.
- Purpose and retention stated in the privacy page; enquiries/waitlist of non-converted contacts auto-anonymised after 24 months (job, configurable).
- ID document numbers (IV) encrypted at column level; never in logs.
- Data subject requests: export and erase a contact from the admin (OWNER).
- Logs: pino redaction of `password`, `token`, `phone`, `email`, `authorization`, `cookie`.

## 4. Secrets

- `.env` for local only; staging/production secrets from the host's secret store, validated at boot (zod config schema — the app refuses to start with missing/weak secrets).
- Provider credentials entered through the vault UI are AES-256-GCM encrypted with a key from env (`VAULT_KEY`), never returned by the API.
- Nothing secret in `apps/web` or `apps/admin` bundles: only `NEXT_PUBLIC_API_URL`, Turnstile site key.

## 5. Web hardening

- Strict CSP with nonces (web allows map tiles, Turnstile, analytics host, tour providers in III; admin allows only api + storage).
- HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal, `frame-ancestors 'none'` (admin) / `'self'` (web).
- Uploads: MIME sniffing, size limits (images 25 MB, docs 10 MB), images re-encoded (strips payloads/EXIF), SVG uploads sanitised or rejected.
- Rich text: stored as ProseMirror JSON and rendered through an allow-list — no raw HTML path.
- Webhooks: signature/verification per provider, idempotency on provider event IDs, replay window.
- Dependency scanning (Renovate + `pnpm audit` in CI); container images scanned.

## 6. Audit

Every `/v1/admin` mutation is wrapped by an `AuditInterceptor`: actor, action, entity, before/after (redacted), IP, UA — written in the same transaction. Append-only (DB role lacks UPDATE/DELETE on `AuditLog`). Money-related events (II) additionally keep the provider payload in `PaymentEvent`.

## 7. Backups & recovery

Nightly `pg_dump` + WAL archiving (point-in-time recovery, 14 days), off-site copy; object storage versioning; quarterly restore drill. RPO ≤ 15 min, RTO ≤ 4 h for Movement I–II.
