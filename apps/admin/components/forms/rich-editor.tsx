'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Undo2, Redo2 } from 'lucide-react';
import { useEffect } from 'react';
import type { LRich, RichDoc } from '@reberon/contracts/text';
import { cn } from '@/lib/cn';

/** Tiptap over ProseMirror JSON; the stored value is `{ en: doc }`. Limited marks by design. */
export function RichEditor({ value, onChange, placeholder, invalid }: { value: LRich | null | undefined; onChange: (v: LRich) => void; placeholder?: string; invalid?: boolean }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, code: false, horizontalRule: false, link: { openOnClick: false, autolink: true } })],
    content: value?.en ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: { attributes: { 'data-placeholder': placeholder ?? '' } },
    onUpdate: ({ editor: e }) => onChange({ ...(value ?? {}), en: e.getJSON() as RichDoc }),
  });

  // Reset when a different record is loaded.
  useEffect(() => {
    if (!editor) return;
    const next = JSON.stringify(value?.en ?? null);
    if (next !== JSON.stringify(editor.getJSON()) && !editor.isFocused) editor.commands.setContent(value?.en ?? { type: 'doc', content: [{ type: 'paragraph' }] }, { emitUpdate: false });
  }, [value, editor]);

  const btn = (active: boolean) => cn('grid size-7 place-items-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg', active && 'bg-surface-2 text-fg');
  if (!editor) return <div className="input min-h-32" />;
  return (
    <div className={cn('overflow-hidden rounded-[10px] border bg-surface focus-within:border-brand', invalid ? 'border-danger' : 'border-line-strong')}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
        <button type="button" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold"><Bold className="size-3.5" /></button>
        <button type="button" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic"><Italic className="size-3.5" /></button>
        <span className="mx-1 h-4 w-px bg-line" />
        <button type="button" className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading"><Heading2 className="size-3.5" /></button>
        <button type="button" className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Subheading"><Heading3 className="size-3.5" /></button>
        <button type="button" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="List"><List className="size-3.5" /></button>
        <button type="button" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list"><ListOrdered className="size-3.5" /></button>
        <button type="button" className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Quote"><Quote className="size-3.5" /></button>
        <button
          type="button"
          className={btn(editor.isActive('link'))}
          aria-label="Link"
          onClick={() => {
            const prev = editor.getAttributes('link').href as string | undefined;
            const href = window.prompt('Link to (e.g. /kapchorwa/the-road or https://…)', prev ?? '');
            if (href === null) return;
            if (!href) editor.chain().focus().unsetLink().run();
            else editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
          }}
        >
          <Link2 className="size-3.5" />
        </button>
        <span className="ml-auto flex">
          <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()} aria-label="Undo"><Undo2 className="size-3.5" /></button>
          <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()} aria-label="Redo"><Redo2 className="size-3.5" /></button>
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
