// Scene.tsx
import { Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei"
import { Suspense } from "react"

export function Scene() {
  return (
    <Suspense fallback={null}>
      <Environment files="/textures/skybox_sky.hdr" background={true} />
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls />
    </Suspense>
  );
}
