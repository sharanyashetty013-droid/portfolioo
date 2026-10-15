import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ISLAND_LAYOUT } from '../../constants/islandLayout';

const waterVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const waterFragmentShader = `
  uniform float uTime;
  uniform vec3 uCameraPos;
  uniform vec3 uSunDirection;
  uniform vec3 uDeepColor;
  uniform vec3 uTealColor;
  uniform vec3 uShallowColor;
  uniform vec3 uFoamColor;
  uniform vec2 uIslandPositions[5];
  uniform float uIslandRadii[5];
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vec2 pos = vWorldPosition.xz;
    
    // Multi-layered animated ripples matching the style reference
    float t = uTime * 0.75;
    float wave1 = sin(pos.x * 0.18 + pos.y * 0.14 + t * 1.3);
    float wave2 = cos(pos.x * 0.24 - pos.y * 0.20 - t * 1.0);
    float wave3 = sin(pos.x * 0.50 + pos.y * 0.38 + t * 2.0) * 0.5;
    float ripple = (wave1 + wave2 + wave3) / 2.5;

    // Perturb surface normal for sparkling light facets
    vec3 n = normalize(vec3(
      cos(pos.x * 0.22 + t) * 0.08 + sin(pos.y * 0.42 - t) * 0.05,
      1.0,
      sin(pos.y * 0.22 + t) * 0.08 + cos(pos.x * 0.42 - t) * 0.05
    ));

    vec3 viewDir = normalize(uCameraPos - vWorldPosition);
    vec3 lightDir = normalize(uSunDirection);

    // Fresnel effect
    float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);

    // Island proximity & shore shallow turquoise ring
    float minShoreDist = 999.0;
    float shoreWeight = 0.0;
    for (int i = 0; i < 5; i++) {
      float d = length(pos - uIslandPositions[i]);
      float r = uIslandRadii[i];
      if (d < r + 14.0) {
        float proximity = clamp(1.0 - (d - r) / 14.0, 0.0, 1.0);
        proximity = smoothstep(0.0, 1.0, proximity);
        if (proximity > shoreWeight) {
          shoreWeight = proximity;
        }
      }
      float diff = d - r;
      if (abs(diff) < abs(minShoreDist)) {
        minShoreDist = diff;
      }
    }

    // Soft caustics light pattern near island shores
    float caustic = 0.0;
    if (shoreWeight > 0.01) {
      vec2 cUv = pos * 0.55;
      float c1 = sin(cUv.x + sin(cUv.y + t * 1.5));
      float c2 = cos(cUv.y + cos(cUv.x + t * 1.2));
      caustic = pow(max(c1 * c2, 0.0), 1.6) * shoreWeight * 0.55;
    }

    // Base water gradient
    vec3 waterColor = mix(uTealColor, uDeepColor, clamp(fresnel * 0.6, 0.0, 1.0));
    waterColor = mix(waterColor, uShallowColor, clamp(shoreWeight * 0.85 + ripple * 0.1, 0.0, 1.0));
    waterColor += vec3(caustic);

    // Specular sun glints
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfVec), 0.0), 32.0);
    waterColor += vec3(1.0, 0.98, 0.92) * spec * 0.75;

    // Contact foam ring at cliff base waterline
    float foamRing = 0.0;
    if (minShoreDist < 1.0 && minShoreDist > -0.6) {
      float fBand = smoothstep(1.0, 0.1, abs(minShoreDist));
      float fNoise = sin(pos.x * 3.2 + t * 3.0) * cos(pos.y * 3.2 - t * 2.0);
      foamRing = fBand * (0.7 + 0.3 * fNoise);
    }
    waterColor = mix(waterColor, uFoamColor, clamp(foamRing * 0.95, 0.0, 1.0));

    // Subtle transparency near shores
    float alpha = mix(0.96, 0.88, shoreWeight * 0.4);
    gl_FragColor = vec4(waterColor, alpha);
    #include <colorspace_fragment>
  }
`;

export const WaterSea: React.FC = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, radii } = useMemo(() => {
    const islands = Object.values(ISLAND_LAYOUT);
    const posArray: [number, number][] = islands.map(isl => [isl.position[0], isl.position[2]]);
    const radArray: number[] = islands.map(isl => isl.radius);
    return {
      positions: posArray.flatMap(p => [p[0], p[1]]),
      radii: radArray,
    };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uCameraPos: { value: new THREE.Vector3(0, 20, 30) },
    uSunDirection: { value: new THREE.Vector3(12, 20, 10).normalize() },
    uDeepColor: { value: new THREE.Color('#2BA9B0') },      // Clear teal
    uTealColor: { value: new THREE.Color('#4CC9C0') },      // Mid turquoise
    uShallowColor: { value: new THREE.Color('#9BE8D8') },   // Shallow turquoise
    uFoamColor: { value: new THREE.Color('#FFFFFF') },      // White foam
    uIslandPositions: { value: positions },
    uIslandRadii: { value: radii },
  }), [positions, radii]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uCameraPos.value.copy(state.camera.position);
    }
  });

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.05, -135]}
      receiveShadow
    >
      <planeGeometry args={[800, 800, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
};
