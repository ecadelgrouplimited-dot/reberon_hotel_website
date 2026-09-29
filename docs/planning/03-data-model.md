# 03 · Data Model

PostgreSQL 16 via Prisma. Tables are grouped by module and tagged with the Movement in which they are **migrated** (created). Later-module tables are specified here so the shape is known, but are not migrated until their Movement.

## 1. Conventions

| Rule | Detail |
|---|---|
| Primary keys | `id uuid` (UUIDv7, generated in app) |
| Timestamps | `createdAt`, `updatedAt` `timestamptz` on every table; `deletedAt` where soft-deletable |
| Business dates | `date` columns (stay nights, arrival/departure) — interpreted in `Africa/Kampala` |
| Money | `amountMinor bigint` + `currency char(3)`; UGX exponent 0, USD exponent 2. Helper in `packages/utils/money` |
| Enums | Postgres enums for closed sets (statuses); lookup tables for anything a manager may extend |
| Slugs | lowercase-kebab, unique per entity type, immutable after publish (redirect table if changed) |
| Seed marker | `isSeed boolean default false` on content and demo tables — purge with one command |
| Rich text | `jsonb` Tiptap/ProseMirror documents, never raw HTML |
| Localisation-ready | Translatable text fields are `jsonb` keyed by locale: `{"en": "…"}` for Movement I. Adding a language later is data, not a migration (spec M01 "Languages: Later") |

Type shorthand below: `t` = localized text jsonb, `rt` = localized rich-text jsonb, `?` = nullable, `→` = FK.

---

## 2. Platform — M22 (Movement I)

### `User`
`id, email (unique, citext), name, phone?, passwordHash (argon2id), role Role, status (ACTIVE|INVITED|DISABLED), avatarId? → MediaAsset, lastLoginAt?, mfaSecret? (encrypted), createdAt, updatedAt, deletedAt?`

`enum Role { OWNER, MANAGER, DESK, HOUSEKEEPING }` — hard walls, see [10](10-security.md).

### `Session`
`id, userId → User, refreshTokenHash, family uuid, userAgent, ip, expiresAt, revokedAt?, createdAt` — rotating refresh tokens; reuse of a revoked token revokes the whole family.

### `Invitation`
`id, email, role, tokenHash, invitedById → User, expiresAt, acceptedAt?`

### `Setting`
`key text PK, value jsonb, group (GENERAL|CONTACT|BOOKING|NOTIFICATIONS|SEO|FEATURES), updatedById?, updatedAt`

Seeded keys (non-exhaustive): `hotel.name`, `hotel.legalName`, `hotel.tagline (t)`, `hotel.timezone = "Africa/Kampala"`, `hotel.currencies = ["UGX","USD"]`, `hotel.defaultCurrency = "UGX"`, `hotel.checkInTime = "14:00"`, `hotel.checkOutTime = "10:30"`, `contact.phones[]`, `contact.whatsapp`, `contact.email`, `contact.address (t)`, `contact.geo {lat,lng}`, `contact.hours (t)`, `social.*`, `seo.defaultTitle`, `seo.titleTemplate`, `seo.defaultDescription (t)`, `seo.defaultShareImageId`, `features.bookingEnabled=false`, `features.waitlistEnabled=true`, `features.toursEnabled=false`, `features.progressEnabled=true`, `notifications.ownerBriefTime="19:00"`.

### `MediaAsset`
`id, kind (IMAGE|VIDEO|DOCUMENT|DRAWING), storageKey, originalName, mimeType, bytes, width?, height?, durationSec?, blurhash?, dominantColor?, focalX? (0–1), focalY?, alt (t), caption? (t), credit?, takenAt?, isRendering boolean (drawing/visualisation vs real photo — spec: "Drawings until then"), variants jsonb, folderId? → MediaFolder, tags text[], uploadedById → User, isSeed, timestamps, deletedAt?`

### `MediaFolder`
`id, name, parentId?`

### `AuditLog` (Movement I — cheap to start early)
`id, actorId? → User, actorType (USER|SYSTEM|GUEST|WEBHOOK), action (e.g. "room_type.update"), entityType, entityId, before jsonb?, after jsonb?, ip?, userAgent?, createdAt` — append-only; no update/delete grants for the app role.

