import type { CheckpointDef } from './TrackTypes'

interface CheckpointProps extends CheckpointDef {
  visible?: boolean
}

// Debug-only visual. Renders a wireframe box showing the checkpoint gate.
// Collision detection is done in the parent via AABB checks in useFrame —
// this component is purely for development visibility.
export function Checkpoint({ position, size, visualSize, rotation, color = 'cyan', visible = true }: CheckpointProps) {
  if (!visible) return null

  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]}>
      <boxGeometry args={visualSize ?? size} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  )
}
