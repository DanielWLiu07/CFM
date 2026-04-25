'use client';

import { useRef, useEffect, useState, useCallback, useMemo, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import { BEAT_INTERVAL, BEAT_OFFSET } from '../lib/beats';
import { useMembers } from '../hooks/useMembers';

import type { WebringEntry, Social, Node, Edge, Camera, FlyTo, BoundingSphere, WebringSectionProps } from './webring/types';
import { buildGraph, computeLayout, computeBoundingSphere } from './webring/graph';
import { FOCAL, TAU, LOD_DOT, LOD_SIMPLE, easeInOutCubic, lerp, getCameraEye, getCameraBasis, project, depthFog } from './webring/camera';
import SearchPanel from './webring/SearchPanel';
import ProfilePanel from './webring/ProfilePanel';
import ControlsBar from './webring/ControlsBar';
import ArrowTuner from './ArrowTuner';

const WebringBackground = dynamic(() => import('./WebringBackground'), { ssr: false });

export default function WebringSection({ onVisibilityChange, audioRef, reducedMotion, sectionRefOut }: WebringSectionProps) {
  const { members: membersData } = useMembers();

  const WEBRING_ENTRIES: WebringEntry[] = useMemo(() => membersData
    .filter(m => m.url && m.url !== '#')
    .map(m => ({
      name: m.name,
      url: m.url,
      tagline: m.tagline,
      description: m.description ?? '',
      cohort: m.cohort ?? m.year,
      avatar: m.avatar,
      websiteImage: m.websiteImage,
      role: m.role,
      location: m.location,
      school: m.school,
      blurb: m.blurb,
      year: m.year,
      socials: m.socials as Social[] | undefined,
    })), [membersData]);

  const ALL_COHORTS = useMemo(() => [...new Set(WEBRING_ENTRIES.map(e => e.cohort))].sort(), [WEBRING_ENTRIES]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [search, setSearch] = useState('');
  const [selectedCohorts, setSelectedCohorts] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState(-1);
  const [selectedNode, setSelectedNode] = useState(-1);
  const hoveredNodeRef = useRef(-1);
  const selectedNodeRef = useRef(-1);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; entry: WebringEntry } | null>(null);
  const lastEntryRef = useRef<WebringEntry | null>(null);

  // Keep refs in sync with state so the render loop reads them without restarting
  hoveredNodeRef.current = hoveredNode;
  selectedNodeRef.current = selectedNode;

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Periodically sync sim values to React state for search panel
  useEffect(() => {
    const id = setInterval(() => setSimTick(t => t + 1), 1000);
    return () => clearInterval(id);
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
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion ?? false;
  const lastBeatIdxRef = useRef(-1);
  const centerGlowRef = useRef<HTMLDivElement>(null);
  // Last frame time for fly-to
  const lastTimeRef = useRef(0);
  // Cached depth-sorted node indices (avoids alloc+sort every frame)
  const depthSortedRef = useRef<number[]>([]);
  const matchingIndicesRef = useRef<Set<number>>(new Set());
  const simValuesRef = useRef<Record<number, number>>({});
  const [simTick, setSimTick] = useState(0);

  // Red arrow tuner state
  const [arrowConfig, setArrowConfig] = useState({ top: '-32%', right: '-32%', width: 'min(1100px, 85vw)' });

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
  matchingIndicesRef.current = matchingIndices;

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
      if (!orbitDragRef.current && !panDragRef.current && !ft && !srActive) {
        cam.orbitThetaVel *= 0.97;
        if (Math.abs(cam.orbitThetaVel) < 0.002) {
          cam.orbitThetaVel += (0.0008 - cam.orbitThetaVel) * 0.01;
        }
        cam.orbitTheta += cam.orbitThetaVel;
      }
      cam.bobPhase += 0.006;

      // ── Beat detection (OTT only) ────────────────────────────────────
      if (audioRef.current && !audioRef.current.paused && !reducedMotionRef.current) {
        const t = audioRef.current.currentTime;
        const beatIdx = Math.floor((t - BEAT_OFFSET) / BEAT_INTERVAL);
        if (beatIdx < lastBeatIdxRef.current) lastBeatIdxRef.current = -1; // audio looped
        if (beatIdx > lastBeatIdxRef.current) {
          lastBeatIdxRef.current = beatIdx;
          beatPulseRef.current = 1;
        }
      }
      if (reducedMotionRef.current) beatPulseRef.current = 0;
      else beatPulseRef.current *= 0.96;
      const beat = beatPulseRef.current;

      // Center glow — static, no pulsing

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
        const driftX = Math.sin(time * 0.5 + n.index * 1.7) * 2;
        const driftY = Math.cos(time * 0.4 + n.index * 2.3) * 1.5;
        const driftZ = Math.sin(time * 0.3 + n.index * 3.1) * 1.8;
        const p = project(n.x + driftX, n.y + driftY, n.z + driftZ, eye, right, up, fwd, cx, cy);
        n.sx = p.sx; n.sy = p.sy; n.scale = p.scale; n.depth = p.depth;
        n.screenR = (22 + n.hoverAnim * 8) * p.scale;
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

      // Read refs so the loop doesn't depend on React state
      const _hovered = hoveredNodeRef.current;
      const _selected = selectedNodeRef.current;
      const _matching = matchingIndicesRef.current;
      for (const n of nodes) {
        const t = (_hovered === n.index || _selected === n.index) ? 1 : 0;
        n.hoverAnim += (t - n.hoverAnim) * 0.12;
        if (Math.abs(n.hoverAnim - t) < 0.01) n.hoverAnim = t;
      }

      // Animate edge hoverAnim
      for (const edge of edges) {
        const eitherHovered = _hovered === edge.from || _hovered === edge.to;
        const t = eitherHovered ? 1 : 0;
        edge.hoverAnim += (t - edge.hoverAnim) * 0.10;
        if (Math.abs(edge.hoverAnim - t) < 0.01) edge.hoverAnim = t;
      }

      // ── Edges ─────────────────────────────────────────────────────────
      for (const edge of edges) {
        const a = nodes[edge.from], b = nodes[edge.to];
        // Edge LOD: skip if both are dot-level and neither hovered
        if (a.screenR < LOD_DOT && b.screenR < LOD_DOT && edge.hoverAnim < 0.01) continue;

        const aMatch = _matching.has(a.index), bMatch = _matching.has(b.index);
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
        // Blend between base state and hovered state using edge.hoverAnim
        const baseAlpha = bothMatch ? 0.12 : 0.03;
        const baseWidth = bothMatch ? Math.max(0.3, avgScale) : Math.max(0.2, 0.5 * avgScale);
        ctx.globalAlpha = (baseAlpha + (0.6 - baseAlpha) * eh) * avgFog;
        ctx.lineWidth = baseWidth + (2 * avgScale - baseWidth) * eh;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── Data packets (simulation — flash node + update value on arrival) ─
      for (const edge of edges) {
        const a = nodes[edge.from], b = nodes[edge.to];
        if (!_matching.has(a.index) && !_matching.has(b.index)) continue;
        const avgDepth = (a.depth + b.depth) / 2;
        if (avgDepth > cam.orbitDist * 1.5) continue;
        const period = 3 + (edge.from * 0.7 + edge.to * 0.3) % 4;
        const rawT = ((time * 0.3 + edge.from * 0.5) % period) / period;
        const t = Math.min(1, rawT);

        // Detect arrival at destination node (t wraps near 1)
        const prevT = (((time - dt) * 0.3 + edge.from * 0.5) % period) / period;
        if (prevT > 0.9 && rawT < 0.1) {
          // Packet arrived at b — flash it and update sim value
          b.flashAnim = 1;
          b.flashGreen = edge.packetGreen;
          const delta = edge.packetGreen ? (1 + Math.random() * 5) : -(1 + Math.random() * 5);
          b.simValue = Math.max(0, Math.round((b.simValue + delta) * 100) / 100);
          // Re-randomize packet color for next cycle
          edge.packetGreen = Math.random() > 0.4;
        }

        const px3 = a.x + (b.x - a.x) * t, py3 = a.y + (b.y - a.y) * t, pz3 = a.z + (b.z - a.z) * t;
        const p = project(px3, py3, pz3, eye, right, up, fwd, cx, cy);
        const fog = depthFog(p.depth, cam.orbitDist);
        if (fog < 0.01) continue;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.5, (1.5 + (1 - t) * 0.5) * p.scale), 0, TAU);
        ctx.globalAlpha = 0.6 * fog;
        ctx.fillStyle = edge.packetGreen ? '#00e676' : '#ff5252';
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Decay flash animations
      for (const n of nodes) {
        if (n.flashAnim > 0) {
          n.flashAnim *= 0.92;
          if (n.flashAnim < 0.01) n.flashAnim = 0;
        }
      }

      // Update simValues ref for search panel
      if (simValuesRef.current) {
        for (const n of nodes) {
          simValuesRef.current[n.index] = n.simValue;
        }
      }

      // ── Nodes (back to front, cached sort) ─────────────────────────────
      const sortArr = depthSortedRef.current;
      if (sortArr.length !== nodes.length) {
        sortArr.length = 0;
        for (let i = 0; i < nodes.length; i++) sortArr.push(i);
      }
      sortArr.sort((a, b) => {
        if (_hovered === a) return 1;
        if (_hovered === b) return -1;
        return nodes[b].depth - nodes[a].depth;
      });

      for (const idx of sortArr) {
        const node = nodes[idx];
        const isMatch = _matching.has(node.index);
        const isHovered = _hovered === node.index;
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

        // Border — beat glow only when effects enabled
        const beatGlow = reducedMotionRef.current ? 0 : beat * 0.4;
        const strokeAlpha = (isMatch ? 0.5 : 0.1) + ha * 0.5 + beatGlow;
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, r, 0, TAU);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, strokeAlpha * brightenedFog)})`;
        ctx.lineWidth = (1.5 + ha * 1.5 + beat * 1.5) * effectiveScale;
        ctx.stroke();

        // Beat pulse ring — only when effects enabled
        if (!reducedMotionRef.current && beat > 0.1 && brightenedFog > 0.1) {
          const pulseR = r + 8 * beat * effectiveScale;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, pulseR, 0, TAU);
          ctx.strokeStyle = `rgba(255,255,255,${beat * 0.25 * brightenedFog})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Simulation flash — green/red glow when packet arrives
        if (node.flashAnim > 0.01 && brightenedFog > 0.05) {
          const flashColor = node.flashGreen ? '0,230,118' : '255,82,82';
          const flashR = r + 12 * node.flashAnim * effectiveScale;
          const grad = ctx.createRadialGradient(node.sx, node.sy, r * 0.5, node.sx, node.sy, flashR);
          grad.addColorStop(0, `rgba(${flashColor},${0.4 * node.flashAnim * brightenedFog})`);
          grad.addColorStop(0.5, `rgba(${flashColor},${0.15 * node.flashAnim * brightenedFog})`);
          grad.addColorStop(1, `rgba(${flashColor},0)`);
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, flashR, 0, TAU);
          ctx.fillStyle = grad;
          ctx.fill();
          // Flash border
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, r, 0, TAU);
          ctx.strokeStyle = `rgba(${flashColor},${0.6 * node.flashAnim * brightenedFog})`;
          ctx.lineWidth = 2 * effectiveScale;
          ctx.stroke();
        }

        // Hover glow — radial gradient instead of shadowBlur to avoid edge clipping
        if (ha > 0.1 && brightenedFog > 0.2) {
          const glowR = r + 15 * effectiveScale * ha;
          const grad = ctx.createRadialGradient(node.sx, node.sy, r * 0.8, node.sx, node.sy, glowR);
          grad.addColorStop(0, `rgba(255,255,255,${0.3 * ha * brightenedFog})`);
          grad.addColorStop(0.5, `rgba(255,255,255,${0.1 * ha * brightenedFog})`);
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, glowR, 0, TAU);
          ctx.fillStyle = grad;
          ctx.fill();
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
  }, []);

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

  // Profile panel derived state
  const selectedGraphNode = selectedNode >= 0 && graphRef.current ? graphRef.current.nodes.find(n => n.index === selectedNode) : null;
  const isProfileOpen = !!selectedGraphNode;
  if (isProfileOpen) lastEntryRef.current = selectedGraphNode!.entry;
  const profileEntry = lastEntryRef.current;

  return (
    <section ref={setSectionRef} className="relative h-screen flex flex-col" style={{ zIndex: 10, background: '#000', overflow: 'hidden' }}>
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-24" />

      {/* Top fade — black→transparent so 3D content doesn't cut abruptly */}
      <div className="absolute top-0 left-0 w-full pointer-events-none" style={{ zIndex: 50, height: '120px', background: 'linear-gradient(to bottom, #000 0%, transparent 100%)' }} />

      {/* Three.js background scene */}
      <WebringBackground beatRef={beatPulseRef} paused={!sectionVisible} />

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

      {/* Green arrow decoration */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/arrow_green.png"
        alt=""
        className="absolute pointer-events-none select-none"
        style={{
          bottom: '-10%',
          left: 0,
          width: 'min(600px, 55vw)',
          height: 'auto',
          opacity: 0.12,
          zIndex: 2,
          filter: 'drop-shadow(0 0 40px rgba(0,200,80,0.3))',
          animation: 'webring-arrow-float 8s ease-in-out infinite',
        }}
      />

      {/* Red arrow decoration — top right, flipped */}
      <div
        className="absolute pointer-events-none select-none"
        style={{
          top: arrowConfig.top,
          right: arrowConfig.right,
          width: arrowConfig.width,
          zIndex: 2,
          animation: 'webring-arrow-float-red 9s ease-in-out infinite',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/arrow_red.png"
          alt=""
          style={{
            width: '100%',
            height: 'auto',
            opacity: 0.12,
            transform: 'scaleX(-1)',
            filter: 'drop-shadow(0 0 40px rgba(200,50,30,0.3))',
          }}
        />
      </div>

      {/* Circular vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 15,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.95) 78%, black 88%)',
      }} />

      {/* Search panel */}
      <SearchPanel
        panelRef={panelRef}
        isMobile={isMobile}
        selectedNode={selectedNode}
        panelPos={panelPos}
        panelSize={panelSize}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        search={search}
        setSearch={setSearch}
        selectedCohorts={selectedCohorts}
        setSelectedCohorts={setSelectedCohorts}
        toggleCohort={toggleCohort}
        matchingIndices={matchingIndices}
        hoveredNode={hoveredNode}
        setHoveredNode={setHoveredNode}
        handleDragStart={handleDragStart}
        handleResizeStart={handleResizeStart}
        handleListClick={handleListClick}
        handleListDoubleClick={handleListDoubleClick}
        allCohorts={ALL_COHORTS}
        webringEntries={WEBRING_ENTRIES}
        listMaxHeight={listMaxHeight}
        simValues={simValuesRef.current}
        simTick={simTick}
      />

      {/* Right-side profile panel — draggable + resizable, matches left panel */}
      <ProfilePanel
        rightPanelRef={rightPanelRef}
        isMobile={isMobile}
        isOpen={isProfileOpen}
        entry={profileEntry}
        rightDragged={rightDragged}
        rightPos={rightPos}
        rightCollapsed={rightCollapsed}
        setRightCollapsed={setRightCollapsed}
        handleRightDragStart={handleRightDragStart}
        handleDeselect={handleDeselect}
      />

      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ background: 'transparent' }}
          onMouseDown={handleCanvasDown} onMouseMove={handleCanvasMove} onMouseUp={handleCanvasUp} onMouseLeave={handleCanvasLeave}
        />
      </div>

      {/* Controls bar — hidden on mobile */}
      <ControlsBar
        isMobile={isMobile}
        sliderAngle={sliderAngle}
        sliderTilt={sliderTilt}
        sliderZoom={sliderZoom}
        handleSliderChange={handleSliderChange}
        handleSliderUp={handleSliderUp}
        handleTiltChange={handleTiltChange}
        handleTiltUp={handleTiltUp}
        handleZoomChange={handleZoomChange}
        handleZoomUp={handleZoomUp}
        handleResetView={handleResetView}
      />

      {/* Arrow tuner — for development */}
      {/* <ArrowTuner onConfigChange={setArrowConfig} initialConfig={arrowConfig} /> */}
    </section>
  );
}
