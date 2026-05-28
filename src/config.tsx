// config.tsx — single source of truth for all game tuning

export const CONFIG = {
  gravity: [0, -9.81, 0] as [number, number, number],
  // --- Chassis ---
  mass: 1000,
  size: [2.4, 1.3, 6] as [number, number, number],
  wheelRadius: 0.43,
  // linearDamping replaces wheel-based engine drag for coast deceleration.
  // Applied uniformly to the chassis body — no axle bias, no spin-out trigger.
  linearDamping: 0.30,
  // angularDamping: arcade self-correction. High enough to kill random spins,
  // low enough that intentional handbrake drifts can rotate the car.
  angularDamping: 0.65,
  boostedAngularDamping: 0.995, // when braking straight — near-total yaw lock

  // --- Engine / Drivetrain ---
  force: 12001,
  // Fraction of force sent to rear (0 = FWD, 1 = RWD, 0.5 = AWD).
  // Keep at 0.5–0.7 — high values cause rear wheel spin that overpowers steering.
  // The real fix for steering at higher differentials is rearFrictionSlip (below).
  differential: 0.00,
  revForceRatio: 0.5,
  brakeForce: 260,
  frontBrakeBias: 0.30,    // front brake fraction when turning
  frontStraightBias: 0.45, // front brake fraction when going straight
  reverseThreshold: 0.4,
  // Separate handbrake force — needs to be significantly higher than regular
  // braking to lock the rear wheels and initiate a drift cleanly.
  handbrakeForce: 900,

  // --- Coasting ---
  // engineDragFactor is ZERO. Wheel-based engine drag was the root cause of
  // the lift-off spin: it applied symmetric braking through the rear axle
  // which always exceeded rearFrictionSlip mid-corner. Coast now comes from:
  //   1. linearDamping above — chassis-level, no axle bias
  //   2. aeroDragCoefficient below — chassis force, speed²
  engineDragFactor: 0,
  aeroDragCoefficient: 0.2, // chassis aero force opposing velocity, scales with speed²
  velocityDeadzone: 0.15,

  // --- Steering ---
  // maxSteer is a fixed ceiling — speed no longer shrinks the angle.
  maxSteer: 0.50,
  // Time (seconds) to ramp from 0 to full lock.
  // Interpolated linearly between the two speed anchors below.
  steerTimeLow: 0.45,   // at <= steerSpeedLow  m/s
  steerTimeHigh: 1.20,   // at >= steerSpeedHigh m/s
  steerSpeedLow: 10,    // m/s — below this, use steerTimeLow
  steerSpeedHigh: 50,    // m/s — above this, use steerTimeHigh
  // Return-to-centre always takes this fraction of the current lock time.
  // 0.5 = half the time to lock → twice the step rate.
  steerReturnFactor: 0.3,

  // --- Suspension ---
  // Near-rigid arcade suspension. The goal is to keep wheels on the ground
  // while letting the car body stay completely flat — no squat, no dive, no roll.
  suspensionStiffness: 220,
  suspensionRestLength: 0.2,
  dampingRelaxation: 8.0,
  dampingCompression: 18.0,
  maxSuspensionForce: 100000,
  // rollInfluence: 0 is the key arcade setting. It tells Cannon not to rotate
  // the chassis from suspension forces at all — no pitch under acceleration,
  // no roll in corners, no weight transfer oscillation on lift-off.
  // The suspension still keeps wheels on the ground; it just can't tip the body.
  rollInfluence: 0,
  maxSuspensionTravel: 0.06,

  // --- Wheels ---
  // Medium-high rear friction: stable under normal driving, breakable with handbrake.
  // Front significantly higher: steering authority is preserved even mid-slide.
  rearFrictionSlip: 10.0,  // high — prevents wheel spin at normal gravity so full force transmits
  frontFrictionSlip: 10.0, // front grip budget now entirely for steering (no engine force here)

  // Rear sliding speed: ~50 rad/s ≈ rolling speed at ~22 m/s drift entry.
  // Enabled — rear wheels maintain spin during slide so throttle can sustain the drift
  // and the rear doesn't lock up. Front disabled so steering force stays intact.
  rearSlidingRotationalSpeed: 50,
  useRearSlidingRotationalSpeed: true,
  frontSlidingRotationalSpeed: -30,
  useFrontSlidingRotationalSpeed: false,

  wheelCylinderThickness: 0.42,
  wheelCylinderSegments: 20,
  wheelMass: 100,

  // --- Wheel geometry factors (multiplied against chassis dimensions) ---
  wheelHeightFactor: 0.265,
  wheelWidthFactor: 0.50,
  wheelFrontOffsetFactor: 0.68,
  wheelRearOffsetFactor: 0.73,
  frontWheelWidthMultiplier: 1.05,

  // --- Camera ---
  cameraDistance: 10,
  cameraHeight: 5,
  cameraLookAhead: 4,
  cameraYawLerp: 0.07,
  cameraFovBase: 35,
  cameraFovMax: 55,
  cameraFovSpeedMax: 50,
  cameraFovLerp: 0.24,
  visualLerpFactor: 0.50,
} as const

// Derived drivetrain values — computed once from CAR_OPTIONS
export const FFORCE = CAR_OPTIONS.force * (1 - CAR_OPTIONS.differential)
export const RFORCE = CAR_OPTIONS.force * CAR_OPTIONS.differential
export const REV_FORCE = -CAR_OPTIONS.force * CAR_OPTIONS.revForceRatio
