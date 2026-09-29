'use client';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { BLOCKS, BLOCK_MAP, CTA_ACTIONS, type Block, type FieldDef, type RefEntity, type Cta } from '@reberon/contracts';
import { t, type LText, type LRich } from '@reberon/contracts/text';
import { get, thumb } from '@/lib/api';
import { cn } from '@/lib/cn';
import { FieldShell, Switch } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { MediaPicker } from '@/components/media/media-picker';
import { RichEditor } from './rich-editor';

/** Extra field kinds used by entity editors (on top of the block FieldDefs). */
export type AdminFieldDef =
  | FieldDef
  | { kind: 'money'; name: string; label: string; currency: 'UGX' | 'USD'; help?: string }
  | { kind: 'date'; name: string; label: string; required?: boolean; help?: string }
  | { kind: 'textarea'; name: string; label: string; help?: string }
  | { kind: 'refs'; name: string; label: string; entity: RefEntity | 'amenity'; help?: string }
  | { kind: 'group'; label: string; fields: AdminFieldDef[]; columns?: 2 | 3 }
  | { kind: 'blocks'; name: string; label: string; help?: string };

type Values = Record<string, unknown>;
type Errors = Record<string, string>;

const ENTITY_ENDPOINT: Record<string, string> = {
  roomType: '/room-types',
  facility: '/facilities',
  destination: '/destinations',
  faqGroup: '/faq-groups',
  amenity: '/amenities',
};

function useEntity(entity: string) {
  return useQuery({
    queryKey: ['entity-options', entity],
    queryFn: async () => {
      const rows = await get<{ id: string; name?: LText; title?: LText; key?: string; slug?: string; icon?: string; category?: string }[]>(ENTITY_ENDPOINT[entity]!);
      return rows.map((r) => ({ id: r.id, label: t(r.name ?? r.title) || r.key || r.slug || r.id, group: r.category }));
    },
    staleTime: 60_000,
  });
}

