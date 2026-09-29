import { z } from 'zod';

export const DEFAULT_LOCALE = 'en';
export const LOCALES = ['en'] as const;

/** Localized short text: { en: "…" }. Adding a language is data, not a migration. */
export const zLText = z.record(z.string(), z.string());
export type LText = z.infer<typeof zLText>;

/** ProseMirror / Tiptap JSON document. */
type JsonPrimitive = string | number | boolean | null;
export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, JsonPrimitive>;
  marks?: { type: string; attrs?: Record<string, JsonPrimitive> }[];
  content?: RichNode[];
};
export type RichDoc = RichNode & { type: 'doc' };
export const zRichDoc: z.ZodType<RichDoc> = z.object({
  type: z.literal('doc'),
  content: z.array(z.any()).optional(),
}) as unknown as z.ZodType<RichDoc>;

export const zLRich = z.record(z.string(), zRichDoc);
export type LRich = z.infer<typeof zLRich>;

export function t(value: LText | null | undefined, locale = DEFAULT_LOCALE): string {
  if (!value) return '';
  return value[locale] ?? value[DEFAULT_LOCALE] ?? Object.values(value)[0] ?? '';
}

export function tr(value: LRich | null | undefined, locale = DEFAULT_LOCALE): RichDoc | null {
  if (!value) return null;
  return value[locale] ?? value[DEFAULT_LOCALE] ?? Object.values(value)[0] ?? null;
}

export const en = (text: string): LText => ({ en: text });
