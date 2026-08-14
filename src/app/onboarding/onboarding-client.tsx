'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react'
import { OnboardingProgress } from './components/onboarding-progress'
import { OnboardingClinicDetails } from './components/onboarding-clinic-details'
import { OnboardingAdminAsDoctor } from './components/onboarding-admin-doctor'
import { OnboardingStaff } from './components/onboarding-staff'
import { OnboardingServices } from './components/onboarding-services'
import { OnboardingFeatures } from './components/onboarding-features'
import { OnboardingPaymentSetup } from './components/onboarding-payment-setup'
import { OnboardingWhatsApp } from './components/onboarding-whatsapp'
import { OnboardingGoogle } from './components/onboarding-google'
import { OnboardingReview } from './components/onboarding-review'
import { OnboardingLabStaff } from './components/onboarding-lab-staff'
import { toast } from 'sonner'

const STORAGE_KEY = 'onboarding-data'

const BASE_STEPS = 9
const hasLabStep = (data: OnboardingData) => data.labEnabled

interface OnboardingData {
  address: string
  latitude: number | null
  longitude: number | null
  logoFile: File | null
  workingHours: string
  isDoctor: boolean
  doctorId: string | null
  staff: any[]
  services: any[]
  pharmacyEnabled: boolean
  inventoryEnabled: boolean
  labEnabled: boolean
  onlinePaymentsEnabled: boolean
  bankAccounts: any[]
  labStaff: any[]
  whatsappConnected: boolean
  whatsappMode: string
  googleConnected: boolean
}

const DEFAULT_DATA: OnboardingData = {
  address: '',
  latitude: null,
  longitude: null,
  logoFile: null,
  workingHours: '{}',
  isDoctor: false,
  doctorId: null,
  staff: [],
  services: [],
  pharmacyEnabled: false,
  inventoryEnabled: false,
  labEnabled: false,
  onlinePaymentsEnabled: false,
  bankAccounts: [],
  labStaff: [],
  whatsappConnected: false,
  whatsappMode: '',
  googleConnected: false,
}

function loadData(): OnboardingData {
  if (typeof window === 'undefined') return DEFAULT_DATA
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : DEFAULT_DATA
  } catch {
    return DEFAULT_DATA
  }
}

function saveData(data: OnboardingData) {
  if (typeof window === 'undefined') return
  const safe = { ...data, logoFile: null }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
}

interface Props {
  clinicId: string
  clinicName: string
}

