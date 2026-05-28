import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Input } from './Input';

export interface CarConfig {
  acceleration: number;        // units/s² — forward thrust
  reverseAcceleration: number; // units/s² — reverse thrust
  maxSpeed: number;            // units/s cap
  drag: number;                // fraction of speed lost per second (no throttle)
  steeringStrength: number;    // radians/s at any speed
  traction: number;            // blend rate toward forward dir (higher = grippier)
  brakeTraction: number;       // traction while Space is held (lower = more slide)
}

export class CarController {
  config: CarConfig = {
    acceleration: 28,
    reverseAcceleration: 18,
    maxSpeed: 38,
    drag: 0.5,
    steeringStrength: 2.4,
    traction: 1.5,
    brakeTraction: 0.5,
  };

  // Arcade velocity (XZ plane; Y is owned by gravity/physics)
  velocity = new THREE.Vector3();

  // Car heading in radians around Y axis (yaw=0 → facing +Z)
  yaw = 0;

  private body: RAPIER.RigidBody;

  // Pre-allocated scratch vectors to avoid per-frame allocation
  private _fwd = new THREE.Vector3();
  private _velDir = new THREE.Vector3();
  private _q = new THREE.Quaternion();
  private _axis = new THREE.Vector3(0, 1, 0);

  constructor(body: RAPIER.RigidBody) {
    this.body = body;
  }

  update(dt: number, input: Input): void {
    const cfg = this.config;

    // Forward direction in world XZ from current yaw
    this._fwd.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));

    // Steering only meaningful once moving — prevents spin-in-place
    const speed = this.velocity.length();
    if (speed > 0.3) {
      const steerDir = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      // Reverse steering when the car is genuinely moving backward (velocity
      // opposes the car's forward vector). Checking actual velocity direction
      // rather than the key press means steering stays natural while the car
      // is still rolling forward after releasing throttle or tapping reverse.
      const movingBackward = this.velocity.dot(this._fwd) < 0;
      this.yaw += steerDir * cfg.steeringStrength * dt * (movingBackward ? -0.5 : 1);
      this._fwd.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    }

    // Throttle / reverse
    if (input.forward) {
      this.velocity.addScaledVector(this._fwd, cfg.acceleration * dt);
    } else if (input.backward) {
      this.velocity.addScaledVector(this._fwd, -cfg.reverseAcceleration * dt);
    }

    // Drag (applied every frame regardless of throttle)
    this.velocity.multiplyScalar(Math.max(0, 1 - cfg.drag * dt));

    // Speed cap
    if (this.velocity.length() > cfg.maxSpeed) {
      this.velocity.setLength(cfg.maxSpeed);
    }

    // ── Drift / traction ────────────────────────────────────────────────────
    // Inspired by the Unity arcade drift pattern:
    //   MoveForce = Lerp(MoveForce.normalized, transform.forward, traction*dt) * magnitude
    //
    // We preserve speed magnitude while blending the velocity *direction*
    // toward the car's forward. Low traction → direction barely changes →
    // the car slides; high traction → car grips and goes where it points.
    const currentSpeed = this.velocity.length();
    if (currentSpeed > 0.05) {
      const grip = input.handbrake ? cfg.brakeTraction : cfg.traction;
      this._velDir.copy(this.velocity).normalize();
      this._velDir.lerp(this._fwd, Math.min(1, grip * dt)).normalize();
      this.velocity.copy(this._velDir).multiplyScalar(currentSpeed);
    }

    // Push our arcade velocity into the physics body.
    // Rapier will integrate position and handle wall collisions; we keep the
    // Y component from physics so gravity still works.
    const curLinvel = this.body.linvel();
    this.body.setLinvel(
      { x: this.velocity.x, y: curLinvel.y, z: this.velocity.z },
      true,
    );

    // Manually orient the collider so wall-slide direction is correct
    this._q.setFromAxisAngle(this._axis, this.yaw);
    this.body.setRotation({ x: this._q.x, y: this._q.y, z: this._q.z, w: this._q.w }, true);
  }

  // Call after world.step() to inherit any velocity change from collision response.
  // If a wall absorbed part of our velocity, next frame's traction blends us back
  // to forward rather than tunnelling through.
  readbackFromBody(): void {
    const lv = this.body.linvel();
    this.velocity.set(lv.x, 0, lv.z);
  }

  get position(): RAPIER.Vector { return this.body.translation(); }

  teleportTo(x: number, y: number, z: number): void {
    this.body.setTranslation({ x, y, z }, true)
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.velocity.set(0, 0, 0)
  }
}
