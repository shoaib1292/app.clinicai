'use client'

import { Calendar, Clock, MapPin, Stethoscope, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BookingSummaryData {
  doctorName: string
  doctorSpeciality: string
  slotTime: string
  tokenNo: number | null
  fees: {
    doctorFee: number
    platformFee: number
    total: number
  }
  paymentMode: string
}

export function BookingSummary({
  summary,
  onConfirm,
  onBack,
  loading,
}: {
  summary: BookingSummaryData
  onConfirm: () => void
  onBack: () => void
  loading: boolean
}) {
  const date = new Date(summary.slotTime)
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4" style={{ background: 'linear-gradient(135deg, var(--portal-primary), var(--portal-secondary))' }}>
          <h3 className="text-white/90 text-sm font-medium">Booking Summary</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ background: 'var(--portal-primary)' }}>
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Dr. {summary.doctorName}</p>
              <p className="text-xs text-muted-foreground">{summary.doctorSpeciality}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{dateStr} • {time}</span>
          </div>
          {summary.tokenNo && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Token #{summary.tokenNo}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Wallet className="w-4 h-4" />
            <span>{summary.paymentMode === 'screenshot' ? 'Pay at clinic (Screenshot)' : 'Pay at clinic'}</span>
          </div>
        </div>
        <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-muted/30">
          <span className="text-sm text-muted-foreground">Total Fee</span>
          <span className="text-lg font-bold text-[var(--portal-primary)]">Rs. {summary.fees.total}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={onConfirm}
          disabled={loading}
          style={{ background: 'var(--portal-primary)' }}
        >
          {loading ? 'Booking...' : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  )
}
