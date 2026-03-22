'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

interface WebringSectionProps {
  onVisibilityChange: (visible: boolean) => void;
}

interface WebringEntry {
  name: string;
  url: string;
  description: string;
  cohort: string;
}

const WEBRING_ENTRIES: WebringEntry[] = [
  { name: 'Daniel Liu', url: 'https://danielwliu.com', description: 'SWE @ building things', cohort: '2029' },
  { name: 'Alice Chen', url: '#', description: 'quant dev in training', cohort: '2028' },
  { name: 'Bob Zhang', url: '#', description: 'full-stack fintech', cohort: '2029' },
  { name: 'Carol Wu', url: '#', description: 'ML + markets', cohort: '2027' },
  { name: 'David Park', url: '#', description: 'systems engineer', cohort: '2028' },
  { name: 'Eve Singh', url: '#', description: 'crypto & distributed', cohort: '2029' },
  { name: 'Frank Li', url: '#', description: 'product & design', cohort: '2027' },
  { name: 'Grace Kim', url: '#', description: 'data science', cohort: '2028' },
];

const ALL_COHORTS = [...new Set(WEBRING_ENTRIES.map(e => e.cohort))].sort();

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ── 3D Types ────────────────────────────────────────────────────────────────

interface Node {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  entry: WebringEntry;
  index: number;
  // Cached projection (updated each frame)
  sx: number; sy: number; scale: number; depth: number;
}

interface Edge { from: number; to: number; }

interface Star {
  x: number; y: number; z: number;
  brightness: number;
}

interface Camera {
  rotY: number;
  rotVel: number;       // angular velocity (momentum)
  bobPhase: number;
  zoom: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

const FOCAL = 800;
const CAM_Z = 0;
const FOG_NEAR = -400;
const FOG_FAR = 800;
const Z_BOUND = 200;
const STAR_COUNT = 120;
const TAU = Math.PI * 2;

// ── Projection ──────────────────────────────────────────────────────────────

function project(wx: number, wy: number, wz: number, cam: Camera, cx: number, cy: number) {
  // Translate to camera-relative (nodes are in screen coords centered at cx,cy)
  let rx = wx - cx;
  let ry = wy - cy;
  let rz = wz;

  // Rotate around Y
  const cosR = Math.cos(cam.rotY);
  const sinR = Math.sin(cam.rotY);
  const rx2 = rx * cosR - rz * sinR;
  const rz2 = rx * sinR + rz * cosR;
  ry += Math.sin(cam.bobPhase) * 8;

  // Perspective divide (zoom affects focal length)
  const focalZoomed = FOCAL * cam.zoom;
  const d = focalZoomed + rz2;
  if (d < 50) return { sx: -9999, sy: -9999, scale: 0.01, depth: 9999 };
  const scale = focalZoomed / d;
  return {
    sx: cx + rx2 * scale,
    sy: cy + ry * scale,
    scale,
    depth: rz2,
  };
}

function depthFog(depth: number) {
  return Math.max(0, Math.min(1, 1 - (depth - FOG_NEAR) / (FOG_FAR - FOG_NEAR)));
}

// ── Unproject (screen → world, pinning z) ───────────────────────────────────

function unproject(sx: number, sy: number, nodeZ: number, cam: Camera, cx: number, cy: number) {
  // Compute what rz2 (rotated z) would be for this node's z
  // We need to estimate rx to rotate, but we're solving for it — use iterative approach:
  // Start with rx guess = 0, compute rz2, then solve rx from screen coords
  const cosR = Math.cos(cam.rotY);
  const sinR = Math.sin(cam.rotY);

  // First pass: assume rx ≈ 0 to get approximate rz2
  let rz2 = nodeZ * cosR; // rx*sinR ≈ 0
  const focalZoomed = FOCAL * cam.zoom;
  let scale = focalZoomed / (focalZoomed + rz2);

  // Solve rx2 from screen position
  const rx2 = (sx - cx) / scale;
  const ry = (sy - cy) / scale - Math.sin(cam.bobPhase) * 8;

  // Inverse rotation: rx2 = rx*cos - rz*sin, rz2 = rx*sin + rz*cos
  // We know nodeZ and rx2, solve for rx:
  // rx2 = rx*cos - nodeZ*sin  →  rx = (rx2 + nodeZ*sin) / cos
  const rx = cosR !== 0 ? (rx2 + nodeZ * sinR) / cosR : rx2;

  return { x: rx + cx, y: ry + cy };
}

// ── Graph Construction ──────────────────────────────────────────────────────

function buildGraph(entries: WebringEntry[], w: number, h: number) {
  const padX = 120, padY = 120;
  const nodes: Node[] = entries.map((entry, i) => {
    const x = padX + seededRandom(i * 2) * (w - padX * 2);
    const y = padY + seededRandom(i * 2 + 1) * (h - padY * 2);
    const z = -Z_BOUND + seededRandom(i * 2 + 100) * Z_BOUND * 2;
    return { x, y, z, vx: 0, vy: 0, vz: 0, entry, index: i, sx: 0, sy: 0, scale: 1, depth: 0 };
  });

  const edges: Edge[] = [];
  for (let i = 0; i < entries.length; i++)
    edges.push({ from: i, to: (i + 1) % entries.length });
  for (let i = 0; i < entries.length; i++) {
    const jump = 2 + Math.floor(seededRandom(i * 7 + 3) * 3);
    const target = (i + jump) % entries.length;
    if (!edges.some(e => (e.from === i && e.to === target) || (e.from === target && e.to === i)))
      edges.push({ from: i, to: target });
  }

  return { nodes, edges };
}

function buildStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: (seededRandom(i * 3 + 1000) - 0.5) * 1600,
      y: (seededRandom(i * 3 + 1001) - 0.5) * 1000,
      z: (seededRandom(i * 3 + 1002) - 0.5) * 1200,
      brightness: 0.15 + seededRandom(i * 3 + 1003) * 0.5,
    });
  }
  return stars;
}

