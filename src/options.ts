// options.ts

interface ColorScheme {
  directionalLight: number,
  ambientLight: number,
  fog: [number, number],
  floor: number,
  wall: number,
  sky: number,
  car?: number,
}


export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  default: {
    directionalLight: 0xfff5e0,
    ambientLight: 0xfff5e0,
    fog: [0xffffff, 0.010],
    // floor: 0x1b1717,
    floor: 0x849aad,
    wall: 0x849aad,
    sky: 0xdbdacd,
    car: 0x810100,
  },
  sunset: {
    directionalLight: 0xfff5e0,
    ambientLight: 0xfff5e0,
    fog: [0xffaa88, 0.012],
    floor: 0x552200,
    wall: 0xaa7744,
    sky: 0xffaa88,
    car: 0x880000,
  },
  night: {
    directionalLight: 0xfff5e0,
    ambientLight: 0xfff5e0,
    fog: [0xffaa88, 0.012],
    floor: 0x222244,
    wall: 0x444488,
    sky: 0x000022,
    car: 0x440000,
  },
}
