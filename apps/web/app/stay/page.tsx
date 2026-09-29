'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { StayView } from '@/components/booking/stay-view';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** "Code + phone. Their stay on one screen." (spec M12) */
function Stay() {
  const p = useSearchParams();
  const router = useRouter();
  const code = p.get('code');
  const token = p.get('t');
  const [form, setForm] = useState({ code: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (code && token) return <StayView code={code} token={token} />;
  return (
    <div className="mx-auto max-w-md">
      <p className="eyebrow">Your stay</p>
      <h1 className="mt-4 text-step-5">Find your booking</h1>
      <p className="mt-4 text-fg-muted">Your code is in the confirmation email and starts with RB-.</p>
      <form
        className="mt-8 grid gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const r = await fetch(`${API}/v1/public/stay/lookup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
          const j = await r.json();
          setBusy(false);
          if (!r.ok) return setError(r.status === 429 ? 'Too many tries. Please wait a few minutes.' : (j.errors?.[0]?.message ?? j.detail ?? 'No booking matches that code and phone number.'));
          router.replace(`/stay?code=${j.code}&t=${j.token}`);
        }}
      >
        {error && <p role="alert" className="rounded-[var(--r-md)] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
        <label className="field"><span className="text-sm font-semibold">Booking code</span><input className="input font-mono uppercase" placeholder="RB-7K3QX" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></label>
        <label className="field"><span className="text-sm font-semibold">Phone number you booked with</span><input className="input" type="tel" inputMode="tel" placeholder="07xx xxx xxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
        <button type="submit" className="btn btn-lg" disabled={busy}>{busy && <LoaderCircle className="size-4 animate-spin" />}<span className="btn-label">Show my stay</span></button>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <section className="container-x pb-24 pt-32 md:pt-40">
      <Suspense><Stay /></Suspense>
    </section>
  );
}
