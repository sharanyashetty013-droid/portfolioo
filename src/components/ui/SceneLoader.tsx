import React, { useEffect, useRef, useState } from 'react';

/**
 * Intro loader: a real-time raymarched "liquid glass" sculpture in raw WebGL
 * (no libraries, so it paints before three.js has even downloaded).
 * Three glass blobs melt in and out of each other, refracting a sky/sea world
 * with chromatic dispersion and an iridescent thin-film sheen.
 * When the 3D world is ready it bursts outward and dissolves into the fly-in.
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uCenter;   // orb centre in uv space (0..1)
uniform vec2 uMouse;    // -1..1

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float map(vec3 p) {
  float t = uTime;
  p.xz *= rot(t * 0.25 + uMouse.x * 0.6);
  p.yz *= rot(uMouse.y * 0.4);
  vec3 c1 = vec3(sin(t * 0.9) * 0.42, cos(t * 0.7) * 0.22, 0.0);
  vec3 c2 = vec3(cos(t * 0.6 + 2.0) * 0.55, sin(t * 0.8 + 1.0) * 0.35, sin(t * 0.5) * 0.3);
  vec3 c3 = vec3(sin(t * 0.5 + 4.0) * 0.3, cos(t * 1.1 + 3.0) * 0.45, cos(t * 0.7) * 0.35);
  float d = length(p - c1) - 0.62;
  d = smin(d, length(p - c2) - 0.42, 0.42);
  d = smin(d, length(p - c3) - 0.34, 0.42);
  // gentle surface ripples
  d += sin(p.x * 7.0 + t * 1.6) * sin(p.y * 6.0 - t * 1.2) * sin(p.z * 5.0 + t) * 0.018;
  return d;
}

vec3 nrm(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}

// the world the glass reflects / refracts: cream sky, teal sea, sun, caustic bands
vec3 env(vec3 d) {
  float y = d.y;
  vec3 sky = mix(vec3(1.0, 0.95, 0.86), vec3(0.55, 0.82, 0.95), smoothstep(0.0, 0.9, y));
  vec3 sea = mix(vec3(0.42, 0.85, 0.80), vec3(0.10, 0.55, 0.60), smoothstep(0.0, -0.8, y));
  vec3 c = mix(sea, sky, smoothstep(-0.05, 0.08, y));
  float bands = sin(d.x * 14.0 + uTime * 0.8 + sin(d.z * 9.0)) * sin(d.z * 11.0 - uTime * 0.6);
  c += smoothstep(0.75, 1.0, bands) * 0.35 * step(y, 0.0);
  vec3 sunDir = normalize(vec3(0.6, 0.55, 0.6));
  c += vec3(1.0, 0.85, 0.6) * pow(max(dot(d, sunDir), 0.0), 40.0) * 1.6;
  c += vec3(1.0) * smoothstep(0.985, 1.0, dot(d, normalize(vec3(-0.5, 0.7, 0.4)))) * 0.9; // softbox
  return c;
}

// soft caustic pattern for the backdrop
float caustic(vec2 uv) {
  vec2 p = uv * 6.0;
  float t = uTime * 0.4;
  float c = 0.0;
  for (int i = 0; i < 3; i++) {
    p += vec2(sin(p.y + t), cos(p.x - t)) * 0.6;
    c += 0.5 + 0.5 * sin(p.x + p.y);
  }
  return pow(c / 3.0, 3.0);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  float aspect = uRes.x / uRes.y;
  // normalise by the smaller side so the sculpture fits phones and desktops alike
  vec2 q = (uv - uCenter) * uRes / min(uRes.x, uRes.y);
  if (aspect < 1.0) q *= 0.78; // a touch bigger on phones

  // backdrop: page gradient + drifting caustic light + glow under the orb
  vec3 top = vec3(1.0, 0.95, 0.88), mid = vec3(0.80, 0.94, 0.92), bot = vec3(0.17, 0.66, 0.69);
  vec3 bg = mix(bot, mix(mid, top, smoothstep(0.55, 1.0, uv.y)), smoothstep(0.0, 0.62, uv.y));
  bg += caustic(uv * vec2(aspect, 1.0) * 0.6) * 0.18 * (1.0 - uv.y);
  float halo = exp(-dot(q, q) * 9.0);
  bg += vec3(0.55, 0.95, 0.9) * halo * 0.25;
  float shadow = exp(-pow((q.y + 0.3) * 10.0, 2.0) - q.x * q.x * 14.0);
  bg = mix(bg, bg * 0.72, shadow * 0.55);

  vec3 ro = vec3(0.0, 0.0, 6.2);
  vec3 rd = normalize(vec3(q, -1.75));
  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 72; i++) {
    float d = map(ro + rd * t);
    if (d < 0.0015) { hit = true; break; }
    t += d;
    if (t > 9.0) break;
  }

  vec3 col = bg;
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = nrm(p);
    float fres = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
    // dispersion: each colour channel bends by a different amount
    vec3 refr;
    refr.r = env(refract(rd, n, 1.0 / 1.42)).r;
    refr.g = env(refract(rd, n, 1.0 / 1.46)).g;
    refr.b = env(refract(rd, n, 1.0 / 1.51)).b;
    vec3 refl = env(reflect(rd, n));
    // thin-film iridescence on the rim
    vec3 iri = 0.5 + 0.5 * cos(6.2831 * (fres * 1.6 + vec3(0.0, 0.33, 0.67) + uTime * 0.07));
    col = mix(refr * vec3(0.92, 1.0, 0.98), refl, 0.12 + fres * 0.7);
    col = mix(col, col * iri * 1.35, fres * 0.65);
    // crisp specular highlights
    vec3 l1 = normalize(vec3(0.6, 0.7, 0.5));
    col += pow(max(dot(reflect(rd, n), l1), 0.0), 90.0) * 1.4;
    col += pow(max(dot(reflect(rd, n), normalize(vec3(-0.7, 0.3, 0.6))), 0.0), 30.0) * 0.25;
  }

  // vignette
  col *= 1.0 - 0.18 * dot(uv - 0.5, uv - 0.5) * 2.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

function useLiquidGlass(canvasRef: React.RefObject<HTMLCanvasElement | null>, running: boolean) {
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
    const uCenter = gl.getUniformLocation(prog, 'uCenter');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);

    // render at reduced resolution: a full-screen raymarch is pricey on phones
    const resize = () => {
      const scale = Math.min(1, window.devicePixelRatio || 1) * (window.innerWidth < 640 ? 0.55 : 0.7);
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = reduced ? 2 : (now - start) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      const wide = window.innerWidth >= 768;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uCenter, wide ? 0.6 : 0.5, wide ? 0.6 : 0.6);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [canvasRef, running]);
  return supported;
}

const NAME = 'Sharanya';

export const SceneLoader: React.FC<{ visible: boolean }> = ({ visible }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(true);
  const [progress, setProgress] = useState(0);
  const supported = useLiquidGlass(canvasRef, mounted);

  // eased progress: creeps toward 92% while loading, snaps to 100% when ready
  useEffect(() => {
    if (!visible) {
      setProgress(100);
      const id = setTimeout(() => setMounted(false), 1400);
      return () => clearTimeout(id);
    }
    const id = setInterval(() => setProgress((p) => p + (92 - p) * 0.06), 120);
    return () => clearInterval(id);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div className={`lg-loader ${visible ? '' : 'is-leaving'}`} aria-hidden={!visible} role="status">
      {supported ? <canvas ref={canvasRef} className="lg-canvas" /> : <div className="lg-canvas lg-fallback" />}

      <div className="lg-copy">
        <h2 className="lg-name" aria-label={NAME}>
          {NAME.split('').map((ch, i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties} data-ch={ch}>
              {ch}
            </span>
          ))}
        </h2>
        <p className="lg-tag">backend · blockchain · hackathons</p>
        <div className="lg-bar">
          <div className="lg-bar-fill" style={{ width: `${progress}%` }} />
          <span className="lg-bar-label">{progress >= 99 ? 'setting sail' : `charting the islands ${Math.round(progress)}%`}</span>
        </div>
      </div>
    </div>
  );
};
