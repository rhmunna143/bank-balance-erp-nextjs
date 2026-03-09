export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-background)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
      </div>
    </div>
  );
}
