import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";

function Orb() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.08;
      const breath = 1 + Math.sin(t * 0.8) * 0.06;
      meshRef.current.scale.setScalar(breath);
    }
  });
  return (
    <Sphere ref={meshRef} args={[1.4, 128, 128]}>
      <MeshDistortMaterial
        color="#6ba3c8"
        emissive="#b8d4e8"
        emissiveIntensity={0.35}
        roughness={0.1}
        metalness={0.3}
        distort={0.3}
        speed={1}
        clearcoat={1}
      />
    </Sphere>
  );
}

export function BreathingOrb({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={1.5} color="#b8d4e8" />
          <pointLight position={[-5, -3, -5]} intensity={0.8} color="#6ba3c8" />
          <Orb />
        </Suspense>
      </Canvas>
    </div>
  );
}
