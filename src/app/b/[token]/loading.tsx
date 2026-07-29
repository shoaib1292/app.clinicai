import { MorphingSquare } from '@/components/ui/morphing-square'

export default function BookingLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <MorphingSquare message="Loading booking form..." />
    </div>
  )
}
