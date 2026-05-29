import * as THREE from 'three'
import { useGLTF } from "@react-three/drei"

interface CarProps {
  showdebug: boolean
  carRef: React.RefObject<THREE.Mesh>
}

export function Car({ showdebug, carRef }: CarProps) {

  const { scene } = useGLTF('/models/ae86.glb')
  // scene.traverse((child) => {
  //   if (child instanceof THREE.Mesh) {
  //     child.castShadow = true
  //     child.receiveShadow = true
  //   }
  // }
  // )
  return (
    <>
      {/* Car body */}
      <mesh ref={carRef} castShadow>
        <primitive object={scene} scale={0.5} position={[0, 0.1, 0]} rotation={[0, Math.PI, 0]} />
        {showdebug && (
          <mesh>
            <boxGeometry args={[1, 0.5, 2.2]} />
            <meshBasicMaterial wireframe color="#00ff88" />
          </mesh>
        )}
      </mesh>
    </>
  )
}

useGLTF.preload('/models/ae86.glb')
