'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, LoaderCircle, Smartphone, TriangleAlert } from 'lucide-react';
import { formatMoney, type Currency } from '@reberon/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Development only: stands in for Pesapal's hosted page. No money moves. */
function TestPayment() {
  const ref = useSearchParams().get('ref') ?? '';
  const [p, setP] = useState<{ code: string; amountMinor: string; currency: string; guest: string; status: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${API}/v1/public/payments/test/${encodeURIComponent(ref)}`).then(async (r) => (r.ok ? setP(await r.json()) : setError('This test payment does not exist.')));
  }, [ref]);
  async function pay(outcome: 'success' | 'fail', method: 'MOBILE_MONEY' | 'CARD') {
    setBusy(outcome + method);
    await fetch(`${API}/v1/public/payments/test/${encodeURIComponent(ref)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome, method }) });
    window.location.href = `/book/return?code=${p!.code}&t=${p!.token}`;
  }
  return (
    <section className="container-x grid min-h-[80vh] place-items-center pb-24 pt-32">
      <div className="w-full max-w-md rounded-[var(--r-xl)] border border-line bg-surface p-8 shadow-[var(--shadow-lift)]">
        <p className="flex items-center gap-2 rounded-full bg-gold-400/20 px-3 py-1.5 text-xs font-semibold text-gold-500"><TriangleAlert className="size-4" /> Test payment — no money moves</p>
        {error && <p className="mt-6 text-danger">{error}</p>}
        {p && (
          <>
            <p className="mt-6 text-sm text-fg-muted">Reberon Hotel · {p.code}</p>
            <p className="mt-1 font-display text-step-4 tabular">{formatMoney(BigInt(p.amountMinor), p.currency as Currency).replace(/\.00$/, '')}</p>
            <p className="mt-1 text-sm text-fg-muted">{p.guest}</p>
            {p.status !== 'PENDING' ? <p className="mt-6">This payment is already {p.status.toLowerCase()}.</p> : (
              <div className="mt-8 grid gap-3">
                <button type="button" className="btn btn-lg" disabled={!!busy} onClick={() => pay('success', 'MOBILE_MONEY')}>{busy === 'successMOBILE_MONEY' ? <LoaderCircle className="size-4 animate-spin" /> : <Smartphone className="size-4" />} Pay with mobile money</button>
                <button type="button" className="btn btn-secondary btn-lg" disabled={!!busy} onClick={() => pay('success', 'CARD')}>{busy === 'successCARD' ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />} Pay by card</button>
                <button type="button" className="btn btn-ghost mt-2 justify-self-center text-danger" disabled={!!busy} onClick={() => pay('fail', 'MOBILE_MONEY')}><span className="btn-label">Simulate a failed payment</span></button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function Page() {
  return <Suspense><TestPayment /></Suspense>;
}
