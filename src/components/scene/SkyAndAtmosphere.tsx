import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ambience, blendPalette, makePalette, TimeOfDay } from './ambience';

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
  material: THREE.Material;
}

const LowPolyCloud: React.FC<CloudProps> = ({ initialPosition, speed, scale = 1, material }) => {
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
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[3.2, -0.6, 0.4]}>
        <icosahedronGeometry args={[3.2, 1]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[-3.0, -0.5, -0.3]}>
        <icosahedronGeometry args={[3.0, 1]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[1.2, 1.5, -0.5]}>
        <icosahedronGeometry args={[2.8, 1]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[-1.4, 1.2, 0.6]}>
        <icosahedronGeometry args={[2.6, 1]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
};

// Stars on the upper sky dome, faded in at night
const Stars: React.FC = () => {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const pts: number[] = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 700; i++) {
      const u = rnd() * Math.PI * 2;
      const v = 0.08 + rnd() * 0.92; // above the horizon only
      const r = 480;
      const y = v * r;
      const ring = Math.sqrt(r * r - y * y);
      pts.push(Math.cos(u) * ring, y, Math.sin(u) * ring);
    }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  }, []);
  useFrame((state) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.PointsMaterial;
    m.opacity = ambience.night * (0.85 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
    ref.current.visible = ambience.night > 0.02;
  });
  return (
    <points ref={ref} geometry={geo} position={[0, 0, -135]}>
      <pointsMaterial color="#FFFFFF" size={2.2} sizeAttenuation={false} transparent opacity={0} depthWrite={false} fog={false} />
    </points>
  );
};

export const SkyAndAtmosphere: React.FC<{ reducedMotion?: boolean; timeOfDay?: TimeOfDay }> = ({
  reducedMotion = false,
  timeOfDay = 'day',
}) => {
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const fogRef = useRef<THREE.FogExp2>(null);
  const sunDiscRef = useRef<THREE.Mesh>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const palette = useMemo(() => makePalette(), []);
  const cloudMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9, flatShading: true }),
    []
  );

  useFrame((state, delta) => {
    // ease toward the selected mood
    const k = reducedMotion ? 1 : Math.min(1, delta * 1.4);
    ambience.sunset += ((timeOfDay === 'sunset' ? 1 : 0) - ambience.sunset) * k;
    ambience.night += ((timeOfDay === 'night' ? 1 : 0) - ambience.night) * k;
    blendPalette(palette, ambience.sunset, ambience.night);

    if (skyMatRef.current) {
      const u = skyMatRef.current.uniforms;
      u.uTopColor.value.copy(palette.skyTop);
      u.uMidColor.value.copy(palette.skyMid);
      u.uHorizonColor.value.copy(palette.skyHorizon);
    }
    if (ambientRef.current) {
      ambientRef.current.color.copy(palette.ambient);
      ambientRef.current.intensity = palette.ambientI;
    }
    if (hemiRef.current) {
      hemiRef.current.color.copy(palette.hemiSky);
      hemiRef.current.groundColor.copy(palette.hemiGround);
      hemiRef.current.intensity = palette.hemiI;
    }
    if (sunRef.current) {
      sunRef.current.color.copy(palette.sun);
      sunRef.current.intensity = palette.sunI;
      sunRef.current.position.copy(palette.sunPos);
    }
    if (fogRef.current) fogRef.current.color.copy(palette.fog);
    cloudMaterial.color.copy(palette.cloud);

    // big low sun at sunset, moon at night (placed relative to the camera so they feel infinitely far)
    const cam = state.camera.position;
    if (sunDiscRef.current) {
      sunDiscRef.current.position.set(cam.x + 260, 38, cam.z - 300);
      sunDiscRef.current.lookAt(cam);
      (sunDiscRef.current.material as THREE.MeshBasicMaterial).opacity = ambience.sunset;
      sunDiscRef.current.visible = ambience.sunset > 0.02;
    }
    if (moonRef.current) {
      moonRef.current.position.set(cam.x - 180, 150, cam.z - 320);
      moonRef.current.lookAt(cam);
      (moonRef.current.material as THREE.MeshBasicMaterial).opacity = ambience.night;
      moonRef.current.visible = ambience.night > 0.02;
    }
  });

  const uniforms = useMemo(() => ({
    uTopColor: { value: new THREE.Color('#7CC8EE') },
    uMidColor: { value: new THREE.Color('#BFE6EE') },
    uHorizonColor: { value: new THREE.Color('#FFF4E0') },
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
      <ambientLight ref={ambientRef} intensity={0.9} color="#FFFFFF" />
      <hemisphereLight
        ref={hemiRef}
        color="#FFF6E4"      // Warm sunny sky light
        groundColor="#BFEDE3" // Light teal ground bounce
        intensity={0.8} 
      />
      
      {/* Key Directional Sun Light with soft shadows */}
      <directionalLight
        ref={sunRef}
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
      <fogExp2 ref={fogRef} attach="fog" args={['#FFF3E0', 0.0012]} />

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
          material={cloudMaterial}
        />
      ))}

      <Stars />
      <mesh ref={sunDiscRef} visible={false}>
        <circleGeometry args={[26, 32]} />
        <meshBasicMaterial color="#FFB25E" transparent opacity={0} fog={false} depthWrite={false} />
      </mesh>
      <mesh ref={moonRef} visible={false}>
        <circleGeometry args={[14, 32]} />
        <meshBasicMaterial color="#F4F1E1" transparent opacity={0} fog={false} depthWrite={false} />
      </mesh>
    </>
  );
};
