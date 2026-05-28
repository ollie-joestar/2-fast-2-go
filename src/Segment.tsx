import { Wall } from './Wall'
import type { PhysicsContext } from './Physics'

// Direction legend (numpad layout):
//   7 8 9
//   4   6
//   1 2 3
//
// Straights: 8/2 = N/S (walls on E+W), 4/6 = E/W (walls on N+S)
// Corners:   7=NW(N+W), 9=NE(N+E), 1=SW(S+W), 3=SE(S+E)

interface SegmentProps {
  physics: PhysicsContext | null
  position: [number, number, number]  // tile centre (x, 0, z)
  length: number                      // tile size in world units
  wallWidth: number                   // wall thickness
  wallHeight: number
  direction: number
  color?: number | string
}

export function Segment({ physics, position, length, wallWidth, wallHeight, direction, color }: SegmentProps) {
  const [cx, , cz] = position
  const y = wallHeight / 2
  // Wall centres sit half a wall-width inward from the tile edge
  const half = length / 2 - wallWidth / 2

  const wallN = (
    <Wall
      physics={physics}
      position={[cx, y, cz - half]}
      width={length}
      height={wallHeight}
      depth={wallWidth}
      color={color}
    />
  )
  const wallS = (
    <Wall
      physics={physics}
      position={[cx, y, cz + half]}
      width={length}
      height={wallHeight}
      depth={wallWidth}
      color={color}
    />
  )
  const wallE = (
    <Wall
      physics={physics}
      position={[cx + half, y, cz]}
      width={wallWidth}
      height={wallHeight}
      depth={length}
      color={color}
    />
  )
  const wallW = (
    <Wall
      physics={physics}
      position={[cx - half, y, cz]}
      width={wallWidth}
      height={wallHeight}
      depth={length}
      color={color}
    />
  )

  switch (direction) {
    case 8: case 2: return <>{wallE}{wallW}</>   // N/S straight
    case 4: case 6: return <>{wallN}{wallS}</>   // E/W straight
    case 7: return <>{wallN}{wallW}</>            // NW corner
    case 9: return <>{wallN}{wallE}</>            // NE corner
    case 1: return <>{wallS}{wallW}</>            // SW corner
    case 3: return <>{wallS}{wallE}</>            // SE corner
    default: return null
  }
}