### `Job` visibility
BullMQ owns job state in Redis. `JobRun` table (Movement II) mirrors finished runs for the admin "Jobs" screen: `id, queue, name, status, attempts, error?, startedAt, finishedAt`.

### `IntegrationSecret` — vault (Movement II)
`id, provider (PESAPAL|WHATSAPP|SMS|SMTP), key, valueEncrypted bytea (AES-256-GCM, key from env KMS), lastRotatedAt, updatedById` — never returned by any API, only "set / last 4 / test connection".

---

## 3. Content engine — M01 (Movement I)

The website is composed from these tables. Everything dynamic.

### `Page`
`id, slug (unique; "" = home), kind (HOME|STANDARD|ABOUT|FACILITIES|CONTACT|LEGAL|DESTINATION_INDEX|ROOMS_INDEX|PROGRESS|LANDING), title (t), status (DRAFT|SCHEDULED|PUBLISHED|ARCHIVED), publishedVersionId? → PageVersion, draftBlocks jsonb, seo jsonb {title(t), description(t), shareImageId, noindex, canonical}, publishAt?, isSeed, timestamps, deletedAt?`

### `PageVersion`
`id, pageId → Page, version int, blocks jsonb, seo jsonb, publishedById → User, publishedAt` — immutable snapshots; rollback = republish an old version.

### Blocks (stored in `blocks jsonb`, validated by Zod in `packages/contracts/blocks`)
Each block: `{ id, type, variant?, hidden?, data }`. The fixed, designed set:

| Type | Data (abridged) |
|---|---|
| `hero` | eyebrow(t), heading(t), sub(t), media[] (image/video, focal), ctas[], variant: `fullbleed` \| `split` \| `mist` (animated layered parallax) |
| `story` | heading(t), body(rt), mediaId?, layout: `left`\|`right`\|`stacked` |
| `roomGrid` | heading(t), roomTypeIds[] or `all`, showFromPrice |
| `roomSpotlight` | roomTypeId, heading override |
| `facilities` | heading(t), facilityIds[] or `all` |
| `gallery` | mediaIds[], layout: `masonry`\|`carousel`\|`filmstrip` |
| `progressTimeline` | heading(t), limit, showMilestones |
| `destinationCards` | destinationIds[] |
| `journey` | heading(t), stops[] {name(t), durationMin, note(t)} — "The road" |
| `seasonStrip` | months[] {month, label(t), weather(t), rating} — "When to come" |
| `packageCards` | packageIds[] (Movement II) |
| `quote` | text(t), attribution(t), mediaId? |
| `stats` | items[] {value, label(t)} |
| `faq` | faqGroupId or items[] |
| `map` | showDirections, zoom |
| `contactCard` | uses settings; heading(t) |
| `enquiryForm` | heading(t), preset intent (STAY\|EVENT\|GENERAL) |
| `waitlistForm` | heading(t), sub(t) |
| `ctaBand` | heading(t), sub(t), ctas[], background mediaId |
| `richText` | body(rt) — legal and long-form |
| `tourEmbed` | tourId (Movement III) |
| `spacer` / `divider` | size |

A CTA: `{ label(t), action: "whatsapp"|"enquire"|"waitlist"|"book"|"link"|"call", href?, prefill? }` — `whatsapp` builds a wa.me payload with page/room context (M10).

### `NavigationMenu` / `NavigationItem`
`NavigationMenu: id, key (HEADER|FOOTER_PRIMARY|FOOTER_LEGAL|MOBILE)`
`NavigationItem: id, menuId, parentId?, label (t), target (PAGE|ROOM_TYPE|DESTINATION|URL|ANCHOR), targetId?, url?, order, isVisible`

### `Redirect`
`id, fromPath (unique), toPath, statusCode (301|302), hits int`

### `FaqGroup` / `FaqItem`
`FaqGroup: id, key, title (t)` · `FaqItem: id, groupId, question (t), answer (rt), order, isPublished`

### `Facility` (M01 Facilities — "only what exists")
`id, slug, name (t), summary (t), body (rt), icon, mediaIds uuid[], status (AVAILABLE|COMING_SOON|HIDDEN), order, isSeed`

