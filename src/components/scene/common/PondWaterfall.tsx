import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const PondWaterfall: React.FC<{
  islandHeight: number;
  islandRadius: number;
  reducedMotion?: boolean;
}> = ({ islandHeight, islandRadius, reducedMotion = false }) => {
  const fallStreamRef = useRef<THREE.Mesh>(null);
  const pondWaterRef = useRef<THREE.Mesh>(null);
  const splashRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reducedMotion) return;
    const time = state.clock.getElapsedTime();
    if (fallStreamRef.current) {
      fallStreamRef.current.position.y = (islandHeight / 2) + Math.sin(time * 6) * 0.05;
      const pulse = 1.0 + Math.sin(time * 8) * 0.04;
      fallStreamRef.current.scale.set(pulse, 1.0, pulse);
    }
    if (pondWaterRef.current) {
      pondWaterRef.current.position.y = islandHeight + 0.04 + Math.sin(time * 2.5) * 0.015;
    }
    if (splashRef.current) {
      splashRef.current.rotation.y = time * 1.5;
      const s = 1.0 + Math.sin(time * 7) * 0.12;
      splashRef.current.scale.set(s, s, s);
    }
  });

  const pondCenter: [number, number, number] = [3.5, islandHeight, -5.5];
  const lipPos: [number, number, number] = [4.8, islandHeight - 0.1, -8.6];
  const fallHeight = islandHeight + 0.5;

  return (
    <group>
      {/* 1. Stone Basin Ring of flat-shaded boulders */}
      <group position={pondCenter}>
        {[
          [-2.2, 0.15, -0.8, 0.7],
          [-1.6, 0.2, 1.6, 0.85],
          [-0.2, 0.25, 2.3, 0.9],
          [1.5, 0.18, 1.8, 0.8],
          [2.4, 0.22, 0.4, 0.95],
          [2.2, 0.18, -1.5, 0.75],
          [0.8, 0.2, -2.4, 0.85],
          [-1.0, 0.22, -2.2, 0.7],
        ].map(([rx, ry, rz, s], i) => (
          <mesh key={`p-rock-${i}`} position={[rx, ry, rz]} scale={[s, s * 0.8, s]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.65, 0]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#A8957F' : '#B8A58F'} roughness={0.85} flatShading />
          </mesh>
        ))}

        {/* Pond Water Surface */}
        <mesh ref={pondWaterRef} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[2.2, 16]} />
          <meshStandardMaterial
            color="#4CC9C0"
            emissive="#2BA9B0"
            emissiveIntensity={0.2}
            roughness={0.15}
            metalness={0.1}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Small Pond Lily Pad */}
        <mesh position={[-0.7, 0.06, 0.5]} rotation={[-Math.PI / 2, 0, 0.4]}>
          <circleGeometry args={[0.35, 7]} />
          <meshStandardMaterial color="#5FBF4A" roughness={0.8} flatShading />
        </mesh>
        <mesh position={[0.6, 0.06, -0.6]} rotation={[-Math.PI / 2, 0, -0.5]}>
          <circleGeometry args={[0.28, 7]} />
          <meshStandardMaterial color="#5FBF4A" roughness={0.8} flatShading />
        </mesh>
      </group>

      {/* 2. River Outlet / Stream Notch */}
      <mesh position={[4.1, islandHeight + 0.02, -7.0]} rotation={[-Math.PI / 2, 0, -0.55]}>
        <planeGeometry args={[1.2, 2.2]} />
        <meshStandardMaterial
          color="#4CC9C0"
          emissive="#2BA9B0"
          emissiveIntensity={0.25}
          roughness={0.15}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* 3. The Waterfall Pouring Over the Cliff Edge */}
      <mesh position={lipPos} rotation={[0, -0.55, 0]}>
        <boxGeometry args={[1.3, 0.25, 0.6]} />
        <meshStandardMaterial
          color="#9BE8D8"
          emissive="#4CC9C0"
          emissiveIntensity={0.35}
          roughness={0.2}
          flatShading
        />
      </mesh>

      {/* Falling Water Curtain */}
      <group position={[lipPos[0] + 0.1, 0, lipPos[2] - 0.1]} rotation={[0, -0.55, 0]}>
        <mesh ref={fallStreamRef} position={[0, islandHeight / 2, 0]}>
          <boxGeometry args={[1.1, fallHeight, 0.22]} />
          <meshStandardMaterial
            color="#E0F7F6"
            emissive="#4CC9C0"
            emissiveIntensity={0.4}
            roughness={0.1}
            transparent
            opacity={0.85}
            flatShading
          />
        </mesh>

        {/* Frothy White Water Crest Ribbons */}
        <mesh position={[0, islandHeight / 2, 0.12]}>
          <boxGeometry args={[0.85, fallHeight * 0.95, 0.08]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#E0F7F6"
            emissiveIntensity={0.5}
            roughness={0.25}
            flatShading
          />
        </mesh>

        {/* 4. Ocean Splash & Mist at Base */}
        <group ref={splashRef} position={[0, 0.06, 0.35]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 1.4, 8]} />
            <meshStandardMaterial
              color="#FFFFFF"
              emissive="#E0F7F6"
              emissiveIntensity={0.4}
              roughness={0.2}
              transparent
              opacity={0.75}
              flatShading
            />
          </mesh>
          <pointLight color="#9BE8D8" intensity={1.2} distance={5} />
        </group>
      </group>
    </group>
  );
};
