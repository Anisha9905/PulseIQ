import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { GlucoseState } from "@/store/glucoseStore";

interface OrbProps {
  state?: GlucoseState;
  intensity?: number;
}

const stateColors: Record<GlucoseState, { base: string; glow: string }> = {
  normal: { base: "#5cd6a3", glow: "#a8efd0" },
  low: { base: "#f5b95a", glow: "#fcd99a" },
  high: { base: "#f06868", glow: "#f9a8a8" },
};

function OrbMesh({ state = "normal", intensity = 1 }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<any>(null);
  const colors = stateColors[state];

  const baseColor = useMemo(() => new THREE.Color(colors.base), [colors.base]);
  const glowColor = useMemo(() => new THREE.Color(colors.glow), [colors.glow]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.15;
      meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
      const breath = 1 + Math.sin(t * 1.2) * 0.04 * intensity;
      meshRef.current.scale.setScalar(breath);
    }
    if (matRef.current) {
      matRef.current.distort = 0.3 + Math.sin(t * 0.8) * 0.08;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
      <Sphere ref={meshRef} args={[1, 128, 128]}>
        <MeshDistortMaterial
          ref={matRef}
          color={baseColor}
          emissive={glowColor}
          emissiveIntensity={0.4}
          roughness={0.15}
          metalness={0.2}
          distort={0.35}
          speed={1.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </Sphere>
    </Float>
  );
}

export function GlucoseOrb({ state = "normal", intensity = 1, className }: OrbProps & { className?: string }) {
  const colors = stateColors[state];
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <pointLight position={[5, 5, 5]} intensity={1.2} color={colors.glow} />
          <pointLight position={[-5, -3, -5]} intensity={0.8} color={colors.base} />
          <directionalLight position={[0, 5, 2]} intensity={0.5} />
          <OrbMesh state={state} intensity={intensity} />
        </Suspense>
      </Canvas>
    </div>
  );
}
