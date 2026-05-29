import { Wall } from './Wall'
import { Floor } from './Floor'
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
  wallColor?: number | string
  floorColor?: number | string
}

export function Segment({ physics, position, length, wallWidth, wallHeight, direction, wallColor, floorColor }: SegmentProps) {
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
      color={wallColor}
    />
  )
  const wallS = (
    <Wall
      physics={physics}
      position={[cx, y, cz + half]}
      width={length}
      height={wallHeight}
      depth={wallWidth}
      color={wallColor}
    />
  )
  const wallE = (
    <Wall
      physics={physics}
      position={[cx + half, y, cz]}
      width={wallWidth}
      height={wallHeight}
      depth={length}
      color={wallColor}
    />
  )
  const wallW = (
    <Wall
      physics={physics}
      position={[cx - half, y, cz]}
      width={wallWidth}
      height={wallHeight}
      depth={length}
      color={wallColor}
    />
  )
  const floor = (
    <Floor
      physics={physics}
      position={[cx, -0.1, cz]}
      width={length}
      depth={length}
      color={floorColor}
    />
  )

  switch (direction) {
    case 8: case 2: return <>{wallE}{wallW}{floor}</>   // N/S straight
    case 4: case 6: return <>{wallN}{wallS}{floor}</>   // E/W straight
    case 7: return <>{wallN}{wallW}{floor}</>            // NW corner
    case 9: return <>{wallN}{wallE}{floor}</>            // NE corner
    case 1: return <>{wallS}{wallW}{floor}</>            // SW corner
    case 3: return <>{wallS}{wallE}{floor}</>            // SE corner
    default: return null
  }
}
