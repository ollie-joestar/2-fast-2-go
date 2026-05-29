import type { TrackData, CheckpointDef } from './TrackTypes'

// ─── direction types ──────────────────────────────────────────────────────────

type Dir = 'N' | 'S' | 'E' | 'W'

// For a straight start cell, the digit encodes the direction of travel.
function initialDir(cellDir: number): Dir {
  switch (cellDir) {
    case 8: return 'N'
    case 2: return 'S'
    case 6: return 'E'
    case 4: return 'W'
    default: return 'N'
  }
}

// Where you exit a cell given your entry travel direction.
// Straights are pass-through; corners redirect.
function exitDir(cellDir: number, travel: Dir): Dir {
  if (cellDir === 8 || cellDir === 2 || cellDir === 4 || cellDir === 6) return travel
  switch (cellDir) {
    case 7: return travel === 'N' ? 'E' : 'S'   // NW corner: N→E, W→S
    case 9: return travel === 'N' ? 'W' : 'S'   // NE corner: N→W, E→S
    case 1: return travel === 'S' ? 'E' : 'N'   // SW corner: S→E, W→N
    case 3: return travel === 'S' ? 'W' : 'N'   // SE corner: S→W, E→N
  }
  return travel
}

function stepCell(row: number, col: number, dir: Dir): [number, number] {
  switch (dir) {
    case 'N': return [row - 1, col]
    case 'S': return [row + 1, col]
    case 'E': return [row, col + 1]
    case 'W': return [row, col - 1]
  }
}

// ─── checkpoint colours ───────────────────────────────────────────────────────

const CP_COLORS = [
  'red', 'yellow', 'green', 'blue', 'violet', 'magenta',
  'cyan', 'orange', 'coral', 'steelblue', 'seagreen', 'goldenrod',
]

// ─── public API ──────────────────────────────────────────────────────────────

// Walks the circuit once from the start cell and returns one CheckpointDef per tile.
// Straight checkpoints are thin gates across the road width.
// Corner checkpoints are square and rotated 45° so they roughly fill the turn.
export function buildCheckpoints(data: TrackData): CheckpointDef[] {
  const { grid, startRow, startCol, length: L, width: W, height: H } = data
  const roadW = L - W   // clear driving width inside the walls
  const thin  = W       // depth of a straight gate

  const checkpoints: CheckpointDef[] = []
  let row = startRow, col = startCol
  let travel: Dir = initialDir(grid[startRow][startCol])

  do {
    const cellDir = grid[row][col]
    const cx = (col - startCol) * L
    const cz = (row - startRow) * L
    const isNS = travel === 'N' || travel === 'S'
    const color = CP_COLORS[checkpoints.length % CP_COLORS.length]

    let cp: CheckpointDef
    if (cellDir === 8 || cellDir === 2 || cellDir === 4 || cellDir === 6) {
      // Straight: a thin slab across the road
      cp = {
        position: [cx, H / 2, cz],
        size: isNS ? [roadW, H, thin] : [thin, H, roadW],
        color,
      }
    } else {
      // Corner: square AABB, visual rotated 45° so it visually spans the diagonal
      const rotY = (cellDir === 7 || cellDir === 3) ? -Math.PI / 4 : Math.PI / 4
      cp = {
        position: [cx, H / 2, cz],
        size: [roadW, H, roadW],
        visualSize: [roadW * Math.SQRT2, H, thin],
        rotation: [0, rotY, 0],
        color,
      }
    }

    checkpoints.push(cp)

    const exit = exitDir(cellDir, travel)
    ;[row, col] = stepCell(row, col, exit)
    travel = exit
  } while (row !== startRow || col !== startCol)

  return checkpoints
}

// Returns the world position the car should spawn at, placed just inside the
// start tile offset toward where it came from (so it faces the first gate).
export function carStartFromData(data: TrackData): [number, number, number] {
  const dir = data.grid[data.startRow]?.[data.startCol] ?? 8
  const half = data.length / 2
  switch (dir) {
    case 8: return [0, 1,  half]
    case 2: return [0, 1, -half]
    case 6: return [-half, 1, 0]
    case 4: return [ half, 1, 0]
    default: return [0, 1, half]
  }
}

// Returns the Y-axis rotation (yaw) the car should face at spawn.
// Forward direction formula: fwd = (sin(yaw), 0, cos(yaw))
//   yaw=0      → +Z (South)   yaw=π    → -Z (North)
//   yaw=π/2    → +X (East)    yaw=-π/2 → -X (West)
export function carYawFromData(data: TrackData): number {
  switch (data.grid[data.startRow]?.[data.startCol] ?? 8) {
    case 8: return Math.PI        // N travel → face -Z
    case 2: return 0              // S travel → face +Z
    case 6: return Math.PI / 2   // E travel → face +X
    case 4: return -Math.PI / 2  // W travel → face -X
    default: return Math.PI
  }
}
