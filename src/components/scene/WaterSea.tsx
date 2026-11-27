import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ISLAND_LAYOUT } from '../../constants/islandLayout';
import { ambience, blendPalette, makePalette } from './ambience';

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
  uniform vec3 uTint;
  uniform vec3 uFogColor;
  uniform vec3 uGlint;
  uniform vec2 uIslandPositions[5];
  uniform float uIslandRadii[5];
  uniform float uRise[5];
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vec2 pos = vWorldPosition.xz;
    
    // Wave field: several directional waves summed, with their slopes, so the surface
    // has real relief (light crests, darker troughs) and a properly tilted normal for lighting
    float t = uTime * 0.75;
    float h = 0.0;
    vec2 slope = vec2(0.0);
    // direction, frequency, amplitude, speed
    vec4 W[6];
    W[0] = vec4(normalize(vec2( 1.0,  0.35)), 0.16, 1.0);
    W[1] = vec4(normalize(vec2(-0.6,  1.0)),  0.23, 0.7);
    W[2] = vec4(normalize(vec2( 0.8, -0.9)),  0.37, 0.45);
    W[3] = vec4(normalize(vec2(-1.0, -0.2)),  0.61, 0.28);
    W[4] = vec4(normalize(vec2( 0.3,  1.0)),  1.05, 0.16);
    W[5] = vec4(normalize(vec2(-0.7, -0.8)),  1.7,  0.09);
    float speeds[6] = float[6](1.1, 1.3, 1.7, 2.1, 2.8, 3.6);
    for (int i = 0; i < 6; i++) {
      vec2 d = W[i].xy;
      float f = W[i].z;
      float a = W[i].w;
      float ph = dot(d, pos) * f + t * speeds[i];
      h += sin(ph) * a;
      slope += d * cos(ph) * a * f;
    }
    float ripple = h / 1.6;                 // about -1..1
    vec3 n = normalize(vec3(-slope.x * 0.9, 1.0, -slope.y * 0.9));

    vec3 viewDir = normalize(uCameraPos - vWorldPosition);
    vec3 lightDir = normalize(uSunDirection);

    // Fresnel effect
    float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);

    // Island proximity & shore shallow turquoise ring
    float minShoreDist = 999.0;
    float shoreWeight = 0.0;
    float churn = 0.0;
    for (int i = 0; i < 5; i++) {
      float d = length(pos - uIslandPositions[i]);
      float rise = clamp(uRise[i], 0.0, 1.0);
      float r = uIslandRadii[i] * mix(0.2, 1.0, rise);
      // white churning water while the island shoulders up through the surface
      float burst = sin(clamp(uRise[i], 0.0, 1.0) * 3.14159) * step(0.001, uRise[i]) * (uRise[i] < 1.0 ? 1.0 : 0.0);
      float churnBand = smoothstep(r + 3.0 + burst * 10.0, r, d) * smoothstep(r - 3.0, r, d);
      float boil = 0.5 + 0.5 * sin(pos.x * 1.7 + uTime * 6.0) * cos(pos.y * 1.9 - uTime * 5.0);
      churn = max(churn, churnBand * burst * (0.55 + 0.45 * boil));
      if (rise < 0.02) continue;
      if (d < r + 14.0) {
        float proximity = clamp(1.0 - (d - r) / 14.0, 0.0, 1.0);
        proximity = smoothstep(0.0, 1.0, proximity);
        proximity *= rise;
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

    // Base water gradient: deeper colour in the troughs, brighter on the crests
    vec3 waterColor = mix(uTealColor, uDeepColor, clamp(fresnel * 0.6 + (0.5 - ripple * 0.5) * 0.35, 0.0, 1.0));
    waterColor = mix(waterColor, uShallowColor, clamp(shoreWeight * 0.85 + max(ripple, 0.0) * 0.22, 0.0, 1.0));
    // a little self-shadowing on the side of each wave facing away from the sun
    float lambert = clamp(dot(n, lightDir) * 0.5 + 0.5, 0.0, 1.0);
    waterColor *= mix(0.82, 1.08, lambert);
    waterColor += vec3(caustic);

    // sky reflection toward the horizon
    waterColor = mix(waterColor, uFogColor, clamp(fresnel * 0.35, 0.0, 0.35));

    // sun / moon glints: a broad sheen plus sharp sparkles on the wave facets
    vec3 halfVec = normalize(lightDir + viewDir);
    float nh = max(dot(n, halfVec), 0.0);
    float spec = pow(nh, 28.0) * 0.4 + pow(nh, 220.0) * 2.2;
    waterColor += uGlint * spec;

    // waves lapping toward each shore: foam lines rolling in
    if (minShoreDist > 0.0 && minShoreDist < 7.0) {
      float roll = fract(minShoreDist * 0.32 + t * 0.35);
      float line = smoothstep(0.0, 0.06, roll) * smoothstep(0.16, 0.06, roll);
      float breakUp = 0.55 + 0.45 * sin(pos.x * 1.3 + pos.y * 1.1 + t);
      waterColor = mix(waterColor, uFoamColor, line * breakUp * (1.0 - minShoreDist / 7.0) * 0.6);
    }

    // Contact foam ring at cliff base waterline
    float foamRing = 0.0;
    if (minShoreDist < 1.0 && minShoreDist > -0.6) {
      float fBand = smoothstep(1.0, 0.1, abs(minShoreDist));
      float fNoise = sin(pos.x * 3.2 + t * 3.0) * cos(pos.y * 3.2 - t * 2.0);
      foamRing = fBand * (0.7 + 0.3 * fNoise);
    }
    waterColor = mix(waterColor, uFoamColor, clamp(foamRing * 0.95 + churn * 1.15, 0.0, 1.0));

    // Subtle transparency near shores
    waterColor *= uTint;
    // melt into the horizon with distance (ShaderMaterial doesn't get scene fog)
    float dist = length(uCameraPos - vWorldPosition);
    float fogF = 1.0 - exp(-pow(dist * 0.0016, 2.0));
    waterColor = mix(waterColor, uFogColor, clamp(fogF, 0.0, 1.0));
    float alpha = mix(0.96, 0.88, shoreWeight * 0.4);
    gl_FragColor = vec4(waterColor, alpha);
    #include <colorspace_fragment>
  }
`;

export const WaterSea: React.FC = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const palette = useMemo(() => makePalette(), []);

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
    uRise: { value: [1, 1, 1, 1, 1] },
    uTint: { value: new THREE.Color('#FFFFFF') },
    uFogColor: { value: new THREE.Color('#FFF4E0') },
    uGlint: { value: new THREE.Color('#FFFAEB') },
  }), [positions, radii]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uCameraPos.value.copy(state.camera.position);
      blendPalette(palette, ambience.sunset, ambience.night);
      materialRef.current.uniforms.uTint.value.copy(palette.waterTint);
      materialRef.current.uniforms.uFogColor.value.copy(palette.skyHorizon);
      materialRef.current.uniforms.uGlint.value.copy(palette.glint);
      materialRef.current.uniforms.uSunDirection.value.copy(palette.sunPos).normalize();
    }
  });

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.05, -135]}
      receiveShadow
    >
      <planeGeometry args={[3200, 3200, 96, 96]} />
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
