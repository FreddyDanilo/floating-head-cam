export const GRADIENTS = {
  none: 'transparent',
  gradient_01: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  gradient_02: 'linear-gradient(45deg, #25F4EE 0%, #FE2C55 50%, #25F4EE 100%)',
  gradient_03: 'linear-gradient(45deg, #25D366 0%, #128C7E 100%)',
  gradient_04: 'linear-gradient(45deg, #00C6FF 0%, #0072FF 100%)',
  gradient_05: 'linear-gradient(45deg, #b224ef 0%, #7579ff 100%)',
  gradient_06: 'linear-gradient(45deg, #a8e063 0%, #56ab2f 100%)',
  gradient_07: 'linear-gradient(45deg, #ff00cc 0%, #333399 100%)',
  gradient_08: 'linear-gradient(45deg, #ffffff 0%, #8e8e93 100%)'
} as const

export type GradientKey = keyof typeof GRADIENTS

export function getGradient(key: string): string {
  if (key in GRADIENTS) return GRADIENTS[key as GradientKey]
  // Custom solid color (hex, rgb, etc.)
  return key
}
