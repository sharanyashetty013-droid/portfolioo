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
const float PERIOD = 3.2;
const float FORM = 0.55;   // drop swells at the top
const float FALL = 0.85;   // then falls
const float PI = 3.14159265;

float hash(float n) { return fract(sin(n) * 43758.5453); }

vec3 background(vec2 uv, vec2 p, float t) {
  vec3 sky = mix(vec3(1.0, 0.957, 0.878), vec3(0.75, 0.90, 0.93), smoothstep(HORIZON, 0.75, uv.y));
  sky = mix(sky, vec3(0.49, 0.78, 0.93), smoothstep(0.75, 1.15, uv.y));
  sky += vec3(1.0, 0.9, 0.7) * exp(-length(p - vec2(0.55, 0.78)) * 5.0) * 0.25;
  float d = clamp((HORIZON - uv.y) / HORIZON, 0.0, 1.0);
  vec3 sea = mix(vec3(0.61, 0.91, 0.85), vec3(0.17, 0.66, 0.69), pow(d, 0.7));
  float z = 1.0 / max(0.02, HORIZON - uv.y);
  float w = sin(p.x * 6.0 * z * 0.12 + z * 2.2 + t * 1.1) * sin(p.x * 3.0 * z * 0.08 - z * 1.3 + t * 0.7);
  sea += smoothstep(0.7, 1.0, w) * 0.2 * (1.0 - d * 0.5) * smoothstep(0.0, 0.08, HORIZON - uv.y);
  sea = mix(sea, vec3(1.0, 0.96, 0.88), exp(-(HORIZON - uv.y) * 45.0) * 0.6);
  return uv.y > HORIZON ? sky : sea;
}

// smooth teardrop: round belly (r1), fine tip (r2) at height h (iq's uneven capsule)
float sdTear(vec2 p, float r1, float r2, float h) {
  p.x = abs(p.x);
  float b = (r1 - r2) / h;
  float a = sqrt(1.0 - b * b);
  float k = dot(p, vec2(-b, a));
  if (k < 0.0) return length(p) - r1;
  if (k > a * h) return length(p - vec2(0.0, h)) - r2;
  return dot(p, vec2(a, b)) - r1;
}

// glass shading given a surface normal n
vec3 glassN(vec3 behind, vec2 uv, vec2 p, float t, vec3 n, float alpha) {
  vec3 refr = background(uv - n.xy * 0.09 + vec2(0.0, 0.04), p - n.xy * 0.09, t);
  vec3 c = mix(refr, vec3(0.7, 0.96, 0.94), 0.22);
  float fres = pow(1.0 - n.z, 2.0);
  c = mix(c, vec3(0.08, 0.45, 0.5), fres * 0.55);
  vec3 L = normalize(vec3(-0.5, 0.6, 0.65));
  c += pow(max(dot(n, L), 0.0), 40.0) * 0.95;                       // crisp highlight
  c += smoothstep(0.6, 1.0, dot(n, normalize(vec3(0.55, -0.4, 0.7)))) * 0.18; // soft bounce light
  return mix(behind, c, alpha);
}

