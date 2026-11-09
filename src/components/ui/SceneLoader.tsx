import React, { useEffect, useRef, useState } from 'react';

/**
 * "Surfacing" intro, rendered live in raw WebGL (no libraries, paints instantly).
 * You start deep under the sea: light shafts from above, drifting marine snow,
 * rising bubbles and the anchor chain hanging from your boat at the surface.
 * The depth gauge counts up to the surface while the world loads; when it's
 * ready the waterline sweeps past and you break through into the islands.
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uRise;   // 0 = deep, 1 = just below the surface
uniform float uBreach; // 0..1 breaking through the surface

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float caustic(vec2 uv, float t) {
  vec2 p = uv * 5.0;
  float c = 0.0;
  for (int i = 0; i < 3; i++) {
    p += vec2(sin(p.y * 1.3 + t), cos(p.x * 1.1 - t * 0.8)) * 0.55;
    c += 0.5 + 0.5 * sin(p.x + p.y);
  }
  return pow(c / 3.0, 4.0);
}

// one rising bubble per column cell
float bubbles(vec2 uv, float t, float scale, float speed) {
  vec2 g = uv * vec2(scale, scale * 0.5);
  float col = floor(g.x);
  float r = hash(vec2(col, scale));
  float y = fract(g.y * 0.5 - t * speed * (0.6 + r) - r * 7.0) * 2.0;
  float x = fract(g.x) - 0.5 + sin(t * 2.0 + r * 30.0 + y * 4.0) * 0.12;
  vec2 d = vec2(x, y - 1.0);
  float rad = 0.05 + r * 0.08;
  float l = length(d);
  float ring = smoothstep(rad, rad - 0.02, l) - smoothstep(rad - 0.03, rad - 0.05, l) * 0.7;
  float glint = smoothstep(0.03, 0.0, length(d - vec2(-rad * 0.35, rad * 0.35)));
  return (ring * 0.6 + glint) * step(0.55, hash(vec2(col, 3.0 + scale)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  float t = uTime;

  // water column: darker the deeper we are, lighter toward the surface
  float depthLight = mix(0.25, 1.0, uRise);
  vec3 deep = vec3(0.01, 0.05, 0.10);
  vec3 mid = vec3(0.02, 0.22, 0.32);
  vec3 shallow = vec3(0.10, 0.55, 0.62);
  vec3 col = mix(deep, mid, smoothstep(0.0, 0.7, uv.y));
  col = mix(col, shallow, smoothstep(0.55, 1.0, uv.y) * depthLight);
  col *= mix(0.55, 1.0, uRise);

  // sun shafts fanning down from above
  vec2 src = vec2(0.15, 1.35);
  vec2 dir = p - src;
  float ang = atan(dir.x, -dir.y);
  float shafts = pow(0.5 + 0.5 * sin(ang * 23.0 + t * 0.35), 6.0);
  shafts += pow(0.5 + 0.5 * sin(ang * 37.0 - t * 0.27 + 1.3), 8.0) * 0.7;
  shafts *= noise(vec2(ang * 9.0, t * 0.2)) * 1.2;
  float fall = smoothstep(0.0, 1.0, uv.y) * smoothstep(1.6, 0.2, length(dir));
  col += vec3(0.55, 0.85, 0.85) * shafts * fall * 0.35 * depthLight;

  // surface seen from below: bright rippling ceiling
  float wave = sin(p.x * 9.0 + t * 1.6) * 0.008 + sin(p.x * 23.0 - t * 2.3) * 0.004;
  float surf = smoothstep(0.93 + wave, 1.0 + wave, uv.y);
  float sparkle = caustic(vec2(p.x * 1.6, t * 0.15), t * 1.2);
  col = mix(col, vec3(0.65, 0.95, 0.92) + sparkle * 0.6, surf * mix(0.35, 0.9, uRise));

  // the boat's hull silhouetted at the surface, with its anchor chain
  float hullY = 0.985 + wave * 0.5;
  float hull = step(abs(p.x), 0.17 - (hullY - uv.y) * 2.4) * step(hullY - 0.055, uv.y) * step(uv.y, hullY);
  col = mix(col, vec3(0.01, 0.06, 0.09), hull * 0.92);
  float chainX = 0.07 + sin(uv.y * 3.0 + t * 0.6) * 0.008;
  float linkY = fract(uv.y * 26.0 + uRise * 18.0); // links slide down as we rise
  float link = smoothstep(0.012, 0.004, abs(abs(p.x - chainX) - 0.006 * (0.6 + 0.4 * sin(linkY * 6.283))));
  float chainMask = step(uv.y, hullY - 0.04) * smoothstep(0.0, 0.5, uv.y);
  col = mix(col, vec3(0.02, 0.08, 0.11), link * chainMask * 0.85);

  // dancing caustic light near the top
  col += caustic(p * 0.9 + vec2(0.0, t * 0.03), t) * 0.12 * smoothstep(0.3, 1.0, uv.y) * depthLight;

  // marine snow drifting by
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 sp = p * (14.0 + fi * 9.0) + vec2(t * 0.15 * (fi + 1.0), -t * (0.35 + fi * 0.2) - uRise * 8.0);
    vec2 cell = floor(sp);
    vec2 f = fract(sp) - 0.5;
    float h = hash(cell + fi * 17.0);
    float d = length(f - (vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5) * 0.7);
    col += vec3(0.7, 0.9, 0.9) * smoothstep(0.06, 0.0, d) * step(0.82, h) * (0.25 + 0.15 * fi) * depthLight;
  }

  // bubbles rising past
  col += vec3(0.75, 0.95, 0.95) * bubbles(p + vec2(0.3, 0.0), t, 7.0, 0.22) * 0.55;
  col += vec3(0.75, 0.95, 0.95) * bubbles(p - vec2(0.9, 0.0), t * 1.2, 11.0, 0.3) * 0.35;

  // vignette
  col *= 1.0 - 0.55 * pow(length((uv - vec2(0.5, 0.55)) * vec2(1.0, 1.2)), 2.2);

  // breaking the surface: the waterline sweeps down past the camera
  float line = 1.0 - uBreach * 1.25 + sin(p.x * 7.0 + t * 3.0) * 0.025;
  float on = step(0.001, uBreach);
  float above = smoothstep(line - 0.01, line + 0.01, uv.y);
  vec3 air = mix(vec3(1.0, 0.96, 0.88), vec3(0.75, 0.92, 0.95), uv.y);
  col = mix(col, air, above * on);
  col += smoothstep(0.03, 0.0, abs(uv.y - line)) * on * 0.8;

  gl_FragColor = vec4(col, 1.0);
}
`;

function useUnderwater(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  riseRef: React.MutableRefObject<number>,
  breachRef: React.MutableRefObject<number>,
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
    const uRise = gl.getUniformLocation(prog, 'uRise');
    const uBreach = gl.getUniformLocation(prog, 'uBreach');

    // reduced resolution keeps the full-screen shader cheap on phones
    const resize = () => {
      const scale = Math.min(1, window.devicePixelRatio || 1) * (window.innerWidth < 640 ? 0.6 : 0.75);
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 3 : (now - start) / 1000);
      gl.uniform1f(uRise, riseRef.current);
      gl.uniform1f(uBreach, breachRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [canvasRef, riseRef, breachRef, running]);
  return supported;
}

const MAX_DEPTH = 200;

export const SceneLoader: React.FC<{ visible: boolean }> = ({ visible }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riseRef = useRef(0);
  const breachRef = useRef(0);
  const [mounted, setMounted] = useState(true);
  const [depth, setDepth] = useState(MAX_DEPTH);
  const [breaching, setBreaching] = useState(false);
  const supported = useUnderwater(canvasRef, riseRef, breachRef, mounted);

  // ascend while loading (eases toward ~12 m), then surface when the world is ready
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const target = visible ? 0.94 : 1;
      riseRef.current += (target - riseRef.current) * Math.min(1, (visible ? 0.9 : 4) * dt);
      if (!visible) breachRef.current = Math.min(1, breachRef.current + dt / 1.1);
      setDepth(Math.max(0, Math.round(MAX_DEPTH * (1 - riseRef.current) * (1 - breachRef.current))));
      if (breachRef.current < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    if (!visible) {
      setBreaching(true);
      const id = setTimeout(() => setMounted(false), 1900);
      return () => { cancelAnimationFrame(raf); clearTimeout(id); };
    }
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div className={`sf-loader ${breaching ? 'is-breaching' : ''}`} aria-hidden={!visible} role="status">
      {supported ? <canvas ref={canvasRef} className="sf-canvas" /> : <div className="sf-canvas sf-fallback" />}

      <div className="sf-copy">
        <p className="sf-kicker">a voyage through the work of</p>
        <h2 className="sf-name">
          <span>Sharanya</span> <span>L Shetty</span>
        </h2>
        <p className="sf-role">Backend &amp; Blockchain Engineer</p>
      </div>

      {/* depth gauge doubles as the progress indicator */}
      <div className="sf-gauge">
        <div className="sf-gauge-track">
          <div
            className="sf-gauge-fill"
            style={{ height: `${100 - (depth / MAX_DEPTH) * 100}%`, '--w': `${100 - (depth / MAX_DEPTH) * 100}%` } as React.CSSProperties}
          />
          {[0, 50, 100, 150, 200].map((m) => (
            <span key={m} className="sf-tick" style={{ top: `${(m / MAX_DEPTH) * 100}%` }}>
              <i />{m}
            </span>
          ))}
        </div>
        <div className="sf-readout">
          <span className="sf-readout-label">depth</span>
          <span className="sf-readout-value">{depth === 0 ? 'SURFACE' : `${depth} m`}</span>
        </div>
      </div>
    </div>
  );
};
