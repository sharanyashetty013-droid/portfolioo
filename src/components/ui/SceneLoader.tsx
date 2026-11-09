import React, { useEffect, useRef, useState } from 'react';

/**
 * Water-drop intro, drawn live in raw WebGL (no libraries, so it shows instantly).
 * Bright sky over the turquoise sea in the site's own colours. While the world
 * loads, glassy drops fall from the sky and splash into the ocean (ripple rings,
 * crown droplets, a little rebound jet). When it's ready one last drop falls and
 * its ripple spreads across the whole screen, opening into the 3D ocean.
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFinal;   // seconds since the final drop started, or -1
uniform float uImpactY; // impact height in uv (0 bottom .. 1 top)

const float HORIZON = 0.4;
const float PERIOD = 2.3;
const float FALL = 0.95;

float hash(float n) { return fract(sin(n) * 43758.5453); }

vec3 background(vec2 uv, vec2 p, float t) {
  // sky: warm cream at the horizon to soft blue above, like the scene
  vec3 sky = mix(vec3(1.0, 0.957, 0.878), vec3(0.75, 0.90, 0.93), smoothstep(HORIZON, 0.75, uv.y));
  sky = mix(sky, vec3(0.49, 0.78, 0.93), smoothstep(0.75, 1.15, uv.y));
  sky += vec3(1.0, 0.9, 0.7) * exp(-length(p - vec2(0.55, 0.78)) * 5.0) * 0.25;
  // sea: pale turquoise at the horizon, deeper teal toward the viewer
  float d = clamp((HORIZON - uv.y) / HORIZON, 0.0, 1.0);
  vec3 sea = mix(vec3(0.61, 0.91, 0.85), vec3(0.17, 0.66, 0.69), pow(d, 0.7));
  // perspective wave glints: tighter bands near the horizon
  float z = 1.0 / max(0.02, HORIZON - uv.y);
  float w = sin(p.x * 6.0 * z * 0.12 + z * 2.2 + t * 1.4) * sin(p.x * 3.0 * z * 0.08 - z * 1.3 + t * 0.9);
  sea += smoothstep(0.7, 1.0, w) * 0.22 * (1.0 - d * 0.5) * smoothstep(0.0, 0.08, HORIZON - uv.y);
  sea = mix(sea, vec3(1.0, 0.96, 0.88), exp(-(HORIZON - uv.y) * 45.0) * 0.6); // haze at the horizon line
  return uv.y > HORIZON ? sky : sea;
}

// teardrop distance-ish field: round bottom, pointed top
float drop(vec2 p, float r, float stretch) {
  p.y /= stretch;
  float y = p.y;
  float hw = y < 0.0 ? sqrt(max(0.0, r * r - y * y)) : r * pow(max(0.0, 1.0 - y / (2.1 * r)), 1.3);
  float top = 2.1 * r;
  if (y < -r || y > top) return 1.0;
  return abs(p.x) - hw;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  float t = uTime;

  // where we are in the current drop's life
  float k; float cycle;
  if (uFinal >= 0.0) { k = uFinal; cycle = 99.0; }
  else { cycle = floor(t / PERIOD); k = t - cycle * PERIOD; }
  float xOff = uFinal >= 0.0 ? 0.0 : (hash(cycle * 3.7) - 0.5) * 0.5 * min(aspect, 1.6);
  vec2 impact = vec2(xOff, uImpactY);

  // splash timing
  float s = k - FALL;                  // seconds since impact
  vec2 rel = p - impact;
  vec2 offset = vec2(0.0);

  // ripple rings on the water (squashed for perspective)
  if (s > 0.0 && uv.y < HORIZON) {
    float e = length(vec2(rel.x, rel.y * 3.2));
    float speed = uFinal >= 0.0 ? 0.55 : 0.35;
    float front = s * speed;
    float ring = sin((e - front) * 70.0) * exp(-abs(e - front) * 14.0) * exp(-s * (uFinal >= 0.0 ? 0.6 : 1.4));
    ring *= smoothstep(front + 0.02, front - 0.08, e);
    offset += normalize(rel + 1e-4) * ring * 0.012;
  }

  vec3 col = background(uv + offset, p + offset, t);

  // ring highlights
  if (s > 0.0 && uv.y < HORIZON) {
    float e = length(vec2(rel.x, rel.y * 3.2));
    float front = s * (uFinal >= 0.0 ? 0.55 : 0.35);
    for (int i = 0; i < 3; i++) {
      float f = front - float(i) * 0.045;
      if (f > 0.0) {
        float band = smoothstep(0.006, 0.0, abs(e - f));
        col += band * 0.55 * exp(-s * (uFinal >= 0.0 ? 0.5 : 1.3)) * (1.0 - float(i) * 0.3);
      }
    }
  }

  // the falling drop
  if (k < FALL) {
    float f = k / FALL;
    float y = mix(1.15, impact.y + 0.02, f * f);
    float r = 0.034;
    vec2 dp = p - vec2(impact.x, y);
    float stretch = 1.0 + f * 0.55;
    float dd = drop(dp, r, stretch);
    if (dd < 0.004) {
      float inside = smoothstep(0.004, -0.002, dd);
      // refraction: the drop shows a flipped, magnified bit of the world behind it
      vec2 n = vec2(dp.x / r, dp.y / (r * 2.0 * stretch));
      vec3 refr = background(uv - n * 0.08 + vec2(0.0, 0.05), p - n * 0.08, t);
      vec3 dc = mix(refr * vec3(0.9, 1.0, 1.0), vec3(0.6, 0.95, 0.92), 0.25);
      float rim = smoothstep(-0.012, 0.002, dd);
      dc = mix(dc, vec3(0.1, 0.5, 0.55), rim * 0.55);
      dc += smoothstep(0.012, 0.0, length(dp - vec2(-r * 0.35, r * 0.15))) * 0.9;  // highlight
      col = mix(col, dc, inside);
    }
    // soft shadow/reflection on the water under the falling drop
    if (uv.y < HORIZON) {
      float sh = exp(-pow(length(vec2(rel.x, rel.y * 3.2)) * 18.0, 2.0)) * f * f;
      col = mix(col, col * 0.85, sh);
    }
  }

  // splash: rebound jet + crown droplets
  if (s > 0.0 && s < 0.9) {
    float jetH = sin(clamp(s / 0.45, 0.0, 1.0) * 3.14159) * 0.075;
    vec2 jp = rel - vec2(0.0, jetH * 0.5);
    float jet = smoothstep(0.012, 0.004, length(vec2(jp.x * 1.8, max(0.0, abs(jp.y) - jetH * 0.5))));
    float bead = smoothstep(0.016, 0.008, length(rel - vec2(0.0, jetH + 0.012)));
    col = mix(col, vec3(0.85, 1.0, 0.97), max(jet, bead * step(0.1, s)) * (1.0 - smoothstep(0.6, 0.9, s)));
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float ang = (fi / 6.0 - 0.5) * 2.4;
      float v = 0.22 + hash(fi + cycle) * 0.12;
      vec2 dp2 = vec2(sin(ang) * v * s, cos(ang) * v * s * 1.3 - 1.6 * s * s);
      float dd2 = length(rel - dp2);
      float sz = 0.007 + hash(fi * 2.3 + cycle) * 0.005;
      col = mix(col, vec3(0.9, 1.0, 0.98), smoothstep(sz, sz * 0.4, dd2) * step(-0.01, dp2.y + 0.01));
    }
  }

  // white foam ring at the leading edge of the final ripple
  if (uFinal >= 0.0 && s > 0.0) {
    float e = length(vec2(rel.x, rel.y * (uv.y < HORIZON ? 3.2 : 1.0)));
    float front = s * 0.55;
    col += smoothstep(0.01, 0.0, abs(e - front)) * 0.6;
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

const IMPACT_Y = 0.24; // keep in sync with the CSS mask centre (100% - 76%)

function useWaterDrop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  finalStartRef: React.MutableRefObject<number>,
  running: boolean
) {
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !running) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) { setSupported(false); return; }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setSupported(false); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uFinal = gl.getUniformLocation(prog, 'uFinal');
    const uImpactY = gl.getUniformLocation(prog, 'uImpactY');

    const resize = () => {
      const scale = Math.min(1.25, window.devicePixelRatio || 1) * (window.innerWidth < 640 ? 0.75 : 0.85);
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform1f(uFinal, finalStartRef.current < 0 ? -1 : (now - finalStartRef.current) / 1000);
      gl.uniform1f(uImpactY, IMPACT_Y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [canvasRef, finalStartRef, running]);
  return supported;
}

const FALL_MS = 950;   // matches FALL in the shader
const OPEN_MS = 1300;  // ripple opening the page

export const SceneLoader: React.FC<{ visible: boolean }> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finalStartRef = useRef(-1);
  const [mounted, setMounted] = useState(true);
  const [final, setFinal] = useState(false);
  const supported = useWaterDrop(canvasRef, finalStartRef, mounted);

  useEffect(() => {
    if (visible) return;
    // world is ready: drop the last drop, then let its ripple open the page
    setFinal(true);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    finalStartRef.current = t0;
    let raf = 0;
    const open = (now: number) => {
      const s = (now - t0 - (reduced ? 0 : FALL_MS)) / OPEN_MS;
      if (s > 0 && rootRef.current) {
        const e = Math.min(1, s);
        const eased = e * e * (3 - 2 * e);
        const max = Math.hypot(window.innerWidth, window.innerHeight);
        rootRef.current.style.setProperty('--r', `${eased * max}px`);
      }
      if (s < 1) raf = requestAnimationFrame(open);
      else setMounted(false);
    };
    raf = requestAnimationFrame(open);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div ref={rootRef} className={`wd-loader ${final ? 'is-final' : ''}`} aria-hidden={!visible} role="status">
      {supported ? <canvas ref={canvasRef} className="wd-canvas" /> : <div className="wd-canvas wd-fallback" />}

    </div>
  );
};