export function FieldRenderer({ fields, value, onChange, errors = {}, prefix = '', bare }: { fields: AdminFieldDef[]; value: Values; onChange: (v: Values) => void; errors?: Errors; prefix?: string; bare?: boolean }) {
  const set = (name: string, v: unknown) => onChange({ ...value, [name]: v });
  const Wrap = 'div';
  return (
    <Wrap className={bare ? 'contents' : 'grid gap-5'}>
      {fields.map((f, i) => {
        if (f.kind === 'group') {
          return (
            <div key={`g${i}`} className={cn('grid gap-4', f.columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
              <FieldRenderer bare fields={f.fields} value={value} onChange={onChange} errors={errors} prefix={prefix} />
            </div>
          );
        }
        return <Field key={f.name} def={f} value={value[f.name]} onChange={(v) => set(f.name, v)} error={errors[prefix + f.name]} errors={errors} path={prefix + f.name} />;
      })}
    </Wrap>
  );
}

function Field({ def, value, onChange, error, errors, path }: { def: Exclude<AdminFieldDef, { kind: 'group' }>; value: unknown; onChange: (v: unknown) => void; error?: string; errors: Errors; path: string }) {
  const help = 'help' in def ? def.help : undefined;
  const required = 'required' in def ? def.required : false;
  switch (def.kind) {
    case 'text':
      return (
        <FieldShell label={def.label} hint={help} error={error} required={required}>
          <input className="input" value={(value as string) ?? ''} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value || undefined)} aria-invalid={!!error} />
        </FieldShell>
      );
    case 'ltext': {
      const v = (value as LText) ?? {};
      const Tag = def.multiline ? 'textarea' : 'input';
      return (
        <FieldShell label={def.label} hint={help} error={error} required={required} aside={<span className="rounded bg-surface-2 px-1.5 text-[10px] font-semibold uppercase text-fg-subtle">EN</span>}>
          <Tag className="input" rows={def.multiline ? 3 : undefined} value={v.en ?? ''} onChange={(e: { target: { value: string } }) => onChange(e.target.value ? { ...v, en: e.target.value } : undefined)} aria-invalid={!!error} />
        </FieldShell>
      );
    }
    case 'textarea':
      return (
        <FieldShell label={def.label} hint={help} error={error}>
          <textarea className="input" rows={3} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
        </FieldShell>
      );
    case 'lrich':
      return (
        <FieldShell label={def.label} hint={help} error={error} required={required}>
          <RichEditor value={value as LRich} onChange={onChange} invalid={!!error} />
        </FieldShell>
      );
    case 'number':
      return (
        <FieldShell label={def.label} hint={help} error={error} required={required}>
          <input className="input tabular" type="number" min={def.min} max={def.max} value={value === undefined || value === null ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} aria-invalid={!!error} />
        </FieldShell>
      );
    case 'money': {
      const exp = def.currency === 'USD' ? 100 : 1;
      const major = value === undefined || value === null || value === '' ? '' : String(Number(value) / exp);
      return (
        <FieldShell label={def.label} hint={help} error={error}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-fg-subtle">{def.currency}</span>
            <input className="input pl-12 tabular" type="number" min={0} step={def.currency === 'USD' ? 1 : 1000} value={major} onChange={(e) => onChange(e.target.value === '' ? null : String(Math.round(Number(e.target.value) * exp)))} />
          </div>
        </FieldShell>
      );
    }
    case 'date':
      return (
        <FieldShell label={def.label} hint={help} error={error} required={def.required}>
          <input className="input" type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
        </FieldShell>
      );
    case 'boolean':
      return <Switch label={def.label} hint={help} checked={!!value} onChange={onChange} />;
    case 'select':
      return (
        <FieldShell label={def.label} error={error} required={def.required}>
          <select className="input" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
            {!def.required && <option value="">—</option>}
            {def.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FieldShell>
      );
    case 'media':
      return <MediaField label={def.label} help={help} error={error} ids={value ? [value as string] : []} onChange={(ids) => onChange(ids[0] ?? null)} />;
    case 'mediaList':
      return <MediaField label={def.label} help={help} error={error} ids={(value as string[]) ?? []} onChange={onChange} multiple />;
    case 'ref':
      return <RefSelect label={def.label} help={help} error={error} entity={def.entity} value={(value as string) ?? ''} onChange={onChange} required={def.required} />;
    case 'refs':
      return <RefsPicker label={def.label} help={help} entity={def.entity} value={(value as string[]) ?? []} onChange={onChange} />;
    case 'ctas':
      return <CtaEditor label={def.label} value={(value as Cta[]) ?? []} onChange={onChange} max={def.max ?? 3} />;
    case 'list':
      return <ListEditor def={def} value={(value as Values[]) ?? []} onChange={onChange} errors={errors} path={path} />;
    case 'blocks':
      return <InlineBlocks label={def.label} help={help} value={(value as Block[]) ?? []} onChange={onChange} />;
  }
}

function MediaField({ label, help, error, ids, onChange, multiple }: { label: string; help?: string; error?: string; ids: string[]; onChange: (ids: string[]) => void; multiple?: boolean }) {
  const [open, setOpen] = useState(false);
  const move = (i: number, d: number) => {
    const n = [...ids];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x!);
    onChange(n);
  };
  return (
    <FieldShell label={label} hint={help} error={error}>
      <div className="flex flex-wrap gap-2">
        {ids.map((id, i) => (
          <div key={id + i} className="group relative size-24 overflow-hidden rounded-xl border border-line bg-surface-2">
            <img src={thumb(id, 320)} alt="" className="size-full object-cover" />
            {i === 0 && multiple && <span className="absolute left-1 top-1 rounded bg-basalt-950/70 px-1.5 text-[10px] font-semibold text-white">Main</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 bg-basalt-950/60 p-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              {multiple && i > 0 && (
                <button type="button" onClick={() => move(i, -1)} className="grid size-6 place-items-center rounded text-white hover:bg-white/20" aria-label="Move earlier"><ArrowUp className="size-3 -rotate-90" /></button>
              )}
              {multiple && i < ids.length - 1 && (
                <button type="button" onClick={() => move(i, 1)} className="grid size-6 place-items-center rounded text-white hover:bg-white/20" aria-label="Move later"><ArrowDown className="size-3 -rotate-90" /></button>
              )}
              <button type="button" onClick={() => onChange(ids.filter((_, k) => k !== i))} className="grid size-6 place-items-center rounded text-white hover:bg-white/20" aria-label="Remove"><X className="size-3" /></button>
            </div>
          </div>
        ))}
        {(multiple || !ids.length) && (
          <button type="button" onClick={() => setOpen(true)} className="grid size-24 place-items-center rounded-xl border border-dashed border-line-strong text-fg-subtle transition-colors hover:border-brand hover:text-brand">
            <span className="grid justify-items-center gap-1 text-[11.5px] font-medium"><ImagePlus className="size-5" />{multiple ? 'Add' : 'Choose'}</span>
          </button>
        )}
        {!multiple && ids.length > 0 && (
          <Button size="sm" className="self-end" onClick={() => setOpen(true)}>Replace</Button>
        )}
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} multiple={multiple} initial={multiple ? [] : ids} onPick={(picked) => onChange(multiple ? [...ids, ...picked.filter((p) => !ids.includes(p))] : picked.slice(0, 1))} />
    </FieldShell>
  );
}

