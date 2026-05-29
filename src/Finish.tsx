import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FinishLineProps {
  position: [number, number, number]
  roadWidth: number   // clear driving width (tile length − wall thickness)
  height: number      // gate / wall height
  // Y rotation in radians: 0 for N/S tracks, Math.PI/2 for E/W tracks
  rotationY?: number
  // Pass carWorldPos ref from Scene to enable crossing detection
  carPositionRef?: RefObject<THREE.Vector3>
  // Fires once per crossing. direction: 1 = crossed to +normal side, -1 = to −normal side.
  // For a N-travel track the "lap complete" crossing fires with -1; for S/E it's +1.
  onCross?: (direction: 1 | -1) => void
}

const STRIPS = 8
const STRIP_DEPTH = 1.0   // depth of painted stripe in the travel direction (m)
const POLE_R = 0.12
const BAR_T = 0.22        // bar thickness

export function FinishLine({
  position,
  roadWidth,
  height,
  rotationY = 0,
  carPositionRef,
  onCross,
}: FinishLineProps) {
  const lastSide = useRef<number | null>(null)

  // Plane normal — car crosses this to trigger. Computed once; finish line is static.
  // rotationY=0   → normal = +Z (gate spans X, N/S tracks)
  // rotationY=π/2 → normal = +X (gate spans Z, E/W tracks)
  const normal = useRef(new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY)))
  // Road-width axis (perpendicular to normal in XZ) — used to guard off-axis crossings
  const localX = useRef(new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY)))
  const origin = useRef(new THREE.Vector3(...position))
  const tmp    = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!onCross || !carPositionRef?.current) return

    tmp.current.copy(carPositionRef.current).sub(origin.current)

    const side = tmp.current.dot(normal.current) >= 0 ? 1 : -1

    if (lastSide.current !== null && lastSide.current !== side) {
      // Ignore crossings that happen far outside the gate (e.g. off the track)
      if (Math.abs(tmp.current.dot(localX.current)) <= roadWidth / 2 + 1) {
        onCross(side as 1 | -1)
      }
    }

    lastSide.current = side
  })

  const sw = roadWidth / STRIPS  // individual strip width

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Checkered floor stripe */}
      {Array.from({ length: STRIPS }, (_, i) => (
        <mesh key={i} position={[-roadWidth / 2 + (i + 0.5) * sw, 0.025, 0]}>
          <boxGeometry args={[sw, 0.05, STRIP_DEPTH]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#111111' : '#ffffff'} />
        </mesh>
      ))}

      {/* Left pole */}
      <mesh position={[-roadWidth / 2, height / 2, 0]}>
        <cylinderGeometry args={[POLE_R, POLE_R, height, 8]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Right pole */}
      <mesh position={[roadWidth / 2, height / 2, 0]}>
        <cylinderGeometry args={[POLE_R, POLE_R, height, 8]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Checkered top bar */}
      {Array.from({ length: STRIPS }, (_, i) => (
        <mesh key={`b${i}`} position={[-roadWidth / 2 + (i + 0.5) * sw, height, 0]}>
          <boxGeometry args={[sw, BAR_T, BAR_T]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#111111' : '#ffffff'} />
        </mesh>
      ))}
    </group>
  )
}
