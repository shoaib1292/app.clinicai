import { MorphingSquare } from '@/components/ui/morphing-square'

export default function FinanceLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <MorphingSquare message="Loading finance..." />
    </div>
  )
}
