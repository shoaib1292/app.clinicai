'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, Clock, Loader2, CheckCircle2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  appointment: {
    id: string
    clinicName: string
    doctorName: string
    doctorSpeciality: string
    serviceName: string | null
    patientName: string | null
    date: string
  }
}

const TAG_OPTIONS: { id: string; label: string; emoji: string }[] = [
  { id: 'friendly', label: 'Friendly staff', emoji: '😊' },
  { id: 'on_time', label: 'On time', emoji: '⏰' },
  { id: 'clean', label: 'Clean clinic', emoji: '✨' },
  { id: 'professional', label: 'Professional', emoji: '👨‍⚕️' },
  { id: 'good_advice', label: 'Good advice', emoji: '💡' },
  { id: 'rushed', label: 'Felt rushed', emoji: '🏃' },
  { id: 'long_wait', label: 'Long wait', emoji: '⌛' },
  { id: 'confusing', label: 'Confusing', emoji: '🤔' },
]

export function FeedbackFormClient({ appointment }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [waitTime, setWaitTime] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function toggleTag(id: string) {
    setTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  async function submit() {
    if (rating === 0) {
      toast.error('Please tap a star to rate your visit')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          rating,
          waitTimeMins: waitTime ? Number(waitTime) : null,
          tags,
          comment: comment.trim() || null,
          channel: 'link',
        }),
      })
      const j = await res.json()
      if (j.ok) {
        setSubmitted(true)
        toast.success('Shukriya! Feedback submitted.')
      } else {
        toast.error(j.error || 'Failed to submit')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-card rounded-2xl shadow-xl p-8 fade-up">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Shukriya, {appointment.patientName || 'patient'}!</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Aap ka feedback mil gaya. {appointment.clinicName} values your input.
          </p>
          <div className="flex justify-center gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-6 h-6 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">You can now close this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen hero-gradient p-4">
      <div className="max-w-lg mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-brand-foreground" />
          </div>
          <h1 className="text-2xl font-bold">How was your visit?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {appointment.clinicName} · {new Date(appointment.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Doctor card */}
        <div className="bg-card rounded-xl border p-4 mb-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-soft text-brand flex items-center justify-center font-semibold">
            {appointment.doctorName.charAt(4) || appointment.doctorName.charAt(0)}
          </div>
          <div>
            <div className="font-medium">{appointment.doctorName}</div>
            <div className="text-xs text-muted-foreground">{appointment.doctorSpeciality}{appointment.serviceName ? ` · ${appointment.serviceName}` : ''}</div>
          </div>
        </div>

        {/* Star rating */}
        <div className="bg-card rounded-xl border p-6 mb-4">
          <div className="text-center">
            <div className="text-sm font-medium mb-3">Tap to rate your experience</div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1 hover:scale-110 active:scale-95 transition-transform"
                  aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-10 h-10 ${(hover || rating) >= star ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                {rating === 5 && 'Excellent! 🌟'}
                {rating === 4 && 'Very good 👍'}
                {rating === 3 && 'Okay'}
                {rating === 2 && 'Needs improvement'}
                {rating === 1 && 'Sorry to hear that'}
              </div>
            )}
          </div>
        </div>

        {/* Wait time */}
        <div className="bg-card rounded-xl border p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand" />
              How long did you wait? (optional)
            </label>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['0', '10', '20', '30', '45', '60'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setWaitTime(waitTime === m ? '' : m)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${waitTime === m ? 'bg-brand text-brand-foreground border-brand' : 'border-border hover:border-brand/40'}`}
              >
                {m === '0' ? 'No wait' : `${m}+ min`}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card rounded-xl border p-4 mb-4">
          <div className="text-sm font-medium mb-3">What went well? What could be better?</div>
          <div className="grid grid-cols-2 gap-2">
            {TAG_OPTIONS.map((t) => {
              const active = tags.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={`text-left text-xs px-3 py-2 rounded-md border transition-all flex items-center gap-2 ${active ? 'bg-brand/10 border-brand text-brand' : 'border-border hover:border-brand/40'}`}
                >
                  <span className="text-base">{t.emoji}</span>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Comment */}
        <div className="bg-card rounded-xl border p-4 mb-4">
          <label className="text-sm font-medium mb-2 block">Anything else? (optional)</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Aap ka feedback..."
            className="resize-none focus-brand"
          />
          <div className="text-[10px] text-muted-foreground mt-1 text-right">{comment.length}/500</div>
        </div>

        <Button
          className="w-full brand-gradient"
          size="lg"
          onClick={submit}
          disabled={rating === 0 || submitting}
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Star className="w-4 h-4 mr-1" />}
          {submitting ? 'Submitting...' : 'Submit feedback'}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Your feedback is anonymous to other patients.
        </p>
      </div>
    </div>
  )
}
