export const FILTER_CAMERA = {
  none: 'none',

  // Clássicos
  blackWhite: 'grayscale(100%)',
  noir: 'grayscale(100%) contrast(140%) brightness(85%)',
  sepia: 'sepia(100%)',
  vintage: 'sepia(35%) contrast(90%) brightness(95%) saturate(80%)',

  // Cores
  vivid: 'saturate(180%) contrast(110%)',
  vibrant: 'saturate(150%) contrast(115%) brightness(105%)',
  faded: 'saturate(60%) brightness(110%) contrast(90%)',

  // Temperatura
  warm: 'sepia(20%) saturate(140%) brightness(105%)',
  golden: 'sepia(25%) saturate(160%) brightness(110%) contrast(105%)',
  sunset: 'sepia(20%) saturate(180%) hue-rotate(-10deg) contrast(105%)',
  cool: 'hue-rotate(180deg) saturate(110%) brightness(105%)',
  arctic: 'hue-rotate(170deg) saturate(80%) brightness(115%) contrast(105%)',

  // Estilos
  cinematic: 'contrast(125%) saturate(85%) brightness(95%) sepia(10%)',
  dramatic: 'contrast(145%) saturate(120%) brightness(90%)',
  dreamy: 'brightness(115%) saturate(90%) contrast(85%) blur(0.3px)',
  retro: 'sepia(40%) saturate(130%) contrast(90%) brightness(105%)',

  // Efeitos
  highContrast: 'contrast(150%)',
  negative: 'invert(100%)',
  soft: 'brightness(110%) contrast(85%) saturate(90%) blur(0.2px)'
} as const

export type filterKey = keyof typeof FILTER_CAMERA

export const getFilferCamera = (key: filterKey): string => {
  if (key in FILTER_CAMERA) {
    return FILTER_CAMERA[key]
  }
  return FILTER_CAMERA.none
}
