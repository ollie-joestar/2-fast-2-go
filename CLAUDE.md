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
| `src/App.tsx` | R3F `<Canvas>` setup + HUD overlay (DOM refs, no useState per frame); owns `showDebug` state and 'I' key toggle |
| `src/Scene.tsx` | R3F scene: `useFrame` game loop, owns physics init, camera follow, car sync, checkpoint tracking, lap timing |
| `src/Car.tsx` | Car visual — GLTF model (`/models/ae86.glb`) via `useGLTF`; accepts `showdebug` prop to overlay a green wireframe collision box |
| `src/Track.tsx` | Fetches + parses a track file, renders `Segment` tiles + `FinishLine`; reports `carStart`/`carYaw` via `onLoad` |
| `src/Finish.tsx` | Start/finish line — checkered floor strips + poles + top bar; plane-crossing detection in `useFrame` (no Rapier) fires `onCross` |
| `src/Segment.tsx` | One track tile: places the correct `Wall`/`Floor` components for a given direction digit |
| `src/Wall.tsx` | Visual + Rapier collider for a single wall panel; registers collider in `useEffect` |
| `src/Floor.tsx` | Visual + Rapier collider for a floor tile; registers collider in `useEffect` |
| `src/Checkpoint.tsx` | Debug-only wireframe gate; visible only when `showCheckpoints={showDebug}` |
| `src/TrackTypes.ts` | Shared types: `TrackData`, `CheckpointDef`, `TrackLoadInfo` |
| `src/parseTrack.ts` | Parses the plain-text track file into `TrackData` |
| `src/buildCheckpoints.ts` | Walks the track circuit, returns `CheckpointDef[]` + `carStartFromData()` + `carYawFromData()` |
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
App  (owns showDebug state — toggled by 'I' key)
 └─ Canvas (R3F, fov=60, near=0.1, far=500, initial pos [0,8,-12])
     └─ Scene  (useFrame loop · physics init · camera · lap timer · checkpoint tracking)
         ├─ Track → Segment[] → Wall / Floor  (visual + colliders)
         │       └─ FinishLine  (visual + plane-crossing trigger)
         │       └─ Checkpoint[]  (debug wireframes, visible when showDebug)
         └─ Car  (GLTF model + optional debug wireframe)
 └─ HUD div (top-left — speed + lap/best/last, DOM refs, no React state per frame)
 └─ Debug overlay div (bottom-right — pos/CPs/next gates, hidden until 'I' pressed)
