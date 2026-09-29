import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { buildMetadata } from '@/lib/seo';
import { BookingFlow } from '@/components/booking/booking-flow';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const site = await api.site();
  return { ...buildMetadata(site, { title: 'Book a stay', path: '/book', description: 'See every room and its price for your dates, and book in a few minutes.' }), robots: { index: false } };
}

export default async function BookPage() {
  const site = await api.site();
  if (!site.features.bookingEnabled) {
    return (
      <section className="container-x grid min-h-[70vh] place-items-center pb-24 pt-36 text-center">
        <div className="max-w-xl">
          <p className="eyebrow">Opening soon</p>
          <h1 className="mt-4 text-step-5">The calendar is not open yet.</h1>
          <p className="mt-5 text-step-1 text-fg-muted">Put your name against a room and dates. We contact the first-stay list before bookings open to anyone else.</p>
          <Link href="/first-stay#waitlist" className="btn btn-lg mt-8">Claim a first stay</Link>
        </div>
      </section>
    );
  }
  return (
    <Suspense>
      <BookingFlow />
    </Suspense>
  );
}
