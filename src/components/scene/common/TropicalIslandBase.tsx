import React, { useMemo } from 'react';
import * as THREE from 'three';
import { IslandConfig } from '../../../constants/islandLayout';

interface TropicalIslandBaseProps {
  config: IslandConfig;
}

// Pseudo-random seeded generator
function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const TropicalIslandBase: React.FC<TropicalIslandBaseProps> = ({ config }) => {
  const { radius, height, seed, sandColor, cliffColor } = config;

  const { sandGeo, cliffGeo } = useMemo(() => {
    const rng = createSeededRandom(seed);
    const segments = 18;
    const rimRadii: number[] = [];
    const angles: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      angles.push(angle);
      const noise = (rng() - 0.5) * 1.6;
      rimRadii.push(radius + noise);
    }

    // 1. SAND TOP DISC
    const rings = 4;
    const sandPositions: number[] = [];
    const sandNormals: number[] = [];
    const sandColors: number[] = [];
    const sandIndices: number[] = [];
    const baseSand = new THREE.Color(sandColor || '#F9E7B8');
    const darkSand = new THREE.Color('#F0D49A');

    sandPositions.push(0, height + 0.35, 0);
    sandNormals.push(0, 1, 0);
    sandColors.push(baseSand.r, baseSand.g, baseSand.b);

    for (let r = 1; r <= rings; r++) {
      const ringFrac = r / rings;
      for (let s = 0; s < segments; s++) {
        const angle = angles[s];
        const rad = rimRadii[s] * ringFrac;
        const x = Math.cos(angle) * rad;
        const z = Math.sin(angle) * rad;
        const duneNoise = (rng() - 0.5) * 0.16;
        const y = height + (1.0 - ringFrac) * 0.35 + duneNoise;
        sandPositions.push(x, y, z);
        sandNormals.push(0, 1, 0);
        const patchCol = baseSand.clone().lerp(darkSand, (rng() * 0.5) + (ringFrac * 0.25));
        sandColors.push(patchCol.r, patchCol.g, patchCol.b);
      }
    }

    for (let s = 0; s < segments; s++) {
      const next = (s + 1) % segments;
      sandIndices.push(0, 1 + s, 1 + next);
    }

    for (let r = 1; r < rings; r++) {
      const rowStart = 1 + (r - 1) * segments;
      const nextRowStart = 1 + r * segments;
      for (let s = 0; s < segments; s++) {
        const next = (s + 1) % segments;
        const a = rowStart + s;
        const b = nextRowStart + s;
        const c = nextRowStart + next;
        const d = rowStart + next;
        sandIndices.push(a, b, d);
        sandIndices.push(b, c, d);
      }
    }

    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sandPositions, 3));
    sGeo.setAttribute('color', new THREE.Float32BufferAttribute(sandColors, 3));
    sGeo.setIndex(sandIndices);
    sGeo.computeVertexNormals();

    // 2. CLIFF
    const cliffPositions: number[] = [];
    const cliffColors: number[] = [];
    const cliffIndices: number[] = [];
    const cliffTopCol = new THREE.Color(cliffColor || '#C2AE98');
    const cliffMidCol = new THREE.Color('#A8957F');
    const cliffWaterCol = new THREE.Color('#7FB5AB');
    const cliffDeepCol = new THREE.Color('#5FA9A3');

    const yLevels = [height, height * 0.45, 0.0, -4.0, -12.0];
    const taperFactors = [1.0, 0.98, 0.94, 0.88, 0.75];

    for (let l = 0; l < yLevels.length; l++) {
      const yVal = yLevels[l];
      const taper = taperFactors[l];
      let col: THREE.Color;
      if (yVal >= height * 0.45) {
        const t = (height - yVal) / Math.max(0.001, height - height * 0.45);
        col = cliffTopCol.clone().lerp(cliffMidCol, t);
      } else if (yVal >= 0.0) {
        const t = (height * 0.45 - yVal) / Math.max(0.001, height * 0.45);
        col = cliffMidCol.clone().lerp(cliffWaterCol, t);
      } else {
        const t = Math.min(1.0, -yVal / 12.0);
        col = cliffWaterCol.clone().lerp(cliffDeepCol, t);
      }

      for (let s = 0; s < segments; s++) {
        const angle = angles[s];
        const rad = rimRadii[s] * taper;
        const x = Math.cos(angle) * rad;
        const z = Math.sin(angle) * rad;
        cliffPositions.push(x, yVal, z);
        cliffColors.push(col.r, col.g, col.b);
      }
    }

    for (let l = 0; l < yLevels.length - 1; l++) {
      const rowStart = l * segments;
      const nextRowStart = (l + 1) * segments;
      for (let s = 0; s < segments; s++) {
        const next = (s + 1) % segments;
        const a = rowStart + s;
        const b = nextRowStart + s;
        const c = nextRowStart + next;
        const d = rowStart + next;
        cliffIndices.push(a, b, d);
        cliffIndices.push(b, c, d);
      }
    }

    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.Float32BufferAttribute(cliffPositions, 3));
    cGeo.setAttribute('color', new THREE.Float32BufferAttribute(cliffColors, 3));
    cGeo.setIndex(cliffIndices);
    cGeo.computeVertexNormals();

    return { sandGeo: sGeo, cliffGeo: cGeo };
  }, [radius, height, seed, sandColor, cliffColor]);

  return (
    <group position={config.position}>
      {/* Sandy Dune Top */}
      <mesh geometry={sandGeo} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.92}
          metalness={0.05}
          flatShading
        />
      </mesh>
      {/* Tall Faceted Vertical Striation Cliff */}
      <mesh geometry={cliffGeo} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.88}
          metalness={0.08}
          flatShading
        />
      </mesh>
    </group>
  );
};
