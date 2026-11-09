import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ISLAND_LAYOUT, ROUTE_WAYPOINTS } from '../../constants/islandLayout';
import { mapProject } from '../scene/introTimeline';
import type { SectionId } from '../../types/portfolio';

/**
 * "Ink map comes alive" intro.
 * While the world loads, an old sea chart draws itself in ink: every coastline
 * is traced from the real island geometry (same seeded rim as the 3D islands),
 * projected from the exact top-down view the 3D camera opens on. When the world
 * is ready, turquoise watercolour bleeds across the paper and the chart fades
 * into the real ocean with the islands sitting right where they were drawn.
 */

type Pt = [number, number];

// identical to TropicalIslandBase's generator, so the inked coast matches the 3D rim
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// smooth path through points (Catmull-Rom -> cubic Bézier)
function smoothPath(pts: Pt[], closed: boolean) {
  const n = pts.length;
  const get = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return closed ? d + 'Z' : d;
}

const ORDER: SectionId[] = ['home', 'skills', 'projects', 'hackathons', 'contact'];

// little cartographer's glyph drawn at the heart of each island
function glyph(id: SectionId, x: number, y: number, s: number) {
  switch (id) {
    case 'home': // hut
      return `M${x - s},${y + s * 0.6} L${x - s},${y - s * 0.2} L${x},${y - s} L${x + s},${y - s * 0.2} L${x + s},${y + s * 0.6} Z M${x - s * 0.25},${y + s * 0.6} L${x - s * 0.25},${y + s * 0.05} L${x + s * 0.25},${y + s * 0.05} L${x + s * 0.25},${y + s * 0.6}`;
    case 'skills': // windmill
      return `M${x},${y + s} L${x},${y - s * 0.2} M${x - s},${y - s * 1.1} L${x + s},${y + s * 0.7} M${x + s},${y - s * 1.1} L${x - s},${y + s * 0.7}`;
    case 'projects': // a cluster of houses
      return `M${x - s * 1.4},${y + s * 0.5} h${s * 0.9} v-${s * 0.8} l-${s * 0.45},-${s * 0.45} l-${s * 0.45},${s * 0.45} Z M${x + s * 0.2},${y + s * 0.5} h${s * 0.9} v-${s * 0.8} l-${s * 0.45},-${s * 0.45} l-${s * 0.45},${s * 0.45} Z`;
    case 'hackathons': // mountain with a flag
      return `M${x - s * 1.3},${y + s * 0.7} L${x},${y - s} L${x + s * 1.3},${y + s * 0.7} M${x - s * 0.45},${y - s * 0.2} L${x},${y - s * 0.55} L${x + s * 0.45},${y - s * 0.2} M${x},${y - s} L${x},${y - s * 1.6} L${x + s * 0.5},${y - s * 1.4} L${x},${y - s * 1.2}`;
    case 'contact': // lighthouse with a beam
      return `M${x - s * 0.4},${y + s} L${x - s * 0.25},${y - s * 0.6} L${x + s * 0.25},${y - s * 0.6} L${x + s * 0.4},${y + s} Z M${x - s * 0.3},${y - s * 0.6} L${x},${y - s} L${x + s * 0.3},${y - s * 0.6} M${x + s * 0.5},${y - s * 0.8} L${x + s * 1.6},${y - s * 1.2} M${x + s * 0.5},${y - s * 0.7} L${x + s * 1.6},${y - s * 0.35}`;
  }
}

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

const css = (vars: Record<string, string>) => vars as React.CSSProperties;