// ── 3D Physics ──────────────────────────────────────────────────────────────

function simulate3D(nodes: Node[], edges: Edge[], w: number, h: number) {
  const REPULSION = 12000;
  const SPRING = 0.004;
  const SPRING_LEN = 200;
  const DAMPING = 0.84;
  const PAD = 80;

  // Repulsion
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dz = nodes[j].z - nodes[i].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;
      nodes[i].vx -= fx; nodes[i].vy -= fy; nodes[i].vz -= fz;
      nodes[j].vx += fx; nodes[j].vy += fy; nodes[j].vz += fz;
    }
  }

  // Springs
  for (const edge of edges) {
    const a = nodes[edge.from], b = nodes[edge.to];
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const force = (dist - SPRING_LEN) * SPRING;
    const fx = (dx / dist) * force, fy = (dy / dist) * force, fz = (dz / dist) * force;
    a.vx += fx; a.vy += fy; a.vz += fz;
    b.vx -= fx; b.vy -= fy; b.vz -= fz;
  }

  // Centering
  const cx = w / 2, cy = h / 2;
  for (const n of nodes) {
    n.vx += (cx - n.x) * 0.0003;
    n.vy += (cy - n.y) * 0.0003;
    n.vz += (0 - n.z) * 0.0005; // stronger Z centering
  }

  // Integration + bounds
  for (const n of nodes) {
    n.vx *= DAMPING; n.vy *= DAMPING; n.vz *= DAMPING;
    n.x += n.vx; n.y += n.vy; n.z += n.vz;
    n.x = Math.max(PAD, Math.min(w - PAD, n.x));
    n.y = Math.max(PAD, Math.min(h - PAD, n.y));
    n.z = Math.max(-Z_BOUND, Math.min(Z_BOUND, n.z));
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function WebringSection({ onVisibilityChange }: WebringSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [search, setSearch] = useState('');
  const [selectedCohorts, setSelectedCohorts] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState(-1);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; entry: WebringEntry } | null>(null);
  const graphRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const starsRef = useRef<Star[]>([]);
  const cameraRef = useRef<Camera>({ rotY: 0, rotVel: 0.0008, bobPhase: 0, zoom: 1 });
  const rafRef = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);
  const settled = useRef(false);
  const frameCount = useRef(0);

  const draggedNodeRef = useRef(-1);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const dragCamRotRef = useRef(0);
  // Orbit dragging
  const orbitDragRef = useRef<{ lastX: number; lastTime: number } | null>(null);
  // Mouse position ref for hover-attract
  const mousePosRef = useRef({ x: 0, y: 0 });

  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ x: 32, y: 80 });
  const [panelSize, setPanelSize] = useState({ w: 340, h: 420 });
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const panelRectRef = useRef({ x: 32, y: 80, w: 340, h: 420 });

  const toggleCohort = useCallback((cohort: string) => {
    setSelectedCohorts(prev => {
      const next = new Set(prev);
      if (next.has(cohort)) next.delete(cohort);
      else next.add(cohort);
      return next;
    });
  }, []);

  const matchingIndices = useMemo(() => {
    const q = search.toLowerCase().trim();
    const set = new Set<number>();
    WEBRING_ENTRIES.forEach((e, i) => {
      const matchesSearch = !q || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.cohort.includes(q);
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
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const newPos = { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy };
      setPanelPos(newPos);
      panelRectRef.current = { ...panelRectRef.current, x: newPos.x, y: newPos.y };
      settled.current = false;
      frameCount.current = 100;
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelPos]);

  // Panel resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: panelSize.w, origH: panelSize.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const dy = ev.clientY - resizeRef.current.startY;
      const newSize = { w: Math.max(280, resizeRef.current.origW + dx), h: Math.max(300, resizeRef.current.origH + dy) };
      setPanelSize(newSize);
      panelRectRef.current = { ...panelRectRef.current, w: newSize.w, h: newSize.h };
      settled.current = false; frameCount.current = 100;
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => onVisibilityChange(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

  // ── Canvas render loop ──────────────────────────────────────────────────
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

    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    if (!graphRef.current) graphRef.current = buildGraph(WEBRING_ENTRIES, w, h);
    if (starsRef.current.length === 0) starsRef.current = buildStars();

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio;
    const cam = cameraRef.current;

    const draw = () => {
      const graph = graphRef.current!;
      const { nodes, edges } = graph;
      const stars = starsRef.current;
      const dragging = draggedNodeRef.current;
      const cx = w / 2, cy = h / 2;

      // Camera — momentum + friction + auto-rotate + hover-to-front
      if (!orbitDragRef.current) {
        // If a node is hovered, gently rotate to face it
        if (hoveredNode >= 0 && hoveredNode < nodes.length && dragging < 0) {
          const hn = nodes[hoveredNode];
          // Compute what rotY would place this node at depth minimum (facing camera)
          // Node's contribution to rz2 = rx*sin(rotY) + rz*cos(rotY)
          // Minimize rz2 → derivative = rx*cos(rotY) - rz*sin(rotY) = 0
          // → tan(rotY) = rx/rz, but rx = node.x - cx
          const rx = hn.x - cx;
          const rz = hn.z;
          const targetRot = Math.atan2(-rx, -rz); // rotation that puts node at front
          // Shortest angular path
          let diff = targetRot - cam.rotY;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          // Gently steer toward target (don't snap — blend with existing velocity)
          cam.rotVel += diff * 0.003;
          cam.rotVel *= 0.92; // stronger friction when homing
        } else {
          cam.rotVel *= 0.97; // normal friction
          // When momentum is nearly gone, gently push toward auto-rotate speed
          if (Math.abs(cam.rotVel) < 0.002) {
            cam.rotVel += (0.0008 - cam.rotVel) * 0.01;
          }
        }
        cam.rotY += cam.rotVel;
      }
      cam.bobPhase += 0.006;


      // Physics
      if (dragging >= 0) { settled.current = false; frameCount.current = 100; }
      if (!settled.current) {
        for (let i = 0; i < 3; i++) simulate3D(nodes, edges, w, h);
        frameCount.current++;
        if (frameCount.current > 200 && dragging < 0) settled.current = true;
      } else {
        for (const n of nodes) {
          n.x += Math.sin(Date.now() * 0.0005 + n.index * 1.7) * 0.15;
          n.y += Math.cos(Date.now() * 0.0004 + n.index * 2.3) * 0.1;
          n.z += Math.sin(Date.now() * 0.0003 + n.index * 3.1) * 0.12;
        }
      }

      // Pin dragged node
      if (dragging >= 0) {
        const dn = nodes[dragging];
        dn.vx = 0; dn.vy = 0; dn.vz = 0;
      }

      // Panel avoidance — direct position lerp, no velocity forces (prevents oscillation)
      const pr = panelRectRef.current;
      const PAD_PANEL = 25;
      for (const node of nodes) {
        if (dragging === node.index || hoveredNode === node.index) continue;
        const p = project(node.x, node.y, node.z, cam, cx, cy);
        const px1 = pr.x - PAD_PANEL, py1 = pr.y - PAD_PANEL;
        const px2 = pr.x + pr.w + PAD_PANEL, py2 = pr.y + pr.h + PAD_PANEL;
        if (p.sx > px1 && p.sx < px2 && p.sy > py1 && p.sy < py2) {
          const dL = p.sx - px1, dR = px2 - p.sx, dT = p.sy - py1, dB = py2 - p.sy;
          const minD = Math.min(dL, dR, dT, dB);
          let targetSx = p.sx, targetSy = p.sy;
          if (minD === dL) targetSx = px1 - 2;
          else if (minD === dR) targetSx = px2 + 2;
          else if (minD === dT) targetSy = py1 - 2;
          else targetSy = py2 + 2;
          const target = unproject(targetSx, targetSy, node.z, cam, cx, cy);
          // Lerp position directly — no velocity, no bounce
          node.x += (target.x - node.x) * 0.12;
          node.y += (target.y - node.y) * 0.12;
          node.vx *= 0.3; node.vy *= 0.3; // kill existing velocity
        }
      }

      // Hover-attract: smoothly move hovered node toward cursor position
      if (hoveredNode >= 0 && hoveredNode < nodes.length && dragging < 0) {
        const hn = nodes[hoveredNode];
        const mp = mousePosRef.current;
        const target = unproject(mp.x, mp.y, hn.z, cam, cx, cy);
        hn.x += (target.x - hn.x) * 0.06;
        hn.y += (target.y - hn.y) * 0.06;
        hn.vx *= 0.3; hn.vy *= 0.3;
      }

      // Project all nodes
      for (const n of nodes) {
        const p = project(n.x, n.y, n.z, cam, cx, cy);
        n.sx = p.sx; n.sy = p.sy; n.scale = p.scale; n.depth = p.depth;
      }

      // ── Render ──────────────────────────────────────────────────────────
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const time = Date.now() * 0.001;

      // Nebula glow — subtle radial pulse in the center
      const pulseAlpha = 0.03 + 0.015 * Math.sin(time * 0.5);
      const nebulaGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.5);
      nebulaGrad.addColorStop(0, `rgba(255,255,255,${pulseAlpha})`);
      nebulaGrad.addColorStop(0.5, `rgba(200,200,255,${pulseAlpha * 0.3})`);
      nebulaGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, w, h);

      // Stars with varied sizes and twinkle
      for (const star of stars) {
        const p = project(cx + star.x, cy + star.y, star.z, cam, cx, cy);
        if (p.depth < -200 || p.scale < 0.01) continue;
        const fog = depthFog(p.depth);
        const twinkle = 0.7 + 0.3 * Math.sin(time * 2.5 + star.x * 0.02 + star.y * 0.03);
        const alpha = star.brightness * fog * twinkle * p.scale;
        if (alpha < 0.01) continue;
        const starR = Math.max(0.4, (0.8 + star.brightness * 1.2) * p.scale);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, starR, 0, TAU);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
        // Bright stars get a cross flare
        if (alpha > 0.3 && starR > 1) {
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.3})`;
          ctx.lineWidth = 0.5;
          const flareLen = starR * 3;
          ctx.beginPath(); ctx.moveTo(p.sx - flareLen, p.sy); ctx.lineTo(p.sx + flareLen, p.sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p.sx, p.sy - flareLen); ctx.lineTo(p.sx, p.sy + flareLen); ctx.stroke();
        }
      }

      // Parallax grid (2 layers)
      for (const gz of [-150, 150]) {
        const gFog = depthFog(gz) * 0.025;
        if (gFog < 0.002) continue;
        ctx.strokeStyle = `rgba(255,255,255,${gFog})`;
        ctx.lineWidth = 0.5;
        const step = 60;
        for (let gx = -400; gx <= w + 400; gx += step) {
          const p1 = project(gx, -200 + cy, gz, cam, cx, cy);
          const p2 = project(gx, h + 200, gz, cam, cx, cy);
          if (p1.scale > 0.01 && p2.scale > 0.01) {
            ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.stroke();
          }
        }
        for (let gy = -200; gy <= h + 200; gy += step) {
          const p1 = project(-400, gy, gz, cam, cx, cy);
          const p2 = project(w + 400, gy, gz, cam, cx, cy);
          if (p1.scale > 0.01 && p2.scale > 0.01) {
            ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.stroke();
          }
        }
      }

      // Edges
      for (const edge of edges) {
        const a = nodes[edge.from], b = nodes[edge.to];
        const aMatch = matchingIndices.has(a.index), bMatch = matchingIndices.has(b.index);
        const bothMatch = aMatch && bMatch;
        const eitherHovered = hoveredNode === a.index || hoveredNode === b.index;
        const avgFog = (depthFog(a.depth) + depthFog(b.depth)) / 2;
        const avgScale = (a.scale + b.scale) / 2;

        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);

        if (eitherHovered) {
          ctx.strokeStyle = `rgba(255,255,255,${0.6 * avgFog})`;
          ctx.lineWidth = 2 * avgScale;
        } else if (bothMatch) {
          ctx.strokeStyle = `rgba(255,255,255,${0.12 * avgFog})`;
          ctx.lineWidth = Math.max(0.3, 1 * avgScale);
        } else {
          ctx.strokeStyle = `rgba(255,255,255,${0.03 * avgFog})`;
          ctx.lineWidth = Math.max(0.2, 0.5 * avgScale);
        }
        ctx.stroke();
      }

      // Data packets (3D interpolated)
      for (const edge of edges) {
        const a = nodes[edge.from], b = nodes[edge.to];
        if (!matchingIndices.has(a.index) && !matchingIndices.has(b.index)) continue;
        const t = ((time * 0.3 + edge.from * 0.5) % 1);
        const px3 = a.x + (b.x - a.x) * t;
        const py3 = a.y + (b.y - a.y) * t;
        const pz3 = a.z + (b.z - a.z) * t;
        const p = project(px3, py3, pz3, cam, cx, cy);
        const fog = depthFog(p.depth);
        if (fog < 0.01) continue;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.5, 1.5 * p.scale), 0, TAU);
        ctx.fillStyle = `rgba(255,255,255,${0.5 * fog})`;
        ctx.fill();
      }

      // Nodes — sort back to front
      const sorted = [...nodes].sort((a, b) => b.depth - a.depth);
      for (const node of sorted) {
        const isMatch = matchingIndices.has(node.index);
        const isHovered = hoveredNode === node.index;
        const fog = depthFog(node.depth);
        const r = (isHovered ? 28 : 22) * node.scale;
        if (fog < 0.01 || r < 1) continue;

        // Glow halo
        if (isMatch && fog > 0.1) {
          const glowR = (isHovered ? 50 : 35) * node.scale;
          const grad = ctx.createRadialGradient(node.sx, node.sy, 0, node.sx, node.sy, glowR);
          grad.addColorStop(0, `rgba(255,255,255,${(isHovered ? 0.12 : 0.06) * fog})`);
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, glowR, 0, TAU);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Hover pulse ring
        if (isHovered) {
          const pulseR = (36 + Math.sin(Date.now() * 0.004) * 6) * node.scale;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, pulseR, 0, TAU);
          ctx.strokeStyle = `rgba(255,255,255,${0.2 * fog})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, r, 0, TAU);
        ctx.fillStyle = isHovered ? `rgba(255,255,255,${fog})` : isMatch ? `rgba(10,10,10,${fog})` : `rgba(5,5,5,${fog * 0.5})`;
        ctx.fill();
        ctx.strokeStyle = isMatch ? `rgba(255,255,255,${0.6 * fog})` : `rgba(255,255,255,${0.1 * fog})`;
        ctx.lineWidth = (isHovered ? 2.5 : isMatch ? 1.5 : 0.5) * node.scale;
        ctx.stroke();

        // Glow on hover
        if (isHovered && fog > 0.2) {
          ctx.shadowColor = '#fff';
          ctx.shadowBlur = 15 * node.scale;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, r, 0, TAU);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Initials
        const fontSize = Math.max(6, Math.round((isHovered ? 11 : 9) * node.scale));
        ctx.font = `${fontSize}px ArcadeClassic, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isHovered ? `rgba(0,0,0,${fog})` : isMatch ? `rgba(255,255,255,${0.7 * fog})` : `rgba(255,255,255,${0.15 * fog})`;
        ctx.fillText(node.entry.name.split(' ').map(w => w[0]).join(''), node.sx, node.sy + 1);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
      const newW = canvas.width / window.devicePixelRatio;
      const newH = canvas.height / window.devicePixelRatio;
      if (graphRef.current) {
        graphRef.current = buildGraph(WEBRING_ENTRIES, newW, newH);
        settled.current = false;
        frameCount.current = 0;
      }
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', onResize); };
  }, [matchingIndices, hoveredNode]);

  // ── Mouse interaction (uses projected coords) ───────────────────────────

  const findNodeAt = useCallback((mx: number, my: number) => {
    const graph = graphRef.current;
    if (!graph) return -1;
    // Front-to-back for correct occlusion
    const sorted = [...graph.nodes].sort((a, b) => a.depth - b.depth);
    let closest = -1, closestDist = Infinity;
    for (const node of sorted) {
      const hitR = 30 * node.scale;
      const dx = node.sx - mx, dy = node.sy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hitR && dist < closestDist) {
        closest = node.index;
        closestDist = dist;
      }
    }
    return closest;
  }, []);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const graph = graphRef.current;
    if (!canvas || !graph) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const cam = cameraRef.current;
    const cx = (canvas.width / window.devicePixelRatio) / 2;
    const cy = (canvas.height / window.devicePixelRatio) / 2;

    // Orbit drag — track velocity from mouse delta
    if (orbitDragRef.current) {
      const dx = mx - orbitDragRef.current.lastX;
      const dt = Math.max(1, Date.now() - orbitDragRef.current.lastTime);
      cam.rotY -= dx * 0.004;
      cam.rotVel = (-dx * 0.004) / Math.min(dt / 16, 3); // normalize to ~60fps
      orbitDragRef.current.lastX = mx;
      orbitDragRef.current.lastTime = Date.now();
      return;
    }

    // Node drag
    if (draggedNodeRef.current >= 0) {
      const node = graph.nodes[draggedNodeRef.current];
      const world = unproject(mx, my, node.z, cam, cx, cy);
      node.x = world.x; node.y = world.y;
      node.vx = 0; node.vy = 0; node.vz = 0;
      const p = project(node.x, node.y, node.z, cam, cx, cy);
      node.sx = p.sx; node.sy = p.sy; node.scale = p.scale; node.depth = p.depth;
      setTooltip({ x: node.sx, y: node.sy, entry: node.entry });
      return;
    }

    mousePosRef.current = { x: mx, y: my };
    const closest = findNodeAt(mx, my);
    setHoveredNode(closest);
    if (closest >= 0) {
      const node = graph.nodes[closest];
      setTooltip({ x: node.sx, y: node.sy, entry: node.entry });
      canvas.style.cursor = 'grab';
      // Keep sim alive for hover-attract
      settled.current = false;
      frameCount.current = 150;
    } else {
      setTooltip(null);
      canvas.style.cursor = 'default';
    }
  }, [findNodeAt]);

  const handleCanvasDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = findNodeAt(mx, my);
    if (hit >= 0) {
      // Drag node
      draggedNodeRef.current = hit;
      dragStartPosRef.current = { x: mx, y: my };
      dragCamRotRef.current = cameraRef.current.rotY;
      canvas.style.cursor = 'grabbing';
      setHoveredNode(hit);
    } else {
      // Orbit drag
      orbitDragRef.current = { lastX: mx, lastTime: Date.now() };
      cameraRef.current.rotVel = 0;
      canvas.style.cursor = 'move';
    }
  }, [findNodeAt]);

  const handleCanvasUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // End orbit drag — momentum carries from last velocity
    if (orbitDragRef.current) {
      orbitDragRef.current = null;
      canvas.style.cursor = 'default';
      return;
    }

    // End node drag
    if (draggedNodeRef.current >= 0) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const dist = Math.sqrt((mx - dragStartPosRef.current.x) ** 2 + (my - dragStartPosRef.current.y) ** 2);
      if (dist < 5) {
        const entry = WEBRING_ENTRIES[draggedNodeRef.current];
        if (entry.url !== '#') window.open(entry.url, '_blank', 'noopener,noreferrer');
      }
      draggedNodeRef.current = -1;
      canvas.style.cursor = 'default';
    }
  }, []);

  const handleCanvasLeave = useCallback(() => {
    draggedNodeRef.current = -1;
    orbitDragRef.current = null;
    setHoveredNode(-1);
    setTooltip(null);
  }, []);

  // Native wheel listener to prevent page scroll (React onWheel is passive)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      const cam = cameraRef.current;
      if (e.ctrlKey) {
        // Pinch-to-zoom (trackpad) or Ctrl+scroll → zoom
        e.preventDefault();
        e.stopPropagation();
        cam.zoom = Math.max(0.4, Math.min(2.5, cam.zoom - e.deltaY * 0.005));
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5 && Math.abs(e.deltaX) > 3) {
        // Horizontal swipe → rotate
        e.preventDefault();
        e.stopPropagation();
        cam.rotVel -= e.deltaX * 0.00008;
      }
      // Regular vertical scroll → passes through to page
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // Sliders
  const [sliderAngle, setSliderAngle] = useState(0);
  const [sliderZoom, setSliderZoom] = useState(100);
  const sliderDraggingRef = useRef(false);
  const zoomSliderDraggingRef = useRef(false);

  useEffect(() => {
    let id = 0;
    const sync = () => {
      const cam = cameraRef.current;
      if (!sliderDraggingRef.current) {
        setSliderAngle(((cam.rotY * 180 / Math.PI) % 360 + 360) % 360);
      }
      if (!zoomSliderDraggingRef.current) {
        setSliderZoom(Math.round(cam.zoom * 100));
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
    cameraRef.current.rotY = deg * Math.PI / 180;
    cameraRef.current.rotVel = 0;
  }, []);

  const handleSliderUp = useCallback(() => { sliderDraggingRef.current = false; }, []);

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setSliderZoom(v);
    zoomSliderDraggingRef.current = true;
    cameraRef.current.zoom = v / 100;
  }, []);

  const handleZoomUp = useCallback(() => { zoomSliderDraggingRef.current = false; }, []);

  const listMaxHeight = panelSize.h - 230;

  return (
    <section ref={sectionRef} className="relative h-screen flex flex-col overflow-hidden" style={{ zIndex: 10 }}>
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-24" />

      {/* Draggable + resizable search panel */}
      <div
        ref={panelRef}
        className="absolute z-20"
        style={{ top: panelPos.y, left: panelPos.x, width: panelSize.w, userSelect: 'none' }}
      >
        <div
          style={{
            border: '2px solid #000',
            background: 'rgba(0, 0, 0, 0.85)',
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
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed(prev => !prev);
                  panelRectRef.current = { ...panelRectRef.current, h: collapsed ? panelSize.h : 32 };
                  settled.current = false; frameCount.current = 100;
                }}
                style={{ background: 'none', border: '1px solid #333', color: '#888', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 6px', lineHeight: 1 }}
              >
                {collapsed ? '+' : '−'}
              </button>
            </div>
          </div>

          {!collapsed && <div className="flex-1 overflow-hidden flex flex-col px-4 py-3 relative z-10">
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
                  <button key={cohort} onClick={() => toggleCohort(cohort)}
                    style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, letterSpacing: '0.08em', padding: '3px 10px', border: `1px solid ${active ? '#fff' : '#333'}`, background: active ? '#fff' : 'transparent', color: active ? '#000' : '#666', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  >{cohort}</button>
                );
              })}
              {selectedCohorts.size > 0 && <button onClick={() => setSelectedCohorts(new Set())} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '3px 8px', border: '1px solid #333', background: 'transparent', color: '#666', cursor: 'pointer' }}>clear</button>}
            </div>

            <div className="mt-3 flex flex-col gap-1 flex-1 overflow-y-auto" style={{ maxHeight: Math.max(80, listMaxHeight) }}>
              {WEBRING_ENTRIES.map((entry, i) => {
                if (!matchingIndices.has(i)) return null;
                return (
                  <a key={i} href={entry.url} target="_blank" rel="noopener noreferrer" className="block no-underline"
                    onMouseEnter={() => setHoveredNode(i)} onMouseLeave={() => setHoveredNode(-1)}
                    style={{ padding: '6px 8px', background: hoveredNode === i ? 'rgba(255,255,255,0.08)' : 'transparent', border: `1px solid ${hoveredNode === i ? 'rgba(255,255,255,0.2)' : 'transparent'}`, transition: 'all 0.15s ease', flexShrink: 0 }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 11, letterSpacing: '0.06em', color: '#fff' }}>{entry.name}</span>
                      <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, color: '#444', letterSpacing: '0.08em' }}>{entry.cohort}</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#666', margin: 0, marginTop: 2 }}>{entry.description}</p>
                  </a>
                );
              })}
              {matchingIndices.size === 0 && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444', padding: '12px 0', textAlign: 'center' }}>no results found</p>}
            </div>

            <div className="mt-3 pt-2" style={{ borderTop: '1px solid #222', flexShrink: 0 }}>
              <a href="https://github.com/DanielWLiu07/CFM" target="_blank" rel="noopener noreferrer"
                className="inline-block no-underline transition-all duration-200"
                style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, letterSpacing: '0.15em', color: '#fff', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', padding: '5px 14px', background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#000'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              >ADD YOUR SITE</a>
            </div>
          </div>}

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
        <div className="absolute z-30 pointer-events-none" style={{ left: tooltip.x, top: tooltip.y - 50, transform: 'translateX(-50%)' }}>
          <div style={{ background: 'rgba(0,0,0,0.95)', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', padding: '6px 12px', whiteSpace: 'nowrap' }}>
            <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 11, color: '#fff', margin: 0, letterSpacing: '0.08em' }}>{tooltip.entry.name}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#999', margin: 0, marginTop: 2 }}>{tooltip.entry.description}</p>
          </div>
        </div>
      )}

      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="w-full h-full"
          onMouseDown={handleCanvasDown} onMouseMove={handleCanvasMove} onMouseUp={handleCanvasUp} onMouseLeave={handleCanvasLeave}
        />
      </div>

      {/* Controls bar — bottom center */}
      <div
        className="absolute z-20 flex items-center gap-5"
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
            ZOOM
          </span>
          <input
            type="range" min="40" max="250" step="1"
            value={sliderZoom} onChange={handleZoomChange}
            onMouseUp={handleZoomUp} onTouchEnd={handleZoomUp}
            style={{ width: 100, height: 2, appearance: 'none', background: '#333', outline: 'none', cursor: 'pointer', accentColor: '#fff' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', width: 32, textAlign: 'right' }}>
            {sliderZoom}%
          </span>
        </div>
      </div>
    </section>
  );
}
