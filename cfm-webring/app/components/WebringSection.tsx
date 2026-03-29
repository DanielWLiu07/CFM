'use client';

import { useRef, useEffect, useState, useCallback, useMemo, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import membersData from '../../data/members.json';

const WebringBackground = dynamic(() => import('./WebringBackground'), { ssr: false });

const BEAT_INTERVAL = 60 / 93;
const BEAT_OFFSET = 0.229;

interface WebringSectionProps {
  onVisibilityChange: (visible: boolean) => void;
  audioRef: RefObject<HTMLAudioElement | null>;
  reducedMotion?: boolean;
  sectionRefOut?: RefObject<HTMLElement | null>;
}

interface Social {
  type: string;
  url: string;
}

interface WebringEntry {
  name: string;
  url: string;
  description: string;
  cohort: string;
  avatar?: string;
  websiteImage?: string;
  role?: string;
  location?: string;
  school?: string;
  blurb?: string;
  year?: string;
  socials?: Social[];
}

const WEBRING_ENTRIES: WebringEntry[] = membersData.map(m => ({
  name: m.name,
  url: m.url,
  description: m.description,
  cohort: m.cohort,
  avatar: m.avatar,
  websiteImage: (m as Record<string, unknown>).websiteImage as string | undefined,
  role: (m as Record<string, unknown>).role as string | undefined,
  location: (m as Record<string, unknown>).location as string | undefined,
  school: (m as Record<string, unknown>).school as string | undefined,
  blurb: (m as Record<string, unknown>).blurb as string | undefined,
  year: (m as Record<string, unknown>).year as string | undefined,
  socials: (m as Record<string, unknown>).socials as Social[] | undefined,
}));

const ALL_COHORTS = [...new Set(WEBRING_ENTRIES.map(e => e.cohort))].sort();

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Node {
  x: number; y: number; z: number; // world position (animated toward target)
  targetX: number; targetY: number; targetZ: number; // layout target
  transitionT: number; // 0→1 progress
  nodeOpacity: number; // 0→1, for fade in/out
  removing: boolean;
  entry: WebringEntry;
  index: number;
  sx: number; sy: number; scale: number; depth: number; screenR: number; // projection cache
  hoverAnim: number;
  avatarImg: HTMLImageElement | null;
  lod: 0 | 1 | 2; // 0=dot, 1=simple, 2=full — persists to prevent flicker
}

interface Edge { from: number; to: number; hoverAnim: number; }

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
  startTheta?: number;
  endTheta?: number;
  startPhi?: number;
  endPhi?: number;
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

function buildGraph(entries: WebringEntry[], originalIndices?: number[]) {
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
    const idx = originalIndices ? originalIndices[i] : i;
    return { x, y, z, targetX: x, targetY: y, targetZ: z, transitionT: 1, nodeOpacity: 1, removing: false, entry, index: idx, sx: 0, sy: 0, scale: 1, depth: 0, screenR: 0, hoverAnim: 0, avatarImg, lod: 1 as const };
  });

  // Edges: ring + proximity
  const edges: Edge[] = [];
  const hasEdge = (a: number, b: number) => edges.some(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  for (let i = 0; i < n; i++) edges.push({ from: i, to: (i + 1) % n, hoverAnim: 0 });

  if (n <= 20) {
    for (let i = 0; i < n; i++) {
      const jump = 2 + Math.floor(seededRandom(i * 7 + 3) * 3);
      const target = (i + jump) % n;
      if (!hasEdge(i, target)) edges.push({ from: i, to: target, hoverAnim: 0 });
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
      if (bestJ >= 0) { edges.push({ from: i, to: bestJ, hoverAnim: 0 }); added++; }
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
  const lastEntryRef = useRef<WebringEntry | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Right panel state
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [rightDragged, setRightDragged] = useState(false);
  const [rightPos, setRightPos] = useState({ x: 0, y: 0 });
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const rightDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const handleRightDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // On first drag, snapshot the current computed position
    const el = rightPanelRef.current;
    const startX = el ? el.getBoundingClientRect().left - (sectionRef.current?.getBoundingClientRect().left ?? 0) : rightPos.x;
    const startY = el ? el.getBoundingClientRect().top - (sectionRef.current?.getBoundingClientRect().top ?? 0) : rightPos.y;
    if (!rightDragged) { setRightDragged(true); setRightPos({ x: startX, y: startY }); }
    rightDragRef.current = { startX: e.clientX, startY: e.clientY, origX: startX, origY: startY };
    const onMove = (ev: MouseEvent) => {
      if (!rightDragRef.current) return;
      const dx = ev.clientX - rightDragRef.current.startX, dy = ev.clientY - rightDragRef.current.startY;
      const section = sectionRef.current;
      const maxX = section ? section.clientWidth - 300 : window.innerWidth - 300;
      const maxY = section ? section.clientHeight - 200 : window.innerHeight - 200;
      setRightPos({ x: Math.max(0, Math.min(maxX, rightDragRef.current.origX + dx)), y: Math.max(0, Math.min(maxY, rightDragRef.current.origY + dy)) });
    };
    const onUp = () => { rightDragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [rightPos, rightDragged]);
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
  const [panelPos, setPanelPos] = useState({ x: 32, y: 200 });

  // Center panel vertically on mount
  useEffect(() => {
    setPanelPos(prev => ({ ...prev, y: Math.max(80, (window.innerHeight - 500) / 2) }));
  }, []);
  const [panelSize, setPanelSize] = useState({ w: 340, h: 420 });
  const [collapsed, setCollapsed] = useState(false);
  // Start collapsed on mobile
  const mobileCollapseInit = useRef(false);
  useEffect(() => {
    if (!mobileCollapseInit.current && window.innerWidth < 640) {
      setCollapsed(true);
      mobileCollapseInit.current = true;
    }
  }, []);
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


  // ── Rebuild graph when filters change — reconcile nodes for smooth animation
  useEffect(() => {
    const filteredEntries: WebringEntry[] = [];
    const originalIndices: number[] = [];
    WEBRING_ENTRIES.forEach((e, i) => {
      if (matchingIndices.has(i)) { filteredEntries.push(e); originalIndices.push(i); }
    });

    // Build new layout to get target positions
    const newGraph = buildGraph(filteredEntries, originalIndices);
    computeLayout(newGraph.nodes, newGraph.edges);

    const oldGraph = graphRef.current;
    if (!oldGraph || oldGraph.nodes.length === 0) {
      // First build — no animation needed
      graphRef.current = newGraph;
      const bounds = computeBoundingSphere(newGraph.nodes);
      boundsRef.current = bounds;
      const cam = cameraRef.current;
      cam.tx = bounds.cx; cam.ty = bounds.cy; cam.tz = bounds.cz;
      cam.orbitDist = bounds.radius * 1.8;
      depthSortedRef.current = [];
      return;
    }

    // Reconcile: keep existing nodes, update targets, add/remove as needed
    const oldByIndex = new Map<number, Node>();
    for (const n of oldGraph.nodes) oldByIndex.set(n.index, n);

    const reconciledNodes: Node[] = [];
    const newIndices = new Set(newGraph.nodes.map(n => n.index));

    // Nodes staying or entering
    for (const nn of newGraph.nodes) {
      const existing = oldByIndex.get(nn.index);
      if (existing) {
        // Keep existing, animate to new target
        existing.targetX = nn.x; existing.targetY = nn.y; existing.targetZ = nn.z;
        existing.transitionT = 0;
        existing.removing = false;
        reconciledNodes.push(existing);
      } else {
        // New node — start at center, fade in
        const bounds = boundsRef.current;
        nn.x = bounds.cx; nn.y = bounds.cy; nn.z = bounds.cz;
        nn.transitionT = 0;
        nn.nodeOpacity = 0;
        reconciledNodes.push(nn);
      }
    }

    // Nodes leaving — mark for removal
    for (const on of oldGraph.nodes) {
      if (!newIndices.has(on.index) && !on.removing) {
        on.removing = true;
        on.transitionT = 0;
        reconciledNodes.push(on);
      }
    }

    graphRef.current = { nodes: reconciledNodes, edges: newGraph.edges };

    // Smooth camera to new bounds
    const bounds = computeBoundingSphere(newGraph.nodes.length > 0 ? newGraph.nodes : reconciledNodes);
    boundsRef.current = bounds;
    const cam = cameraRef.current;
    flyToRef.current = {
      startTarget: [cam.tx, cam.ty, cam.tz],
      endTarget: [bounds.cx, bounds.cy, bounds.cz],
      startDist: cam.orbitDist,
      endDist: bounds.radius * 1.8,
      t: 0, duration: 0.6,
    };

    if (selectedNode >= 0 && !matchingIndices.has(selectedNode)) setSelectedNode(-1);
    depthSortedRef.current = [];
  }, [matchingIndices]);

  // ── Fly-to trigger ────────────────────────────────────────────────────────
  const triggerFlyTo = useCallback((nodeIndex: number) => {
    const graph = graphRef.current;
    if (!graph) return;
    const node = graph.nodes.find(n => n.index === nodeIndex);
    if (!node) return;
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

    // Graph is built/rebuilt by the matchingIndices effect

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
        if (ft.startTheta != null && ft.endTheta != null) cam.orbitTheta = lerp(ft.startTheta, ft.endTheta, e);
        if (ft.startPhi != null && ft.endPhi != null) cam.orbitPhi = lerp(ft.startPhi, ft.endPhi, e);
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

      // ── Animate node positions + opacity toward targets ──────────────
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (n.transitionT < 1) {
          n.transitionT = Math.min(1, n.transitionT + dt * 2.0);
          const e = easeInOutCubic(n.transitionT);
          if (!n.removing) {
            n.x = lerp(n.x, n.targetX, e * 0.15);
            n.y = lerp(n.y, n.targetY, e * 0.15);
            n.z = lerp(n.z, n.targetZ, e * 0.15);
            n.nodeOpacity = Math.min(1, n.nodeOpacity + dt * 2.5);
          } else {
            n.nodeOpacity = Math.max(0, n.nodeOpacity - dt * 3);
            if (n.nodeOpacity <= 0) { nodes.splice(i, 1); depthSortedRef.current = []; continue; }
          }
        } else if (!n.removing) {
          // Snap to target
          n.x = n.targetX; n.y = n.targetY; n.z = n.targetZ;
          n.nodeOpacity = 1;
        }
      }

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
        // LOD with hysteresis — need 30% past threshold to switch, prevents flicker
        if (n.lod === 0 && n.screenR > LOD_DOT * 1.3) n.lod = 1;
        else if (n.lod === 1 && n.screenR < LOD_DOT * 0.7) n.lod = 0;
        else if (n.lod === 1 && n.screenR > LOD_SIMPLE * 1.3) n.lod = 2;
        else if (n.lod === 2 && n.screenR < LOD_SIMPLE * 0.7) n.lod = 1;
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

      // Animate edge hoverAnim
      for (const edge of edges) {
        const eitherHovered = hoveredNode === edge.from || hoveredNode === edge.to;
        const t = eitherHovered ? 1 : 0;
        edge.hoverAnim += (t - edge.hoverAnim) * 0.10;
        if (Math.abs(edge.hoverAnim - t) < 0.01) edge.hoverAnim = t;
      }

      // ── Edges ─────────────────────────────────────────────────────────
      for (const edge of edges) {
        const a = nodes[edge.from], b = nodes[edge.to];
        // Edge LOD: skip if both are dot-level and neither hovered
        if (a.screenR < LOD_DOT && b.screenR < LOD_DOT && edge.hoverAnim < 0.01) continue;

        const aMatch = matchingIndices.has(a.index), bMatch = matchingIndices.has(b.index);
        const bothMatch = aMatch && bMatch;
        const eh = edge.hoverAnim;
        const edgeOpacity = Math.min(a.nodeOpacity, b.nodeOpacity);
        const avgFog = (depthFog(a.depth, cam.orbitDist) + depthFog(b.depth, cam.orbitDist)) / 2 * edgeOpacity;
        if (avgFog < 0.01) continue;
        const avgScale = (a.scale + b.scale) / 2;

        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.strokeStyle = '#fff';
        const beatEdge = beat * 0.25;
        // Blend between base state and hovered state using edge.hoverAnim
        const baseAlpha = bothMatch ? (0.12 + beatEdge) : (0.03 + beatEdge);
        const baseWidth = bothMatch ? Math.max(0.3, (1 + beat) * avgScale) : Math.max(0.2, (0.5 + beat * 0.8) * avgScale);
        ctx.globalAlpha = (baseAlpha + (0.6 - baseAlpha) * eh) * avgFog;
        ctx.lineWidth = baseWidth + (2 * avgScale - baseWidth) * eh;
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
        const brightenedFog = (fog + (0.95 - fog) * ha) * node.nodeOpacity;
        const r = node.screenR;
        if (brightenedFog < 0.01 || r < 0.5) continue;

        // ── LOD: Dot ────────────────────────────────────────────────────
        if (node.lod === 0 && !isHovered) {
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, Math.max(1, r), 0, TAU);
          ctx.fillStyle = `rgba(255,255,255,${(isMatch ? 0.5 : 0.15) * brightenedFog})`;
          ctx.fill();
          continue;
        }

        // ── LOD: Simple ─────────────────────────────────────────────────
        if (node.lod === 1 && !isHovered) {
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
          const img = node.avatarImg!;
          const imgSize = r * 2;
          // Crop from center — maintain aspect ratio
          const iw = img.naturalWidth, ih = img.naturalHeight;
          const cropSize = Math.min(iw, ih);
          const sx = (iw - cropSize) / 2, sy = (ih - cropSize) / 2;
          ctx.globalAlpha = brightenedFog * (0.6 + ha * 0.4);
          ctx.drawImage(img, sx, sy, cropSize, cropSize, node.sx - r, node.sy - r, imgSize, imgSize);
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
      cam.orbitPhi -= dy * 0.005;
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
    cam.orbitThetaVel = 0.0008;
    // Animate everything back to defaults
    flyToRef.current = {
      startTarget: [cam.tx, cam.ty, cam.tz],
      endTarget: [bounds.cx, bounds.cy, bounds.cz],
      startDist: cam.orbitDist,
      endDist: bounds.radius * 1.8,
      startTheta: cam.orbitTheta,
      endTheta: 0,
      startPhi: cam.orbitPhi,
      endPhi: Math.PI * 0.45,
      t: 0,
      duration: 1.2,
    };
    setSelectedNode(-1);
    setHoveredNode(-1);
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

      {/* Top fade — black→transparent so 3D content doesn't cut abruptly */}
      <div className="absolute top-0 left-0 w-full pointer-events-none" style={{ zIndex: 50, height: '120px', background: 'linear-gradient(to bottom, #000 0%, transparent 100%)' }} />

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
        style={{
          ...(isMobile
            ? { bottom: 0, left: 0, right: 0, width: '100%', top: 'auto',
                transform: (selectedNode >= 0) ? 'translateY(100%)' : 'translateY(0)',
                transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
              }
            : { top: panelPos.y, left: panelPos.x, width: panelSize.w }
          ),
          userSelect: 'none',
        }}
      >
        <div
          style={{
            border: '2px solid #000',
            background: 'rgba(0, 0, 0, 1)',
            backdropFilter: 'blur(8px)',
            boxShadow: '3px 3px 0 #000',
            height: collapsed ? 'auto' : (isMobile ? 'auto' : panelSize.h),
            maxHeight: isMobile && !collapsed ? '50vh' : undefined,
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
            onMouseDown={isMobile ? undefined : handleDragStart}
            className="flex items-center justify-between px-4 py-2 relative z-10"
            style={{ borderBottom: '1px solid #222', background: '#0a0a0a', cursor: isMobile ? 'default' : 'grab', flexShrink: 0 }}
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
                className="cta-btn"
                onClick={(e) => { e.stopPropagation(); setCollapsed(prev => !prev); }}
                style={{ background: 'transparent', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-arcade)', fontSize: 9, padding: '2px 7px', lineHeight: 1, letterSpacing: '0.1em' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
              >
                {collapsed ? '+' : '−'}
              </button>
            </div>
          </div>

          <div
            className="flex flex-col relative z-10"
            style={{
              maxHeight: collapsed ? 0 : (isMobile ? 'calc(50vh - 44px)' : 600),
              opacity: collapsed ? 0 : 1,
              padding: collapsed ? '0 16px' : '12px 16px',
              overflow: collapsed ? 'hidden' : 'auto',
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
              {selectedCohorts.size > 0 && <button
  onClick={() => setSelectedCohorts(new Set())}
  style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, padding: '3px 8px', border: '2px solid #fff', background: 'transparent', color: '#fff', cursor: 'pointer', letterSpacing: '0.1em', transition: 'all 0.15s ease' }}
  onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
>CLEAR</button>}
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
            </div>
          </div>

          {!collapsed && !isMobile && (
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

      {/* Right-side profile panel — draggable + resizable, matches left panel */}
      {(() => {
        const selectedGraphNode = selectedNode >= 0 && graphRef.current ? graphRef.current.nodes.find(n => n.index === selectedNode) : null;
        const isOpen = !!selectedGraphNode;
        if (isOpen) lastEntryRef.current = selectedGraphNode!.entry;
        const entry = lastEntryRef.current;
        return (
          <div
            ref={rightPanelRef}
            className="absolute z-[60]"
            style={{
              ...(isMobile
                ? { bottom: 0, left: 0, right: 0, width: '100%', top: 'auto', transform: isOpen ? 'translateY(0)' : 'translateY(100%)' }
                : rightDragged
                  ? { top: rightPos.y, left: rightPos.x }
                  : { top: '50%', right: 24, transform: isOpen ? 'translateY(-50%)' : 'translateY(-50%) translateX(30px)' }
              ),
              width: isMobile ? '100%' : 280,
              opacity: isMobile ? (isOpen ? 1 : 0) : (isOpen ? 1 : 0),
              pointerEvents: isOpen ? 'auto' : 'none',
              transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease, width 0.25s ease',
              userSelect: 'none',
              zIndex: isMobile ? 70 : undefined,
            }}
          >
            <div style={{
              border: '2px solid #000', background: 'rgba(0,0,0,1)', boxShadow: '3px 3px 0 #000',
              display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
              height: rightCollapsed ? 'auto' : undefined,
              maxHeight: isMobile ? '60vh' : undefined,
            }}>
              {/* Scanlines */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
                zIndex: 3,
              }} />

              {/* Title bar — draggable */}
              <div
                onMouseDown={isMobile ? undefined : handleRightDragStart}
                className="flex items-center justify-between px-4 py-2 relative z-10"
                style={{ borderBottom: '1px solid #222', background: '#0a0a0a', flexShrink: 0, cursor: isMobile ? 'default' : 'grab' }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
                  <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, letterSpacing: '0.1em', color: '#fff' }}>PROFILE</span>
                  <span style={{ display: 'inline-block', width: 7, height: 12, background: '#fff', animation: 'terminal-cursor-blink 1s step-end infinite' }} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setRightCollapsed(prev => !prev); }}
                    className="cta-btn"
                    style={{ background: 'transparent', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-arcade)', fontSize: 9, padding: '2px 7px', lineHeight: 1, letterSpacing: '0.1em' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
                  >
                    {rightCollapsed ? '+' : '−'}
                  </button>
                  <button
                    onClick={handleDeselect}
                    className="cta-btn"
                    style={{ background: 'transparent', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-arcade)', fontSize: 9, padding: '2px 7px', lineHeight: 1, letterSpacing: '0.1em' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
                  >
                    X
                  </button>
                </div>
              </div>

              {entry && (
                <div
                  className="flex flex-col relative z-10"
                  style={{
                    maxHeight: rightCollapsed ? 0 : (isMobile ? 'calc(60vh - 44px)' : 600),
                    opacity: rightCollapsed ? 0 : 1,
                    overflow: rightCollapsed ? 'hidden' : 'auto',
                    transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
                  }}
                >
                  {/* Website screenshot or avatar fallback */}
                  {(entry.websiteImage || entry.avatar) && (
                    <div style={{ width: '100%', height: 160, overflow: 'hidden', borderBottom: '1px solid #222', position: 'relative', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={entry.websiteImage || entry.avatar!} alt={`${entry.name}'s website`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ padding: '14px 16px' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#888' }}>&gt;</span>
                      <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 14, color: '#fff', letterSpacing: '0.1em' }}>{entry.name}</span>
                    </div>

                    {entry.role && (
                      <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 10, color: '#888', margin: 0, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {entry.role}
                      </p>
                    )}

                    <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, color: '#555', margin: 0, marginTop: 4, letterSpacing: '0.1em' }}>
                      // CLASS OF &apos;{entry.year || entry.cohort}
                    </p>

                    {(entry.location || entry.school) && (
                      <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, color: '#555', margin: 0, marginTop: 2, letterSpacing: '0.06em' }}>
                        {entry.location}{entry.location && entry.school ? '  //  ' : ''}{entry.school}
                      </p>
                    )}

                    {entry.blurb && (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#e0e0e0', margin: 0, marginTop: 10, lineHeight: 1.7 }}>
                        &ldquo;{entry.blurb}&rdquo;
                      </p>
                    )}

                    {/* Socials (website filtered out — shown as VISIT button) */}
                    {entry.socials && entry.socials.filter(s => s.type !== 'website').length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {entry.socials.filter(s => s.type !== 'website').map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                            className="cta-btn"
                            style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: '2px solid #fff', boxShadow: '2px 2px 0 #000', background: 'transparent', textDecoration: 'none', transition: 'all 0.15s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
                            dangerouslySetInnerHTML={{ __html:
                              s.type === 'github' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>'
                              : s.type === 'linkedin' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>'
                              : s.type === 'twitter' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>'
                              : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Visit */}
                    <div className="flex items-center gap-2" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #222' }}>
                      <a href={entry.url} target="_blank" rel="noopener noreferrer" className="cta-btn"
                        style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, letterSpacing: '0.15em', color: '#fff', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', padding: '5px 14px', background: 'transparent', textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
                      >VISIT &rarr;</a>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ background: 'transparent' }}
          onMouseDown={handleCanvasDown} onMouseMove={handleCanvasMove} onMouseUp={handleCanvasUp} onMouseLeave={handleCanvasLeave}
        />
      </div>

      {/* Controls bar — hidden on mobile */}
      <div
        className="absolute z-[60] flex items-center gap-5"
        style={{
          display: isMobile ? 'none' : 'flex',
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
          style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#fff', letterSpacing: '0.1em', background: 'transparent', border: '2px solid #fff', padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
        >RESET</button>
      </div>
    </section>
  );
}
