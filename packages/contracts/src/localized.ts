import { z } from 'zod';
import { DEFAULT_LOCALE, type RichDoc, type LText, type LRich } from './text.js';

export * from './text.js';

/** Localized short text schema. */
export const zLText = z.record(z.string(), z.string());

export const zRichDoc: z.ZodType<RichDoc> = z.object({
  type: z.literal('doc'),
  content: z.array(z.any()).optional(),
}) as unknown as z.ZodType<RichDoc>;

export const zLRich = z.record(z.string(), zRichDoc);

export type { LText, LRich };
