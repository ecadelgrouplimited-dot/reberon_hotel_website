export function PreviewBanner() {
  return (
    <div className="fixed bottom-3 right-3 z-[70] flex items-center gap-2 rounded-full bg-gold-400 py-1 pl-3 pr-1 text-[11px] font-semibold text-basalt-950 shadow-[var(--shadow-lift)]">
      Draft preview
      <a href="/api/exit-preview" className="rounded-full bg-basalt-950 px-2 py-0.5 text-mist-50">
        Exit
      </a>
    </div>
  );
}
