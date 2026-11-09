import React, { useEffect, useRef, useState } from 'react';

/**
 * Loading screen: a calm, empty turquoise sea drawn live in raw WebGL (no
 * libraries, shows instantly). When the 3D world is ready it fades into the
 * same empty sea, and the islands rise out of the water (see introTimeline).
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
  // calm, empty sea: the islands haven't risen yet
  gl_FragColor = vec4(background(uv, p, uTime), 1.0);
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


export const SceneLoader: React.FC<{ visible: boolean }> = ({ visible }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finalStartRef = useRef(-1);
  const [mounted, setMounted] = useState(true);
  const [final, setFinal] = useState(false);
  const supported = useWaterDrop(canvasRef, finalStartRef, mounted);

  useEffect(() => {
    if (visible) return;
    setFinal(true);
    const id = setTimeout(() => setMounted(false), 1100);
    return () => clearTimeout(id);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div className={`wd-loader ${final ? 'is-final' : ''}`} aria-hidden={!visible} role="status">
      {supported ? <canvas ref={canvasRef} className="wd-canvas" /> : <div className="wd-canvas wd-fallback" />}

    </div>
  );
};
