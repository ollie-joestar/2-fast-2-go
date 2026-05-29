# 2 Fast 2 Go — Project Context

## What it is
A browser-based 3D arcade car game built with React + React Three Fiber, intended to be embedded in a larger React website.

## Stack
- **React** v19 — entry via `src/main.tsx`
- **Renderer** — React Three Fiber (`@react-three/fiber` v9) wrapping Three.js
- **Physics** — Rapier 3D (`@dimforge/rapier3d-compat`) initialised async via WASM
- **Build** — Vite + TypeScript (strict, ESM, `moduleResolution: bundler`, `allowImportingTsExtensions: true`)
- **Styling** — Tailwind v4 + `src/index.css` global reset
- `@react-three/cannon` is in `package.json` but **not used** — Rapier is used directly
- `playroomkit` is installed but not yet wired up

## Entry point
`index.html` → `src/main.tsx` → `<App>` → R3F `<Canvas>` → `<Scene>`

## Source files (active)
| File | Role |
|---|---|
| `src/main.tsx` | React DOM entry — mounts `<App>` into `#root` |
| `src/App.tsx` | R3F `<Canvas>` setup + HUD overlay (DOM refs, no useState per frame) |
| `src/Scene.tsx` | R3F scene: `useFrame` game loop, owns physics init, camera follow, car sync |
| `src/Car.tsx` | Car visual mesh (body + cabin + headlights). Receives a `carRef` from `Scene` |
| `src/Track.tsx` | Fetches + parses a track file, renders `Segment` tiles, reports `carStart` via `onLoad` |
| `src/Segment.tsx` | One track tile: places the correct `Wall`/`Floor` components for a given direction digit |
| `src/Wall.tsx` | Visual + Rapier collider for a single wall panel; registers collider in `useEffect` |
| `src/Floor.tsx` | Visual + Rapier collider for a floor tile; registers collider in `useEffect` |
| `src/Checkpoint.tsx` | Debug-only wireframe gate; not shown in gameplay (`showCheckpoints={false}`) |
| `src/TrackTypes.ts` | Shared types: `TrackData`, `CheckpointDef`, `TrackLoadInfo` |
| `src/parseTrack.ts` | Parses the plain-text track file into `TrackData` |
| `src/buildCheckpoints.ts` | Walks the track circuit and returns `CheckpointDef[]` + `carStartFromData()` |
| `src/CarController.ts` | Arcade car logic: velocity, steering, drift/traction; writes into Rapier body each frame |
| `src/Input.ts` | Keyboard state (WASD / Arrows + Space) with `destroy()` for React cleanup |
| `src/options.ts` | `COLOR_SCHEMES` record (`default`, `sunset`, `night`) — only `default` active |
| `src/Map.tsx` | Empty stub — not yet implemented |

## Inactive / legacy files
- `src/main.ts` — old vanilla Three.js entry (no React), not loaded
- `src/old_main.tsx` — earlier React scaffolding attempt, not used

---

## Architecture

### Component tree
```
App
 └─ Canvas (R3F, fov=60, near=0.1, far=500, initial pos [0,8,-12])
     └─ Scene  (useFrame loop · owns physics init · camera)
         ├─ Track → Segment[] → Wall / Floor  (visual + colliders)
         └─ Car  (visual mesh, ref controlled by Scene)
 └─ HUD div (fixed overlay — DOM refs mutated each frame, no React state)
```

### Frame loop (`Scene.tsx` → `useFrame`)
Two concerns, separated deliberately:

1. **Physics + car** — guarded by `readyRef.current` (only after Rapier WASM loads):
   - `car.update(dt, input)` — writes desired linvel + rotation into Rapier body
   - `world.step()` — integrates positions, resolves collisions
   - `car.readbackFromBody()` — reads post-collision linvel back so traction doesn't fight walls
   - Syncs car mesh position/rotation from `car.position` / `car.yaw`

2. **Camera** — always runs, even before physics is ready:
   - Smooth third-person follow: lerps toward 7 units behind + 4.5 units above car
   - `camera.lookAt(carWorldPos)` every frame → scene visible immediately on load

