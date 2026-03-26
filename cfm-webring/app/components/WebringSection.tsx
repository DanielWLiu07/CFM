'use client';

import { useRef, useEffect, useState, useCallback, useMemo, type RefObject } from 'react';
import dynamic from 'next/dynamic';

const WebringBackground = dynamic(() => import('./WebringBackground'), { ssr: false });

const BEAT_INTERVAL = 60 / 93;
const BEAT_OFFSET = 0.229;

interface WebringSectionProps {
  onVisibilityChange: (visible: boolean) => void;
  audioRef: RefObject<HTMLAudioElement | null>;
  reducedMotion?: boolean;
  sectionRefOut?: RefObject<HTMLElement | null>;
}

interface WebringEntry {
  name: string;
  url: string;
  description: string;
  cohort: string;
  avatar?: string; // optional image path
}

const _BASE_ENTRIES: WebringEntry[] = [
  { name: 'Daniel Liu', url: 'https://danielwliu.com', description: 'SWE @ building things', cohort: '2029', avatar: '/images/avatars/daniel.png' },
  { name: 'Timothy Zheng', url: 'https://timothyzheng.ca', description: 'power trading', cohort: '2026', avatar: '/images/avatars/timothyz.png' },
  { name: 'Alice Chen', url: '#', description: 'quant dev in training', cohort: '2028' },
  { name: 'Bob Zhang', url: '#', description: 'full-stack fintech', cohort: '2029' },
  { name: 'Carol Wu', url: '#', description: 'ML + markets', cohort: '2027' },
  { name: 'David Park', url: '#', description: 'systems engineer', cohort: '2028' },
  { name: 'Eve Singh', url: '#', description: 'crypto & distributed', cohort: '2029' },
  { name: 'Frank Li', url: '#', description: 'product & design', cohort: '2027' },
  { name: 'Grace Kim', url: '#', description: 'data science', cohort: '2028' },
];

// ── TEST: generate 300 entries for stress testing ──
const _TEST_NAMES = ['Alex','Sam','Jordan','Taylor','Morgan','Casey','Riley','Quinn','Avery','Harper','Blake','Drew','Reese','Sage','Kai','Nova','Zion','Eden','Sky','River'];
const _TEST_DESCS = ['frontend dev','backend eng','ML researcher','product designer','data analyst','devops','mobile dev','security eng','QA lead','full-stack'];
const _TEST_COHORTS = ['2026','2027','2028','2029','2030'];
const _TEST_SURNAMES = ['Wang','Lee','Kim','Chen','Liu','Zhao','Singh','Park','Wu','Li','Ng','Cho','Tan','Das','Xu','Hu','Ma','Ye','Gu','Lu'];
const _GENERATED: WebringEntry[] = Array.from({ length: 292 }, (_, i) => ({
  name: `${_TEST_NAMES[i % _TEST_NAMES.length]} ${_TEST_SURNAMES[i % _TEST_SURNAMES.length]}${i > 19 ? ` ${i}` : ''}`,
  url: '#',
  description: _TEST_DESCS[i % _TEST_DESCS.length],
  cohort: _TEST_COHORTS[i % _TEST_COHORTS.length],
}));
const WEBRING_ENTRIES: WebringEntry[] = [..._BASE_ENTRIES, ..._GENERATED]; // ~300 total

const ALL_COHORTS = [...new Set(WEBRING_ENTRIES.map(e => e.cohort))].sort();

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Node {
  x: number; y: number; z: number; // world position (static after layout)
  entry: WebringEntry;
  index: number;
  sx: number; sy: number; scale: number; depth: number; screenR: number; // projection cache
  hoverAnim: number;
  avatarImg: HTMLImageElement | null;
}

interface Edge { from: number; to: number; }

interface Camera {
  tx: number; ty: number; tz: number; // orbit target
  orbitTheta: number;  // azimuth
  orbitPhi: number;    // elevation (clamped)
  orbitDist: number;   // distance from target
  orbitThetaVel: number; // momentum
  bobPhase: number;
}

interface FlyTo {
  startTarget: [number, number, number];
  endTarget: [number, number, number];
  startDist: number;
  endDist: number;
  t: number;
  duration: number;
}

interface BoundingSphere { cx: number; cy: number; cz: number; radius: number; }

// ── Constants ────────────────────────────────────────────────────────────────

const FOCAL = 800;
const TAU = Math.PI * 2;
const LOD_DOT = 4;
const LOD_SIMPLE = 10;

// ── Math helpers ─────────────────────────────────────────────────────────────

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ── Camera helpers ───────────────────────────────────────────────────────────

function getCameraEye(cam: Camera): [number, number, number] {
  const sp = Math.sin(cam.orbitPhi);
  const cp = Math.cos(cam.orbitPhi);
  const st = Math.sin(cam.orbitTheta);
  const ct = Math.cos(cam.orbitTheta);
  return [
    cam.tx + cam.orbitDist * sp * st,
    cam.ty + cam.orbitDist * cp + Math.sin(cam.bobPhase) * 4,
    cam.tz + cam.orbitDist * sp * ct,
  ];
}

function getCameraBasis(eye: [number, number, number], target: [number, number, number], theta: number): {
  fwd: [number, number, number]; right: [number, number, number]; up: [number, number, number];
} {
  let fx = target[0] - eye[0], fy = target[1] - eye[1], fz = target[2] - eye[2];
  const fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
  fx /= fl; fy /= fl; fz /= fl;
  // Choose up hint: worldUp unless looking nearly straight up/down (gimbal lock)
  let hx = 0, hy = 1, hz = 0;
  if (Math.abs(fy) > 0.99) {
    // At poles — use theta-derived horizontal as up hint to avoid zero cross product
    hx = Math.sin(theta); hy = 0; hz = Math.cos(theta);
  }
  // right = forward × upHint
  let rx = fy * hz - fz * hy, ry = fz * hx - fx * hz, rz = fx * hy - fy * hx;
  const rl = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  // up = right × forward
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  return { fwd: [fx, fy, fz], right: [rx, ry, rz], up: [ux, uy, uz] };
}

// ── Projection (look-at camera) ─────────────────────────────────────────────