// glass shading for a round 2D blob with signed distance d and gradient g
vec3 glass(vec3 behind, vec2 uv, vec2 p, float t, float d, vec2 g, float size, float alpha) {
  float q = clamp(-d / size, 0.0, 1.0);
  return glassN(behind, uv, p, t, normalize(vec3(g * (1.0 - q * q), sqrt(q) + 0.15)), alpha);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  float t = uTime;
  float aa = 1.6 / uRes.y;

  bool fin = uFinal >= 0.0;
  float cycle = fin ? 99.0 : floor(t / PERIOD);
  float k = fin ? uFinal + FORM * 0.6 : t - cycle * PERIOD;
  float xOff = fin ? 0.0 : (hash(cycle * 3.7 + 1.0) - 0.5) * 0.55 * min(aspect, 1.6);
  vec2 impact = vec2(xOff, uImpactY);
  float size = fin ? 1.25 : 1.0;
  float r = 0.05 * size;

  float s = k - FORM - FALL;   // seconds since impact
  vec2 rel = p - impact;
  float ellE = length(vec2(rel.x, rel.y * 3.2));
  float ripSpeed = fin ? 0.6 : 0.26;
  float decay = fin ? 0.45 : 1.0;

  // ripple displacement on the water
  vec2 offset = vec2(0.0);
  if (s > 0.0 && uv.y < HORIZON) {
    float front = s * ripSpeed;
    float ring = sin((ellE - front) * 55.0) * exp(-abs(ellE - front) * 10.0) * exp(-s * decay);
    ring *= smoothstep(front + 0.03, front - 0.12, ellE);
    offset += normalize(rel + 1e-4) * ring * 0.01;
  }
  vec3 col = background(uv + offset, p + offset, t);

  // ripple rings: several soft, widening bands
  if (s > 0.0 && uv.y < HORIZON) {
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float f = s * ripSpeed - fi * 0.05;
      if (f > 0.0) {
        float w = 0.004 + f * 0.012;
        float band = exp(-pow((ellE - f) / w, 2.0));
        col += band * 0.42 * exp(-s * decay * 1.1) * (1.0 - fi * 0.2);
      }
    }
  }

  // ---- the drop ----
  float yTop = 0.98;
  if (s < 0.0) {
    vec2 c; vec2 sc; float alpha = 1.0;
    if (k < FORM) {
      // swelling at the top, wobbling like it's about to let go
      float f = k / FORM;
      float grow = smoothstep(0.0, 1.0, f);
      float wob = sin(f * PI * 3.0) * (1.0 - f) * 0.12;
      c = vec2(impact.x, yTop - r * grow * 0.6);
      sc = vec2(1.0 + wob, 1.0 - wob) * mix(0.25, 1.0, grow);
      alpha = smoothstep(0.0, 0.25, f);
    } else {
      // falling: ease in, stretch with speed
      float f = (k - FORM) / FALL;
      float y = mix(yTop - r * 0.6, impact.y + r * 0.6, f * f);
      float v = f;                      // speed grows linearly
      c = vec2(impact.x, y);
      sc = vec2(1.0 / (1.0 + v * 0.18), 1.0 + v * 0.38);
    }
    vec2 dp = (p - c) / sc;
    float d = sdTear(dp, r, r * 0.04, r * 2.3) * min(sc.x, sc.y);
    if (d < aa * 2.0) {
      // smooth normal from the drop's own profile (no seam down the middle)
      float hw = dp.y < 0.0 ? sqrt(max(1e-4, r * r - dp.y * dp.y)) : max(r * 0.05, r * (1.0 - clamp(dp.y / (r * 2.3), 0.0, 1.0)));
      vec2 nxy = vec2(clamp(dp.x / hw, -1.0, 1.0), dp.y < 0.0 ? dp.y / r : 0.28 * dp.y / (r * 2.3));
      vec3 n = normalize(vec3(nxy * 0.95, sqrt(max(0.02, 1.0 - dot(nxy, nxy)))));
      float cover = smoothstep(aa, -aa, d) * alpha;
      col = glassN(col, uv, p, t, n, cover);
      // window-shaped glint on the upper-left of the belly, plus a soft bottom caustic
      vec2 hl = (dp - vec2(-r * 0.38, r * 0.12)) / vec2(r * 0.16, r * 0.3);
      col += smoothstep(1.0, 0.3, length(hl)) * 0.75 * cover;
      vec2 bl = (dp - vec2(r * 0.15, -r * 0.62)) / vec2(r * 0.45, r * 0.18);
      col += smoothstep(1.0, 0.0, length(bl)) * 0.25 * cover;
    }
    // its shadow on the water grows as it nears
    if (k >= FORM && uv.y < HORIZON) {
      float f = (k - FORM) / FALL;
      float sh = exp(-pow(ellE / (r * (2.2 - f)), 2.0)) * f * f * 0.22;
      col *= 1.0 - sh;
    }
  }

  // ---- impact: squash, crown, rebound jet ----
  if (s >= 0.0 && s < 1.4) {
    // the drop flattening into the surface
    float sq = smoothstep(0.18, 0.0, s);
    if (sq > 0.0) {
      vec2 dp = rel / vec2(r * (1.0 + (1.0 - sq) * 1.6), r * 0.45 * sq + 1e-4);
      float d = (length(dp) - 1.0) * r * 0.45 * sq;
      vec2 g = normalize(rel / vec2(1.0, 0.2) + 1e-4);
      col = glass(col, uv, p, t, d, g, r * 0.5, smoothstep(aa, -aa, d) * sq);
    }
    // crown of droplets thrown up and out
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float ang = (fi / 8.0 - 0.5) * 2.6 + (hash(fi + cycle) - 0.5) * 0.25;
      float v = (0.2 + hash(fi * 1.7 + cycle) * 0.12) * size;
      float ts = s - 0.05;
      if (ts > 0.0) {
        vec2 pos = vec2(sin(ang) * v * ts, (cos(ang) * 1.35 * v) * ts - 1.9 * ts * ts);
        if (pos.y > -0.01) {
          float sz = (0.008 + hash(fi * 2.3 + cycle) * 0.006) * size * (1.0 - smoothstep(0.5, 0.9, ts));
          vec2 dp = rel - pos;
          float d = length(dp) - sz;
          col = glass(col, uv, p, t, d, normalize(dp + 1e-5), sz, smoothstep(aa, -aa, d));
        }
      }
    }
    // rebound jet with a bead that pinches off and falls back
    float jt = s - 0.12;
    if (jt > 0.0 && jt < 0.9) {
      float h = sin(clamp(jt / 0.5, 0.0, 1.0) * PI) * 0.09 * size;
      float wJet = 0.012 * size * (1.0 - smoothstep(0.3, 0.55, jt));
      vec2 jp = rel - vec2(0.0, clamp(rel.y, 0.0, h));
      float dj = length(jp) - wJet;
      if (wJet > 0.0) col = glass(col, uv, p, t, dj, normalize(jp + 1e-5), wJet, smoothstep(aa, -aa, dj));
      float by = jt < 0.4 ? h + 0.015 * size : (0.09 * size + 0.015) - 2.2 * pow(jt - 0.4, 2.0);
      if (by > -0.005) {
        float br = 0.013 * size;
        vec2 bp = rel - vec2(0.0, by);
        float db = length(bp) - br;
        col = glass(col, uv, p, t, db, normalize(bp + 1e-5), br, smoothstep(aa, -aa, db) * step(0.18, jt));
      }
    }
  }

  // bright foam edge on the final ripple as it opens the page
  if (fin && s > 0.0) {
    float e = length(vec2(rel.x, rel.y * (uv.y < HORIZON ? 3.2 : 1.0)));
    col += exp(-pow((e - s * 0.6) / 0.01, 2.0)) * 0.55;
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
      const scale = Math.min(2, window.devicePixelRatio || 1) * (window.innerWidth < 640 ? 0.9 : 1);
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

const FALL_MS = 1180;  // FORM*0.4 + FALL in the shader: final drop's time to impact
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
