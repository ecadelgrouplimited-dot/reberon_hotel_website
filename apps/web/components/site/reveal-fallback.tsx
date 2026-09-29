'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Observer-driven reveals for browsers without scroll-driven animations (after hydration). */
export function RevealFallback() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('reveal-io')) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.setAttribute('data-shown', ''), io.unobserve(e.target))),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll('[data-reveal]:not([data-shown]),.contour-draw:not([data-shown])').forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}
