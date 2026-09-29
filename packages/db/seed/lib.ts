import { config } from 'dotenv';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { createStorage, processImage, repoRoot, mediaKeys } from '@reberon/media';
import { IMAGE_WIDTHS } from '@reberon/contracts';
import { createPrismaClient, type Prisma } from '../src/index.js';
import { renderArt, type ArtOptions } from './media/art.js';

config({ path: resolve(repoRoot(), '.env'), quiet: true });

export const prisma = createPrismaClient();
export const storage = createStorage();

export const en = (s: string) => ({ en: s });

let counter = 0;
/** Stable-ish block ids for seeded pages. */
export const bid = (prefix: string) => `${prefix}-${(++counter).toString(36)}`;

export interface SeedImage extends Omit<ArtOptions, 'seed'> {
  key: string;
  alt: string;
  caption?: string;
  folder: string;
  tags?: string[];
  focalX?: number;
  focalY?: number;
}

const mediaCache = new Map<string, string>();

/**
 * Generate placeholder art and run it through the same pipeline as real uploads.
 * Idempotent: keyed by storageKey `seed/{key}`.
 */
export async function seedImage(img: SeedImage): Promise<string> {
  const cached = mediaCache.get(img.key);
  if (cached) return cached;
  const storageKey = `seed/${img.key}`;
  const existing = await prisma.mediaAsset.findFirst({ where: { storageKey }, select: { id: true } });
  if (existing && (await hasVariants(existing.id))) {
    mediaCache.set(img.key, existing.id);
    return existing.id;
  }
  const svg = renderArt({ ...img, seed: img.key });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  // Self-heal: a row whose files were removed is regenerated under the same id.
  const asset = existing ?? await prisma.mediaAsset.create({
    data: {
      storageKey,
      originalName: `${img.key}.png`,
      mimeType: 'image/png',
      bytes: png.length,
      alt: en(img.alt),
      caption: img.caption ? en(img.caption) : undefined,
      credit: 'Placeholder art — replace with photography',
      isRendering: true,
      folder: img.folder,
      tags: ['placeholder', ...(img.tags ?? [])],
      focalX: img.focalX ?? 0.5,
      focalY: img.focalY ?? 0.5,
      isSeed: true,
    },
  });
  const processed = await processImage(asset.id, png, storage);
  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: {
      status: 'READY',
      width: processed.width,
      height: processed.height,
      lqip: processed.lqip,
      dominantColor: processed.dominantColor,
      variants: processed.variants as unknown as Prisma.InputJsonValue,
    },
  });
  mediaCache.set(img.key, asset.id);
  return asset.id;
}

async function hasVariants(id: string) {
  try {
    await storage.get(mediaKeys.variant(id, IMAGE_WIDTHS[0]));
    return true;
  } catch {
    return false;
  }
}

export function log(section: string, detail: string) {
  console.log(`  ${section.padEnd(14)} ${detail}`);
}
