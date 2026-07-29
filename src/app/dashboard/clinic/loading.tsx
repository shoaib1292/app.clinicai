import { MorphingSquare } from '@/components/ui/morphing-square'

export default function ClinicLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <MorphingSquare message="Loading clinic setup..." />
    </div>
  )
}
