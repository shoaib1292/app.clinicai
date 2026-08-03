const PUBLIC_BASE = process.env.R2_PUBLIC_URL || ''

export function getImageUrl(imageKey: string, width: 100 | 400 | 800 | 1400 = 800): string {
  const ext = width === 1400 ? 'avif' : 'webp'
  return `${PUBLIC_BASE}/${imageKey}/${width}.${ext}`
}

export function getSrcSet(imageKey: string): string {
  return [
    `${PUBLIC_BASE}/${imageKey}/400.webp 400w`,
    `${PUBLIC_BASE}/${imageKey}/800.webp 800w`,
    `${PUBLIC_BASE}/${imageKey}/1400.avif 1400w`,
  ].join(', ')
}

export function getHighestRes(imageKey: string): string {
  return `${PUBLIC_BASE}/${imageKey}/1400.avif`
}
