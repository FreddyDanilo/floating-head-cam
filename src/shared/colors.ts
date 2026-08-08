export const GRADIENTS = {
  instagram:
    'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  neon: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
  cyberpunk: 'linear-gradient(90deg, #ff007f 0%, #7f00ff 100%)',
  gold: 'linear-gradient(135deg, #bf953f, #fcf6ba, #b38728, #fbf5b7)',
  none: 'transparent'
} as const

export type GradientKey = keyof typeof GRADIENTS

export function getGradient(key: GradientKey): string {
  return GRADIENTS[key]
}