### `ProgressUpdate` (M01 "Watch the hotel rise")
`id, slug, title (t), body (rt), happenedOn date, milestone? (FOUNDATION|STRUCTURE|ROOF|FINISHES|FURNISHING|OPENING), percentComplete? smallint, mediaIds uuid[], status (DRAFT|PUBLISHED), isSeed`

### `Testimonial` (placeholder for M12 public review, Movement IV)
`id, author, origin?, text (t), rating?, source (GUEST_FEEDBACK|MANUAL), stayId?, isPublished`

---

## 4. Rooms catalogue — M02 (Movement I; physical rooms Movement IV)

### `RoomType`
`id, slug, name (t), tagline (t), description (rt), sleepsAdults smallint, sleepsChildren smallint, bedConfig (t) e.g. "One king or two singles", sizeSqm?, view (t)?, floorHint?, heroMediaId?, galleryIds uuid[], floorPlanMediaId?, order, status (DRAFT|PUBLISHED|HIDDEN), fromPriceMinor bigint?, fromPriceCurrency?, fromPriceUsdMinor bigint?, seo jsonb, isSeed, timestamps, deletedAt?`

`fromPrice*` is a *display* figure for Movement I ("A starting figure in UGX. USD when rates exist"). From Movement II it is computed from `RatePlan` and the column becomes a manual override.

### `Amenity` / `RoomTypeAmenity`
`Amenity: id, key, name (t), icon, category (COMFORT|BATH|TECH|VIEW|ACCESS)` · join `RoomTypeAmenity(roomTypeId, amenityId, note (t)?)`

### `Room` — physical rooms (Movement IV)
`id, number (unique) e.g. "12", floor smallint, roomTypeId → RoomType, hkStatus (VACANT_CLEAN|VACANT_DIRTY|OCCUPIED|INSPECTED|BLOCKED|OUT_OF_ORDER), isActive, notes`

Created as a table in Movement I (empty or seeded) so inventory counts can derive from it in Movement II; its screens arrive in IV.

---

## 5. Destination — M03 (Movement I)

### `Destination`
`id, slug, kind (PLACE|ROUTE|THEME|SEASON), name (t), tagline (t), body (rt), heroMediaId?, galleryIds[], geo {lat,lng}?, distanceKm?, driveMinutes?, order, status, seo jsonb, isSeed`

Seeded: Sipi Falls, Mount Elgon, Kapchorwa coffee, The Road (Kampala → Mbale → Kapchorwa), Getting Here, When to Come.

### `RouteStop` (for "The road")
`id, destinationId, order, name (t), note (t), driveMinutesFromPrev, geo?`

---

## 6. Inbox, WhatsApp desk & waitlist — M19 / M10 / M11 (Movement I)

### `Contact` (lightweight person record — becomes `Guest` in Movement IV via link, not a rewrite)
`id, name, phoneE164?, email?, country?, whatsappOptIn boolean, source (WEB|WHATSAPP|EMAIL|PHONE|WALK_IN), guestId? → Guest, createdAt`

### `Conversation`
`id, contactId → Contact, channel (WEB_FORM|WHATSAPP|EMAIL), intent (STAY|EVENT|GROUP|GENERAL|WAITLIST), subject?, status (NEW|OPEN|WAITING_GUEST|DONE|SPAM), assigneeId? → User, lastMessageAt, context jsonb (page, roomTypeId, dates, guests from the wa.me/form payload), reservationId?, createdAt`

### `Message`
`id, conversationId, direction (INBOUND|OUTBOUND|NOTE), body text, author (USER id | CONTACT), channelMessageId?, deliveryStatus?, attachments jsonb, createdAt`

Web form enquiries create `Contact` + `Conversation` + first `Message` in one transaction. WhatsApp Movement I = click-to-chat only (wa.me with prefilled payload incl. a short enquiry ref) and staff log the thread manually; Cloud API (Movement II) writes inbound messages automatically.

### `WaitlistEntry`
`id, contactId → Contact, roomTypeId?, preferredFrom date?, preferredTo date?, flexibleDates boolean, adults, children, note, status (NEW|CONTACTED|CONVERTED|DECLINED|EXPIRED), convertedReservationId?, priority int, createdAt`

