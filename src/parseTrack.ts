import type { TrackData } from './TrackTypes'

// Parses a plain-text track file from /public/tracks/<name>.
//
// Format:
//   length = <n>        tile size in world units
//   width  = <n>        wall thickness
//   height = <n>        wall height
//   laps   = <n>
//   start  = [row, col] grid coords of the start tile
//   <digits>            one row of the grid (0=empty, 8/2/4/6=straights, 7/9/1/3=corners)
//   anything else       ignored (legend, comments, blank lines)

export function parseTrack(text: string): TrackData {
  const lines = text.split('\n').map(l => l.trim())

  let length = 64, width = 4, height = 10, laps = 1
  let startRow = 0, startCol = 0
  const gridLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('length ='))      length   = parseInt(line.split('=')[1].trim(), 10)
    else if (line.startsWith('width ='))  width    = parseInt(line.split('=')[1].trim(), 10)
    else if (line.startsWith('height =')) height   = parseInt(line.split('=')[1].trim(), 10)
    else if (line.startsWith('laps ='))   laps     = parseInt(line.split('=')[1].trim(), 10)
    else if (line.startsWith('start =')) {
      const m = line.match(/\[(\d+),\s*(\d+)\]/)
      if (m) { startRow = parseInt(m[1], 10); startCol = parseInt(m[2], 10) }
    } else if (/^[0-9]+$/.test(line)) {
      gridLines.push(line)
    }
  }

  const grid = gridLines.map(l => l.split('').map(Number))
  return { length, width, height, laps, startRow, startCol, grid }
}
