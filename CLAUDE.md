# Reberon Hotel Suite

Scope source: `docs/Reberon_Hotel_Suite_Module_Feature_Specification.docx` (22 modules, Movements I–IV + Later).
Implementation plan: `docs/planning/` — read `00-README.md` first. Spec wins on scope, planning docs win on implementation; record deviations in `docs/planning/12-decisions-log.md`.

Key rules:
- Monorepo: pnpm + Turborepo. apps/web (public Next.js), apps/admin (House, Next.js), apps/api (NestJS); packages/db (Prisma), contracts (Zod), ui (tokens), utils, config.
- Nothing guest-facing is hard-coded: content comes from the DB (block-based pages, settings, nav).
- Money = bigint minor units + currency; UGX and USD never converted silently.
- Business dates in Africa/Kampala; timestamps UTC.
- Every admin mutation is audited. The API enforces roles; the UI only hides.
- Demo seed rows carry isSeed=true and must be purgeable.
