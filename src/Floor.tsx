import { useEffect } from 'react'
import type { PhysicsContext } from './Physics'

interface FloorProps {
  physics: PhysicsContext | null
  position: [number, number, number]
  width: number
  depth: number
  color?: number | string
}

export function Floor({ physics, position, width, depth, color = 0xf5f5dc }: FloorProps) {
  const height = 0.1 as number
  useEffect(() => {
    if (!physics) return
    const { world, R } = physics
    const [x, y, z] = position
    const body = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(x, y, z))
    world.createCollider(R.ColliderDesc.cuboid(width / 2, height, depth / 2), body)
    return () => { world.removeRigidBody(body) }
    // position/size won't change after mount — physics is the only reactive dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physics])

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshLambertMaterial color={color} />
    </mesh>
  )
}