function project(wx: number, wy: number, wz: number, eye: [number, number, number],
  right: [number, number, number], up: [number, number, number], fwd: [number, number, number],
  cx: number, cy: number) {
  const dx = wx - eye[0], dy = wy - eye[1], dz = wz - eye[2];
  const camX = dx * right[0] + dy * right[1] + dz * right[2];
  const camY = dx * up[0] + dy * up[1] + dz * up[2];
  const camZ = dx * fwd[0] + dy * fwd[1] + dz * fwd[2];
  if (camZ < 1) return { sx: -9999, sy: -9999, scale: 0.001, depth: 9999 };
  const scale = FOCAL / camZ;
  return { sx: cx + camX * scale, sy: cy - camY * scale, scale, depth: camZ };
}

function depthFog(depth: number, orbitDist: number) {
  const fogNear = -orbitDist * 0.3;
  const fogFar = orbitDist * 2.5;
  return Math.max(0, Math.min(1, 1 - (depth - fogNear) / (fogFar - fogNear)));
}

// ── Graph Construction (world-space) ─────────────────────────────────────────

function buildGraph(entries: WebringEntry[]) {
  const n = entries.length;
  const span = 400 + n * 4;
  const cols = Math.max(1, Math.ceil(Math.cbrt(n * 1.5)));
  const rows = Math.max(1, Math.ceil(Math.cbrt(n * 1.5)));
  const layers = Math.max(1, Math.ceil(n / (cols * rows)));
  const cellSize = span / Math.max(cols, rows, layers);

  const nodes: Node[] = entries.map((entry, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols) % rows;
    const layer = Math.floor(i / (cols * rows));
    const jx = (seededRandom(i * 2) - 0.5) * cellSize * 0.6;
    const jy = (seededRandom(i * 2 + 1) - 0.5) * cellSize * 0.6;
    const jz = (seededRandom(i * 2 + 100) - 0.5) * cellSize * 0.6;
    const x = (col - cols / 2 + 0.5) * cellSize + jx;
    const y = (row - rows / 2 + 0.5) * cellSize + jy;
    const z = (layer - layers / 2 + 0.5) * cellSize + jz;
    let avatarImg: HTMLImageElement | null = null;
    if (entry.avatar) { avatarImg = new Image(); avatarImg.src = entry.avatar; }
    return { x, y, z, entry, index: i, sx: 0, sy: 0, scale: 1, depth: 0, screenR: 0, hoverAnim: 0, avatarImg };
  });

  // Edges: ring + proximity
  const edges: Edge[] = [];
  const hasEdge = (a: number, b: number) => edges.some(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  for (let i = 0; i < n; i++) edges.push({ from: i, to: (i + 1) % n });

  if (n <= 20) {
    for (let i = 0; i < n; i++) {
      const jump = 2 + Math.floor(seededRandom(i * 7 + 3) * 3);
      const target = (i + jump) % n;
      if (!hasEdge(i, target)) edges.push({ from: i, to: target });
    }
  } else {
    const maxExtra = Math.floor(n * 1.5);
    let added = 0;
    for (let i = 0; i < n && added < maxExtra; i++) {
      let bestDist = Infinity, bestJ = -1;
      for (let j = 0; j < n; j++) {
        if (j === i || hasEdge(i, j)) continue;
        const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, dz = nodes[j].z - nodes[i].z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestDist) { bestDist = d; bestJ = j; }
      }
      if (bestJ >= 0) { edges.push({ from: i, to: bestJ }); added++; }
    }
  }

  return { nodes, edges };
}

// ── One-time layout computation ──────────────────────────────────────────────

function computeLayout(nodes: Node[], edges: Edge[]) {
  const n = nodes.length;
  const span = 400 + n * 4;
  const avgSpacing = Math.cbrt(span * span * span / Math.max(1, n));
  const springLen = Math.max(60, 1.0 * avgSpacing);
  const repulsion = 30000 * (springLen / 320) * (springLen / 320);
  const spring = 0.002 * (320 / Math.max(30, springLen));
  const damping = 0.85;
  const maxVel = 10;
  const cutoff = springLen * 4;

  // Temp velocity arrays
  const vx = new Float64Array(n), vy = new Float64Array(n), vz = new Float64Array(n);

  for (let iter = 0; iter < 400; iter++) {
    // Repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, dz = nodes[j].z - nodes[i].z;
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > cutoff) continue;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq) || 1;
        const f = repulsion / distSq;
        const fx = (dx / dist) * f, fy = (dy / dist) * f, fz = (dz / dist) * f;
        vx[i] -= fx; vy[i] -= fy; vz[i] -= fz;
        vx[j] += fx; vy[j] += fy; vz[j] += fz;
      }
    }
    // Springs
    for (const edge of edges) {
      const a = edge.from, b = edge.to;
      const dx = nodes[b].x - nodes[a].x, dy = nodes[b].y - nodes[a].y, dz = nodes[b].z - nodes[a].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const f = (dist - springLen) * spring;
      const fx = (dx / dist) * f, fy = (dy / dist) * f, fz = (dz / dist) * f;
      vx[a] += fx; vy[a] += fy; vz[a] += fz;
      vx[b] -= fx; vy[b] -= fy; vz[b] -= fz;
    }
    // Mild centering (just to prevent drift, not to constrain)
    for (let i = 0; i < n; i++) {
      vx[i] += (0 - nodes[i].x) * 0.0001;
      vy[i] += (0 - nodes[i].y) * 0.0001;
      vz[i] += (0 - nodes[i].z) * 0.0001;
    }
    // Integration
    let totalKE = 0;
    for (let i = 0; i < n; i++) {
      vx[i] *= damping; vy[i] *= damping; vz[i] *= damping;
      const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]);
      if (speed > maxVel) { const s = maxVel / speed; vx[i] *= s; vy[i] *= s; vz[i] *= s; }
      nodes[i].x += vx[i]; nodes[i].y += vy[i]; nodes[i].z += vz[i];
      totalKE += vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i];
    }
    if (totalKE < 0.01 * n) break;
  }
}

