# 05 · Design System — "Highland"

The brief says *the most advanced design*. For this hotel, advanced means **cinematic and felt on a big screen, instant and calm on a phone in a moving vehicle.** Every effect below has a budget and a reduced-motion fallback. If an effect costs the LCP target, it goes.

## 1. Brand voice (carried from the spec)

Plain, specific, honest. "Hours spoken honestly." "Weather allowed to be weather." "Only what exists." No superlatives, no stock-photo luxury language. Short sentences. The design follows the voice: generous space, real textures, restraint.

## 2. Concept

**Land, light, altitude.** Kapchorwa sits ~1,900 m on the north slope of Mount Elgon: volcanic soil, coffee terraces, cloud rolling off escarpments, Sipi's falls. The visual system borrows:

- **Contour lines** (topographic) as a recurring hairline texture and section divider; animated on scroll as if drawn by hand.
- **Mist layers** — the signature hero: 3–4 depth planes (sky, far ridge, near ridge, foreground) with slow parallax and a drifting SVG-noise mist; on phones collapses to a single photo with a CSS gradient mist.
- **Altitude marker** — a thin vertical rule on desktop showing scroll progress as elevation (from "Kampala 1,190 m" to "Kapchorwa 1,900 m"); on the Road page it follows the journey.
- **Coffee cherry red** as the single saturated accent — used sparingly for primary actions.

## 3. Tokens (CSS variables, `packages/ui/tokens.css`)

### Colour — light (default)
| Token | Hex | Use |
|---|---|---|
| `--basalt-950` | `#121513` | Primary text, dark surfaces |
| `--basalt-800` | `#262B27` | Secondary dark |
| `--moss-700` | `#2F4A3A` | Brand green, headers on light |
| `--moss-500` | `#4F6F58` | Secondary green |
| `--bamboo-400` | `#8FA06A` | Tertiary, tags |
| `--cherry-600` | `#9E2A2B` | Primary action, accents (AA on parchment) |
| `--cherry-700` | `#7F1F21` | Action hover/pressed |
| `--roast-600` | `#5A3A2A` | Warm dark, footer |
| `--gold-400` | `#E0A54B` | "First light" highlight, focus ring on dark |
| `--sipi-400` | `#7FA7B5` | Water, info |
| `--mist-50` | `#F4F5F1` | Page background |
| `--parchment-100` | `#F6F1E7` | Warm section background |
| `--stone-300` | `#CFCBC0` | Hairlines, borders |
| `--stone-500` | `#8A867B` | Muted text (AA on mist at ≥ 16px) |

Semantic aliases (`--bg`, `--surface`, `--text`, `--text-muted`, `--border`, `--accent`, `--accent-contrast`, `--focus`) are what components use. **Dark "Night on Elgon"** theme redefines aliases (bg `#0E110F`, surface `#171B18`, text `#ECEAE3`, accent `#C9484A`), follows `prefers-color-scheme`, with a manual toggle stored per-visitor.

Admin uses the same aliases with a cooler neutral ramp and denser spacing; status colours: success moss, warning gold, danger cherry, info sipi.

### Typography
| Role | Family | Notes |
|---|---|---|
| Display | **Fraunces** (variable: `opsz`, `SOFT`, `WONK`) | Headlines; `opsz` tied to size, slight `SOFT` for warmth |
| Text / UI | **Inter** (variable) | Body, UI, forms; `tnum` for prices and dates |
| Mono | **JetBrains Mono** | Booking codes (`RB-7K3Q`), admin IDs |

Self-hosted via `next/font`, subset Latin + Latin-Ext, `font-display: swap`, size-adjusted fallbacks (no layout shift).

Fluid type scale (`clamp`) on a 1.25 ratio (mobile) → 1.333 (desktop):
`--step--1 0.83→0.9rem · --step-0 1→1.125rem · --step-1 1.25→1.5rem · --step-2 1.56→2rem · --step-3 1.95→2.66rem · --step-4 2.44→3.55rem · --step-5 3.05→4.74rem · --step-6 3.8→6.3rem` (hero only).

### Space, radius, elevation
- Space: 4-px base, fluid section padding `clamp(4rem, 10vw, 10rem)`.
- Grid: 4 cols mobile / 8 tablet / 12 desktop, max content 1320px, 16px mobile gutter, full-bleed media allowed.
- Radius: `--r-sm 6px` (inputs), `--r-md 12px` (cards), `--r-lg 24px` (media), `--r-pill`.
- Elevation: soft, warm-tinted shadows (`rgba(18,21,19,.08)`), plus one "glass" surface (backdrop-blur 16px, 60% surface) for the sticky booking bar and header over imagery — disabled when `prefers-reduced-transparency`.

## 4. Motion