```

### Frame loop (`Scene.tsx` → `useFrame`)
Three concerns, separated deliberately:

1. **Physics + car** — guarded by `readyRef.current` (only after Rapier WASM loads):
   - `car.update(dt, input)` — writes desired linvel + rotation into Rapier body
   - `world.step()` — integrates positions, resolves collisions
   - `car.readbackFromBody()` — reads post-collision linvel back so traction doesn't fight walls
   - Syncs car mesh position/rotation from `car.position` / `car.yaw`
   - **Checkpoint AABB detection** — XZ half-extent test against `checkpoints[nextCp]`; on hit, increments `nextCpRef`
   - Calls `onHudUpdate` (speed + lap times) and `onDebugUpdate` (position + checkpoint data) each frame

2. **Camera** — always runs, even before physics is ready:
   - Smooth third-person follow: lerps toward 7 units behind + 4.5 units above car
   - `camera.lookAt(carWorldPos)` every frame → scene visible immediately on load

3. **Finish line detection** (`Finish.tsx` → `useFrame`, fires after Scene's frame):
   - Signed plane test: `dot(carPos − origin, normal)` sign change = crossing
   - Width guard prevents triggering outside the gate
   - Calls `onCross(direction)` once per crossing

### Physics passing pattern (two-phase)
`Scene` holds two references to the same Rapier context:
- `physicsRef` (ref) — zero-overhead access inside `useFrame`
- `physics` (useState) — triggers re-render so `Track` → `Segment` → `Wall`/`Floor` receive the context via props and each register their own Rapier collider in a `useEffect([physics])`. Cleanup removes the collider.

### Spawn race condition
Track file loading (HTTP fetch) and Rapier init (WASM) are both async and can resolve in either order. `Scene` handles this with two pending refs:
- Track loads **before** Rapier → `handleTrackLoad` stores `carStart` + `carYaw` in `pendingCarStartRef` / `pendingCarYawRef`
- Rapier finishes → physics init callback checks the pending refs and calls `ctrl.teleportTo(x, y, z, yaw)`
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

- **Visual** (`Car.tsx`): GLTF model loaded from `/models/ae86.glb` via `useGLTF`; scale 0.5, offset `[0, 0.1, 0]`, rotated 180° around Y. A green wireframe box (`1 × 0.5 × 2.2`) showing the collision shape is shown as a child mesh when `showdebug` is true.
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

- **`teleportTo(x, y, z, yaw?)`** — resets position + zeroes velocity; optionally sets heading and pushes the quaternion to the Rapier body immediately

---

## Lap system

### Start/finish line (`Finish.tsx`)
- Rendered by `Track` at world origin `[0, 0, 0]` (the start tile is always at origin)
- Gate orientation derived from start cell direction: N/S tracks → `rotationY=0`, E/W tracks → `rotationY=π/2`
- Detection: signed plane test each frame, no Rapier sensor needed
- `onCross(direction)` fires once per crossing; `direction = -1` means crossed going forward on N-travel tracks

### Checkpoint validation
- `buildCheckpoints` returns one `CheckpointDef` per tile, walked in circuit order
- `Scene` stores the array and tracks `nextCpRef` (index of next required gate)
- Each frame: XZ AABB test against `checkpoints[nextCp]`; on hit, `nextCp++`
- The start tile checkpoint (index 0) is skipped — the finish crossing covers it; `nextCp` starts at 1 after each finish crossing

### Lap counting rules
| Scenario | Result |
|---|---|
| First finish crossing | Timer starts; `nextCp = 1` |
| Finish crossing with `nextCp < total` | Ignored (shortcut detected) |
| Finish crossing with all checkpoints cleared | Lap recorded; timer restarts; `nextCp = 1` |

### `TrackLoadInfo` fields
```ts
carStart: [number, number, number]  // spawn position
carYaw:   number                    // spawn heading (radians around Y)
checkpoints: CheckpointDef[]        // ordered gate list for the full circuit
laps:     number                    // target lap count from track file
```

---

## HUD & debug overlay

### Main HUD (top-left, always visible)
- **Speed** — updated every frame via `onHudUpdate` callback (DOM ref, no React state)
- **Lap** — current lap elapsed time (counting from first finish crossing)
- **Best** — best completed lap time this session
- **Last** — most recently completed lap time

Time format: `M:SS.cc` (e.g. `1:23.04`)

### Debug overlay (bottom-right, toggled by `I`)
- **Pos** — car world XZ position
- **CPs** — checkpoints passed this lap / total required
- **CP+1/2/3** — XZ midpoints of the next 3 upcoming checkpoint gates (useful for AI path following)

`showDebug` is `useState` in `App.tsx`, passed as a prop to `Scene` (for `showCheckpoints`) and `Car` (for the wireframe). The 'I' `keydown` handler calls `setShowDebug(v => !v)` — a single state flip controls all three debug visuals.

---

## Color schemes (`options.ts`)
`COLOR_SCHEMES` defines `default`, `sunset`, `night`. Only `default` is currently active.
Each scheme has: `directionalLight`, `ambientLight`, `fog` (tuple), `floor`, `wall`, `sky`, `car`.
Used in `App.tsx` (background/fog), `Scene.tsx` (lights), `Track.tsx` → `Segment` (wall/floor colors).

---

## Controls
| Key | Action |
|---|---|
| W / ↑ | Accelerate |
| S / ↓ | Reverse |
| A / ← | Steer left |
| D / → | Steer right |
| Space | Handbrake / drift |
| I | Toggle debug overlay + checkpoint wireframes + collision box |

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
