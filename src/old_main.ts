import * as THREE from 'three';
import { initPhysics, createGround, createCarBody, createWall } from './Physics';
import { CarController } from './CarController';
import { Input } from './Input';

// ── Arena dimensions ─────────────────────────────────────────────────────────
const HALF = 20;          // arena half-extent → 40×40 play area
const WALL_H = 1.5;       // wall half-height
const WALL_T = 0.5;       // wall half-thickness

// ── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.FogExp2(0x1a1a2e, 0.018);

// ── Camera ───────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 8, -12);
camera.lookAt(0, 0, 0);

// ── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
// renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Lights ───────────────────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xfff5e0, 2.5);
sun.position.set(15, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x304060, 1.2));

// ── Ground ───────────────────────────────────────────────────────────────────
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(HALF * 2, HALF * 2),
  new THREE.MeshLambertMaterial({ color: 0x2a3a1e }),
);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// Grid for visual speed reference
scene.add(new THREE.GridHelper(HALF * 2, 20, 0x3a4a2e, 0x2e3e22));

// ── Walls (visual) ───────────────────────────────────────────────────────────
const wallMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });

// Each entry: [cx, cy, cz, width, height, depth]  (full extents for BoxGeometry)
const wallDefs: [number, number, number, number, number, number][] = [
  [0, WALL_H, -HALF, HALF * 2, WALL_H * 2, WALL_T * 2],  // north
  [0, WALL_H, HALF, HALF * 2, WALL_H * 2, WALL_T * 2],  // south
  [-HALF, WALL_H, 0, WALL_T * 2, WALL_H * 2, HALF * 2],  // west
  [HALF, WALL_H, 0, WALL_T * 2, WALL_H * 2, HALF * 2],  // east
];

for (const [cx, cy, cz, w, h, d] of wallDefs) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  m.position.set(cx, cy, cz);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}

// ── Car mesh ─────────────────────────────────────────────────────────────────
const carBody = new THREE.Mesh(
  new THREE.BoxGeometry(1, 0.5, 2),
  new THREE.MeshLambertMaterial({ color: 0xe74c3c }),
);
carBody.castShadow = true;
scene.add(carBody);

// Cabin on top so orientation is obvious
const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(0.75, 0.32, 0.95),
  new THREE.MeshLambertMaterial({ color: 0xc0392b }),
);
cabin.position.set(0, 0.41, -0.15);
carBody.add(cabin);

// Headlights (front indicator)
const headlightGeo = new THREE.BoxGeometry(0.18, 0.1, 0.05);
const headlightMat = new THREE.MeshLambertMaterial({ color: 0xffffaa, emissive: 0xffff66, emissiveIntensity: 0.6 });
[-0.35, 0.35].forEach((xOff) => {
  const hl = new THREE.Mesh(headlightGeo, headlightMat);
  hl.position.set(xOff, 0.05, 1.03);
  carBody.add(hl);
});

// ── Physics world ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const physics = await initPhysics();
  const { world } = physics;

  createGround(physics);

  // Physics walls (half-extents)
  createWall(physics, 0, WALL_H, -HALF, HALF, WALL_H, WALL_T);  // north
  createWall(physics, 0, WALL_H, HALF, HALF, WALL_H, WALL_T);  // south
  createWall(physics, -HALF, WALL_H, 0, WALL_T, WALL_H, HALF);    // west
  createWall(physics, HALF, WALL_H, 0, WALL_T, WALL_H, HALF);    // east

  const carRigidBody = createCarBody(physics);

  // ── Controllers ─────────────────────────────────────────────────────────────
  const input = new Input();
  const car = new CarController(carRigidBody);

  // ── Camera follow state ──────────────────────────────────────────────────────
  // Smooth current camera position interpolated toward desired each frame
  const camPos = camera.position.clone();
  const camTarget = new THREE.Vector3();
  const _fwdScratch = new THREE.Vector3();

  // ── HUD ──────────────────────────────────────────────────────────────────────
  const hud = document.createElement('div');
  Object.assign(hud.style, {
    position: 'fixed',
    top: '16px',
    left: '16px',
    color: '#fff',
    font: 'bold 13px/1.6 monospace',
    pointerEvents: 'none',
    textShadow: '1px 1px 3px #000',
  });
  document.body.appendChild(hud);

  // ── Render loop ──────────────────────────────────────────────────────────────
  let lastTime = performance.now();

  function loop(now: number): void {
    requestAnimationFrame(loop);

    // Cap dt to avoid spiral-of-death on tab re-focus
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // 1. Apply arcade inputs → write linvel + rotation into rigid body
    car.update(dt, input);

    // 2. Rapier steps — integrates positions, resolves wall collisions
    world.step();

    // 3. Read back post-collision velocity so next frame we don't fight the wall
    car.readbackFromBody();

    // 4. Sync car mesh ← physics body position; use our own yaw for rotation
    const pos = car.position;
    carBody.position.set(pos.x, pos.y, pos.z);
    carBody.rotation.set(0, car.yaw, 0);

    // 5. Third-person camera: offset behind & above the car, smooth follow
    _fwdScratch.set(Math.sin(car.yaw), 0, Math.cos(car.yaw));
    const desiredCam = new THREE.Vector3(pos.x, pos.y, pos.z)
      .addScaledVector(_fwdScratch, -7)   // 7 units behind
      .add(new THREE.Vector3(0, 4.5, 0));  // 4.5 units up

    camPos.lerp(desiredCam, Math.min(1, 6 * dt));
    camera.position.copy(camPos);

    camTarget.set(pos.x, pos.y + 0.5, pos.z);
    camera.lookAt(camTarget);

    // 6. HUD
    const kmh = (car.velocity.length() * 3.6).toFixed(0);
    hud.innerHTML =
      `Speed: ${kmh} km/h${input.handbrake ? '  <span style="color:#f39c12">DRIFT</span>' : ''}<br>` +
      `<span style="opacity:0.6;font-weight:normal">WASD / Arrows — drive &nbsp;|&nbsp; Space — handbrake</span>`;

    renderer.render(scene, camera);
  }

  requestAnimationFrame(loop);
}

main().catch(console.error);