### Physics passing pattern (two-phase)
`Scene` holds two references to the same Rapier context:
- `physicsRef` (ref) — zero-overhead access inside `useFrame`
- `physics` (useState) — triggers re-render so `Track` → `Segment` → `Wall`/`Floor` receive the context via props and each register their own Rapier collider in a `useEffect([physics])`. Cleanup removes the collider.

### Spawn race condition
Track file loading (HTTP fetch) and Rapier init (WASM) are both async and can resolve in either order. `Scene` handles this with `pendingCarStartRef`:
- Track loads **before** Rapier → `handleTrackLoad` stores `carStart` in `pendingCarStartRef`
- Rapier finishes → physics init callback checks `pendingCarStartRef` and calls `ctrl.teleportTo()`
- Track loads **after** Rapier → `handleTrackLoad` calls `teleportTo` immediately

---

## Track system

### File format (`/public/tracks/<name>`)
Plain text — header key/value pairs, then digit rows for the grid:
```
length = 36       # tile size in world units
width  = 1        # wall thickness
height = 5        # wall height
laps   = 2
start  = [3, 4]   # [row, col] of the start tile

00766690
79879730          # one char per tile; rows top-to-bottom
```

### Direction digit legend (numpad layout)
```
7 8 9
4   6
1 2 3
```
- `0` — empty (no geometry)
- `8/2` — N/S straight (walls on E + W sides)
- `4/6` — E/W straight (walls on N + S sides)
- `7/9/1/3` — NW / NE / SW / SE corners

### Available tracks
| File | Grid | Tile size | Laps |
|---|---|---|---|
| `ShippingDock` | 8×6 | 36 | 2 |
| `Arena` | 2×2 loop | 64 | 0 (free-roam) |

Active track is set in `Scene.tsx`: `trackPath="/tracks/ShippingDock"`

---

## Car

- **Visual** (`Car.tsx`): `BoxGeometry(1, 0.5, 2)` body + cabin child mesh + two `Headlight` sub-components
- **Collider** (`Physics.ts`): `cuboid(0.5, 0.25, 1.0)` half-extents; rotation locked — yaw set manually each frame
- **Config** (`CarController.config`):

| Field | Default | Meaning |
|---|---|---|
| `acceleration` | 28 | units/s² forward thrust |
| `reverseAcceleration` | 18 | units/s² reverse |
| `maxSpeed` | 38 | units/s cap |
| `drag` | 0.5 | speed fraction lost/second off-throttle |
| `steeringStrength` | 2.4 | rad/s yaw rate |
| `traction` | 1.5 | grip — blend rate toward forward dir |
| `brakeTraction` | 0.5 | grip while Space held (lower = more drift) |

- **`teleportTo(x, y, z)`** — resets position + zeroes velocity; used for spawning at track start

---

## Color schemes (`options.ts`)
`COLOR_SCHEMES` defines `default`, `sunset`, `night`. Only `default` is currently active.
Each scheme has: `directionalLight`, `ambientLight`, `fog` (tuple), `floor`, `wall`, `sky`, `car`.
Used in `App.tsx` (background/fog), `Scene.tsx` (lights), `Car.tsx` (car color), `Track.tsx` → `Segment` (wall/floor colors).

---

## Controls
| Key | Action |
|---|---|
| W / ↑ | Accelerate |
| S / ↓ | Reverse |
| A / ← | Steer left |
| D / → | Steer right |
| Space | Handbrake / drift |

---

## Important Vite note
Always import `.tsx` files with an explicit extension:
```ts
import { Scene } from './Scene.tsx'   // ✓
import { Scene } from './Scene'       // ✗ — Vite resolves .ts before .tsx
```
Valid because `allowImportingTsExtensions: true` is set in `tsconfig.app.json`.

## Dev commands
```
npm run dev      # Vite dev server
npm run build    # tsc + vite build
npm run preview  # preview production build
```
