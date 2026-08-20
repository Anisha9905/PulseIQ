import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";

interface DeviceRingProps {
  connected: boolean;
  className?: string;
}

function Ring({ connected }: { connected: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      if (connected) {
        ringRef.current.rotation.z = t * 0.6;
        ringRef.current.rotation.x = Math.sin(t * 0.4) * 0.15;
      } else {
        // Glitch
        ringRef.current.rotation.z = t * 0.1 + Math.sin(t * 12) * 0.08;
        ringRef.current.position.x = Math.sin(t * 30) * 0.02;
      }
    }
    if (innerRef.current) {
      const s = 1 + Math.sin(t * 1.6) * (connected ? 0.04 : 0.08);
      innerRef.current.scale.setScalar(s);
    }
  });

  const color = connected ? "#5cd6a3" : "#f06868";
  const glow = connected ? "#a8efd0" : "#f9a8a8";

  return (
    <group>
      <mesh ref={ringRef}>
        <torusGeometry args={[1.1, 0.04, 16, 120]} />
        <meshStandardMaterial color={color} emissive={glow} emissiveIntensity={0.9} metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh ref={ringRef as never} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.012, 16, 120]} />
        <meshStandardMaterial color={color} emissive={glow} emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.55, 64, 64]} />
        <meshStandardMaterial color={color} emissive={glow} emissiveIntensity={0.6} roughness={0.3} metalness={0.2} />
      </mesh>
    </group>
  );
}

export function DeviceRing3D({ connected, className }: DeviceRingProps) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3.4], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <pointLight position={[3, 3, 3]} intensity={1.2} color={connected ? "#a8efd0" : "#f9a8a8"} />
          <pointLight position={[-3, -2, -3]} intensity={0.7} color={connected ? "#5cd6a3" : "#f06868"} />
          <Ring connected={connected} />
        </Suspense>
      </Canvas>
    </div>
  );
}
