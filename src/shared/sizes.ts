/**
 * Size presets in pixels for the floating camera window.
 * Index 0..9 map to keyboard shortcuts 1..0, index 10 maps to Space.
 */
export const SIZE_PRESETS = [200, 225, 250, 275, 300, 325, 350, 375, 400, 450, 500] as const

/** Legacy size mapping for migration from sizeIndex to windowSize. */
export const LEGACY_SIZE_PX = [300, 350, 400] as const
