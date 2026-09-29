'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StayView } from '@/components/booking/stay-view';

function Return() {
  const p = useSearchParams();
  return <StayView code={p.get('code') ?? ''} token={p.get('t') ?? ''} waitForPayment />;
}

export default function Page() {
  return (
    <section className="container-x pb-24 pt-32 md:pt-40">
      <Suspense><Return /></Suspense>
    </section>
  );
}
