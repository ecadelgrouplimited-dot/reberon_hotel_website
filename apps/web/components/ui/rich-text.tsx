import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LRich, RichNode } from '@reberon/contracts';
import { tr } from '@reberon/contracts';
import { cn } from '@/lib/cn';

/**
 * Renders a ProseMirror document through an allow-list. There is no raw-HTML
 * path: unknown nodes render their children, unknown marks are ignored.
 */
function marks(node: RichNode, content: ReactNode, key: number): ReactNode {
  return (node.marks ?? []).reduce<ReactNode>((acc, m) => {
    if (m.type === 'bold') return <strong key={key}>{acc}</strong>;
    if (m.type === 'italic') return <em key={key}>{acc}</em>;
    if (m.type === 'link') {
      const href = String(m.attrs?.href ?? '#');
      if (href.startsWith('/')) return <Link key={key} href={href}>{acc}</Link>;
      if (/^(https?:|mailto:|tel:)/.test(href)) return <a key={key} href={href} rel="noopener noreferrer" target="_blank">{acc}</a>;
      return acc;
    }
    return acc;
  }, content);
}

function render(nodes: RichNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((n, i) => {
    switch (n.type) {
      case 'text':
        return marks(n, n.text ?? '', i);
      case 'paragraph':
        return <p key={i}>{render(n.content)}</p>;
      case 'heading':
        return n.attrs?.level === 3 ? <h3 key={i}>{render(n.content)}</h3> : <h2 key={i}>{render(n.content)}</h2>;
      case 'bulletList':
        return <ul key={i}>{render(n.content)}</ul>;
      case 'orderedList':
        return <ol key={i}>{render(n.content)}</ol>;
      case 'listItem':
        return <li key={i}>{(n.content ?? []).length === 1 && n.content![0]!.type === 'paragraph' ? render(n.content![0]!.content) : render(n.content)}</li>;
      case 'blockquote':
        return <blockquote key={i}>{render(n.content)}</blockquote>;
      case 'hardBreak':
        return <br key={i} />;
      case 'horizontalRule':
        return <hr key={i} className="border-line" />;
      default:
        return <span key={i}>{render(n.content)}</span>;
    }
  });
}

export function RichText({ value, className }: { value: LRich | null | undefined; className?: string }) {
  const doc = tr(value);
  if (!doc?.content?.length) return null;
  return <div className={cn('prose-rb', className)}>{render(doc.content)}</div>;
}
