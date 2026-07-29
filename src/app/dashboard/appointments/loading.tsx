import { MorphingSquare } from '@/components/ui/morphing-square'

export default function AppointmentsLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <MorphingSquare message="Loading appointments..." />
    </div>
  )
}
