import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

interface AvatarProps {
  gender?: "male" | "female" | "other";
  age?: number;
  className?: string;
}

function AvatarMesh({ gender = "other", age = 30 }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);

  const palette = useMemo(() => {
    if (gender === "female") return { skin: "#f5cdb6", accent: "#e89bb0" };
    if (gender === "male") return { skin: "#e8b896", accent: "#6ba3c8" };
    return { skin: "#d9c2a8", accent: "#a8c8e8" };
  }, [gender]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.15;
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.04;
    }
    if (headRef.current) {
      const breath = 1 + Math.sin(t * 1.4) * 0.015;
      headRef.current.scale.setScalar(breath);
    }
  });

  // Simple stylized avatar: head + shoulders
  const youthful = (age ?? 30) < 35 ? 1 : 0.95;

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh ref={headRef} position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.55 * youthful, 64, 64]} />
        <meshStandardMaterial color={palette.skin} roughness={0.5} metalness={0.05} />
      </mesh>
      {/* Hair cap */}
      <mesh position={[0, 0.78, -0.02]}>
        <sphereGeometry args={[0.58 * youthful, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={gender === "female" ? "#3a2a22" : "#2a1f18"} roughness={0.7} />
      </mesh>
      {/* Shoulders/torso */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.85, 1.05, 1.0, 32]} />
        <meshStandardMaterial color={palette.accent} roughness={0.4} metalness={0.15} />
      </mesh>
      {/* Glow ring */}
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.02, 16, 100]} />
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function ImageOrb({ imageUrl }: { imageUrl: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return loader.load(imageUrl);
  }, [imageUrl]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.1) * 0.04;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1} rotationIntensity={0.15} floatIntensity={0.3}>
        {/* Glow halo */}
        <Sphere args={[1.4, 64, 64]}>
          <MeshDistortMaterial
            color="#6ba3c8"
            emissive="#b8d4e8"
            emissiveIntensity={0.4}
            transparent
            opacity={0.18}
            distort={0.35}
            speed={1.2}
          />
        </Sphere>
        {/* Photo disc */}
        <mesh position={[0, 0, 0]}>
          <circleGeometry args={[0.95, 64]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
        {/* Frame ring */}
        <mesh ref={ringRef} position={[0, 0, 0.02]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.98, 0.025, 16, 100]} />
          <meshStandardMaterial color="#6ba3c8" emissive="#b8d4e8" emissiveIntensity={0.8} />
        </mesh>
      </Float>
    </group>
  );
}

export function ProfileAvatar3D({ gender, age, className, imageUrl }: AvatarProps & { imageUrl?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0.2, 3.4], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <pointLight position={[3, 3, 4]} intensity={1.4} color="#b8d4e8" />
          <pointLight position={[-3, -2, -4]} intensity={0.7} color="#6ba3c8" />
          {imageUrl ? <ImageOrb imageUrl={imageUrl} /> : <AvatarMesh gender={gender} age={age} />}
        </Suspense>
      </Canvas>
    </div>
  );
}
