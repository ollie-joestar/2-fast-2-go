# 2 Fast 2 Go — Project Context

## What it is
A browser-based 3D arcade car game. One player, keyboard controls. Built with React + React Three Fiber, intended to be embedded in a larger React website.

## Stack
- **React**: v19, entry via `src/main.tsx`
- **Renderer**: React Three Fiber (`@react-three/fiber` v9) wrapping Three.js
- **Physics**: Rapier 3D (`@dimforge/rapier3d-compat`) — initialised async via WASM
- **Build**: Vite + TypeScript (strict, ESM, `moduleResolution: bundler`)
- **Styling**: Tailwind v4 (via `@tailwindcss/vite` plugin) + `src/index.css` for global reset
- **Multiplayer stub**: `playroomkit` is installed but not yet wired up
- `@react-three/cannon` is in `package.json` but **not used** — we use Rapier directly

## Entry point
`index.html` → `src/main.tsx` → `<App>` → R3F `<Canvas>` → `<Scene>`

## Source files (active)
| File | Role |
|---|---|
| `src/main.tsx` | React DOM entry — mounts `<App>` into `#root` |
| `src/App.tsx` | R3F `<Canvas>` setup + HUD HTML overlay; HUD is updated via DOM refs (no state) to avoid per-frame re-renders |
| `src/Scene.tsx` | R3F scene: all Three.js meshes as JSX + `useFrame` game loop |
| `src/Physics.ts` | Rapier init + factory helpers (ground, car body, walls) |
| `src/CarController.ts` | Arcade car movement: velocity, steering, drift/traction, pushes into Rapier body each frame |
| `src/Input.ts` | Keyboard state (WASD / Arrows + Space) with `destroy()` for React cleanup |

## Inactive / legacy files
- `src/main.ts` — old vanilla Three.js entry (no React), no longer loaded
- `src/old_main.tsx` — earlier React scaffolding attempt, not used

## Architecture pattern

### Component tree
```
App
 └─ Canvas (R3F, fov=60, initial position [0,8,-12])
     └─ Scene (useFrame game loop, all meshes)
 └─ HUD div (fixed overlay, refs updated imperatively each frame)
```

### Frame loop in `Scene.tsx` (`useFrame`)
Two separate concerns run every frame:

1. **Physics + car** (guarded — only runs after Rapier async init):
   - `car.update(dt, input)` — arcade logic writes desired velocity into Rapier body
   - `world.step()` — Rapier integrates positions and resolves wall collisions
   - `car.readbackFromBody()` — re-reads post-collision linvel back into `car.velocity`
   - Sync car mesh position/rotation from `car.position` / `car.yaw`

2. **Camera** (always runs, even before physics loads):
   - Smooth third-person follow: lerps toward 7 units behind + 4.5 units above car
   - `camera.lookAt(carWorldPos)` called every frame so the scene is always visible

### Why camera is outside the physics guard
The R3F default camera has no `lookAt` set — it faces -Z by default and misses the scene at origin. Running `camera.lookAt` unconditionally means the scene is visible immediately on load, before Rapier WASM finishes.

### HUD update strategy
`onHudUpdate` callback passed from `App` → `Scene`, called in `useFrame`. `App` holds refs to `<span>` elements and mutates `.textContent` / `.style.display` directly — no `useState`, no re-renders on every frame.

## Arena
40×40 play area (±20 units). Four fixed Rapier wall colliders around the perimeter, mirrored by `<mesh>` JSX. Ground is a fixed Rapier cuboid + `<planeGeometry>`.

## Car
- Visual: `<boxGeometry args={[1, 0.5, 2]}>` red body, darker cabin child mesh, headlight child meshes
- Collider: `cuboid(0.5, 0.25, 1.0)` half-extents
- Physics rotation disabled on all axes; yaw set manually via `setRotation` each frame
- Tunable via `CarController.config` (`CarConfig` interface): `acceleration`, `reverseAcceleration`, `maxSpeed`, `drag`, `steeringStrength`, `traction`, `brakeTraction`

## Controls
| Key | Action |
|---|---|
| W / ↑ | Accelerate |
| S / ↓ | Reverse |
| A / ← | Steer left |
| D / → | Steer right |
| Space | Handbrake / drift |

## Important Vite note
Import `Scene` with explicit extension — `import { Scene } from './Scene.tsx'` — not `'./Scene'`. Vite resolves `.ts` before `.tsx` in its default extension order, which would pick up a stale/missing file otherwise.

## Dev commands
```
npm run dev      # Vite dev server
npm run build    # tsc + vite build
npm run preview  # preview production build
```
