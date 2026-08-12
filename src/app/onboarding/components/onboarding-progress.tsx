'use client'

import { cn } from '@/lib/utils'

const BASE_LABELS = [
  'Clinic Details',
  'You as Doctor',
  'Add Staff',
  'Services & Fees',
  'Features',
  'Bank Account',
  'WhatsApp',
  'Google',
  'Review & Finish',
]

interface Props {
  currentStep: number
  totalSteps: number
  labEnabled?: boolean
}

export function OnboardingProgress({ currentStep, totalSteps, labEnabled }: Props) {
  const stepLabels = labEnabled
    ? [...BASE_LABELS.slice(0, 5), 'Lab Staff', ...BASE_LABELS.slice(5)]
    : BASE_LABELS

  const percent = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="font-medium tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {stepLabels.map((label, i) => (
          <span
            key={label}
            className={cn(
              'shrink-0 text-[10px] px-1.5 py-0.5 rounded transition-colors',
              i + 1 === currentStep
                ? 'bg-primary/10 text-primary font-medium'
                : i + 1 < currentStep
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'text-muted-foreground/50'
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
