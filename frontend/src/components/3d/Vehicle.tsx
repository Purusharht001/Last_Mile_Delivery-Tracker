import { forwardRef } from "react";
import * as THREE from "three";

/**
 * Low-poly delivery van built from primitive geometries — no external GLTF
 * asset, so the app stays self-contained and works fully offline. The
 * parent (SceneContent in DeliveryScene.tsx) owns this group's transform
 * imperatively via the forwarded ref for smooth per-frame motion.
 *
 * Local +Z is "front" (headlights) — empirically matched to how
 * SceneContent's lookAt/chase-camera pairing orients the group, so the
 * chase camera (positioned behind the van, looking ahead) actually sees the
 * taillights, and the van's headlights face its direction of travel.
 */
export const Vehicle = forwardRef<THREE.Group>(function Vehicle(_props, ref) {
  return (
    <group ref={ref}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.6, 1.1, 3.2]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.35} />
      </mesh>

      <mesh position={[0, 0.95, 1.1]}>
        <boxGeometry args={[1.5, 0.5, 0.9]} />
        <meshStandardMaterial color="#0f172a" metalness={0.2} roughness={0.1} />
      </mesh>

      {([
        [-0.85, 0.05, 1.05],
        [0.85, 0.05, 1.05],
        [-0.85, 0.05, -1.05],
        [0.85, 0.05, -1.05],
      ] as [number, number, number][]).map((p, i) => (
        <mesh key={i} position={p} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.28, 16]} />
          <meshStandardMaterial color="#111827" roughness={0.8} />
        </mesh>
      ))}

      <mesh position={[-0.55, 0.5, 1.62]}>
        <boxGeometry args={[0.25, 0.15, 0.05]} />
        <meshStandardMaterial color="#3B82F6" emissive="#3B82F6" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[0.55, 0.5, 1.62]}>
        <boxGeometry args={[0.25, 0.15, 0.05]} />
        <meshStandardMaterial color="#3B82F6" emissive="#3B82F6" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>

      <mesh position={[-0.55, 0.5, -1.62]}>
        <boxGeometry args={[0.2, 0.12, 0.05]} />
        <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0.55, 0.5, -1.62]}>
        <boxGeometry args={[0.2, 0.12, 0.05]} />
        <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>

      <pointLight position={[0, 1.2, 1.6]} intensity={0.8} distance={5} color="#3B82F6" />
    </group>
  );
});
