interface FloorProps {
  position: [number, number, number]
  width: number
  depth: number
  color?: number | string
}

export function Floor({ position, width, depth, color = 0xf5f5dc }: FloorProps) {
  const height = 0.1 as number
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshLambertMaterial color={color} />
    </mesh>
  )
}
