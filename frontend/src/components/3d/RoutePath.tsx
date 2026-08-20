import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SimRoute } from "../../lib/geo-sim";

interface RoutePathProps {
  route: SimRoute;
  progress: number;
}

/** Glowing holographic route tube + pickup marker + pulsing destination ring. */
export function RoutePath({ route, progress }: RoutePathProps) {
  const tubeGeometry = useMemo(
    () => new THREE.TubeGeometry(route.curve, 120, 0.12, 8, false),
    [route],
  );
  const ringRef = useRef<THREE.Mesh>(null);
  const delivered = progress >= 0.999;
  const accentColor = delivered ? "#10B981" : "#3B82F6";

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.12;
    ringRef.current.scale.setScalar(pulse);
    const mat = ringRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = delivered ? 2.5 : 1.4 + Math.sin(clock.elapsedTime * 2.2) * 0.6;
  });

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[route.pickup.x, 0.05, route.pickup.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.85, 32]} />
        <meshStandardMaterial color="#3B82F6" emissive="#3B82F6" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>

      <mesh ref={ringRef} position={[route.drop.x, 0.05, route.drop.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.1, 0.08, 16, 48]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}
