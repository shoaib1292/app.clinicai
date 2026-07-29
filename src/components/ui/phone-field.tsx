'use client'

import * as React from 'react'
import * as RPNInput from 'react-phone-number-input'
import { cn } from '@/lib/utils'
import { PhoneInput } from '@/components/ui/phone-input'
import { DEFAULT_COUNTRY } from '@/lib/phone-utils'

interface PhoneFieldProps extends Omit<React.ComponentProps<typeof PhoneInput>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  /** Default selected country (ISO code, e.g. 'PK'). Defaults to Pakistan. */
  defaultCountry?: RPNInput.Country
}

// The app stores phone numbers in its own normalized format: [dialCode][local],
// e.g. "923001234567" (no leading '+'). react-phone-number-input works with E.164
// strings ("+923001234567"), so we translate between the two here.
function toE164(value: string): string | undefined {
  if (!value) return undefined
  return value.startsWith('+') ? value : `+${value}`
}

function fromE164(value: string): string {
  // Keep the leading '+' so the canonical E.164 format is preserved end-to-end.
  // Stripping it here caused edited numbers (e.g. receptionist/doctor phones) to
  // lose their '+92' prefix and be stored inconsistently with seeded data.
  return value
}

function PhoneField({
  value,
  onChange,
  defaultCountry = DEFAULT_COUNTRY,
  className,
  ...props
}: PhoneFieldProps) {
  return (
    <PhoneInput
      className={cn('w-full', className)}
      defaultCountry={defaultCountry || (DEFAULT_COUNTRY as RPNInput.Country)}
      value={toE164(value)}
      onChange={(v) => onChange(fromE164(v || ''))}
      {...props}
    />
  )
}

export { PhoneField }
