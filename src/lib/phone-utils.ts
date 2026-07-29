export interface CountryPhoneConfig {
  code: string
  name: string
  flag: string
  dialCode: string  // e.g. '92'
  length: number    // local number length (without dial code)
  mobilePrefixes: string[]  // e.g. ['3']
  format: (local: string) => string  // display format function
}

export const COUNTRY_PHONE_CONFIGS: Record<string, CountryPhoneConfig> = {
  PK: {
    code: 'PK',
    name: 'Pakistan',
    flag: '🇵🇰',
    dialCode: '92',
    length: 10,
    mobilePrefixes: ['3'],
    format: (local: string) => local.replace(/^(\d{3})(\d{7})$/, '$1 $2'),
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    dialCode: '966',
    length: 9,
    mobilePrefixes: ['5'],
    format: (local: string) => local.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3'),
  },
  AE: {
    code: 'AE',
    name: 'UAE',
    flag: '🇦🇪',
    dialCode: '971',
    length: 9,
    mobilePrefixes: ['5', '5'],
    format: (local: string) => local.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3'),
  },
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    dialCode: '1',
    length: 10,
    mobilePrefixes: [],
    format: (local: string) => local.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3'),
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    dialCode: '44',
    length: 10,
    mobilePrefixes: ['7'],
    format: (local: string) => local.replace(/^(\d{4})(\d{6})$/, '$1 $2'),
  },
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    dialCode: '91',
    length: 10,
    mobilePrefixes: ['6', '7', '8', '9'],
    format: (local: string) => local.replace(/^(\d{5})(\d{5})$/, '$1 $2'),
  },
  BD: {
    code: 'BD',
    name: 'Bangladesh',
    flag: '🇧🇩',
    dialCode: '880',
    length: 10,
    mobilePrefixes: ['1'],
    format: (local: string) => local.replace(/^(\d{4})(\d{6})$/, '$1 $2'),
  },
  AF: {
    code: 'AF',
    name: 'Afghanistan',
    flag: '🇦🇫',
    dialCode: '93',
    length: 9,
    mobilePrefixes: ['7'],
    format: (local: string) => local.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3'),
  },
  QA: {
    code: 'QA',
    name: 'Qatar',
    flag: '🇶🇦',
    dialCode: '974',
    length: 8,
    mobilePrefixes: ['3', '5', '6', '7'],
    format: (local: string) => local.replace(/^(\d{4})(\d{4})$/, '$1 $2'),
  },
  OM: {
    code: 'OM',
    name: 'Oman',
    flag: '🇴🇲',
    dialCode: '968',
    length: 8,
    mobilePrefixes: ['7', '9'],
    format: (local: string) => local.replace(/^(\d{4})(\d{4})$/, '$1 $2'),
  },
}

export const COUNTRY_LIST = Object.values(COUNTRY_PHONE_CONFIGS)

export const DEFAULT_COUNTRY = 'PK'

export function detectCountry(digits: string): string | null {
  for (const cfg of COUNTRY_LIST) {
    if (digits.startsWith(cfg.dialCode)) return cfg.code
  }
  return null
}

/**
 * Normalize a phone number to canonical format: [dialCode][localNumber]
 * Handles + prefix, 00 prefix, local 0-prefix, and raw digits.
 * Defaults to Pakistan (+92) if no country code detected.
 */
export function normalizePhone(phone: string, countryCode?: string): string {
  let digits = phone.replace(/\D/g, '')

  if (!digits) return ''

  // Strip international prefix variations
  if (digits.startsWith('00')) digits = digits.slice(2)

  const country = countryCode || detectCountry(digits) || DEFAULT_COUNTRY
  const cfg = COUNTRY_PHONE_CONFIGS[country]
  if (!cfg) return digits

  // Remove country code if present
  if (digits.startsWith(cfg.dialCode)) {
    digits = digits.slice(cfg.dialCode.length)
  }
  // Remove local 0-prefix
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  return cfg.dialCode + digits
}

/**
 * Format a phone number for display in the local format of its country.
 */
export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''

  const country = detectCountry(digits)
  if (!country) return phone

  const cfg = COUNTRY_PHONE_CONFIGS[country]
  if (!cfg) return phone

  const local = digits.slice(cfg.dialCode.length)
  try {
    return `+${cfg.dialCode} ${cfg.format(local)}`
  } catch {
    return `+${digits}`
  }
}

/**
 * Return just the local number (without country code).
 */
export function getLocalNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const country = detectCountry(digits)
  if (!country) return digits
  const cfg = COUNTRY_PHONE_CONFIGS[country]
  if (!cfg) return digits
  return digits.slice(cfg.dialCode.length)
}

/**
 * Get the country dial code for a given country code.
 */
export function getDialCode(countryCode: string): string {
  return COUNTRY_PHONE_CONFIGS[countryCode]?.dialCode || '92'
}
