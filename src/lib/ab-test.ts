/**
 * ClinicAI — Simple A/B testing utility.
 *
 * Deterministic assignment based on user IP or session for consistent experience.
 * Currently used for pricing section variant testing.
 */

type Variant = 'A' | 'B'

const EXPERIMENTS: Record<string, { variants: Variant[]; weights?: number[] }> = {
  'pricing-messaging': { variants: ['A', 'B'], weights: [0.5, 0.5] },
}

/**
 * Get the assigned variant for a given experiment and seed.
 * Deterministic — same seed always gets same variant.
 * Falls back to 'A' if no experiment exists.
 */
export function getVariant(experimentName: string, seed: string = 'default'): Variant {
  const config = EXPERIMENTS[experimentName]
  if (!config) return 'A'

  // Deterministic hash-based assignment
  let hash = 0
  const str = `${experimentName}:${seed}`
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit integer
  }
  const normalized = Math.abs(hash) / 0x7fffffff

  const weights = config.weights ?? config.variants.map(() => 1 / config.variants.length)
  let cumulative = 0
  for (let i = 0; i < config.variants.length; i++) {
    cumulative += weights[i] ?? 0
    if (normalized < cumulative) {
      return config.variants[i]
    }
  }
  return config.variants[config.variants.length - 1]
}
