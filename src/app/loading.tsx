import { MorphingSquare } from '@/components/ui/morphing-square'

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-cyan-50 dark:from-slate-950 dark:to-slate-900">
      <MorphingSquare message="Loading ClinicAI..." />
    </div>
  )
}
