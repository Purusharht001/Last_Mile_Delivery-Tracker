import { useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import { SimRoute } from "../../lib/geo-sim";
import { Vehicle } from "./Vehicle";
import { RoutePath } from "./RoutePath";

export type CameraMode = "drone" | "chase" | "destination";

interface DeliverySceneProps {
  route: SimRoute;
  progress: number;
  cameraMode: CameraMode;
}

function dampVec3(current: THREE.Vector3, target: THREE.Vector3, lambda: number, delta: number) {
  current.x = THREE.MathUtils.damp(current.x, target.x, lambda, delta);
  current.y = THREE.MathUtils.damp(current.y, target.y, lambda, delta);
  current.z = THREE.MathUtils.damp(current.z, target.z, lambda, delta);
}

function SceneContent({ route, progress, cameraMode }: DeliverySceneProps) {
  const vehicleRef = useRef<THREE.Group>(null);
  // Damped toward `progress` every frame so the van glides at 60fps even
  // though `progress` itself only updates ~10x/sec from React state.
  const smoothProgress = useRef(progress);
  const lookAtTarget = useRef(new THREE.Vector3());
  const { camera } = useThree();

  useFrame((_, delta) => {
    smoothProgress.current = THREE.MathUtils.damp(smoothProgress.current, progress, 4, delta);
    const pos = route.pointAt(smoothProgress.current);
    const tangent = route.tangentAt(smoothProgress.current);

    if (vehicleRef.current) {
      vehicleRef.current.position.set(pos.x, 0.05, pos.z);
      vehicleRef.current.lookAt(pos.x + tangent.x, 0.05, pos.z + tangent.z);
    }

    let desiredPos: THREE.Vector3;
    let desiredLookAt: THREE.Vector3;

    if (cameraMode === "drone") {
      desiredPos = new THREE.Vector3(pos.x, pos.y + 42, pos.z + 16);
      desiredLookAt = pos;
    } else if (cameraMode === "destination") {
      desiredPos = route.drop.clone().add(new THREE.Vector3(13, 9, 13));
      desiredLookAt = route.drop;
    } else {
      // chase: behind and above the van, looking ahead along its direction of travel
      desiredPos = pos.clone().addScaledVector(tangent, -9).add(new THREE.Vector3(0, 4.5, 0));
      desiredLookAt = pos.clone().addScaledVector(tangent, 8).add(new THREE.Vector3(0, 0.5, 0));
    }

    dampVec3(camera.position, desiredPos, 3, delta);
    dampVec3(lookAtTarget.current, desiredLookAt, 3, delta);
    camera.lookAt(lookAtTarget.current);
  });

  return (
    <>
      <ambientLight intensity={0.35} color="#3B82F6" />
      <directionalLight
        position={[24, 34, 12]}
        intensity={1.3}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <fogExp2 attach="fog" args={["#090d16", 0.014]} />

      <Grid
        args={[160, 160]}
        cellColor="#1e293b"
        sectionColor="#3B82F6"
        sectionThickness={1}
        cellThickness={0.5}
        fadeDistance={90}
        fadeStrength={1.5}
        infiniteGrid
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#090d16" />
      </mesh>

      <RoutePath route={route} progress={progress} />
      <Vehicle ref={vehicleRef} />
    </>
  );
}

export function DeliveryScene({ route, progress, cameraMode }: DeliverySceneProps) {
  return (
    <Canvas shadows camera={{ position: [0, 42, 16], fov: 45, near: 0.1, far: 400 }}>
      <SceneContent route={route} progress={progress} cameraMode={cameraMode} />
    </Canvas>
  );
}