export const SceneLoader: React.FC<{ visible: boolean }> = ({ visible }) => {
  const { w, h } = useViewport();
  const floodRef = useRef<SVGCircleElement>(null);
  const [phase, setPhase] = useState<'drawing' | 'flooding' | 'gone'>('drawing');
  const startedRef = useRef(false);

  const map = useMemo(() => {
    const islands = ORDER.map((id, idx) => {
      const cfg = ISLAND_LAYOUT[id];
      const rng = seededRandom(cfg.seed);
      const rim: Pt[] = [];
      const shore: Pt[] = [];
      const hatch: string[] = [];
      const centre = mapProject(cfg.position[0], cfg.height, cfg.position[2], w, h);
      const at = (rad: number, a: number, y: number) =>
        mapProject(cfg.position[0] + Math.cos(a) * rad, y, cfg.position[2] + Math.sin(a) * rad, w, h);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const rad = cfg.radius + (rng() - 0.5) * 1.6;
        const p = at(rad, a, cfg.height);
        rim.push([p.sx, p.sy]);
        const q = at(rad + 3.2, a, 0);
        shore.push([q.sx, q.sy]);
        // short hatching strokes radiating off the coast
        for (let j = 0; j < 2; j++) {
          const aa = a + (j * Math.PI) / 18;
          const r0 = at(rad + 0.6, aa, 0);
          const r1 = at(rad + 1.9 + j * 0.4, aa, 0);
          hatch.push(`M${r0.sx.toFixed(1)},${r0.sy.toFixed(1)} L${r1.sx.toFixed(1)},${r1.sy.toFixed(1)}`);
        }
      }
      const grass: Pt[] = rim.map(([x, y]) => [centre.sx + (x - centre.sx) * 0.55, centre.sy + (y - centre.sy) * 0.55]);
      const s = Math.max(5, cfg.radius * centre.pxPerUnit * 0.22);
      return {
        id,
        delay: 0.25 + idx * 0.42,
        coast: smoothPath(rim, true),
        shore: smoothPath(shore, true),
        grass: smoothPath(grass, true),
        hatch: hatch.join(' '),
        glyph: glyph(id, centre.sx, centre.sy, s),
      };
    });
    const route = smoothPath(
      ROUTE_WAYPOINTS.map(([x, , z]) => {
        const p = mapProject(x, 0, z, w, h);
        return [p.sx, p.sy] as Pt;
      }),
      false
    );
    return { islands, route };
  }, [w, h]);

  // scattered wave marks in open water (kept off the islands)
  const waves = useMemo(() => {
    const rng = seededRandom(77);
    const out: string[] = [];
    let tries = 0;
    while (out.length < 26 && tries++ < 400) {
      const x = rng() * w, y = rng() * h;
      const clear = ORDER.every((id) => {
        const c = ISLAND_LAYOUT[id];
        const p = mapProject(c.position[0], 0, c.position[2], w, h);
        return Math.hypot(x - p.sx, y - p.sy) > (c.radius + 7) * p.pxPerUnit;
      });
      if (!clear) continue;
      const s = 7 + rng() * 6;
      out.push(`M${x.toFixed(1)},${y.toFixed(1)} q${s / 2},-${s / 2} ${s},0 t${s},0`);
    }
    return out;
  }, [w, h]);

  // a patch of open sea for the serpent, away from every island
  const serpentAt = useMemo(() => {
    for (const [fx, fy] of [[0.16, 0.62], [0.42, 0.55], [0.3, 0.8], [0.62, 0.35], [0.08, 0.35], [0.5, 0.15]]) {
      const x = w * fx, y = h * fy;
      const clear = ORDER.every((id) => {
        const c = ISLAND_LAYOUT[id];
        const p = mapProject(c.position[0], 0, c.position[2], w, h);
        return Math.hypot(x + 30 - p.sx, y - p.sy) > (c.radius + 4) * p.pxPerUnit + 60;
      });
      if (clear) return [x, y];
    }
    return [w * 0.16, h * 0.62];
  }, [w, h]);

  // when the world is ready: watercolour floods outward from Home, then the chart fades into the 3D sea
  useEffect(() => {
    if (visible || startedRef.current) return;
    startedRef.current = true;
    setPhase('flooding');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const DUR = reduced ? 1 : 1500;
    const max = Math.hypot(w, h) * 1.1;
    let raf = 0;
    const tick = (now: number) => {
      const e = Math.min(1, (now - t0) / DUR);
      const k = 1 - Math.pow(1 - e, 3);
      floodRef.current?.setAttribute('r', String(k * max));
      if (e < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const id = setTimeout(() => setPhase('gone'), DUR + 900);
    return () => { cancelAnimationFrame(raf); clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (phase === 'gone') return null;
  const home = mapProject(ISLAND_LAYOUT.home.position[0], 0, ISLAND_LAYOUT.home.position[2], w, h);
  const compassR = Math.min(w, h) * 0.07;

  return (
    <div className={`ink-loader ${phase === 'flooding' ? 'is-flooding' : ''}`} aria-hidden={!visible} role="status">
      <svg className="ink-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          {/* paper grain + age stains */}
          <filter id="paper" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.2  0 0 0 0.10 0" result="g" />
            <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed="9" result="stain" />
            <feColorMatrix in="stain" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.4  0 0 0 0 0.22  0 0 0 0.35 -0.12" result="st" />
            <feMerge><feMergeNode in="st" /><feMergeNode in="g" /></feMerge>
          </filter>
          {/* slightly wobbly, bleeding ink */}
          <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
          </filter>
          {/* watercolour edge for the flood */}
          <filter id="bleed" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="12" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="90" />
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#5A3E22" stopOpacity="0.38" />
          </radialGradient>
          <radialGradient id="wash" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#9BE8D8" />
            <stop offset="60%" stopColor="#4CC9C0" />
            <stop offset="100%" stopColor="#2BA9B0" />
          </radialGradient>
          <mask id="routeReveal">
            <path d={map.route} className="ink-draw" pathLength={1} stroke="#fff" strokeWidth="10" fill="none" style={css({ '--d': '1.6s', '--dur': '3.2s' })} />
          </mask>
          <mask id="flood">
            <circle ref={floodRef} cx={home.sx} cy={home.sy} r="0" fill="#fff" filter="url(#bleed)" />
          </mask>
        </defs>

        {/* paper */}
        <rect width={w} height={h} fill="#F2E3C2" />
        <rect width={w} height={h} filter="url(#paper)" />
        <rect width={w} height={h} fill="url(#vignette)" />

        {/* watercolour flood (when the world is ready) */}
        <rect width={w} height={h} fill="url(#wash)" mask="url(#flood)" opacity="0.96" />

        <g filter="url(#ink)" fill="none" stroke="#4A3426" strokeLinecap="round" strokeLinejoin="round">
          {/* faint chart grid */}
          <g className="ink-fade" style={css({ '--d': '0s' })} stroke="#8A6A45" strokeWidth="0.6" opacity="0.35">
            {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={(w * (i + 1)) / 10} y1="0" x2={(w * (i + 1)) / 10} y2={h} strokeDasharray="2 6" />)}
            {Array.from({ length: 5 }).map((_, i) => <line key={`h${i}`} x1="0" y1={(h * (i + 1)) / 6} x2={w} y2={(h * (i + 1)) / 6} strokeDasharray="2 6" />)}
          </g>

          {/* wave marks */}
          <g className="ink-fade" style={css({ '--d': '1.2s' })} strokeWidth="1.2" opacity="0.55">
            {waves.map((d, i) => <path key={i} d={d} />)}
          </g>

          {/* islands: coastline inks itself, then shore line, hatching, colour wash and a glyph */}
          {map.islands.map((isl) => (
            <g key={isl.id}>
              <path d={isl.coast} className="ink-tint" fill="#E8CF98" stroke="none" style={css({ '--d': `${isl.delay + 0.7}s` })} />
              <path d={isl.grass} className="ink-tint" fill="#A9D08A" stroke="none" style={css({ '--d': `${isl.delay + 0.9}s` })} />
              <path d={isl.shore} className="ink-fade" strokeWidth="0.9" strokeDasharray="2 4" opacity="0.6" style={css({ '--d': `${isl.delay + 0.5}s` })} />
              <path d={isl.coast} className="ink-draw" pathLength={1} strokeWidth="2.4" style={css({ '--d': `${isl.delay}s` })} />
              <path d={isl.hatch} className="ink-fade" strokeWidth="1" opacity="0.7" style={css({ '--d': `${isl.delay + 0.6}s` })} />
              <path d={isl.glyph} className="ink-fade" strokeWidth="1.6" style={css({ '--d': `${isl.delay + 0.9}s` })} />
            </g>
          ))}

          {/* the sailing route, dashed, inked progressively */}
          <path d={map.route} mask="url(#routeReveal)" strokeWidth="1.8" strokeDasharray="7 8" />

          {/* little ship doodle sailing the route */}
          <g className="ink-fade" style={css({ '--d': '2.2s' })}>
            <g>
              <path d="M-9,2 L9,2 L6,7 L-6,7 Z M0,2 L0,-10 L7,-1 L0,-1" strokeWidth="1.6" fill="#F2E3C2" />
              <animateMotion dur="14s" repeatCount="indefinite" rotate="auto" path={map.route} />
            </g>
          </g>

          {/* sea serpent doodle */}
          <g className="ink-fade" style={css({ '--d': '2.6s' })} transform={`translate(${serpentAt[0].toFixed(0)} ${serpentAt[1].toFixed(0)})`}>
            <g className="serpent">
              <path d="M0,0 q8,-14 16,0 M20,0 q8,-12 16,0 M40,0 q7,-10 14,0 M58,0 q5,-7 10,0 M-14,2 q-4,-12 6,-14 q8,0 6,10 M-9,-9 l1,1" strokeWidth="1.8" />
              <path d="M-20,6 q50,6 100,0" strokeWidth="0.8" opacity="0.5" />
            </g>
          </g>

          {/* compass rose */}
          <g className="ink-fade" style={css({ '--d': '0.5s' })} transform={`translate(${(w - compassR * 1.7).toFixed(0)} ${(h - compassR * 2.4).toFixed(0)})`}>
            <circle r={compassR} strokeWidth="1.2" />
            <circle r={compassR * 0.82} strokeWidth="0.6" strokeDasharray="1.5 4" />
            <path d={`M0,${-compassR * 1.15} L${compassR * 0.16},0 L0,${compassR * 1.15} L${-compassR * 0.16},0 Z`} strokeWidth="1.3" fill="#E9D3A0" />
            <path d={`M${-compassR * 1.15},0 L0,${compassR * 0.16} L${compassR * 1.15},0 L0,${-compassR * 0.16} Z`} strokeWidth="1.1" />
            <path d={`M0,${-compassR * 1.15} L${compassR * 0.16},0 L0,0 Z`} fill="#4A3426" stroke="none" />
            <text y={-compassR * 1.3} textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize={compassR * 0.42} fill="#4A3426" stroke="none">N</text>
          </g>
        </g>

        {/* double-ruled frame */}
        <rect x="10" y="10" width={w - 20} height={h - 20} fill="none" stroke="#4A3426" strokeWidth="1.5" opacity="0.55" />
        <rect x="16" y="16" width={w - 32} height={h - 32} fill="none" stroke="#4A3426" strokeWidth="0.6" opacity="0.45" />
      </svg>
    </div>
  );
};
