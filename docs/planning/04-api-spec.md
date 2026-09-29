# 04 · API Specification

NestJS, base path `/v1`. JSON only. Zod contracts live in `packages/contracts` and are imported by api, web and admin — one definition, three consumers.

## 1. Conventions

| Topic | Rule |
|---|---|
| Namespaces | `/v1/public/*` (anonymous, published data only) · `/v1/admin/*` (authenticated, RBAC) · `/v1/guest/*` (guest token, Movement II) · `/v1/webhooks/*` (signed, providers) |
| Auth (admin) | `access_token` (JWT, 15 min) + `refresh_token` (opaque, 30 days, rotating) in `httpOnly; Secure; SameSite=Lax` cookies scoped to the api domain. CSRF: double-submit token header `X-CSRF-Token` on mutations |
| Pagination | Cursor: `?cursor=…&limit=25` → `{ data: [], nextCursor }` |
| Filtering / sort | `?q=`, `?status=`, `?sort=-createdAt` |
| Errors | RFC 9457 problem+json: `{ type, title, status, detail, code, errors?: [{path, message}] }`. `code` is a stable string (`VALIDATION_FAILED`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT_VERSION`, `INVENTORY_UNAVAILABLE`, `RATE_LIMITED`) |
| Concurrency | Mutable admin resources return `version`; updates send `If-Match: <version>` → `409 CONFLICT_VERSION` if stale |
| Idempotency | `Idempotency-Key` header required on public POSTs that create records and on all payment operations; stored 24 h in Redis |
| Caching (public) | `Cache-Control: public, s-maxage=60, stale-while-revalidate=600` + `ETag`; invalidated on publish |
| Rate limits | Public forms: 5/min/IP and 20/day/phone. Login: 5/15 min/IP+email |
| Localization | `?locale=en` (default from settings); localized fields resolved server-side for public, returned raw (all locales) for admin |
| Money | `{ amountMinor: "450000", currency: "UGX" }` — `amountMinor` serialized as string (bigint-safe) |

## 2. Public endpoints — Movement I

| Method | Path | Returns |
|---|---|---|
| GET | `/public/site` | Settings subset (name, tagline, contact, social, currencies, feature flags, SEO defaults), navigation menus |
| GET | `/public/pages/:slug` | Published page version: `{ slug, kind, title, seo, blocks: ResolvedBlock[] }` — blocks are **resolved** (referenced rooms/facilities/media expanded) so web renders in one request |
| GET | `/public/pages` | Slugs + updatedAt (sitemap) |
| GET | `/public/room-types` | Published room types (card shape) |
| GET | `/public/room-types/:slug` | Full room type with amenities, gallery, from-price, related |
| GET | `/public/facilities` | Available + coming-soon facilities |
| GET | `/public/destinations` · `/:slug` | Destination list / detail with route stops |
| GET | `/public/progress` | Published progress updates (cursor) |
| GET | `/public/faqs?group=` | FAQ group |
| GET | `/public/redirects` | Redirect map (consumed by web middleware, cached) |
| POST | `/public/enquiries` | Body `{ name, phone?, email?, intent, message, dates?, adults?, roomTypeSlug?, pagePath, consent, turnstileToken }` → `201 { reference }`. Creates Contact + Conversation + Message; emits `enquiry.created` |
| POST | `/public/waitlist` | `{ name, phone, email?, roomTypeSlug?, preferredFrom?, preferredTo?, flexibleDates, adults, children, note?, consent, turnstileToken }` → `201 { reference }` |
| POST | `/public/whatsapp-intent` | Logs a click-to-chat intent `{ pagePath, roomTypeSlug?, dates? }` → `{ waUrl, ref }` — the wa.me link with a prefilled message carrying the ref so the inbox can match it |
| GET | `/public/media/:id/:variant` | 302 to CDN variant (fallback path; normally the loader hits storage directly) |

Bot protection: Cloudflare Turnstile (free, privacy-friendly) + honeypot field + rate limits. Validation errors return field-level messages the form shows inline.

## 3. Admin endpoints — Movement I

### Auth & users
| Method | Path | Role |
|---|---|---|
| POST | `/admin/auth/login` · `/refresh` · `/logout` | — |
| POST | `/admin/auth/forgot` · `/reset` | — |
| GET | `/admin/auth/me` | any |
| GET/POST | `/admin/users` · PATCH/DELETE `/admin/users/:id` | OWNER |
| POST | `/admin/users/invite` · `/admin/invitations/:token/accept` | OWNER |

### Content
| Method | Path | Role |
|---|---|---|
| GET/POST | `/admin/pages` | MANAGER+ |
| GET/PATCH/DELETE | `/admin/pages/:id` (PATCH updates draft blocks/seo) | MANAGER+ |
| POST | `/admin/pages/:id/publish` `{ publishAt? }` · `/unpublish` · `/versions/:v/restore` | MANAGER+ |
| GET | `/admin/pages/:id/versions` | MANAGER+ |
| POST | `/admin/preview-token` `{ entityType, id }` → short-lived signed token | MANAGER+ |
| CRUD | `/admin/room-types`, `/admin/amenities`, `/admin/facilities`, `/admin/destinations`, `/admin/progress`, `/admin/faq-groups`, `/admin/faq-items`, `/admin/testimonials`, `/admin/redirects` | MANAGER+ |
| PUT | `/admin/navigation/:menuKey` (whole tree) | MANAGER+ |
| POST | `/admin/{entity}/reorder` `{ ids[] }` | MANAGER+ |
| GET/PATCH | `/admin/settings` (grouped) | OWNER (all), MANAGER (non-sensitive groups) |

### Media
| Method | Path | Notes |
|---|---|---|
| POST | `/admin/media/uploads` | Returns presigned PUT URL + asset id (direct to storage) |
| POST | `/admin/media/:id/complete` | Triggers processing job |
| GET | `/admin/media?folder=&q=&kind=&tag=` | Library |
| PATCH/DELETE | `/admin/media/:id` | alt, caption, focal point, tags, isRendering; delete blocked if referenced (returns usages) |
| GET | `/admin/media/:id/usages` | Where this image is used |

### Inbox & waitlist
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/conversations?status=&channel=&assignee=me` | Unified inbox |
| GET | `/admin/conversations/:id` | Thread + contact + context |
| POST | `/admin/conversations/:id/messages` | Staff reply (email/WhatsApp when channel supports it) or internal NOTE |
| PATCH | `/admin/conversations/:id` | status, assignee, intent |
| POST | `/admin/conversations` | Log a WhatsApp/phone conversation manually |
| GET/PATCH | `/admin/waitlist` · `/admin/waitlist/:id` | List for the owner; status, priority, notes |
| GET | `/admin/waitlist/export.csv` | OWNER/MANAGER |

### Dashboard & audit
| GET | `/admin/dashboard` | Counts: new enquiries, waitlist by room type, content drafts, recent activity |
| GET | `/admin/audit?entityType=&entityId=&actor=` | OWNER, MANAGER |

## 4. Movement II additions (outline)

| Area | Endpoints |
|---|---|
| Availability (public) | `GET /public/availability?from&to&adults&children&currency` → room types with bookable rate plans, total incl. tax |
| Checkout | `POST /public/checkout/holds` → hold (15 min) · `POST /public/checkout/reservations` → HELD reservation + PaymentIntent → Pesapal redirect URL |
| Webhooks | `POST /webhooks/pesapal` (IPN) → verify via Pesapal GetTransactionStatus, dedupe on `providerEventId`, post folio line, confirm reservation, emit `payment.succeeded` · `POST /webhooks/whatsapp` (Cloud API, signature verified) |
| Guest corridor | `POST /guest/lookup {code, phone}` → OTP via SMS/WhatsApp → token · `GET /guest/stay` · `POST /guest/stay/add-night` · `POST /guest/requests` |
| Admin | `/admin/rate-plans`, `/admin/rates` (bulk grid PUT), `/admin/inventory` (calendar grid), `/admin/packages`, `/admin/extras`, `/admin/reservations` (+ `/amend`, `/cancel`, `/payments`, `/folio`), `/admin/templates`, `/admin/jobs`, `/admin/vault`, `/admin/owner/brief` |

Movement III/IV endpoints are designed when those phases start; the data model already fixes their nouns.

## 5. Events (internal)

| Event | Subscribers |
|---|---|
| `content.published {tags[]}` | cache bust, web revalidation, audit |
| `enquiry.created` | ack to guest (email/SMS if given), notify staff (email + optional WhatsApp to manager), dashboard counter |
| `waitlist.created` | ack to guest, owner digest |
| `media.uploaded` | image processing job |
| `reservation.*`, `payment.*` (II) | confirmations, inventory, owner brief, audit |

## 6. Web ↔ API contract for revalidation

`POST {WEB_URL}/api/revalidate` with body `{ tags: string[], ts }` and header `X-Signature: hex(HMAC-SHA256(REVALIDATE_SECRET, body))`. Web rejects > 60 s old timestamps. Tag scheme: `site`, `nav`, `page:{slug}`, `room-types`, `room-type:{slug}`, `facilities`, `destinations`, `destination:{slug}`, `progress`, `faq:{group}`, `redirects`.
