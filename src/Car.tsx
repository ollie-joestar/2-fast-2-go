import { useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { COLOR_SCHEMES } from './options.ts'

function Headlight({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.SpotLight>(null!)
  const targetRef = useRef<THREE.Object3D>(null!)

  useLayoutEffect(() => {
    lightRef.current.target = targetRef.current
  }, [])

  return (
    <>
      <mesh position={position}>
        <boxGeometry args={[0.18, 0.1, 0.05]} />
        <meshLambertMaterial color={0xffffaa} emissive={0xffff66} emissiveIntensity={0.6} />
      </mesh>
      {/* <spotLight */}
      {/*   ref={lightRef} */}
      {/*   position={position} */}
      {/*   angle={Math.PI / 6} */}
      {/*   penumbra={0.2} */}
      {/*   intensity={30} */}
      {/*   distance={25} */}
      {/*   color={COLOR_SCHEMES.default.directionalLight} */}
      {/* /> */}
      {/* Target sits 12 units forward in local car space — moves with the car */}
      < object3D ref={targetRef} position={[position[0], position[1], position[2] + 12]} />
    </>
  )
}

export function Car({ carRef }: { carRef: React.RefObject<THREE.Mesh> }) {
  return (
    <>
      {/* Car body */}
      <mesh ref={carRef} castShadow>
        <boxGeometry args={[1, 0.5, 2]} />
        <meshLambertMaterial color={COLOR_SCHEMES.default.car} />

        {/* Cabin */}
        <mesh position={[0, 0.41, -0.15]}>
          <boxGeometry args={[0.75, 0.32, 0.95]} />
          <meshLambertMaterial color={COLOR_SCHEMES.default.car} />
        </mesh>

        {/* Headlights with spotlights */}
        <Headlight position={[-0.35, 0.05, 1.03]} />
        <Headlight position={[0.35, 0.05, 1.03]} />
      </mesh>
    </>
  )
}
