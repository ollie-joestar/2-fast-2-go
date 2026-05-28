import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { initPhysics, createGround, createCarBody, createWall, type PhysicsContext } from './Physics'
import { CarController } from './CarController'
import { Input } from './Input'
import { Car } from './Car'

const HALF = 20
const WALL_H = 1.5
const WALL_T = 0.5

const WALL_DEFS: [number, number, number, number, number, number][] = [
  [0, WALL_H, -HALF, HALF * 2, WALL_H * 2, WALL_T * 2],  // north
  [0, WALL_H, HALF, HALF * 2, WALL_H * 2, WALL_T * 2],  // south
  [-HALF, WALL_H, 0, WALL_T * 2, WALL_H * 2, HALF * 2],  // west
  [HALF, WALL_H, 0, WALL_T * 2, WALL_H * 2, HALF * 2],  // east
]

interface SceneProps {
  onHudUpdate: (kmh: number, drifting: boolean) => void
}

export function Scene({ onHudUpdate }: SceneProps) {
  const carRef = useRef<THREE.Mesh>(null!)
  const physicsRef = useRef<PhysicsContext | null>(null)
  const carControllerRef = useRef<CarController | null>(null)
  const inputRef = useRef<Input | null>(null)
  const readyRef = useRef(false)

  const { camera } = useThree()
  const camPosRef = useRef(new THREE.Vector3(0, 8, -12))
  const camTargetRef = useRef(new THREE.Vector3())
  const fwdScratch = useRef(new THREE.Vector3())
  // Tracks car world position so camera can follow even before physics loads
  const carWorldPos = useRef(new THREE.Vector3())

  useEffect(() => {
    const input = new Input()
    inputRef.current = input

    initPhysics().then((physics) => {
      physicsRef.current = physics
      createGround(physics)
      createWall(physics, 0, WALL_H, -HALF, HALF, WALL_H, WALL_T)
      createWall(physics, 0, WALL_H, HALF, HALF, WALL_H, WALL_T)
      createWall(physics, -HALF, WALL_H, 0, WALL_T, WALL_H, HALF)
      createWall(physics, HALF, WALL_H, 0, WALL_T, WALL_H, HALF)
      carControllerRef.current = new CarController(createCarBody(physics))
      readyRef.current = true
    })

    return () => { input.destroy() }
  }, [])

  useFrame((_, dt) => {
    const clampedDt = Math.min(dt, 0.05)

    // Physics + car update (only once Rapier is ready)
    if (readyRef.current && physicsRef.current && carControllerRef.current && inputRef.current) {
      const car = carControllerRef.current
      const input = inputRef.current

      // Same 3-step order as the vanilla loop
      car.update(clampedDt, input)
      physicsRef.current.world.step()
      car.readbackFromBody()

      const pos = car.position
      carWorldPos.current.set(pos.x, pos.y, pos.z)
      carRef.current.position.set(pos.x, pos.y, pos.z)
      carRef.current.rotation.set(0, car.yaw, 0)

      onHudUpdate(car.velocity.length() * 3.6, input.handbrake)
    }

    // Camera always follows (uses origin until physics is ready)
    const yaw = carControllerRef.current?.yaw ?? 0
    fwdScratch.current.set(Math.sin(yaw), 0, Math.cos(yaw))
    const desired = carWorldPos.current.clone()
      .addScaledVector(fwdScratch.current, -7)
      .add(new THREE.Vector3(0, 4.5, 0))
    camPosRef.current.lerp(desired, Math.min(1, 6 * clampedDt))
    camera.position.copy(camPosRef.current)
    camTargetRef.current.set(carWorldPos.current.x, carWorldPos.current.y + 0.5, carWorldPos.current.z)
    camera.lookAt(camTargetRef.current)
  })

  return (
    <>
      {/* Lights */}
      <directionalLight
        color={0xfff5e0}
        intensity={2.5}
        position={[15, 30, 10]}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <ambientLight color={0x304060} intensity={1.2} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshLambertMaterial color={0x2a4a1e} />
      </mesh>

      {/* Grid */}
      <gridHelper args={[HALF * 2, 20, 0x1a1a1e, 0x2e2e20]} />

      {/* Arena walls */}
      {WALL_DEFS.map(([cx, cy, cz, w, h, d], i) => (
        <mesh key={i} position={[cx, cy, cz]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshLambertMaterial color={0x4c5e70} />
        </mesh>
      ))}

      {/* Car body */}
      <Car carRef={carRef} />
    </>
  )
}