| Principle | Rule |
|---|---|
| Purposeful | Motion explains depth, order or state — never decoration alone |
| Slow land, quick UI | Ambient: 1.2–2.4 s ease-out. UI feedback: 120–220 ms |
| Easing | `--ease-out: cubic-bezier(.22,1,.36,1)`, `--ease-in-out: cubic-bezier(.65,0,.35,1)` |
| Reduced motion | `prefers-reduced-motion: reduce` → no parallax, no smooth-scroll hijack, fades ≤ 150 ms, video posters only |
| Cost | Only `transform`/`opacity`; CSS scroll-driven animations first (zero JS), `motion` library only where orchestration is needed |

Signature moments:
1. **Hero mist** — layered parallax + drifting mist; headline words rise in with staggered mask reveal.
2. **Contour draw** — section dividers stroke-dash animate into view.
3. **Room cards** — image scales 1.04 on hover with a slow Ken Burns; on touch, a subtle tilt from device orientation is *not* used (battery, nausea).
4. **Shared-element transitions** — room card image morphs into the room page hero via the View Transitions API (graceful no-op where unsupported).
5. **Progress timeline** — a vertical line fills as you scroll; milestone badges pop; percent-complete counter ticks.
6. **The Road** — an SVG route Kampala→Mbale→Kapchorwa draws as you scroll, stops light up with honest hours.
7. **Magnetic primary buttons** (pointer: fine only), cursor-follow image preview on the destination list (desktop only).
8. **Lenis** smooth scroll on desktop pointer devices only; native scroll on touch.

## 5. Components (web)

`SiteHeader` (transparent over hero → solid glass on scroll, hides on scroll-down, shows on up) · `MobileNav` (full-screen sheet, large targets) · `StickyActionBar` (mobile: WhatsApp · Call · Enquire — always within thumb reach) · `Hero` (3 variants) · `SectionHeading` (eyebrow + display heading + contour) · `RoomCard` · `RoomFacts` (sleeps, bed, size, view as icon row) · `PriceTag` (UGX/USD toggle, "from") · `Gallery` (masonry/carousel/filmstrip + accessible lightbox) · `RenderingBadge` ("Architect's drawing" on non-photo images — honesty rule) · `FacilityTile` (with "Coming soon" state) · `ProgressTimeline` · `RouteMap` · `SeasonStrip` · `FAQ` (accessible accordion) · `EnquiryForm` / `WaitlistForm` (progressive: works without JS; phone input defaults +256; inline validation) · `WhatsAppButton` (prefilled context) · `MapPin` (MapLibre, static fallback image) · `CTABand` · `RichText` renderer · `Footer` (contact, hours, legal, social).

## 6. Components (admin — "The House")

App shell with collapsible sidebar, command palette (⌘K: jump to any page/room/enquiry), breadcrumbs, global search · `DataTable` (TanStack: sort, filter, column visibility, saved views) · `PageBuilder` (block list with dnd-kit, per-block forms generated from Zod schemas, live preview pane via iframe to web draft mode, device width toggle 375/768/1280) · `LocalizedField` · `RichTextEditor` (Tiptap, limited marks) · `MediaPicker` (library modal, upload with drag-drop, focal-point picker, alt text required) · `StatusPill` · `PublishBar` (draft/scheduled/published, diff vs live, publish/schedule/rollback) · `InboxThread` (chat layout, quick replies, assign) · `KpiTile`, `Sparkline` · `EmptyState` · `ConfirmDialog` · toasts. Desk screens (Movement IV) use a `--density-touch` mode: 56px targets, high contrast, minimal text.

## 7. Imagery rules

- Real photos when they exist; drawings/renders until then, **always** badged "Architect's drawing" / "Artist's impression" (`MediaAsset.isRendering`).
- Weather is allowed to be weather: we show mist and cloud, not only blue sky.
- Every image needs alt text before it can be published (enforced in admin).
- Art direction: focal point per image so crops work at every breakpoint.

## 8. Performance budget (web, per route, mobile)

| Item | Budget |
|---|---|
| JS (compressed, first load) | ≤ 110 KB for content pages |
| CSS | ≤ 30 KB |
| Hero image | ≤ 120 KB AVIF at 768w; `fetchpriority=high`; blurhash placeholder inline |
| Fonts | ≤ 2 files preloaded (Fraunces subset + Inter) |
| LCP / CLS / INP (p75, 4G mid Android) | ≤ 2.0 s / ≤ 0.05 / ≤ 200 ms |
| Third-party | None blocking. Map, video, tours load on interaction/visibility |

Low-data mode: honours `Save-Data` header and `prefers-reduced-data` → no background video, lower image widths, map as static image.

## 9. Accessibility

WCAG 2.2 AA minimum: contrast checked on tokens, focus visible (`--focus` gold ring 3px), skip link, landmarks, all interactive elements keyboard reachable, forms with labels + error text linked by `aria-describedby`, carousel pausable, target size ≥ 44px on touch, language attribute per locale.
