'use client';
/**
 * Maps next/image requests onto the pre-generated webp widths the API wrote
 * (…/i/{id}/{width}.webp). No on-the-fly resizing; every file is immutable.
 */
const WIDTHS = [320, 640, 960, 1280, 1920, 2560];

export default function loader({ src, width }: { src: string; width: number }) {
  const m = src.match(/^(.*\/i\/[0-9a-f-]+\/)\d+\.webp$/i);
  if (!m) return src;
  const w = WIDTHS.find((x) => x >= width) ?? WIDTHS[WIDTHS.length - 1];
  return `${m[1]}${w}.webp`;
}
