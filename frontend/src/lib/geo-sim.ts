import * as THREE from "three";

const SCENE_BOUNDS = 34;
const MIN_SEPARATION = 10;

/**
 * There's no real GPS backend behind this app — Area rows only carry a
 * pincode + zone, not lat/lng. This hashes a pincode to a stable point in
 * the 3D scene's ground plane, so a given order always renders the same
 * route (same pincode -> same point), without pretending to be real
 * geocoding.
 */
function hashString(input: string, salt: string): number {
  let hash = 2166136261 ^ salt.length;
  const s = input + salt;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // unsigned, normalized to [0, 1)
  return (hash >>> 0) / 4294967296;
}

function pincodeToPoint(pincode: string): THREE.Vector3 {
  const x = (hashString(pincode, "x") * 2 - 1) * SCENE_BOUNDS;
  const z = (hashString(pincode, "z") * 2 - 1) * SCENE_BOUNDS;
  return new THREE.Vector3(x, 0, z);
}

export interface SimRoute {
  pickup: THREE.Vector3;
  drop: THREE.Vector3;
  curve: THREE.CatmullRomCurve3;
  length: number;
  pointAt: (progress: number) => THREE.Vector3;
  tangentAt: (progress: number) => THREE.Vector3;
}

export function buildRoute(pickupPincode: string, dropPincode: string): SimRoute {
  const pickup = pincodeToPoint(pickupPincode);
  let drop = pincodeToPoint(dropPincode || `${pickupPincode}-drop`);

  if (pickup.distanceTo(drop) < MIN_SEPARATION) {
    // Deterministic nudge so pickup/drop never visually overlap, even if
    // two pincodes happen to hash close together.
    const angle = hashString(pickupPincode + dropPincode, "nudge") * Math.PI * 2;
    drop = pickup.clone().add(
      new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(MIN_SEPARATION),
    );
  }

  // Offset the midpoint perpendicular to the pickup->drop line so the route
  // reads as a road, not a ruler-straight line between two dots.
  const mid = pickup.clone().lerp(drop, 0.5);
  const direction = drop.clone().sub(pickup).normalize();
  const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
  const bendSign = hashString(pickupPincode, dropPincode) > 0.5 ? 1 : -1;
  const bendAmount = pickup.distanceTo(drop) * 0.22 * bendSign;
  const control = mid.add(perpendicular.multiplyScalar(bendAmount));

  const curve = new THREE.CatmullRomCurve3([pickup, control, drop], false, "catmullrom", 0.5);
  const length = curve.getLength();

  return {
    pickup,
    drop,
    curve,
    length,
    // getPointAt/getTangentAt use arc-length parametrization, so a
    // constant-speed progress value produces constant-speed motion even
    // though the curve itself isn't uniform in parameter space.
    pointAt: (progress: number) => curve.getPointAt(THREE.MathUtils.clamp(progress, 0, 1)),
    tangentAt: (progress: number) => curve.getTangentAt(THREE.MathUtils.clamp(progress, 0.0001, 0.9999)),
  };
}
