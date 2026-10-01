# Reberon Hotel Suite

The platform for Reberon Hotel, Kapchorwa: a public website that sells the stay, and **the House**, the management platform behind it. Built by Ecadel Group Limited.

- **Scope:** [`docs/Reberon_Hotel_Suite_Module_Feature_Specification.docx`](docs/Reberon_Hotel_Suite_Module_Feature_Specification.docx) (22 modules, Movements I–IV)
- **Plan:** [`docs/planning/`](docs/planning/00-README.md) covering architecture, data model, API, design system, roadmap, security and decisions

## What is here

| App | Port | What it is |
|---|---|---|
| `apps/web` | 3000 | The public website (Next.js 16). Every word and photo comes from the database. |
| `apps/admin` | 3001 | The House (Next.js 16): page builder, rooms, Kapchorwa stories, construction progress, media, inbox, first-stay list, settings, people, audit. |
| `apps/api` | 4000 | The engine (NestJS 12, PostgreSQL, Redis, BullMQ). |

| Package | Purpose |
|---|---|
| `packages/contracts` | Zod schemas, block registry, DTOs, permissions. Browser code imports `@reberon/contracts/text` only. |
| `packages/db` | Prisma 7 schema, migrations, seed (with generated placeholder art). |
| `packages/media` | Image pipeline (sharp → webp widths, blur placeholder, dominant colour) and storage. |
| `packages/utils` | Money (minor units, UGX/USD, never converted), Kampala dates, phones, reference codes. |
| `packages/ui` | Design tokens ("Highland"): palette, type scale, light and "Night on Elgon". |

## Run it

Requires Node 22+, pnpm 10, Docker.

```bash
pnpm install
cp .env.example .env
pnpm infra:up          # Postgres :5433, Redis :6380, Mailpit :8025
pnpm db:migrate        # create the schema
pnpm db:seed           # settings, rooms, stories, pages, inbox, waitlist, ~120 images (~1 min)
pnpm dev               # web :3000 · admin :3001 · api :4000
```

Sign in to the House at <http://localhost:3001> with any seeded account. The password is `SEED_PASSWORD` from `.env`.

| Email | Role |
|---|---|
| `owner@reberonhotel.ug` | Owner (Denis Mayamba) |
| `manager@reberonhotel.ug` | Manager |
| `desk@reberonhotel.ug` | Desk |
| `housekeeping@reberonhotel.ug` | Housekeeping |

Emails (enquiry acknowledgements, staff alerts, invitations, password resets) land in Mailpit at <http://localhost:8025>.

## Everyday commands

```bash
pnpm db:seed:refresh     # rewrite demo content (isSeed rows) from the seed source; real content untouched
pnpm db:purge-demo       # remove all demo rows before launch
pnpm db:reset            # drop + migrate + seed (local only)
pnpm --filter @reberon/api test     # API integration tests (needs the API running and seeded)
pnpm build               # build everything
```

## How content goes live

A manager edits a page in the House. The draft autosaves, and the preview beside it shows the real website in draft mode. On **Publish** the API stores an immutable version, clears its cache, and tells the website to revalidate. The public site shows the change in about a second. Scheduling, version history with restore, and automatic redirects when an address changes are built in.

## Status

Everything built so far, feature by feature: [`docs/FEATURES.md`](docs/FEATURES.md).

- **Phase 0, foundation:** done.
- **Phase 1, Movement I (the Face):** done:
  - the full website
  - the House for content, inbox, first-stay list, media, settings, people and audit
- **Movement II (the Door):** built and verified, switched off (`features.bookingEnabled`) until rates and Pesapal keys are ready.
- **Movement IV (the House):** built and verified: front desk, room rack, housekeeping, guests and memory, feedback, reports. Sign in as `desk@`, `housekeeping@` or the owner to see each view.
- **Movement III (the Walk):** built, switched off (`features.toursEnabled`). Image walks for every room and the hall are seeded; a camera walk added later replaces them in place.
- **Integrations and messaging:** Pesapal, SMS, WhatsApp and SMTP keys are entered in House → Integrations (encrypted); message wording in House → Messages. Until a channel is connected, messages are kept in Sent messages for staff to send by hand.
- **People and access:** per-person permissions on top of a role, staff without a login, sign-in hours and end dates, sign out everywhere (Admin → People and access).
- **Receipts and invoices:** numbered receipt for every payment, refund notes, invoice at check-out; print A4 or 80 mm, send by email/SMS/WhatsApp, void and reissue, register with CSV, public check at `/verify`.
- **Deployment:** ready. Needs a domain and a server. See [`docs/planning/13-deployment.md`](docs/planning/13-deployment.md) for the first deploy and the go-live checklist.
- **Still to settle:** open questions for Denis and Wilson (domain, logo, real phone numbers, room mix, prices) are listed in [`docs/planning/12-decisions-log.md`](docs/planning/12-decisions-log.md). Until then the seed uses clearly marked placeholders, and every image is labelled as a drawing.