function RefSelect({ label, help, error, entity, value, onChange, required }: { label: string; help?: string; error?: string; entity: string; value: string; onChange: (v: string | null) => void; required?: boolean }) {
  const opts = useEntity(entity);
  return (
    <FieldShell label={label} hint={help} error={error} required={required}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{opts.isLoading ? 'Loading…' : '— choose —'}</option>
        {opts.data?.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}

function RefsPicker({ label, help, entity, value, onChange }: { label: string; help?: string; entity: string; value: string[]; onChange: (v: string[]) => void }) {
  const opts = useEntity(entity);
  const groups = new Map<string, { id: string; label: string }[]>();
  for (const o of opts.data ?? []) groups.set(o.group ?? '', [...(groups.get(o.group ?? '') ?? []), o]);
  return (
    <FieldShell label={label} hint={help ?? (value.length ? `${value.length} selected, shown in the order ticked` : undefined)}>
      <div className="grid gap-3 rounded-[10px] border border-line-strong p-3">
        {[...groups.entries()].map(([g, list]) => (
          <div key={g}>
            {g && <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-fg-subtle">{g.toLowerCase()}</p>}
            <div className="flex flex-wrap gap-1.5">
              {list.map((o) => {
                const on = value.includes(o.id);
                return (
                  <button key={o.id} type="button" onClick={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])} className={cn('rounded-full border px-3 py-1 text-[12.5px] transition-colors', on ? 'border-fg bg-fg text-bg' : 'border-line-strong hover:border-fg/50')} aria-pressed={on}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {opts.isLoading && <p className="text-[12px] text-fg-subtle">Loading…</p>}
      </div>
    </FieldShell>
  );
}

const CTA_LABEL: Record<string, string> = { whatsapp: 'Open WhatsApp', enquire: 'Open enquiry form', waitlist: 'Go to first-stay form', call: 'Phone call', link: 'Go to a page / URL', book: 'Book (when bookings open)' };

function CtaEditor({ label, value, onChange, max }: { label: string; value: Cta[]; onChange: (v: Cta[]) => void; max: number }) {
  const set = (i: number, patch: Partial<Cta>) => onChange(value.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  return (
    <FieldShell label={label}>
      <div className="grid gap-2">
        {value.map((c, i) => (
          <div key={i} className="grid gap-2 rounded-[10px] border border-line p-3 sm:grid-cols-[1.3fr_1fr_0.8fr_auto]">
            <input className="input" placeholder="Button text" value={c.label?.en ?? ''} onChange={(e) => set(i, { label: { en: e.target.value } })} />
            <select className="input" value={c.action} onChange={(e) => set(i, { action: e.target.value as Cta['action'] })}>
              {CTA_ACTIONS.map((a) => (
                <option key={a} value={a}>{CTA_LABEL[a]}</option>
              ))}
            </select>
            <select className="input" value={c.style ?? 'primary'} onChange={(e) => set(i, { style: e.target.value as Cta['style'] })}>
              <option value="primary">Solid</option>
              <option value="secondary">Outline</option>
              <option value="ghost">Text link</option>
            </select>
            <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="grid size-10 place-items-center rounded-lg text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Remove button">
              <Trash2 className="size-4" />
            </button>
            {c.action === 'link' && <input className="input sm:col-span-4" placeholder="/about or https://…" value={c.href ?? ''} onChange={(e) => set(i, { href: e.target.value })} />}
            {c.action === 'whatsapp' && <input className="input sm:col-span-4" placeholder="Pre-filled message (optional)" value={c.prefill ?? ''} onChange={(e) => set(i, { prefill: e.target.value || undefined })} />}
          </div>
        ))}
        {value.length < max && (
          <Button size="sm" className="justify-self-start" icon={<Plus className="size-3.5" />} onClick={() => onChange([...value, { label: { en: '' }, action: 'enquire', style: value.length ? 'secondary' : 'primary' }])}>
            Add button
          </Button>
        )}
      </div>
    </FieldShell>
  );
}

function ListEditor({ def, value, onChange, errors, path }: { def: Extract<FieldDef, { kind: 'list' }>; value: Values[]; onChange: (v: Values[]) => void; errors: Errors; path: string }) {
  const [open, setOpen] = useState<number | null>(value.length ? null : null);
  const move = (i: number, d: number) => {
    const n = [...value];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x!);
    onChange(n);
  };
  const summary = (item: Values): ReactNode => {
    for (const f of def.fields) {
      const v = item[f.name];
      if (typeof v === 'string' && v) return v;
      if (v && typeof v === 'object' && 'en' in (v as object)) return (v as LText).en;
    }
    return <span className="text-fg-subtle">Untitled</span>;
  };
  return (
    <FieldShell label={def.label}>
      <ol className="grid gap-1.5">
        {value.map((item, i) => (
          <li key={i} className={cn('rounded-[10px] border', open === i ? 'border-line-strong bg-surface' : 'border-line')}>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <GripVertical className="size-4 shrink-0 text-fg-subtle" />
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="min-w-0 flex-1 truncate py-1 text-left text-[13px]">
                <span className="mr-2 text-[11px] tabular text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                {summary(item)}
              </button>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-7 place-items-center rounded text-fg-subtle hover:bg-surface-2 disabled:opacity-30" aria-label="Move up"><ArrowUp className="size-3.5" /></button>
              <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="grid size-7 place-items-center rounded text-fg-subtle hover:bg-surface-2 disabled:opacity-30" aria-label="Move down"><ArrowDown className="size-3.5" /></button>
              <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="grid size-7 place-items-center rounded text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Remove"><Trash2 className="size-3.5" /></button>
            </div>
            {open === i && (
              <div className="border-t border-line p-3">
                <FieldRenderer fields={def.fields} value={item} onChange={(v) => onChange(value.map((x, k) => (k === i ? v : x)))} errors={errors} prefix={`${path}.${i}.`} />
              </div>
            )}
          </li>
        ))}
      </ol>
      {value.length < (def.max ?? 50) && (
        <Button
          size="sm"
          className="mt-1 justify-self-start"
          icon={<Plus className="size-3.5" />}
          onClick={() => {
            onChange([...value, {}]);
            setOpen(value.length);
          }}
        >
          Add {def.itemLabel.toLowerCase()}
        </Button>
      )}
    </FieldShell>
  );
}

/** Compact block list for entities that carry a few extra sections (e.g. a destination's season chart). */
function InlineBlocks({ label, help, value, onChange }: { label: string; help?: string; value: Block[]; onChange: (v: Block[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState('');
  return (
    <FieldShell label={label} hint={help}>
      <ol className="grid gap-1.5">
        {value.map((b, i) => {
          const def = BLOCK_MAP[b.type];
          return (
            <li key={b.id} className="rounded-[10px] border border-line">
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" className="flex-1 text-left text-[13px] font-medium" onClick={() => setOpen(open === b.id ? null : b.id)}>
                  {def?.label ?? b.type} <span className="text-fg-subtle">· {(b.data.heading as LText | undefined)?.en ?? ''}</span>
                </button>
                <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="grid size-7 place-items-center rounded text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Remove block"><Trash2 className="size-3.5" /></button>
              </div>
              {open === b.id && def && (
                <div className="border-t border-line p-3">
                  <FieldRenderer fields={def.fields} value={b.data as Values} onChange={(data) => onChange(value.map((x) => (x.id === b.id ? { ...x, data } : x)))} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-1 flex gap-2">
        <select className="input !w-auto" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Block type">
          <option value="">Add a section…</option>
          {BLOCKS.filter((b) => !b.later && b.type !== 'hero').map((b) => (
            <option key={b.type} value={b.type}>{b.label}</option>
          ))}
        </select>
        <Button size="sm" disabled={!adding} onClick={() => {
          const b: Block = { id: `${adding}-${Math.random().toString(36).slice(2, 8)}`, type: adding, variant: BLOCK_MAP[adding]?.variants?.[0]?.value, data: {} };
          onChange([...value, b]);
          setOpen(b.id);
          setAdding('');
        }}>Add</Button>
      </div>
    </FieldShell>
  );
}
