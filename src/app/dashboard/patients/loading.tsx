import { MorphingSquare } from '@/components/ui/morphing-square'

export default function PatientsLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <MorphingSquare message="Loading patients..." />
    </div>
  )
}
