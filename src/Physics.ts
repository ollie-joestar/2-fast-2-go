import RAPIER from '@dimforge/rapier3d-compat';

export type { World, RigidBody } from '@dimforge/rapier3d-compat';

export interface PhysicsContext {
  world: RAPIER.World;
  R: typeof RAPIER;
}

export async function initPhysics(): Promise<PhysicsContext> {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  return { world, R: RAPIER };
}

export function createGround({ world, R }: PhysicsContext): void {
  const body = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0));
  world.createCollider(R.ColliderDesc.cuboid(50, 0.1, 50), body);
}

export function createCarBody({ world, R }: PhysicsContext): RAPIER.RigidBody {
  const desc = R.RigidBodyDesc.dynamic()
    .setTranslation(0, 0.5, 0)
    .setLinearDamping(0)
    .setAngularDamping(0);
  const body = world.createRigidBody(desc);
  // Disable physics-driven rotation on all axes — we set it manually each frame
  body.setEnabledRotations(false, false, false, false);
  // Half-extents match the BoxGeometry(1, 0.5, 2) car mesh
  world.createCollider(R.ColliderDesc.cuboid(0.5, 0.25, 1.0), body);
  return body;
}

export function createWall(
  { world, R }: PhysicsContext,
  x: number, y: number, z: number,
  hw: number, hh: number, hd: number,
): void {
  const body = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(x, y, z));
  world.createCollider(R.ColliderDesc.cuboid(hw, hh, hd), body);
}
