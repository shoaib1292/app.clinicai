import { MorphingSquare } from '@/components/ui/morphing-square'

export default function FeedbackLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <MorphingSquare message="Loading feedback form..." />
    </div>
  )
}
