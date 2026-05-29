import { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { initPhysics, createCarBody, type PhysicsContext } from './Physics'
import { CarController } from './CarController'
import { Input } from './Input'
import { Car } from './Car.tsx'
import { Track } from './Track.tsx'
import { RemoteCarRenderer } from './RemoteCarRenderer.tsx'
import type { TrackLoadInfo, CheckpointDef } from './TrackTypes'
import type { RemotePlayer } from './useMultiplayer.ts'
import { COLOR_SCHEMES } from './options.ts'

// Module-level scratch objects — no per-frame allocation
const _quatScratch = new THREE.Quaternion()
const _yAxis = new THREE.Vector3(0, 1, 0)

interface SceneProps {
  onHudUpdate: (kmh: number, lapMs: number | null, bestMs: number | null, lastMs: number | null) => void
  onDebugUpdate?: (carX: number, carZ: number, cpsPassed: number, cpsTotal: number, next3: [number, number][]) => void
  showDebug?: boolean
  // Multiplayer
  remotePlayers?: RemotePlayer[]
  broadcast?: (pos: [number, number, number], quat: [number, number, number, number], lap: number, cp: number) => void
  onProgressUpdate?: (lap: number, cp: number) => void
}

export function Scene({
  onHudUpdate,
  onDebugUpdate,
  showDebug = false,
  remotePlayers,
  broadcast,
  onProgressUpdate,
}: SceneProps) {
  const carRef = useRef<THREE.Mesh>(null!)
  const physicsRef = useRef<PhysicsContext | null>(null)
  const [physics, setPhysics] = useState<PhysicsContext | null>(null)
  const carControllerRef = useRef<CarController | null>(null)
  const inputRef = useRef<Input | null>(null)
  const readyRef = useRef(false)
  const pendingCarStartRef = useRef<[number, number, number] | null>(null)
  const pendingCarYawRef = useRef<number | null>(null)
  const lapStartRef = useRef<number | null>(null)
  const bestLapRef = useRef<number | null>(null)
  const lastLapRef = useRef<number | null>(null)
  const checkpointsRef = useRef<CheckpointDef[]>([])
  const nextCpRef = useRef(0)
  const currentLapRef = useRef(0)

  const { camera } = useThree()
  const camPosRef = useRef(new THREE.Vector3(0, 8, -12))
  const camTargetRef = useRef(new THREE.Vector3())
  const fwdScratch = useRef(new THREE.Vector3())
  const carWorldPos = useRef(new THREE.Vector3())

  useEffect(() => {
    const input = new Input()
    inputRef.current = input

    initPhysics().then((ctx) => {
      physicsRef.current = ctx
      const ctrl = new CarController(createCarBody(ctx))
      carControllerRef.current = ctrl
      if (pendingCarStartRef.current) {
        const [x, y, z] = pendingCarStartRef.current
        ctrl.teleportTo(x, y, z, pendingCarYawRef.current ?? undefined)
        pendingCarStartRef.current = null
        pendingCarYawRef.current = null
      }
      readyRef.current = true
      setPhysics(ctx)
    })

    return () => { input.destroy() }
  }, [])

  const handleFinishCross = useCallback(() => {
    const now = performance.now()
    const cps = checkpointsRef.current

    if (lapStartRef.current === null) {
      lapStartRef.current = now
      nextCpRef.current = 1
      currentLapRef.current = 1
      onProgressUpdate?.(1, 1)
      return
    }

    if (nextCpRef.current < cps.length) return

    const lapMs = now - lapStartRef.current
    lastLapRef.current = lapMs
    if (bestLapRef.current === null || lapMs < bestLapRef.current) {
      bestLapRef.current = lapMs
    }
    lapStartRef.current = now
    nextCpRef.current = 1
    currentLapRef.current++
    onProgressUpdate?.(currentLapRef.current, 1)
  }, [onProgressUpdate])

  const handleTrackLoad = useCallback(({ carStart, carYaw, checkpoints }: TrackLoadInfo) => {
    checkpointsRef.current = checkpoints
    if (carControllerRef.current) {
      carControllerRef.current.teleportTo(carStart[0], carStart[1], carStart[2], carYaw)
    } else {
      pendingCarStartRef.current = carStart
      pendingCarYawRef.current = carYaw
    }
  }, [])

  useFrame((_, dt) => {
    const clampedDt = Math.min(dt, 0.05)

    if (readyRef.current && physicsRef.current && carControllerRef.current && inputRef.current) {
      const car = carControllerRef.current
      const input = inputRef.current

      car.update(clampedDt, input)
      physicsRef.current.world.step()
      car.readbackFromBody()

      const pos = car.position
      carWorldPos.current.set(pos.x, pos.y, pos.z)
      carRef.current.position.set(pos.x, pos.y, pos.z)
      carRef.current.rotation.set(0, car.yaw, 0)

      // Checkpoint AABB detection
      const cps = checkpointsRef.current
      const nextIdx = nextCpRef.current
      if (nextIdx < cps.length) {
        const cp = cps[nextIdx]
        if (
          Math.abs(carWorldPos.current.x - cp.position[0]) <= cp.size[0] / 2 &&
          Math.abs(carWorldPos.current.z - cp.position[2]) <= cp.size[2] / 2
        ) {
          nextCpRef.current++
          onProgressUpdate?.(currentLapRef.current, nextCpRef.current)
        }
      }

      // Broadcast position + race progress to other players
      if (broadcast) {
        _quatScratch.setFromAxisAngle(_yAxis, car.yaw)
        broadcast(
          [pos.x, pos.y, pos.z],
          [_quatScratch.x, _quatScratch.y, _quatScratch.z, _quatScratch.w],
          currentLapRef.current,
          nextCpRef.current,
        )
      }

      const lapMs = lapStartRef.current !== null ? performance.now() - lapStartRef.current : null
      onHudUpdate(car.velocity.length() * 3.6, lapMs, bestLapRef.current, lastLapRef.current)

      if (onDebugUpdate && cps.length > 0) {
        const ni = nextCpRef.current
        const next3 = Array.from({ length: 3 }, (_, i): [number, number] => {
          const cp = cps[(ni + i) % cps.length]
          return [cp.position[0], cp.position[2]]
        })
        onDebugUpdate(carWorldPos.current.x, carWorldPos.current.z, Math.max(0, ni - 1), cps.length - 1, next3)
      }
    }

    // Camera always follows
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
      <directionalLight
        color={COLOR_SCHEMES.default.directionalLight}
        intensity={2.5}
        position={[15, 30, 10]}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <ambientLight color={COLOR_SCHEMES.default.ambientLight} intensity={1.2} />

      <Track
        physics={physics}
        trackPath="/tracks/ShippingDock"
        showCheckpoints={showDebug}
        onLoad={handleTrackLoad}
        carPositionRef={carWorldPos}
        onFinishCross={handleFinishCross}
      />

      <Car showdebug={showDebug} carRef={carRef} />

      {remotePlayers?.map(remote => (
        <RemoteCarRenderer key={remote.id} remote={remote} />
      ))}
    </>
  )
}
