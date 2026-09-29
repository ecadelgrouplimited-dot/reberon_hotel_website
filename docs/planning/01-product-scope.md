# 01 · Product Scope

## 1. The suite in one sentence

A public website that sells the stay, a booking engine that takes the money, and a house system that runs the desk after the guest has paid — for a ten-room hotel with a forty-seat hall in Kapchorwa, on the slopes of Mount Elgon.

## 2. People

| Persona | Where they are | What they need from us |
|---|---|---|
| **Guest in Kampala** | Phone, patchy 3G/4G, often in a moving vehicle | Understand the place in one minute, trust it, enquire or book in under three |
| **International guest** | Laptop or phone, USD mindset | Clear USD price, honest road time, card payment |
| **Group / event planner** (district officer, NGO, wedding) | Desk, forwards things by WhatsApp | Hall capacity, a quote they can forward |
| **Denis (Owner)** | Anywhere, not at the desk | Tomorrow's names, occupancy, money cleared — without hunting |
| **Manager** | Office / desk | Content, rates, bookings, inbox, rooms |
| **Desk staff** | Front desk, 15 minutes of training | Big buttons: arrivals, check-in, folio, walk-in |
| **Housekeeping** | Corridors, phone | Which rooms to make, mark clean |

## 3. What "dynamic" means (a hard requirement)

1. **No guest-facing copy lives in code.** Headlines, body text, photos, room facts, prices, facilities, destination stories, FAQs, legal text, contact numbers, opening hours, SEO titles, share images, nav and footer links — all are database records editable in the House.
2. **Pages are composed of blocks.** A page is an ordered list of typed blocks (hero, story, room grid, gallery, progress timeline, CTA band, FAQ, map, quote…). Managers can add, reorder, hide and edit blocks without a developer. Block types are a fixed, designed set — flexibility without breaking the design.
3. **Draft → publish.** Edits are drafts until published. Publishing triggers on-demand revalidation of the affected pages (seconds, not a redeploy). Scheduled publish is supported.
4. **Settings drive behaviour.** Hotel name, timezone (Africa/Kampala), currencies, check-in/out hours, phones, WhatsApp number, feature flags (e.g. "booking live" vs "waitlist mode") are settings, not constants.
5. **Seeded, not empty.** Every environment boots with rich, realistic seed content (see [08](08-seed-data.md)) so design and QA happen against real-shaped data. Seed records are tagged and can be purged in one command before launch.

## 4. Modules and Movements (from the spec)

| Movement | Trigger | Modules |
|---|---|---|
| **I · Face** | Now | M01 Website, M02 Rooms catalogue, M03 Destination, M10 click-to-chat + enquiry queue, M11 Waitlist, M19 Web enquiry + unified inbox, M22 Identity, roles, settings, media |
| **II · Door** | When rates exist | M05 Availability & rates, M06 Packages & extras, M07 Reservations, M08 Payments (Pesapal), M09 Confirmations, M10 templates/Cloud API, M11 conversion, M12 guest lookup, M16 experiences (sell), M21 owner brief, M22 jobs/audit/vault |
| **III · Walk** | When there is something to walk | M04 Virtual exploration (embedded tours, hotspots, analytics) |
| **IV · House** | When a person stands at the desk | M13 Front desk, M14 Room rack & housekeeping, M15 Guests & memory, M12 feedback/reviews, M21 ADR/source mix |
| **Later** | When the ground is real | M17 Events & hall, M18 F&B posting, M19 group quotes, M20 Channels, languages, guide capacity |

Rule from the spec, kept: *Later modules exist in the architecture so a hall, a restaurant charge or a portal does not require a second product.* Our schema reserves their shape (see [03](03-data-model.md)); we do not build their screens.

## 5. Build strategy

We are asked to start with **the website and the management platform**. Concretely:

- **Phase 0 — Foundation:** monorepo, design system, API skeleton, auth/RBAC, settings, media, CMS engine, seed pipeline.
- **Phase 1 — Movement I complete:** entire public website driven by the CMS; House screens for content, rooms catalogue, destination, facilities, progress ("Watch the hotel rise"), inbox, waitlist, users, settings, media.
- **Phase 2 — Movement II:** availability, rates, packages, reservations, Pesapal, confirmations, guest lookup, owner brief.
- Phases 3–4 follow the spec's Movements III and IV.

Details and acceptance criteria: [09-roadmap.md](09-roadmap.md).

## 6. Success measures for Movement I

| Measure | Target |
|---|---|
| Largest Contentful Paint, mid-range Android on 4G | ≤ 2.0 s (p75) |
| Lighthouse (mobile) Performance / A11y / SEO / Best Practices | ≥ 95 / 100 / 100 / 100 |
| Enquiry form completion on phone | ≤ 45 s, ≤ 4 fields required |
| Content change → live on site | ≤ 10 s after Publish |
| Time for a manager to change the home hero photo, untrained | ≤ 2 min |
| Enquiries / waitlist entries lost | 0 (every submission persisted before any notification is attempted) |

## 7. What this suite will not be (spec, verbatim intent)

Not a restaurant POS. Not an accounts package or EFRIS engine. Not Booking.com. Not a virtual-tour studio. They may connect; they do not live in the middle of the house.

**Filter for every feature request:** does it help a guest book a night in Kapchorwa, or help the desk keep that night? If not, it is not in this suite.
