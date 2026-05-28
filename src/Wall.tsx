import { useEffect } from 'react'
import type { PhysicsContext } from './Physics'

interface WallProps {
  physics: PhysicsContext | null
  position: [number, number, number]
  width: number
  height: number
  depth: number
  color?: number | string
}

export function Wall({ physics, position, width, height, depth, color = 0xc0c0c0 }: WallProps) {
  useEffect(() => {
    if (!physics) return
    const { world, R } = physics
    const [x, y, z] = position
    const body = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(x, y, z))
    world.createCollider(R.ColliderDesc.cuboid(width / 2, height / 2, depth / 2), body)
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
