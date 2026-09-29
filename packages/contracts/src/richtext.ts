import type { RichDoc, RichNode, LRich } from './text.js';

/**
 * Tiny builder for rich-text documents (used by seed data and tests).
 * Supports **bold**, *italic* and [links](url) inline.
 */
function inline(text: string): RichNode[] {
  const nodes: RichNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) nodes.push({ type: 'text', text: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('**')) nodes.push({ type: 'text', text: tok.slice(2, -2), marks: [{ type: 'bold' }] });
    else if (tok.startsWith('[')) {
      const [, label = '', href = ''] = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      nodes.push({ type: 'text', text: label, marks: [{ type: 'link', attrs: { href } }] });
    } else nodes.push({ type: 'text', text: tok.slice(1, -1), marks: [{ type: 'italic' }] });
    last = m.index! + tok.length;
  }
  if (last < text.length) nodes.push({ type: 'text', text: text.slice(last) });
  return nodes;
}

export const rt = {
  p: (text: string): RichNode => ({ type: 'paragraph', content: inline(text) }),
  h: (level: 2 | 3, text: string): RichNode => ({ type: 'heading', attrs: { level }, content: inline(text) }),
  ul: (...items: string[]): RichNode => ({
    type: 'bulletList',
    content: items.map((i) => ({ type: 'listItem', content: [rt.p(i)] })),
  }),
  quote: (text: string): RichNode => ({ type: 'blockquote', content: [rt.p(text)] }),
  doc: (...content: RichNode[]): RichDoc => ({ type: 'doc', content }),
  /** Paragraph-per-line shorthand: lines starting "## " become headings, "- " bullets. */
  md: (source: string): LRich => {
    const blocks: RichNode[] = [];
    let bullets: string[] = [];
    const flush = () => {
      if (bullets.length) blocks.push(rt.ul(...bullets));
      bullets = [];
    };
    // Headings always stand alone, even without blank lines around them.
    const normalised = source.trim().replace(/^(#{2,3} .*)$/gm, '\n$1\n');
    for (const raw of normalised.split(/\n\s*\n|\n(?=- |## |### |> )/)) {
      const line = raw.trim().replace(/\s*\n\s*/g, ' ');
      if (!line) continue;
      if (line.startsWith('- ')) {
        bullets.push(line.slice(2));
        continue;
      }
      flush();
      if (line.startsWith('### ')) blocks.push(rt.h(3, line.slice(4)));
      else if (line.startsWith('## ')) blocks.push(rt.h(2, line.slice(3)));
      else if (line.startsWith('> ')) blocks.push(rt.quote(line.slice(2)));
      else blocks.push(rt.p(line));
    }
    flush();
    return { en: rt.doc(...blocks) };
  },
};

export function richToPlain(doc: RichNode | null | undefined): string {
  if (!doc) return '';
  if (doc.text) return doc.text;
  const sep = doc.type === 'doc' ? '\n\n' : doc.type === 'bulletList' ? '\n' : '';
  return (doc.content ?? []).map(richToPlain).join(sep);
}