export function OnboardingClient({ clinicId, clinicName }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepParam = searchParams.get('step')
  const [data, setData] = useState<OnboardingData>(loadData)
  const [step, setStep] = useState(stepParam ? Math.min(Math.max(Number(stepParam), 1), BASE_STEPS + (data.labEnabled ? 1 : 0)) : 1)
  const [completing, setCompleting] = useState(false)

  const totalSteps = BASE_STEPS + (data.labEnabled ? 1 : 0)

  // Persist data
  useEffect(() => {
    saveData(data)
  }, [data])

  function updateData(patch: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...patch }))
  }

  function goToStep(s: number) {
    const clamped = Math.min(Math.max(s, 1), totalSteps)
    setStep(clamped)
    router.replace(`/onboarding?step=${clamped}`, { scroll: false })
  }

  async function complete() {
    setCompleting(true)
    try {
      // Mark onboarding as completed
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyEnabled: data.pharmacyEnabled,
          inventoryEnabled: data.inventoryEnabled,
          labEnabled: data.labEnabled,
          onlinePaymentsEnabled: data.onlinePaymentsEnabled,
          onboardingCompleted: true,
        }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error('Failed to complete setup'); setCompleting(false); return }

      localStorage.removeItem(STORAGE_KEY)
      toast.success('Setup complete! Welcome to your dashboard.')
      router.push('/dashboard/clinic')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
      setCompleting(false)
    }
  }

  const stepComponent = () => {
    switch (step) {
      case 1:
        return <OnboardingClinicDetails
          data={{ address: data.address, latitude: data.latitude, longitude: data.longitude, logoFile: data.logoFile, workingHours: data.workingHours }}
          onChange={(p) => updateData(p as any)}
          clinicId={clinicId}
        />
      case 2:
        return <OnboardingAdminAsDoctor
          data={{ isDoctor: data.isDoctor, doctorId: data.doctorId }}
          onChange={(p) => updateData(p as any)}
          clinicId={clinicId}
        />
      case 3:
        return <OnboardingStaff
          data={{ staff: data.staff }}
          onChange={(p) => updateData(p as any)}
          clinicId={clinicId}
        />
      case 4:
        return <OnboardingServices
          data={{ services: data.services }}
          onChange={(p) => updateData(p as any)}
          clinicId={clinicId}
        />
      case 5:
        return <OnboardingFeatures
          data={{
            pharmacyEnabled: data.pharmacyEnabled,
            inventoryEnabled: data.inventoryEnabled,
            labEnabled: data.labEnabled,
            onlinePaymentsEnabled: data.onlinePaymentsEnabled,
          }}
          onChange={(p) => updateData(p as any)}
        />
      case 6:
        return data.labEnabled ? (
          <OnboardingLabStaff
            data={{ labStaff: data.labStaff }}
            onChange={(p) => updateData(p as any)}
            clinicId={clinicId}
          />
        ) : (
          <OnboardingPaymentSetup
            data={{ bankAccounts: data.bankAccounts }}
            onChange={(p) => updateData(p as any)}
            clinicId={clinicId}
            onlinePaymentsEnabled={data.onlinePaymentsEnabled}
          />
        )
      case 7:
        return data.labEnabled ? (
          <OnboardingPaymentSetup
            data={{ bankAccounts: data.bankAccounts }}
            onChange={(p) => updateData(p as any)}
            clinicId={clinicId}
            onlinePaymentsEnabled={data.onlinePaymentsEnabled}
          />
        ) : (
          <OnboardingWhatsApp
            data={{ whatsappConnected: data.whatsappConnected, whatsappMode: data.whatsappMode }}
            onChange={(p) => updateData(p as any)}
            clinicId={clinicId}
          />
        )
      case 8:
        return data.labEnabled ? (
          <OnboardingWhatsApp
            data={{ whatsappConnected: data.whatsappConnected, whatsappMode: data.whatsappMode }}
            onChange={(p) => updateData(p as any)}
            clinicId={clinicId}
          />
        ) : (
          <OnboardingGoogle
            data={{ googleConnected: data.googleConnected }}
            onChange={(p) => updateData(p as any)}
            clinicId={clinicId}
          />
        )
      case 9:
        return data.labEnabled ? (
          <OnboardingGoogle
            data={{ googleConnected: data.googleConnected }}
            onChange={(p) => updateData(p as any)}
            clinicId={clinicId}
          />
        ) : (
          <OnboardingReview
            data={data}
            totalSteps={totalSteps}
            onComplete={complete}
            clinicId={clinicId}
            clinicName={clinicName}
          />
        )
      case 10:
        return <OnboardingReview
          data={data}
          totalSteps={totalSteps}
          onComplete={complete}
          clinicId={clinicId}
          clinicName={clinicName}
        />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/clinic')}
          >
            <ChevronLeft className="size-4 mr-1" /> Dashboard
          </Button>
          <span className="text-sm text-muted-foreground">{clinicName}</span>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <OnboardingProgress currentStep={step} totalSteps={totalSteps} labEnabled={data.labEnabled} />
        </div>

        {/* Step content */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {stepComponent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => goToStep(step - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="size-4 mr-1.5" /> Back
          </Button>
          {step < totalSteps && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => goToStep(step + 1)}
              >
                Skip
              </Button>
              <Button onClick={() => goToStep(step + 1)}>
                Next <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