function computeBoundingSphere(nodes: Node[]): BoundingSphere {
  let sx = 0, sy = 0, sz = 0;
  for (const n of nodes) { sx += n.x; sy += n.y; sz += n.z; }
  const cx = sx / nodes.length, cy = sy / nodes.length, cz = sz / nodes.length;
  let maxR = 0;
  for (const n of nodes) {
    const d = Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2 + (n.z - cz) ** 2);
    if (d > maxR) maxR = d;
  }
  return { cx, cy, cz, radius: Math.max(maxR, 50) };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function WebringSection({ onVisibilityChange, audioRef, reducedMotion, sectionRefOut }: WebringSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [search, setSearch] = useState('');
  const [selectedCohorts, setSelectedCohorts] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState(-1);
  const [selectedNode, setSelectedNode] = useState(-1);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; entry: WebringEntry } | null>(null);
  const graphRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const boundsRef = useRef<BoundingSphere>({ cx: 0, cy: 0, cz: 0, radius: 200 });
  const cameraRef = useRef<Camera>({ tx: 0, ty: 0, tz: 0, orbitTheta: 0, orbitPhi: Math.PI * 0.45, orbitDist: 400, orbitThetaVel: 0.0008, bobPhase: 0 });
  const flyToRef = useRef<FlyTo | null>(null);
  const rafRef = useRef(0);
  const visibleRef = useRef(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  // Scroll-driven 360° rotation: progress 0→1 (0°→360°), releases at 1
  // Scroll-driven tilt: progress 0→1 maps phi 0→2π (full 360° vertical orbit), releases at 1
  const PHI_CLAMP_MIN = 0.1;  // interactive drag limits (not scroll-tilt)
  const PHI_CLAMP_MAX = Math.PI - 0.1;
  const setSectionRef = useCallback((el: HTMLElement | null) => {
    (sectionRef as React.MutableRefObject<HTMLElement | null>).current = el;
    if (sectionRefOut && 'current' in sectionRefOut) {
      (sectionRefOut as React.MutableRefObject<HTMLElement | null>).current = el;
    }
  }, [sectionRefOut]);

  // Orbit/pan drag state
  const orbitDragRef = useRef<{ lastX: number; lastY: number; startX: number; startY: number; lastTime: number } | null>(null);
  const panDragRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  // Beat
  const beatPulseRef = useRef(0);
  const lastBeatIdxRef = useRef(-1);
  const centerGlowRef = useRef<HTMLDivElement>(null);
  // Last frame time for fly-to
  const lastTimeRef = useRef(0);
  // Cached depth-sorted node indices (avoids alloc+sort every frame)
  const depthSortedRef = useRef<number[]>([]);

  // Search panel state
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ x: 32, y: 80 });
  const [panelSize, setPanelSize] = useState({ w: 340, h: 420 });
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const toggleCohort = useCallback((cohort: string) => {
    setSelectedCohorts(prev => {
      const next = new Set(prev);
      if (next.has(cohort)) next.delete(cohort); else next.add(cohort);
      return next;
    });
  }, []);

  const matchingIndices = useMemo(() => {
    const q = search.toLowerCase().trim();
    const set = new Set<number>();
    WEBRING_ENTRIES.forEach((e, i) => {
      const matchesSearch = !q || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.cohort.toLowerCase().includes(q);
      const matchesCohort = selectedCohorts.size === 0 || selectedCohorts.has(e.cohort);
      if (matchesSearch && matchesCohort) set.add(i);
    });
    return set;
  }, [search, selectedCohorts]);

  // Panel drag
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: panelPos.x, origY: panelPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX, dy = ev.clientY - dragRef.current.startY;
      const section = sectionRef.current;
      const pw = panelSize.w, ph = panelSize.h;
      const maxX = section ? section.clientWidth - pw : window.innerWidth - pw;
      const maxY = section ? section.clientHeight - ph : window.innerHeight - ph;
      setPanelPos({ x: Math.max(0, Math.min(maxX, dragRef.current.origX + dx)), y: Math.max(0, Math.min(maxY, dragRef.current.origY + dy)) });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelPos, panelSize]);

  // Panel resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: panelSize.w, origH: panelSize.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      setPanelSize({ w: Math.max(280, resizeRef.current.origW + ev.clientX - resizeRef.current.startX), h: Math.max(300, resizeRef.current.origH + ev.clientY - resizeRef.current.startY) });
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => { visibleRef.current = entry.isIntersecting; setSectionVisible(entry.isIntersecting); onVisibilityChange(entry.isIntersecting); }, { threshold: 0.1 });
    observer.observe(el);
    return () => { observer.disconnect(); };
  }, [onVisibilityChange]);


  // ── Fly-to trigger ────────────────────────────────────────────────────────
  const triggerFlyTo = useCallback((nodeIndex: number) => {
    const graph = graphRef.current;
    if (!graph || nodeIndex < 0 || nodeIndex >= graph.nodes.length) return;
    const node = graph.nodes[nodeIndex];
    const cam = cameraRef.current;
    const dist = Math.sqrt((cam.tx - node.x) ** 2 + (cam.ty - node.y) ** 2 + (cam.tz - node.z) ** 2);
    const duration = Math.max(0.5, Math.min(2.0, 0.5 + dist * 0.002));
    flyToRef.current = {
      startTarget: [cam.tx, cam.ty, cam.tz],
      endTarget: [node.x, node.y, node.z],
      startDist: cam.orbitDist,
      endDist: Math.max(boundsRef.current.radius * 0.12, 250),
      t: 0,
      duration,
    };
    setSelectedNode(nodeIndex);
  }, []);

  // ── Canvas render loop ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };
    resize();

    // Init graph + layout (one-time)
    if (!graphRef.current) {
      const graph = buildGraph(WEBRING_ENTRIES);
      computeLayout(graph.nodes, graph.edges);
      graphRef.current = graph;
      const bounds = computeBoundingSphere(graph.nodes);
      boundsRef.current = bounds;
      // Set initial camera to overview
      const cam = cameraRef.current;
      cam.tx = bounds.cx; cam.ty = bounds.cy; cam.tz = bounds.cz;
      cam.orbitDist = bounds.radius * 1.8;
    }

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio;
    lastTimeRef.current = performance.now();

    const draw = () => {
      const now = performance.now();
      // Skip rendering when off-screen
      if (!visibleRef.current) {
        lastTimeRef.current = now;
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      // Throttle to ~30fps
      const elapsed = now - lastTimeRef.current;
      if (elapsed < 30) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const dt = Math.min(elapsed / 1000, 0.05); // seconds, capped
      lastTimeRef.current = now;

      const graph = graphRef.current!;
      const { nodes, edges } = graph;
      const cam = cameraRef.current;
      const bounds = boundsRef.current;
      const w = canvas.width / dpr, h = canvas.height / dpr;
      const cx = w / 2, cy = h / 2;

      // ── Fly-to animation ──────────────────────────────────────────────
      const ft = flyToRef.current;
      if (ft) {
        ft.t += dt / ft.duration;
        if (ft.t >= 1) {
          ft.t = 1;
          flyToRef.current = null;
        }
        const e = easeInOutCubic(Math.min(ft.t, 1));
        cam.tx = lerp(ft.startTarget[0], ft.endTarget[0], e);
        cam.ty = lerp(ft.startTarget[1], ft.endTarget[1], e);
        cam.tz = lerp(ft.startTarget[2], ft.endTarget[2], e);
        cam.orbitDist = lerp(ft.startDist, ft.endDist, e);
      }

      // ── Camera auto-rotate (when not interacting and not in scroll-rotation) ──
      const srActive = false;
      if (!reducedMotion && !orbitDragRef.current && !panDragRef.current && !ft && !srActive) {
        cam.orbitThetaVel *= 0.97;
        if (Math.abs(cam.orbitThetaVel) < 0.002) {
          cam.orbitThetaVel += (0.0008 - cam.orbitThetaVel) * 0.01;
        }
        cam.orbitTheta += cam.orbitThetaVel;
      }
      if (!reducedMotion) cam.bobPhase += 0.006;

      // ── Beat detection ────────────────────────────────────────────────
      if (audioRef.current && !audioRef.current.paused && !reducedMotion) {
        const t = audioRef.current.currentTime;
        const beatIdx = Math.floor((t - BEAT_OFFSET) / BEAT_INTERVAL);
        if (beatIdx > lastBeatIdxRef.current) {
          lastBeatIdxRef.current = beatIdx;
          beatPulseRef.current = 1;
        }
      }
      if (reducedMotion) beatPulseRef.current = 0;
      else beatPulseRef.current *= 0.96;
      const beat = beatPulseRef.current;

      if (centerGlowRef.current) {
        centerGlowRef.current.style.opacity = String(0.02 + beat * 0.05);
        centerGlowRef.current.style.transform = `scale(${1 + beat * 0.06})`;
      }

      // ── Camera basis ──────────────────────────────────────────────────
      const eye = getCameraEye(cam);
      const target: [number, number, number] = [cam.tx, cam.ty, cam.tz];
      const { fwd, right, up } = getCameraBasis(eye, target, cam.orbitTheta);
      const time = Date.now() * 0.001;

      // ── Project all nodes ─────────────────────────────────────────────
      for (const n of nodes) {
        // Idle drift (visual only — don't mutate positions)
        const driftX = reducedMotion ? 0 : Math.sin(time * 0.5 + n.index * 1.7) * 2;
        const driftY = reducedMotion ? 0 : Math.cos(time * 0.4 + n.index * 2.3) * 1.5;
        const driftZ = reducedMotion ? 0 : Math.sin(time * 0.3 + n.index * 3.1) * 1.8;
        const p = project(n.x + driftX, n.y + driftY, n.z + driftZ, eye, right, up, fwd, cx, cy);
        n.sx = p.sx; n.sy = p.sy; n.scale = p.scale; n.depth = p.depth;
        const beatSize = 1 + beat * 0.15;
        n.screenR = (22 + n.hoverAnim * 8) * p.scale * beatSize;
      }

      // ── Render ────────────────────────────────────────────────────────
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Animate hoverAnim
      for (const n of nodes) {
        const t = (hoveredNode === n.index || selectedNode === n.index) ? 1 : 0;
        n.hoverAnim += (t - n.hoverAnim) * 0.12;
        if (Math.abs(n.hoverAnim - t) < 0.01) n.hoverAnim = t;
      }

      // ── Edges ─────────────────────────────────────────────────────────
      for (const edge of edges) {
        const a = nodes[edge.from], b = nodes[edge.to];
        // Edge LOD: skip if both are dot-level and neither hovered
        if (a.screenR < LOD_DOT && b.screenR < LOD_DOT && hoveredNode !== a.index && hoveredNode !== b.index) continue;

        const aMatch = matchingIndices.has(a.index), bMatch = matchingIndices.has(b.index);
        const bothMatch = aMatch && bMatch;
        const eitherHovered = hoveredNode === a.index || hoveredNode === b.index;
        const avgFog = (depthFog(a.depth, cam.orbitDist) + depthFog(b.depth, cam.orbitDist)) / 2;
        if (avgFog < 0.01) continue;
        const avgScale = (a.scale + b.scale) / 2;

        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.strokeStyle = '#fff';
        const beatEdge = beat * 0.25;
        if (eitherHovered) {
          ctx.globalAlpha = 0.6 * avgFog;
          ctx.lineWidth = 2 * avgScale;
        } else if (bothMatch) {
          ctx.globalAlpha = (0.12 + beatEdge) * avgFog;
          ctx.lineWidth = Math.max(0.3, (1 + beat) * avgScale);
        } else {
          ctx.globalAlpha = (0.03 + beatEdge) * avgFog;
          ctx.lineWidth = Math.max(0.2, (0.5 + beat * 0.8) * avgScale);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── Data packets (with distance culling) ──────────────────────────
      for (const edge of edges) {
        const a = nodes[edge.from], b = nodes[edge.to];
        if (!matchingIndices.has(a.index) && !matchingIndices.has(b.index)) continue;
        const avgDepth = (a.depth + b.depth) / 2;
        if (avgDepth > cam.orbitDist * 1.5) continue;
        const t = ((time * 0.3 + edge.from * 0.5) % 1);
        const px3 = a.x + (b.x - a.x) * t, py3 = a.y + (b.y - a.y) * t, pz3 = a.z + (b.z - a.z) * t;
        const p = project(px3, py3, pz3, eye, right, up, fwd, cx, cy);
        const fog = depthFog(p.depth, cam.orbitDist);
        if (fog < 0.01) continue;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.5, (1.5 + beat * 2) * p.scale), 0, TAU);
        ctx.globalAlpha = (0.5 + beat * 0.4) * fog;
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── Nodes (back to front, cached sort) ─────────────────────────────
      const sortArr = depthSortedRef.current;
      if (sortArr.length !== nodes.length) {
        sortArr.length = 0;
        for (let i = 0; i < nodes.length; i++) sortArr.push(i);
      }
      sortArr.sort((a, b) => {
        if (hoveredNode === a) return 1;
        if (hoveredNode === b) return -1;
        return nodes[b].depth - nodes[a].depth;
      });

      for (const idx of sortArr) {
        const node = nodes[idx];
        const isMatch = matchingIndices.has(node.index);
        const isHovered = hoveredNode === node.index;
        const ha = node.hoverAnim;
        const effectiveScale = node.scale * (1 + ha * 0.4);
        const fog = depthFog(node.depth, cam.orbitDist);
        const brightenedFog = fog + (0.95 - fog) * ha;
        const r = node.screenR;
        if (brightenedFog < 0.01 || r < 0.5) continue;

        // ── LOD: Dot ────────────────────────────────────────────────────
        if (r < LOD_DOT && !isHovered) {
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, Math.max(1, r), 0, TAU);
          ctx.fillStyle = `rgba(255,255,255,${(isMatch ? 0.5 : 0.15) * brightenedFog})`;
          ctx.fill();
          continue;
        }

        // ── LOD: Simple ─────────────────────────────────────────────────
        if (r < LOD_SIMPLE && !isHovered) {
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, r, 0, TAU);
          ctx.fillStyle = `rgba(${isMatch ? 10 : 5},${isMatch ? 10 : 5},${isMatch ? 10 : 5},${brightenedFog})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(255,255,255,${(isMatch ? 0.4 : 0.08) * brightenedFog})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          continue;
        }

        // ── LOD: Full ───────────────────────────────────────────────────

        // Hover rings + glow
        if (ha > 0.05) {
          const t2 = Date.now() * 0.003;
          for (let ring = 0; ring < 3; ring++) {
            const phase = (t2 + ring * 2.1) % 6.28;
            const ringR = r + 10 + Math.sin(phase) * 15 + ring * 12;
            const ringAlpha = (0.15 - ring * 0.04) * (0.5 + 0.5 * Math.cos(phase)) * ha;
            ctx.beginPath();
            ctx.arc(node.sx, node.sy, ringR * effectiveScale / 1.2, 0, TAU);
            ctx.strokeStyle = `rgba(255,255,255,${ringAlpha * brightenedFog})`;
            ctx.lineWidth = 1.5 - ring * 0.3;
            ctx.stroke();
          }
          const glowR = 55 * effectiveScale;
          const grad = ctx.createRadialGradient(node.sx, node.sy, 0, node.sx, node.sy, glowR);
          grad.addColorStop(0, `rgba(255,255,255,${0.15 * brightenedFog * ha})`);
          grad.addColorStop(0.4, `rgba(255,255,255,${0.06 * brightenedFog * ha})`);
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, glowR, 0, TAU);
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (isMatch && brightenedFog > 0.1) {
          const glowR = 35 * effectiveScale;
          const grad = ctx.createRadialGradient(node.sx, node.sy, 0, node.sx, node.sy, glowR);
          grad.addColorStop(0, `rgba(255,255,255,${0.06 * brightenedFog})`);
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, glowR, 0, TAU);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        const hasAvatar = node.avatarImg && node.avatarImg.complete && node.avatarImg.naturalWidth > 0;

        // Circle fill — skip for avatar nodes so transparency shows through
        if (!hasAvatar) {
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, r, 0, TAU);
          const fillBase = isMatch ? 10 : 5;
          const fillVal = Math.round(fillBase + (30 - fillBase) * ha);
          ctx.fillStyle = `rgba(${fillVal},${fillVal},${fillVal},${brightenedFog})`;
          ctx.fill();
        }

        // Avatar / initials
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, r - 1, 0, TAU);
        ctx.clip();
        if (hasAvatar) {
          const imgSize = r * 2;
          ctx.globalAlpha = brightenedFog * (0.6 + ha * 0.4);
          ctx.drawImage(node.avatarImg!, node.sx - r, node.sy - r, imgSize, imgSize);
          ctx.globalAlpha = 1;
        } else {
          const fontSize = Math.max(8, Math.round((12 + ha * 4) * effectiveScale));
          ctx.font = `${fontSize}px ArcadeClassic, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = `rgba(255,255,255,${(isMatch ? 0.7 + ha * 0.3 : 0.2 + ha * 0.3) * brightenedFog})`;
          ctx.fillText(node.entry.name.split(' ').map(w => w[0]).join(''), node.sx, node.sy + 1);
        }
        ctx.restore();

        // Border
        const beatGlow = beat * 0.4;
        const strokeAlpha = (isMatch ? 0.5 : 0.1) + ha * 0.5 + beatGlow;
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, r, 0, TAU);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, strokeAlpha * brightenedFog)})`;
        ctx.lineWidth = (1.5 + ha * 1.5 + beat * 1.5) * effectiveScale;
        ctx.stroke();

        // Beat pulse ring
        if (beat > 0.1 && brightenedFog > 0.1) {
          const pulseR = r + 8 * beat * effectiveScale;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, pulseR, 0, TAU);
          ctx.strokeStyle = `rgba(255,255,255,${beat * 0.25 * brightenedFog})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Hover glow
        if (ha > 0.1 && brightenedFog > 0.2) {
          ctx.shadowColor = '#fff';
          ctx.shadowBlur = 15 * effectiveScale * ha;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, r, 0, TAU);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Name label
        if (ha > 0.3) {
          const labelY = node.sy + r + 12 * effectiveScale;
          const labelSize = Math.max(8, Math.round(10 * effectiveScale));
          ctx.font = `${labelSize}px ArcadeClassic, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = `rgba(255,255,255,${ha * brightenedFog * 0.8})`;
          ctx.fillText(node.entry.name, node.sx, labelY);
        }
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, [matchingIndices, hoveredNode, selectedNode, reducedMotion]);

  // ── Hit testing ───────────────────────────────────────────────────────────
  const findNodeAt = useCallback((mx: number, my: number) => {
    const graph = graphRef.current;
    if (!graph) return -1;
    // Pick frontmost (smallest depth) node under cursor — no sort needed
    let closest = -1, closestDepth = Infinity;
    for (const node of graph.nodes) {
      const hitR = Math.max(15, 30 * node.scale);
      const dx = node.sx - mx, dy = node.sy - my;
      if (dx * dx + dy * dy < hitR * hitR && node.depth < closestDepth) {
        closest = node.index;
        closestDepth = node.depth;
      }
    }
    return closest;
  }, []);

  // ── Canvas mouse handlers ─────────────────────────────────────────────────
  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const cam = cameraRef.current;

    // Orbit drag — takes over from scroll-rotation
    if (orbitDragRef.current) {
      const dx = mx - orbitDragRef.current.lastX;
      const dy = my - orbitDragRef.current.lastY;
      const dt = Math.max(1, Date.now() - orbitDragRef.current.lastTime);
      cam.orbitTheta -= dx * 0.005;
      cam.orbitPhi = Math.max(PHI_CLAMP_MIN, Math.min(PHI_CLAMP_MAX, cam.orbitPhi - dy * 0.005));
      cam.orbitThetaVel = (-dx * 0.005) / Math.min(dt / 16, 3);
      orbitDragRef.current.lastX = mx;
      orbitDragRef.current.lastY = my;
      orbitDragRef.current.lastTime = Date.now();
      flyToRef.current = null;
      return;
    }

    // Pan drag
    if (panDragRef.current) {
      const dx = mx - panDragRef.current.lastX;
      const dy = my - panDragRef.current.lastY;
      const eye = getCameraEye(cam);
      const { right, up } = getCameraBasis(eye, [cam.tx, cam.ty, cam.tz], cam.orbitTheta);
      const panScale = cam.orbitDist / FOCAL;
      cam.tx -= right[0] * dx * panScale + up[0] * -dy * panScale;
      cam.ty -= right[1] * dx * panScale + up[1] * -dy * panScale;
      cam.tz -= right[2] * dx * panScale + up[2] * -dy * panScale;
      panDragRef.current.lastX = mx;
      panDragRef.current.lastY = my;
      flyToRef.current = null;
      return;
    }

    // Hover detection
    mousePosRef.current = { x: mx, y: my };
    const closest = findNodeAt(mx, my);
    setHoveredNode(closest);
    if (closest >= 0 && graphRef.current) {
      const node = graphRef.current.nodes[closest];
      setTooltip({ x: node.sx, y: node.sy, entry: node.entry });
      canvas.style.cursor = 'pointer';
    } else {
      setTooltip(null);
      canvas.style.cursor = 'grab';
    }
  }, [findNodeAt]);

  const handleCanvasDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    if (e.shiftKey || e.button === 1) {
      // Pan
      panDragRef.current = { lastX: mx, lastY: my };
      canvas.style.cursor = 'move';
    } else {
      // Orbit (also tracks start for click detection)
      orbitDragRef.current = { lastX: mx, lastY: my, startX: mx, startY: my, lastTime: Date.now() };
      cameraRef.current.orbitThetaVel = 0;
      canvas.style.cursor = 'grabbing';
    }
  }, []);

  const handleResetView = useCallback(() => {
    const bounds = boundsRef.current;
    const cam = cameraRef.current;
    flyToRef.current = {
      startTarget: [cam.tx, cam.ty, cam.tz],
      endTarget: [bounds.cx, bounds.cy, bounds.cz],
      startDist: cam.orbitDist,
      endDist: bounds.radius * 1.8,
      t: 0,
      duration: 1.2,
    };
    setSelectedNode(-1);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedNode(-1);
    handleResetView();
  }, [handleResetView]);

  const handleCanvasUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Pan end
    if (panDragRef.current) {
      panDragRef.current = null;
      canvas.style.cursor = 'grab';
      return;
    }

    // Orbit end — check for click
    if (orbitDragRef.current) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const dist = Math.sqrt((mx - orbitDragRef.current.startX) ** 2 + (my - orbitDragRef.current.startY) ** 2);
      orbitDragRef.current = null;

      if (dist < 5) {
        // Click — hit test
        const hit = findNodeAt(mx, my);
        if (hit >= 0) {
          if (selectedNode === hit) {
            handleDeselect();
          } else {
            triggerFlyTo(hit);
          }
        } else {
          setSelectedNode(-1);
        }
      }
      canvas.style.cursor = 'grab';
    }
  }, [findNodeAt, selectedNode, triggerFlyTo, handleDeselect]);

  const handleCanvasLeave = useCallback(() => {
    orbitDragRef.current = null;
    panDragRef.current = null;
    setHoveredNode(-1);
    setTooltip(null);
  }, []);

  // Wheel: pinch-to-zoom + horizontal swipe to rotate. Vertical scroll = page scroll (pass through).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      const cam = cameraRef.current;
      const bounds = boundsRef.current;

      if (e.ctrlKey) {
        // Pinch-to-zoom
        e.preventDefault();
        e.stopPropagation();
        flyToRef.current = null;
        const minDist = Math.max(80, bounds.radius * 0.08);
        const maxDist = bounds.radius * 3.5;
        cam.orbitDist = Math.max(minDist, Math.min(maxDist, cam.orbitDist * (1 + e.deltaY * 0.005)));
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5 && Math.abs(e.deltaX) > 3) {
        // Horizontal swipe → rotate
        e.preventDefault();
        e.stopPropagation();
        flyToRef.current = null;
        cam.orbitTheta += e.deltaX * 0.003;
        cam.orbitThetaVel = e.deltaX * 0.00008;
      }
      // Vertical scroll passes through to page
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // Slider sync
  const [sliderAngle, setSliderAngle] = useState(0);
  const [sliderTilt, setSliderTilt] = useState(Math.round(cameraRef.current.orbitPhi * 180 / Math.PI));
  const [sliderZoom, setSliderZoom] = useState(50);
  const sliderDraggingRef = useRef(false);
  const tiltSliderDraggingRef = useRef(false);
  const zoomSliderDraggingRef = useRef(false);

  useEffect(() => {
    let id = 0;
    let frameSkip = 0;
    let lastAngle = -1, lastTilt = -1, lastZoom = -1;
    const sync = () => {
      if (!visibleRef.current) { id = requestAnimationFrame(sync); return; }
      frameSkip++;
      if (frameSkip % 3 === 0) {
        const cam = cameraRef.current;
        const bounds = boundsRef.current;
        if (!sliderDraggingRef.current) {
          const angle = Math.round(((cam.orbitTheta * 180 / Math.PI) % 360 + 360) % 360);
          if (angle !== lastAngle) { lastAngle = angle; setSliderAngle(angle); }
        }
        if (!tiltSliderDraggingRef.current) {
          const tilt = Math.round(((cam.orbitPhi * 180 / Math.PI) % 360 + 360) % 360);
          if (tilt !== lastTilt) { lastTilt = tilt; setSliderTilt(tilt); }
        }
        if (!zoomSliderDraggingRef.current) {
          const minDist = Math.max(80, bounds.radius * 0.08);
          const maxDist = bounds.radius * 3.5;
          const pct = Math.round(Math.max(0, Math.min(100, 100 - ((cam.orbitDist - minDist) / (maxDist - minDist)) * 100)));
          if (pct !== lastZoom) { lastZoom = pct; setSliderZoom(pct); }
        }
      }
      id = requestAnimationFrame(sync);
    };
    id = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(id);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const deg = parseFloat(e.target.value);
    setSliderAngle(deg);
    sliderDraggingRef.current = true;
    cameraRef.current.orbitTheta = deg * Math.PI / 180;
    cameraRef.current.orbitThetaVel = 0;
    flyToRef.current = null;
  }, []);

  const handleSliderUp = useCallback(() => { sliderDraggingRef.current = false; }, []);

  const handleTiltChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const deg = parseFloat(e.target.value);
    setSliderTilt(deg);
    tiltSliderDraggingRef.current = true;
    cameraRef.current.orbitPhi = deg * Math.PI / 180;
    flyToRef.current = null;
  }, []);

  const handleTiltUp = useCallback(() => { tiltSliderDraggingRef.current = false; }, []);

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setSliderZoom(v);
    zoomSliderDraggingRef.current = true;
    const bounds = boundsRef.current;
    const minDist = Math.max(80, bounds.radius * 0.08);
    const maxDist = bounds.radius * 3.5;
    cameraRef.current.orbitDist = maxDist - (v / 100) * (maxDist - minDist);
    flyToRef.current = null;
  }, []);

  const handleZoomUp = useCallback(() => { zoomSliderDraggingRef.current = false; }, []);

  // List item click → fly to
  const handleListClick = useCallback((e: React.MouseEvent, i: number) => {
    e.preventDefault();
    if (selectedNode === i) {
      handleDeselect();
    } else {
      triggerFlyTo(i);
    }
  }, [selectedNode, triggerFlyTo]);

  const handleListDoubleClick = useCallback((e: React.MouseEvent, i: number) => {
    e.preventDefault();
    const entry = WEBRING_ENTRIES[i];
    if (entry.url !== '#') window.open(entry.url, '_blank', 'noopener,noreferrer');
  }, []);

  const listMaxHeight = panelSize.h - 230;

  return (
    <section ref={setSectionRef} className="relative h-screen flex flex-col" style={{ zIndex: 10, background: '#000', overflow: 'hidden' }}>
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-24" />

      {/* Three.js background scene */}
      <WebringBackground beatRef={beatPulseRef} paused={reducedMotion || !sectionVisible} />

      {/* Center glow — beat-synced radial pulse */}
      <div
        ref={centerGlowRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          opacity: 0.03,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(150,180,255,0.4) 0%, rgba(100,140,255,0.15) 25%, transparent 55%)',
          transition: 'none',
        }}
      />

      {/* Circular vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 15,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.95) 78%, black 88%)',
      }} />

      {/* Search panel */}
      <div
        ref={panelRef}
        className="absolute z-[60]"
        style={{ top: panelPos.y, left: panelPos.x, width: panelSize.w, userSelect: 'none' }}
      >
        <div
          style={{
            border: '2px solid #000',
            background: 'rgba(0, 0, 0, 1)',
            backdropFilter: 'blur(8px)',
            boxShadow: '3px 3px 0 #000',
            height: collapsed ? 'auto' : panelSize.h,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
            zIndex: 1,
          }} />

          <div
            onMouseDown={handleDragStart}
            className="flex items-center justify-between px-4 py-2 relative z-10"
            style={{ borderBottom: '1px solid #222', background: '#0a0a0a', cursor: 'grab', flexShrink: 0 }}
          >
            <div className="flex items-center gap-2">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
              <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, letterSpacing: '0.1em', color: '#fff' }}>SEARCH</span>
              <span style={{ display: 'inline-block', width: 7, height: 12, background: '#fff', animation: 'terminal-cursor-blink 1s step-end infinite' }} />
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#444', letterSpacing: '0.1em' }}>
                {matchingIndices.size}/{WEBRING_ENTRIES.length}
              </span>
              <button
                className="collapse-btn"
                onClick={(e) => { e.stopPropagation(); setCollapsed(prev => !prev); }}
                style={{ background: 'none', border: '1px solid #333', color: '#888', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 6px', lineHeight: 1 }}
              >
                {collapsed ? '+' : '−'}
              </button>
            </div>
          </div>

          <div
            className="flex flex-col relative z-10"
            style={{
              maxHeight: collapsed ? 0 : 600,
              opacity: collapsed ? 0 : 1,
              padding: collapsed ? '0 16px' : '12px 16px',
              overflow: 'hidden',
              transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, padding 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              flex: collapsed ? 'none' : '1',
            }}
          >
            <div style={{ border: '1px solid #333', background: '#111', display: 'flex', alignItems: 'center', padding: '0 12px', flexShrink: 0 }}>
              <span style={{ color: '#888', fontFamily: 'var(--font-mono)', fontSize: 13, marginRight: 8 }}>{'>'}</span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="search..." spellCheck={false}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e0e0e0', fontFamily: 'var(--font-mono)', fontSize: 13, padding: '8px 0', width: '100%', caretColor: '#fff' }}
              />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '0 4px' }}>x</button>}
            </div>

            <div className="flex flex-wrap gap-1 mt-2" style={{ flexShrink: 0 }}>
              {ALL_COHORTS.map(cohort => {
                const active = selectedCohorts.has(cohort);
                return (
                  <button key={cohort} className="cohort-chip" onClick={() => toggleCohort(cohort)}
                    style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, letterSpacing: '0.08em', padding: '3px 10px', border: `1px solid ${active ? '#fff' : '#333'}`, background: active ? '#fff' : 'transparent', color: active ? '#000' : '#666', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  >{cohort}</button>
                );
              })}
              {selectedCohorts.size > 0 && <button onClick={() => setSelectedCohorts(new Set())} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '3px 8px', border: '1px solid #333', background: 'transparent', color: '#666', cursor: 'pointer' }}>clear</button>}
            </div>

            <div className="mt-3 flex flex-col gap-1 flex-1 overflow-y-auto" style={{ maxHeight: Math.max(80, listMaxHeight) }}>
              {WEBRING_ENTRIES.map((entry, i) => {
                if (!matchingIndices.has(i)) return null;
                const isSelected = selectedNode === i;
                return (
                  <div key={i} className="block no-underline webring-item" role="button" tabIndex={0}
                    onClick={(e) => handleListClick(e, i)}
                    onDoubleClick={(e) => handleListDoubleClick(e, i)}
                    onMouseEnter={() => setHoveredNode(i)} onMouseLeave={() => setHoveredNode(-1)}
                    style={{ padding: '6px 8px', cursor: 'pointer', background: (hoveredNode === i || isSelected) ? 'rgba(255,255,255,0.08)' : 'transparent', border: `1px solid ${isSelected ? 'rgba(255,255,255,0.4)' : hoveredNode === i ? 'rgba(255,255,255,0.2)' : 'transparent'}`, transition: 'all 0.15s ease', flexShrink: 0 }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 11, letterSpacing: '0.06em', color: '#fff' }}>{entry.name}</span>
                      <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, color: '#444', letterSpacing: '0.08em' }}>{entry.cohort}</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#666', margin: 0, marginTop: 2 }}>{entry.description}</p>
                  </div>
                );
              })}
              {matchingIndices.size === 0 && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444', padding: '12px 0', textAlign: 'center' }}>no results found</p>}
            </div>

            <div className="mt-3 pt-2 flex items-center gap-2" style={{ borderTop: '1px solid #222', flexShrink: 0 }}>
              <a href="https://github.com/DanielWLiu07/CFM" target="_blank" rel="noopener noreferrer"
                className="inline-block no-underline cta-btn"
                style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, letterSpacing: '0.15em', color: '#fff', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', padding: '5px 14px', background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#000'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              >ADD YOUR SITE</a>
              {selectedNode >= 0 && (
                <button
                  onClick={handleDeselect}
                  className="cta-btn"
                  style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, letterSpacing: '0.15em', color: '#888', border: '2px solid #555', boxShadow: '2px 2px 0 #000', padding: '5px 14px', background: 'transparent', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#555'; }}
                >DESELECT</button>
              )}
            </div>
          </div>

          {!collapsed && (
            <div onMouseDown={handleResizeStart} style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, cursor: 'nwse-resize', zIndex: 10 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ opacity: 0.3 }}>
                <line x1="14" y1="4" x2="4" y2="14" stroke="#fff" strokeWidth="1" />
                <line x1="14" y1="8" x2="8" y2="14" stroke="#fff" strokeWidth="1" />
                <line x1="14" y1="12" x2="12" y2="14" stroke="#fff" strokeWidth="1" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {tooltip && (
        <div className="absolute z-30 pointer-events-none" style={{ left: Math.max(80, Math.min(tooltip.x, (sectionRef.current?.clientWidth ?? 1000) - 80)), top: Math.max(10, tooltip.y - 50), transform: 'translateX(-50%)' }}>
          <div style={{ background: 'rgba(0,0,0,0.95)', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', padding: '6px 12px', whiteSpace: 'nowrap' }}>
            <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 11, color: '#fff', margin: 0, letterSpacing: '0.08em' }}>{tooltip.entry.name}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#999', margin: 0, marginTop: 2 }}>{tooltip.entry.description}</p>
          </div>
        </div>
      )}

      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ background: 'transparent' }}
          onMouseDown={handleCanvasDown} onMouseMove={handleCanvasMove} onMouseUp={handleCanvasUp} onMouseLeave={handleCanvasLeave}
        />
      </div>

      {/* Controls bar */}
      <div
        className="absolute z-[60] flex items-center gap-5"
        style={{
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #222',
          padding: '8px 20px',
          userSelect: 'none',
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#555', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            ROTATE
          </span>
          <input
            type="range" min="0" max="360" step="0.5"
            value={sliderAngle} onChange={handleSliderChange}
            onMouseUp={handleSliderUp} onTouchEnd={handleSliderUp}
            style={{ width: 140, height: 2, appearance: 'none', background: '#333', outline: 'none', cursor: 'pointer', accentColor: '#fff' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', width: 28, textAlign: 'right' }}>
            {Math.round(sliderAngle)}°
          </span>
        </div>
        <div style={{ width: 1, height: 14, background: '#333' }} />
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#555', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            TILT
          </span>
          <input
            type="range" min="0" max="360" step="1"
            value={sliderTilt} onChange={handleTiltChange}
            onMouseUp={handleTiltUp} onTouchEnd={handleTiltUp}
            style={{ width: 100, height: 2, appearance: 'none', background: '#333', outline: 'none', cursor: 'pointer', accentColor: '#fff' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', width: 28, textAlign: 'right' }}>
            {Math.round(sliderTilt)}°
          </span>
        </div>
        <div style={{ width: 1, height: 14, background: '#333' }} />
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#555', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            ZOOM
          </span>
          <input
            type="range" min="0" max="100" step="1"
            value={sliderZoom} onChange={handleZoomChange}
            onMouseUp={handleZoomUp} onTouchEnd={handleZoomUp}
            style={{ width: 100, height: 2, appearance: 'none', background: '#333', outline: 'none', cursor: 'pointer', accentColor: '#fff' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', width: 32, textAlign: 'right' }}>
            {sliderZoom}%
          </span>
        </div>
        <div style={{ width: 1, height: 14, background: '#333' }} />
        <button
          onClick={handleResetView}
          style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#555', letterSpacing: '0.1em', background: 'none', border: '1px solid #333', padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#333'; }}
        >RESET</button>
      </div>
    </section>
  );
}
