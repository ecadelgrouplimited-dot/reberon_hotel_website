import type { Metadata } from 'next';
import { VerifyForm } from './verify-form';

export const metadata: Metadata = { title: { absolute: 'Check a receipt · Reberon Hotel' }, robots: { index: false } };

/** Anyone holding a Reberon receipt or invoice can confirm it is genuine. */
export default function VerifyPage() {
  return (
    <section className="container-x pb-24 pt-32 md:pt-40">
      <div className="mx-auto max-w-md">
        <p className="eyebrow">Receipts</p>
        <h1 className="mt-4 text-step-5">Check a receipt</h1>
        <p className="mt-4 text-fg-muted">Every receipt, refund note and invoice from Reberon carries a number and a check code at the bottom. Enter both to see whether it is genuine.</p>
        <VerifyForm />
      </div>
    </section>
  );
}
