// The shell's skeleton would be wrong here: this page stands alone, like the
// sign-in page it continues, so its placeholder is that page's card.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4" aria-busy="true">
      <div className="h-64 w-full max-w-sm animate-pulse rounded-card border border-ink-100 bg-white shadow-panel" />
      <p className="sr-only" role="status">
        Loading
      </p>
    </div>
  );
}
