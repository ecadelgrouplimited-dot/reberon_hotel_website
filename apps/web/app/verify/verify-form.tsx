'use client';
import { useState } from 'react';
import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react';
import { formatMoney, type Currency } from '@reberon/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
type Result = { valid: false } | { valid: true; kind: string; number: string; issuedAt: string; currency: string; amountMinor: string; voided: boolean };

export function VerifyForm() {
  const [number, setNumber] = useState('');
  const [check, setCheck] = useState('');
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Result | null>(null);
  return (
    <form
      className="mt-8 grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch(`${API}/v1/public/documents/verify?number=${encodeURIComponent(number)}&check=${encodeURIComponent(check)}`).catch(() => null);
        setR(res?.ok ? ((await res.json()) as Result) : { valid: false });
        setBusy(false);
      }}
    >
      <label className="field"><span className="text-sm font-semibold">Document number</span><input className="input font-mono uppercase" placeholder="RCT-2026-00042" value={number} onChange={(e) => { setNumber(e.target.value.toUpperCase()); setR(null); }} required /></label>
      <label className="field"><span className="text-sm font-semibold">Check code</span><input className="input font-mono uppercase" placeholder="AB12-CD34" value={check} onChange={(e) => { setCheck(e.target.value.toUpperCase()); setR(null); }} required /></label>
      <button type="submit" className="btn btn-lg" disabled={busy}>{busy && <LoaderCircle className="size-4 animate-spin" />}<span className="btn-label">Check</span></button>
      {r && (r.valid ? (
        <div role="status" className={`rounded-[var(--r-lg)] border p-5 ${r.voided ? 'border-warning/40 bg-warning/10' : 'border-success/30 bg-success/5'}`}>
          <p className="flex items-center gap-2 font-semibold">{r.voided ? <CircleX className="size-5 text-warning" /> : <CircleCheck className="size-5 text-success" />}{r.voided ? 'Genuine, but it was voided and replaced' : 'Genuine'}</p>
          <p className="mt-2 text-sm text-fg-muted">{r.kind} {r.number} · {formatMoney(BigInt(r.amountMinor), r.currency as Currency).replace(/\.00$/, '')} · {new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Africa/Kampala' }).format(new Date(r.issuedAt))}</p>
        </div>
      ) : (
        <p role="alert" className="flex items-center gap-2 rounded-[var(--r-lg)] border border-danger/30 bg-danger/5 p-5 font-semibold text-danger"><CircleX className="size-5" /> We did not issue a document with that number and code.</p>
      ))}
    </form>
  );
}
