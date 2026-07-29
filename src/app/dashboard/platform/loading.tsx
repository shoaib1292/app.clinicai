import { MorphingSquare } from '@/components/ui/morphing-square'

export default function PlatformLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <MorphingSquare message="Loading platform..." />
    </div>
  )
}
