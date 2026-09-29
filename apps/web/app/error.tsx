'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="container-x grid min-h-[70vh] place-items-center pt-24 text-center">
      <div>
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 text-step-5">The mountain is in cloud for a moment.</h1>
        <p className="mx-auto mt-4 max-w-md text-fg-muted">Please try again. If it keeps happening, message us on WhatsApp — we are still here.</p>
        <button type="button" onClick={reset} className="btn mt-8">Try again</button>
      </div>
    </section>
  );
}
