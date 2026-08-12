export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex">
      {/* Sidebar Skeleton (hidden on mobile) */}
      <div className="hidden lg:flex w-64 flex-col border-r border-[var(--color-border)] p-4 space-y-4">
        <div className="h-8 bg-[var(--color-border)] rounded-md w-3/4 animate-pulse mb-8" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 bg-[var(--color-border)] rounded-md animate-pulse" />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Skeleton */}
        <div className="h-16 border-b border-[var(--color-border)] flex items-center justify-between px-4 lg:px-8">
          <div className="h-6 bg-[var(--color-border)] rounded-md w-1/4 animate-pulse lg:hidden" />
          <div className="h-6 bg-[var(--color-border)] rounded-md w-1/4 animate-pulse hidden lg:block" />
          <div className="h-8 w-8 bg-[var(--color-border)] rounded-full animate-pulse" />
        </div>

        {/* Content Skeleton */}
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          <div className="h-8 bg-[var(--color-border)] rounded-md w-1/3 animate-pulse" />
          
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[var(--color-border)] rounded-lg animate-pulse" />
            ))}
          </div>
          
          {/* Main Chart / Table Area */}
          <div className="h-96 bg-[var(--color-border)] rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
