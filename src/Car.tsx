import * as THREE from 'three'

export function Car({ carRef }: { carRef: React.RefObject<THREE.Mesh> }) {
  return (
    <>
      {/* Car body */}
      <mesh ref={carRef} castShadow>
        <boxGeometry args={[1, 0.5, 2]} />
        <meshLambertMaterial color={0xB60000} />

        {/* Cabin */}
        <mesh position={[0, 0.41, -0.15]}>
          <boxGeometry args={[0.75, 0.32, 0.95]} />
          <meshLambertMaterial color={0xb60000} />
        </mesh>

        {/* Headlights */}
        {([-0.35, 0.35] as const).map((xOff) => (
          <mesh key={xOff} position={[xOff, 0.05, 1.03]}>
            <boxGeometry args={[0.18, 0.1, 0.05]} />
            <meshLambertMaterial color={0xffffaa} emissive={0xffff66} emissiveIntensity={0.6} />
          </mesh>
        ))}
      </mesh>
    </>
  )
}
