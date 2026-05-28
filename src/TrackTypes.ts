export interface CheckpointDef {
  position: [number, number, number]
  size: [number, number, number]        // AABB used for collision detection
  visualSize?: [number, number, number] // geometry for debug rendering (defaults to size)
  rotation?: [number, number, number]   // Euler angles (corners get a Y rotation)
  color?: string
}

export interface TrackData {
  length: number    // tile size in world units
  width: number     // wall thickness
  height: number    // wall height
  laps: number
  startRow: number
  startCol: number
  grid: number[][]  // 0=empty, 8/2/4/6=straights, 7/9/1/3=corners
}

export interface TrackLoadInfo {
  carStart: [number, number, number]
  checkpoints: CheckpointDef[]
  laps: number
}
