/**
 * Zod-free text helpers and types: safe to import from browser code
 * (`@reberon/contracts/text`) without pulling validation into the bundle.
 */
export const DEFAULT_LOCALE = 'en';
export const LOCALES = ['en'] as const;

/** Localized short text: { en: "…" }. Adding a language is data, not a migration. */
export type LText = Record<string, string>;

type JsonPrimitive = string | number | boolean | null;
/** ProseMirror / Tiptap JSON document. */
export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, JsonPrimitive>;
  marks?: { type: string; attrs?: Record<string, JsonPrimitive> }[];
  content?: RichNode[];
};
export type RichDoc = RichNode & { type: 'doc' };
export type LRich = Record<string, RichDoc>;

export function t(value: LText | null | undefined, locale = DEFAULT_LOCALE): string {
  if (!value) return '';
  return value[locale] ?? value[DEFAULT_LOCALE] ?? Object.values(value)[0] ?? '';
}

export function tr(value: LRich | null | undefined, locale = DEFAULT_LOCALE): RichDoc | null {
  if (!value) return null;
  return value[locale] ?? value[DEFAULT_LOCALE] ?? Object.values(value)[0] ?? null;
}

export const en = (text: string): LText => ({ en: text });
