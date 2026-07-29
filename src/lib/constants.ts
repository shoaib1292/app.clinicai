export const TIMEZONE_OFFSET_MINUTES = 300 // UTC+5 (Asia/Karachi)

export const PRICING = {
  PLATFORM_FEE_DEFAULT: 50, // PKR
  FREE_CREDITS_SIGNUP: 1000,
} as const

export const BOOKING = {
  HOLD_TTL_MS: 5 * 60 * 1000, // 5 minutes
  MAX_BULK_CANCEL: 100,
} as const

export const NO_SHOW = {
  BLOCK_AFTER: 3,
  WINDOW_DAYS: 90,
} as const

export const REFUND = {
  FULL_HOURS: 4,
  PARTIAL_HOURS: 2,
  PARTIAL_RATE: 0.5, // 50%
} as const
