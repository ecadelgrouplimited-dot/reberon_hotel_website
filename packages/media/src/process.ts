import sharp from 'sharp';
import { IMAGE_WIDTHS } from '@reberon/contracts';
import { mediaKeys, type StorageDriver } from './storage.js';

export interface ProcessedImage {
  width: number;
  height: number;
  lqip: string;
  dominantColor: string;
  variants: { width: number; key: string; bytes: number }[];
}

/**
 * Turn an uploaded image into web variants: EXIF stripped, auto-rotated,
 * webp at fixed widths (never enlarged — small originals repeat their own size
 * so every width key exists for the loader), plus a ~24px placeholder and dominant colour.
 */
export async function processImage(id: string, input: Buffer, storage: StorageDriver): Promise<ProcessedImage> {
  const base = sharp(input, { failOn: 'error' }).rotate();
  const meta = await base.metadata();
  const width = meta.autoOrient?.width ?? meta.width ?? 0;
  const height = meta.autoOrient?.height ?? meta.height ?? 0;
  if (!width || !height) throw new Error('Unreadable image');

  const variants = await Promise.all(
    IMAGE_WIDTHS.map(async (w) => {
      const buf = await base
        .clone()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: w <= 640 ? 72 : 78, effort: 3, smartSubsample: true })
        .toBuffer();
      const key = mediaKeys.variant(id, w);
      await storage.put(key, buf, 'image/webp');
      return { width: Math.min(w, width), key, bytes: buf.length };
    }),
  );

  const tiny = await base.clone().resize({ width: 24 }).blur(0.6).webp({ quality: 40 }).toBuffer();
  const { dominant } = await base.clone().stats();
  const hex = (n: number) => n.toString(16).padStart(2, '0');

  return {
    width,
    height,
    lqip: `data:image/webp;base64,${tiny.toString('base64')}`,
    dominantColor: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
    variants,
  };
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
