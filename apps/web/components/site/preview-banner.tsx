export function PreviewBanner() {
  return (
    <div className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full bg-gold-400 py-2 pl-4 pr-2 text-sm font-semibold text-basalt-950 shadow-[var(--shadow-lift)]">
      Preview — you are seeing unpublished changes
      <a href="/api/exit-preview" className="rounded-full bg-basalt-950 px-3 py-1 text-mist-50">
        Exit
      </a>
    </div>
  );
}
