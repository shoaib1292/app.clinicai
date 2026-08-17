import { Skeleton } from '@/components/ui/skeleton'

// Skeleton that mirrors the DashboardShell chrome (sidebar + topbar) so
// client-side navigation does not flash to a bare centered spinner.
export function DashboardPageSkeleton({ message }: { message?: string }) {
  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border/60 bg-card p-3 space-y-4">
        <div className="h-8 w-32 rounded-lg">
          <Skeleton className="h-full w-full" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-4 shrink-0 rounded" />
            <Skeleton className="h-4 flex-1 rounded" />
          </div>
        ))}
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar skeleton */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4 lg:px-6">
          <Skeleton className="h-4 w-40 rounded" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>

        {/* Content skeleton */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="space-y-6 max-w-5xl">
            <div className="space-y-2">
              <Skeleton className="h-7 w-56 rounded" />
              <Skeleton className="h-4 w-80 rounded" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
            {message ? (
              <p className="text-sm text-muted-foreground text-center pt-2">{message}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
