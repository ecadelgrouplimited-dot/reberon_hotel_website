/**
 * Runs before paint, outside React: applies the saved theme, and opts browsers
 * without scroll-driven animations into the observer fallback (RevealFallback).
 * It never touches element attributes, so hydration stays clean.
 */
const code = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('rb-theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t);d.classList.add('js');
if(!(window.CSS&&CSS.supports('animation-timeline: view()'))&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window)d.classList.add('reveal-io');
}catch(e){}})();`;

export function BootScript() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
