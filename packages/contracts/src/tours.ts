import { z } from 'zod';
import { zLText } from './localized.js';
import type { LText } from './text.js';
import type { MediaRef } from './dto.js';

/* Movement III — the Walk (M04). Embedded players, not a game engine. */

export const TOUR_SPACES = ['LOBBY', 'ROOM_TYPE', 'HALL', 'COMPOUND', 'BEYOND'] as const;
export type TourSpace = (typeof TOUR_SPACES)[number];
export const TOUR_PROVIDERS = ['DRAWINGS', 'MATTERPORT', 'KUULA', 'VIDEO', 'CUSTOM_URL'] as const;
export type TourProvider = (typeof TOUR_PROVIDERS)[number];
export const TOUR_STAGES = ['PRE_OPENING', 'LIVE'] as const;
export type TourStage = (typeof TOUR_STAGES)[number];
export const TOUR_VARIANTS = ['EMPTY', 'SET'] as const;
export type TourVariant = (typeof TOUR_VARIANTS)[number];
export const HOTSPOT_KINDS = ['BED', 'BATH', 'VIEW', 'CAPACITY', 'ACCESS', 'OTHER'] as const;
export type HotspotKind = (typeof HOTSPOT_KINDS)[number];
export const TOUR_EVENTS = ['OPENED', 'COMPLETED', 'HOTSPOT', 'CTA_CLICK'] as const;
export const TOUR_CONTEXTS = ['ROOM_PAGE', 'CHECKOUT', 'PAGE'] as const;

/** Hosts a tour may be embedded from (mirrored in the website's Content-Security-Policy). */
export const TOUR_FRAME_HOSTS = ['https://my.matterport.com', 'https://kuula.co', 'https://www.youtube-nocookie.com', 'https://player.vimeo.com'];

/**
 * Turn whatever link the owner pastes into an embeddable URL, or explain why not.
 * Matterport and Kuula share links, YouTube and Vimeo watch links all work.
 */
export function normalizeTourUrl(provider: TourProvider, raw: string): { url: string } | { error: string } {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { error: 'That is not a link. Paste the full address, starting with https://' };
  }
  if (u.protocol !== 'https:') return { error: 'The link must start with https://' };
  switch (provider) {
    case 'MATTERPORT': {
      const id = u.searchParams.get('m') ?? u.pathname.match(/\/(?:show|models)\/([A-Za-z0-9]{8,})/)?.[1];
      if (!/matterport\.com$/.test(u.hostname) || !id) return { error: 'Paste a Matterport share link — it looks like my.matterport.com/show/?m=…' };
      return { url: `https://my.matterport.com/show/?m=${id}&play=1&qs=1&brand=0&help=0` };
    }
    case 'KUULA': {
      if (!/(^|\.)kuula\.co$/.test(u.hostname) || !/\/share\//.test(u.pathname)) return { error: 'Paste a Kuula share link — it looks like kuula.co/share/…' };
      u.searchParams.set('logo', '0');
      u.searchParams.set('info', '0');
      return { url: u.toString() };
    }
    case 'VIDEO': {
      const yt = u.hostname.includes('youtu') ? (u.hostname === 'youtu.be' ? u.pathname.slice(1) : (u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts)\/([\w-]{6,})/)?.[1])) : null;
      if (yt) return { url: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1` };
      const vm = u.hostname.includes('vimeo.com') ? u.pathname.match(/\/(?:video\/)?(\d{6,})/)?.[1] : null;
      if (vm) return { url: `https://player.vimeo.com/video/${vm}?dnt=1` };
      return { error: 'Paste a YouTube or Vimeo link' };
    }
    case 'CUSTOM_URL':
      return { url: u.toString() };
    case 'DRAWINGS':
      return { error: 'A drawings walk uses images, not a link' };
  }
}

const zHotspot = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(HOTSPOT_KINDS),
  label: zLText,
  note: zLText.default({}),
  providerRef: z.string().max(200).nullable().optional(),
  frame: z.number().int().min(0).max(200).nullable().optional(),
  x: z.number().min(0).max(1).nullable().optional(),
  y: z.number().min(0).max(1).nullable().optional(),
});

export const zTourInput = z
  .object({
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase words joined by dashes').max(80),
    title: zLText,
    summary: zLText.default({}),
    space: z.enum(TOUR_SPACES),
    roomTypeId: z.string().uuid().nullable().optional(),
    variant: z.enum(TOUR_VARIANTS).nullable().optional(),
    provider: z.enum(TOUR_PROVIDERS),
    embedUrl: z.string().max(1000).nullable().optional(),
    mediaIds: z.array(z.string().uuid()).max(80).default([]),
    posterId: z.string().uuid().nullable().optional(),
    stage: z.enum(TOUR_STAGES),
    status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']),
    order: z.number().int().default(0),
    hotspots: z.array(zHotspot).max(60).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.space === 'ROOM_TYPE' && !v.roomTypeId) ctx.addIssue({ code: 'custom', path: ['roomTypeId'], message: 'Choose the room type' });
    if (v.space !== 'HALL' && v.variant) ctx.addIssue({ code: 'custom', path: ['variant'], message: 'Only the hall has empty and set versions' });
    if (v.provider === 'DRAWINGS' && v.status === 'PUBLISHED' && v.mediaIds.length < 2) ctx.addIssue({ code: 'custom', path: ['mediaIds'], message: 'A walk needs at least two images' });
    if (v.provider !== 'DRAWINGS') {
      const n = v.embedUrl ? normalizeTourUrl(v.provider, v.embedUrl) : { error: 'Paste the tour link' };
      if ('error' in n && (v.status === 'PUBLISHED' || v.embedUrl)) ctx.addIssue({ code: 'custom', path: ['embedUrl'], message: n.error });
    }
  });

export const zTourEventInput = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{12,64}$/),
  event: z.enum(TOUR_EVENTS),
  context: z.enum(TOUR_CONTEXTS),
});

export interface TourHotspotDTO {
  id: string;
  kind: HotspotKind;
  label: LText;
  note: LText;
  frame: number | null;
  x: number | null;
  y: number | null;
}

/** What the website plays. */
export interface TourDTO {
  id: string;
  slug: string;
  title: LText;
  summary: LText;
  space: TourSpace;
  roomTypeId: string | null;
  variant: TourVariant | null;
  provider: TourProvider;
  embedUrl: string | null;
  frames: MediaRef[];
  poster: MediaRef | null;
  stage: TourStage;
  hotspots: TourHotspotDTO[];
}

export interface TourStatsDTO {
  opened: number;
  completed: number;
  hotspots: number;
  ctaClicks: number;
  sessions: number;
  /** Sessions that opened this tour and then started a booking. */
  startedBooking: number;
  /** …and paid (the booking is confirmed or beyond). */
  paid: number;
}

export interface TourAdminDTO extends TourDTO {
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  order: number;
  mediaIds: string[];
  posterId: string | null;
  roomTypeName: string | null;
  /** This tour is what the website shows for its slot right now. */
  showing: boolean;
  updatedAt: string;
  stats: TourStatsDTO;
}
