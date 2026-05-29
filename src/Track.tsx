import { useState, useEffect, useMemo } from 'react'
import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import { Segment } from './Segment.tsx'
import { Checkpoint } from './Checkpoint.tsx'
import { FinishLine } from './Finish.tsx'
import { parseTrack } from './parseTrack'
import { buildCheckpoints, carStartFromData, carYawFromData } from './buildCheckpoints'
import { COLOR_SCHEMES } from './options.ts'
import type { PhysicsContext } from './Physics'
import type { TrackData, TrackLoadInfo } from './TrackTypes'

interface TrackProps {
  physics: PhysicsContext | null
  // Path relative to /public, e.g. '/tracks/ShippingDock'
  trackPath?: string
  // Show wireframe checkpoint gates (useful during development)
  showCheckpoints?: boolean
  // Called once after the track file is parsed
  onLoad?: (info: TrackLoadInfo) => void
  // Wire up to carWorldPos ref in Scene to enable crossing detection
  carPositionRef?: RefObject<Vector3>
  // Fired once per finish line crossing; direction sign matches FinishLine docs
  onFinishCross?: (direction: 1 | -1) => void
}

export function Track({
  physics,
  trackPath = '/tracks/ShippingDock',
  showCheckpoints = false,
  onLoad,
  carPositionRef,
  onFinishCross,
}: TrackProps) {
  const [data, setData] = useState<TrackData | null>(null)

  useEffect(() => {
    fetch(trackPath)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load track: ${trackPath} (${r.status})`)
        return r.text()
      })
      .then(text => {
        const parsed = parseTrack(text)
        setData(parsed)
        onLoad?.({
          carStart: carStartFromData(parsed),
          carYaw: carYawFromData(parsed),
          checkpoints: buildCheckpoints(parsed),
          laps: parsed.laps,
        })
      })
      .catch(err => console.error('[Track]', err))
    // trackPath should not change at runtime; onLoad is intentionally excluded
    // to avoid re-fetching when the callback reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackPath])

  // Flat list of non-empty tiles with their world-space centre positions
  const segments = useMemo(() => {
    if (!data) return []
    const { length, startRow, startCol, grid } = data
    const result: { r: number; c: number; dir: number; pos: [number, number, number] }[] = []
    grid.forEach((row, r) => {
      row.forEach((dir, c) => {
        if (dir !== 0) result.push({
          r, c, dir,
          pos: [(c - startCol) * length, 0, (r - startRow) * length],
        })
      })
    })
    return result
  }, [data])

  const checkpoints = useMemo(() => (data ? buildCheckpoints(data) : []), [data])

  if (!data) return null

  const { length, width, height } = data

  // E/W-travel start cells (4=W, 6=E) need a π/2 gate so it spans the Z axis
  const startDir = data.grid[data.startRow]?.[data.startCol] ?? 8
  const finishRotY = (startDir === 4 || startDir === 6) ? Math.PI / 2 : 0

  return (
    <>
      {segments.map(seg => (
        <Segment
          key={`${seg.r}-${seg.c}`}
          physics={physics}
          position={seg.pos}
          length={length}
          wallWidth={width}
          wallHeight={height}
          direction={seg.dir}
          wallColor={COLOR_SCHEMES.default.wall}
          floorColor={COLOR_SCHEMES.default.floor}
        />
      ))}

      {showCheckpoints && checkpoints.map((cp, i) => (
        <Checkpoint key={i} {...cp} />
      ))}

      {/* Start tile is always at world origin — all segment positions are relative to it */}
      <FinishLine
        position={[0, 0, 0]}
        roadWidth={length - width}
        height={height}
        rotationY={finishRotY}
        carPositionRef={carPositionRef}
        onCross={onFinishCross}
      />
    </>
  )
}
