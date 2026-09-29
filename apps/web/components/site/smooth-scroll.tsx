'use client';
import { useEffect } from 'react';

/** Lenis on desktop pointer devices only; native scroll on touch and for reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (!matchMedia('(pointer: fine) and (min-width: 1024px)').matches) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let destroy = () => {};
    import('lenis').then(({ default: Lenis }) => {
      const lenis = new Lenis({ duration: 1.1, easing: (t: number) => 1 - Math.pow(1 - t, 4), anchors: { offset: -88 } });
      const loop = (time: number) => {
        lenis.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      destroy = () => lenis.destroy();
    });
    return () => {
      cancelAnimationFrame(raf);
      destroy();
    };
  }, []);
  return null;
}
