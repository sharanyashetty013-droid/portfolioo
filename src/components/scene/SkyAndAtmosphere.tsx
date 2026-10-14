import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const skyVertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const skyFragmentShader = `
  uniform vec3 uTopColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  varying vec3 vWorldPosition;

  void main() {
    // Height factor normalized along sphere y
    float h = normalize(vWorldPosition).y;
    
    vec3 color;
    if (h > 0.0) {
      float t = pow(h, 0.65);
      color = mix(uHorizonColor, uTopColor, t);
    } else {
      // Sub-horizon haze blending into warm sea fog
      color = mix(uHorizonColor, uMidColor, clamp(-h * 2.0, 0.0, 1.0));
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

interface CloudProps {
  initialPosition: [number, number, number];
  speed: number;
  scale?: number;
}

const LowPolyCloud: React.FC<CloudProps> = ({ initialPosition, speed, scale = 1 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const startX = initialPosition[0];

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // Wrap clouds smoothly across the open sea
    const curX = ((startX + t * speed * 2.5 + 400) % 800) - 400;
    groupRef.current.position.x = curX;
  });

  return (
    <group ref={groupRef} position={initialPosition} scale={scale}>
      {/* Cluster of chunky low-poly icosahedron cloud puffs */}
      <mesh position={[0, 0, 0]}>
        <icosahedronGeometry args={[4.2, 1]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[3.2, -0.6, 0.4]}>
        <icosahedronGeometry args={[3.2, 1]} />
        <meshStandardMaterial color="#FAF9F5" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-3.0, -0.5, -0.3]}>
        <icosahedronGeometry args={[3.0, 1]} />
        <meshStandardMaterial color="#FAF9F5" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[1.2, 1.5, -0.5]}>
        <icosahedronGeometry args={[2.8, 1]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-1.4, 1.2, 0.6]}>
        <icosahedronGeometry args={[2.6, 1]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
};

export const SkyAndAtmosphere: React.FC<{ reducedMotion?: boolean }> = ({ reducedMotion = false }) => {
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTopColor: { value: new THREE.Color('#7CC8EE') },     // Bright warm sky top
    uMidColor: { value: new THREE.Color('#BFE6EE') },     // Soft pastel sky mid
    uHorizonColor: { value: new THREE.Color('#FFF4E0') }, // Warm golden cream horizon
  }), []);

  // Preset cloud positions spanning the voyage archipelago
  const clouds = useMemo(() => [
    { pos: [-60, 45, 40] as [number, number, number], speed: 0.6, scale: 1.4 },
    { pos: [80, 52, -10] as [number, number, number], speed: 0.45, scale: 1.6 },
    { pos: [-40, 48, -70] as [number, number, number], speed: 0.55, scale: 1.5 },
    { pos: [110, 50, -130] as [number, number, number], speed: 0.5, scale: 1.8 },
    { pos: [-80, 54, -180] as [number, number, number], speed: 0.65, scale: 1.6 },
    { pos: [50, 46, -240] as [number, number, number], speed: 0.4, scale: 1.5 },
    { pos: [-30, 55, -290] as [number, number, number], speed: 0.5, scale: 1.7 },
  ], []);

  return (
    <>
      {/* Warm Sunny Lighting */}
      <ambientLight intensity={0.9} color="#FFFFFF" />
      <hemisphereLight 
        color="#FFF6E4"      // Warm sunny sky light
        groundColor="#BFEDE3" // Light teal ground bounce
        intensity={0.8} 
      />
      
      {/* Key Directional Sun Light with soft shadows */}
      <directionalLight
        position={[45, 60, 35]}
        intensity={2.1}
        color="#FFF3DC"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={10}
        shadow-camera-far={200}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0005}
      />

      {/* Atmospheric Fog */}
      <fogExp2 attach="fog" args={['#FFF3E0', 0.0012]} />

      {/* Sky Sphere */}
      <mesh position={[0, 0, -135]}>
        <sphereGeometry args={[550, 32, 24]} />
        <shaderMaterial
          ref={skyMatRef}
          vertexShader={skyVertexShader}
          fragmentShader={skyFragmentShader}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Drifting Low-Poly Clouds */}
      {!reducedMotion && clouds.map((c, idx) => (
        <LowPolyCloud
          key={idx}
          initialPosition={c.pos}
          speed={c.speed}
          scale={c.scale}
        />
      ))}
    </>
  );
};
