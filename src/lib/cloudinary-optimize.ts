/**
 * Cloudinary image optimization utility.
 * Every image URL used on clinic websites MUST pass through this.
 * No raw image URLs — all get f_auto, q_auto, and width transforms.
 */

export function optimizeImage(
  url: string | null | undefined,
  width?: number,
  height?: number,
  quality: string = 'auto'
): string {
  if (!url || !url.includes('cloudinary')) return url || ''

  const transforms = ['f_auto', `q_${quality}`]
  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if (width || height) transforms.push('c_fill', 'g_auto')

  return url.replace('/upload/', `/upload/${transforms.join(',')}/`)
}

/** Image size presets for common website components */
export const IMAGE_SIZES = {
  hero: { width: 1400, height: 600 },
  heroMobile: { width: 700, height: 300 },
  doctorAvatar: { width: 200, height: 200 },
  galleryThumb: { width: 400, height: 300 },
  galleryFull: { width: 1200, height: 800 },
  logo: { width: 160, height: 48 },
} as const