"Waitlist is not money. Conversion is" — no payment fields here.

---

## 7. Movement II — Door

### Inventory & rates (M05)
- `RatePlan`: `id, code, name (t), description (t), kind (RACK|BB|LONG_STAY|SEASONAL|PACKAGE), mealPlan (RO|BB|HB|FB), minNights?, cancellationPolicyId, isActive, validFrom?, validTo?`
- `Rate`: `id, ratePlanId, roomTypeId, date, currency, amountMinor, extraAdultMinor?, extraChildMinor?` — unique `(ratePlanId, roomTypeId, date, currency)`. Both UGX and USD stored explicitly: *no silent conversion*.
- `InventoryDay`: `id, roomTypeId, date, totalRooms, soldRooms, heldRooms, blockedRooms, closedToArrival, closedToDeparture, stopSell, minStay?` — unique `(roomTypeId, date)`; all sales go through `SELECT … FOR UPDATE` on these rows.
- `Hold`: `id, roomTypeId, from date, to date, rooms, sessionKey, expiresAt, releasedAt?, reservationId?` — default 15 min; BullMQ delayed job releases.
- `TaxRule`: `id, name, ratePercent numeric(5,2), inclusive boolean, appliesTo (ROOM|EXTRA|ALL), validFrom` — "price the guest sees is the price they pay".
- `CancellationPolicy`: `id, name (t), rules jsonb [{daysBefore, penaltyPercent}], text (t)`.

### Packages & extras (M06, M16)
- `Package`: `id, slug, name (t) e.g. "First Light", summary (t), body (rt), nights, inclusions (t)[], ratePlanId?, heroMediaId, priceUgxMinor?, priceUsdMinor?, validFrom?, validTo?, status, isSeed`
- `Extra`: `id, slug, name (t), kind (TRANSFER|GUIDE|MEAL|BED|LATE_CHECKOUT|EXPERIENCE|OTHER), priceUgxMinor, priceUsdMinor?, unit (PER_STAY|PER_NIGHT|PER_PERSON|PER_TRIP), isExperience boolean, capacityPerSlot? (Later), status`

### Reservations (M07) — the source of truth
- `Reservation`: `id, code (unique, e.g. RB-7K3Q), status (ENQUIRY|HELD|CONFIRMED|IN_HOUSE|CHECKED_OUT|CANCELLED|NO_SHOW), source (DIRECT|WHATSAPP|WALK_IN|PHONE|PORTAL), contactId, guestId?, arrival date, departure date, adults, children, currency, totalMinor, paidMinor, balanceMinor (generated), ratePlanId, packageId?, cancellationPolicySnapshot jsonb, eta?, notes, specialRequests, createdById?, cancelledAt?, cancelReason?, version int (optimistic lock)`
- `ReservationRoom`: `id, reservationId, roomTypeId, roomId? (IV), adults, children, nightlyRates jsonb [{date, amountMinor}]`
- `ReservationChange`: amend history `(id, reservationId, kind, before, after, actorId, createdAt)`.

### Folio & payments (M08)
- `Folio`: `id, reservationId (1:1 for now, 1:n later for events), currency, status (OPEN|CLOSED)`
- `FolioLine`: `id, folioId, kind (ROOM|EXTRA|PACKAGE|TAX|FNB|ADJUSTMENT|PAYMENT|REFUND), description, date, quantity, unitMinor, amountMinor (signed), extraId?, paymentId?, postedById?, reversedLineId?` — append-only ledger; corrections are reversing lines.
- `PaymentIntent`: `id, reservationId, purpose (DEPOSIT|FULL|BALANCE|ADD_NIGHT|EXTRA), amountMinor, currency, method (MTN_MOMO|AIRTEL_MONEY|CARD|CASH|BANK), provider (PESAPAL|MANUAL), providerRef?, providerTrackingId?, status (PENDING|SUCCEEDED|FAILED|EXPIRED|REFUNDED), expiresAt, idempotencyKey (unique)`
- `PaymentEvent`: `id, paymentIntentId?, provider, providerEventId (unique — makes webhooks safe to receive twice), payload jsonb, processedAt?`
- `Refund`: `id, paymentIntentId, amountMinor, reason, status, folioLineId`

