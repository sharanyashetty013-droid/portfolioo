import * as THREE from 'three';

/**
 * Soft round glowing points with per-point size, colour and twinkle.
 * mode 0 = gentle twinkle (stars), 1 = blink on/off (fireflies), 2 = steady (markers)
 */
export function createGlowMaterial(opts: { attenuate: boolean; mode: 0 | 1 | 2; blending?: THREE.Blending }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uPixelRatio: { value: Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1) },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      attribute float aSpeed;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = aSize * uPixelRatio;
        ${opts.attenuate ? 'size *= 60.0 / max(1.0, -mv.z);' : ''}
        float s = sin(uTime * aSpeed + aPhase);
        ${
          opts.mode === 0
            ? 'vAlpha = 0.55 + 0.45 * s; size *= 0.85 + 0.15 * s;'
            : opts.mode === 1
            ? 'float b = pow(max(0.0, s), 2.5); vAlpha = 0.08 + 0.92 * b; size *= 0.6 + 0.6 * b;'
            : 'vAlpha = 1.0;'
        }
        gl_PointSize = size;
        vColor = aColor;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;     // 0 centre -> 1 edge
        if (d > 1.0) discard;
        float core = smoothstep(0.35, 0.0, d);              // bright centre
        float halo = pow(1.0 - d, 2.2) * 0.55;              // soft falloff
        float a = (core + halo) * vAlpha * uOpacity;
        gl_FragColor = vec4(vColor * (0.75 + core * 0.6), a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: opts.blending ?? THREE.AdditiveBlending,
  });
}

/** Build a points geometry with the attributes createGlowMaterial expects. */
export function glowGeometry(
  positions: number[],
  per: { size: number; phase: number; speed: number; color: THREE.Color }[]
) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(per.map((p) => p.size), 1));
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(per.map((p) => p.phase), 1));
  g.setAttribute('aSpeed', new THREE.Float32BufferAttribute(per.map((p) => p.speed), 1));
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(per.flatMap((p) => [p.color.r, p.color.g, p.color.b]), 3));
  return g;
}

/** Tiny deterministic RNG so layouts are stable between reloads. */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