### Notifications (M09, M22)
- `NotificationTemplate`: `id, key (BOOKING_CONFIRMED|PAYMENT_FAILED|AMENDED|PRE_ARRIVAL|ENQUIRY_ACK|WAITLIST_ACK|OWNER_BRIEF…), channel (EMAIL|SMS|WHATSAPP), locale, subject?, body (with {{variables}}), waTemplateName?, isActive` — editable in the House.
- `Notification`: `id, templateKey, channel, to, payload jsonb, status (QUEUED|SENT|DELIVERED|FAILED), providerRef?, error?, reservationId?, conversationId?, attempts, sentAt?`

### Guest corridor (M12) & owner brief (M21)
- `GuestAccessToken`: `id, reservationId, tokenHash, expiresAt` (code + phone lookup issues a short-lived token).
- `GuestRequest`: `id, reservationId, kind (EXTRA|LATE_CHECKOUT|GUIDE|TRANSFER|OTHER), extraId?, note, status (NEW|ACCEPTED|DECLINED|DONE)`.
- `OwnerBrief`: `id, forDate, payload jsonb (arrivals, occupancy, cleared, promised), sentVia[], sentAt`.

## 8. Movement III — Walk (M04)
- `Tour`: `id, slug, space (LOBBY|ROOM_TYPE|HALL|COMPOUND|BEYOND), roomTypeId?, provider (MATTERPORT|KUULA|CUSTOM_URL|VIDEO), embedUrl, stage (PRE_OPENING|LIVE), variant? (EMPTY|SET for hall), posterMediaId, isPublished`
- `TourHotspot`: `id, tourId, label (t), kind (BED|BATH|VIEW|CAPACITY|OTHER), note (t), providerRef?`
- `TourEvent`: `id, tourId, sessionId, event (OPENED|COMPLETED|CTA_CLICK), context (ROOM_PAGE|CHECKOUT), reservationId?, createdAt`

## 9. Movement IV — House (M13–M15)
- `Guest`: `id, firstName, lastName, phones text[], emails text[], nationality?, idDocType?, idDocNumberEncrypted?, preferredRoomTypeId?, preferredPaymentMethod?, tags[], notes, stayCount (derived), mergedIntoId?`
- `Stay`: `id, reservationId, reservationRoomId, roomId, guestId, checkedInAt, checkedInById, checkedOutAt?, checkedOutById?`
- `HousekeepingTask`: `id, roomId, date, kind (DEPARTURE|STAYOVER|INSPECTION|DEEP_CLEAN), status (TODO|IN_PROGRESS|DONE|INSPECTED), assigneeId?, notes`
- `RoomBlock`: `id, roomId, from, to, reason (MAINTENANCE|OWNER_USE|STAFF|OOO), note, createdById` — reduces `InventoryDay`.
- `Feedback`: `id, reservationId, score (GOOD|OK|BAD), comment?, allowPublic boolean, testimonialId?`

## 10. Later — shapes reserved
- **M17** `Venue`, `EventHold` (venueId, date, layout, contactId, expiresAt), `RoomBlockGroup` (block of rooms linked to an event), event `Folio` (Folio already supports n per owner).
- **M18** `Outlet`, `Ticket` (outletId, folioId, amountMinor, note) → posts `FolioLine(kind=FNB)`.
- **M19** `Quote` (conversationId, lines jsonb, expiresAt, status) → `Reservation[]`.
- **M20** `Channel`, `ChannelMapping`, `ChannelSyncLog`; `Reservation.source=PORTAL` + `externalRef`.

## 11. Key invariants (enforced in services + DB)

1. `InventoryDay.soldRooms + heldRooms + blockedRooms ≤ totalRooms` (CHECK constraint).
2. `Reservation.arrival < departure`; nights computed, never stored separately.
3. Folio lines are never updated or deleted — only reversed.
4. `PaymentEvent.providerEventId` unique → idempotent webhooks.
5. A published `Page` always has a `publishedVersionId`; the public API reads only versions.
6. Every write under `/v1/admin` produces an `AuditLog` row in the same transaction.
