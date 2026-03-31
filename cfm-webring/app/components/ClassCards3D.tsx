'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

import type { ClassCards3DProps, ClassMember } from './class/types';
import { ASPECT, COL_GAP, ROW_GAP, COLS, TILT_DEG } from './class/types';
import { toSlug } from './class/utils';
import { createDecoElements } from './class/createDecoElements';
import { createCardElement } from './class/createCardElement';
import CRTOverlay from './class/CRTOverlay';

export default function ClassCards3D({ members }: ClassCards3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<CSS3DRenderer | null>(null);
  const objectsRef = useRef<CSS3DObject[]>([]);
  const decoRef = useRef<CSS3DObject[]>([]);
  const rafRef = useRef<number>(0);
  const baseYRef = useRef<number[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [expandedMember, setExpandedMember] = useState<ClassMember | null>(null);
  // CRT phases — on: dot → line → expand → done | off: flash → shrink → dotout → afterglow → idle
  const [phase, setPhase] = useState<'idle' | 'dot' | 'line' | 'expand' | 'done' | 'flash' | 'shrink' | 'dotout' | 'afterglow'>('idle');
  const [inkKey, setInkKey] = useState(0);
  const closeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (rendererRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 1, 5000);
    camera.position.z = 1200;

    const renderer = new CSS3DRenderer();
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.overflow = 'visible';
    container.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Single render — no animation loop
    const renderOnce = () => renderer.render(scene, camera);
    rafRef.current = requestAnimationFrame(renderOnce);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  const swapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const container = containerRef.current;
    if (!scene || !camera || !renderer || !container) return;

    // Clear any pending swap
    if (swapTimeoutRef.current) { clearTimeout(swapTimeoutRef.current); swapTimeoutRef.current = null; }

    const buildNewCards = () => {
      // Remove old cards
      objectsRef.current.forEach(obj => {
        scene.remove(obj);
        if (obj.element.parentNode) obj.element.parentNode.removeChild(obj.element);
      });
      objectsRef.current = [];
      baseYRef.current = [];

      // Remove old deco
      decoRef.current.forEach(obj => {
        scene.remove(obj);
        if (obj.element.parentNode) obj.element.parentNode.removeChild(obj.element);
      });
      decoRef.current = [];

      const containerW = containerWidth || container.clientWidth;
      if (containerW < 100) return; // wait for layout
      if (members.length === 0) { renderer.setSize(containerW, 0); renderer.domElement.style.overflow = 'visible'; container.style.height = '0px'; renderer.render(scene, camera); return; }

      const responsiveCols = containerW >= 900 ? COLS : containerW >= 550 ? 2 : 1;
      const cols = Math.min(responsiveCols, members.length);
      const rows = Math.ceil(members.length / cols);

      const fillPct = cols === 1 ? 0.85 : 0.95;
      const normalCardW = Math.floor((containerW * 0.95 - (3 - 1) * COL_GAP) / 3);
      const rawCardW = Math.floor((containerW * fillPct - (cols - 1) * COL_GAP) / cols);
      const cardW = cols >= 3 ? Math.min(rawCardW, normalCardW) : rawCardW;
      const effectiveAspect = cols === 1 ? Math.min(ASPECT, 1.4) : cols === 2 ? Math.min(ASPECT, 1.8) : ASPECT;
      const cardH = Math.floor(cardW / effectiveAspect);
      const gridH = rows * cardH + (rows - 1) * ROW_GAP;
      const PAD = 40;
      const totalH = gridH + PAD * 2;

      renderer.setSize(containerW, totalH);
      // CSS3DRenderer.setSize() forces overflow:hidden — override on all layers
      renderer.domElement.style.overflow = 'visible';
      const viewEl = renderer.domElement.firstElementChild as HTMLElement;
      if (viewEl) { viewEl.style.overflow = 'visible'; }
      camera.aspect = containerW / totalH;
      camera.updateProjectionMatrix();
      camera.position.z = (totalH / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.updateProjectionMatrix();
      container.style.height = `${totalH}px`;

      members.forEach((member, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const el = createCardElement(member, cardW, cardH, (m) => {
          clearCloseTimers();
          setExpandedMember(m);
          setInkKey(k => k + 1);
          setPhase('dot');
          const slug = toSlug(m.name);
          const url = new URL(window.location.href);
          url.searchParams.set('member', slug);
          window.history.pushState({ member: slug }, '', url.toString());
          setTimeout(() => setPhase('line'), 80);
          setTimeout(() => setPhase('expand'), 250);
          setTimeout(() => setPhase('done'), 600);
        }, col, cols);

        // Start invisible for staggered fade-in
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s ease';

        const obj = new CSS3DObject(el);
        const x = (col - (cols - 1) / 2) * (cardW + COL_GAP);
        // Top-aligned: row 0 at top of grid, subsequent rows below
        const y = (totalH / 2 - PAD) - row * (cardH + ROW_GAP) - cardH / 2;
        const isMiddle = cols >= 3 && col > 0 && col < cols - 1;

        obj.position.set(x, y, isMiddle ? -20 : 0);
        baseYRef.current.push(y);

        if (cols >= 2) {
          if (col === 0) obj.rotation.y = THREE.MathUtils.degToRad(TILT_DEG);
          if (col === cols - 1) obj.rotation.y = THREE.MathUtils.degToRad(-TILT_DEG);
        }

        scene.add(obj);
        objectsRef.current.push(obj);
      });

      renderer.render(scene, camera);

      // Staggered fade-in
      requestAnimationFrame(() => {
        objectsRef.current.forEach((obj, i) => {
          setTimeout(() => { obj.element.style.opacity = '1'; }, 60 + i * 50);
        });
        setTimeout(() => renderer.render(scene, camera), 20);
      });
    };

    // If there are existing cards, fade them out first, then swap
    if (objectsRef.current.length > 0) {
      objectsRef.current.forEach(obj => {
        obj.element.style.transition = 'opacity 0.2s ease';
        obj.element.style.opacity = '0';
      });
      renderer.render(scene, camera);
      swapTimeoutRef.current = setTimeout(buildNewCards, 240);
    } else {
      buildNewCards();
    }

    return () => {
      if (swapTimeoutRef.current) clearTimeout(swapTimeoutRef.current);
    };
  }, [members, containerWidth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onResize = () => setContainerWidth(container.clientWidth);
    setContainerWidth(container.clientWidth);
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const clearCloseTimers = () => {
    closeTimersRef.current.forEach(t => clearTimeout(t));
    closeTimersRef.current = [];
  };

  const closeExpanded = () => {
    if (phase !== 'done') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('member');
    window.history.pushState({}, '', url.toString());
    // CRT turn-off: flash → shrink → dotout → afterglow → idle
    clearCloseTimers();
    setPhase('flash');
    closeTimersRef.current.push(
      setTimeout(() => setPhase('shrink'), 100),
      setTimeout(() => setPhase('dotout'), 400),
      setTimeout(() => setPhase('afterglow'), 600),
      setTimeout(() => { setPhase('idle'); setExpandedMember(null); }, 1050),
    );
  };

  // Open from URL on mount (e.g. ?member=daniel-liu)
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('member');
    if (!slug || members.length === 0) return;
    const match = members.find(m => toSlug(m.name) === slug);
    if (match) {
      clearCloseTimers();
      setExpandedMember(match);
      setInkKey(k => k + 1);
      setPhase('dot');
      setTimeout(() => setPhase('line'), 80);
      setTimeout(() => setPhase('expand'), 250);
      setTimeout(() => setPhase('done'), 600);
    }
  }, [members]);

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => {
      const slug = new URLSearchParams(window.location.search).get('member');
      if (!slug) {
        if (phase === 'done') {
          clearCloseTimers();
          setPhase('flash');
          closeTimersRef.current.push(
            setTimeout(() => setPhase('shrink'), 70),
            setTimeout(() => setPhase('dotout'), 320),
            setTimeout(() => setPhase('afterglow'), 520),
            setTimeout(() => { setPhase('idle'); setExpandedMember(null); }, 900),
          );
        }
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [phase]);

  // Lock scroll + ESC to close
  useEffect(() => {
    if (phase === 'idle') {
      // Re-render scene after overlay closes — body overflow change can corrupt CSS3D layout
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (renderer && scene && camera) {
        requestAnimationFrame(() => renderer.render(scene, camera));
      }
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeExpanded();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [phase]);


  return (
    <>
      <div
        ref={containerRef}
        style={{ position: 'relative', width: '100%', height: members.length > 0 ? 600 : 0, zIndex: 100, overflow: 'visible' }}
      />

      {/* CRT TV overlay — portaled to body */}
      <CRTOverlay
        expandedMember={expandedMember}
        members={members}
        phase={phase}
        closeExpanded={closeExpanded}
        onNavigate={(member) => {
          if (phase !== 'done') return;
          setExpandedMember(member);
          setInkKey(k => k + 1);
          const url = new URL(window.location.href);
          url.searchParams.set('member', toSlug(member.name));
          window.history.replaceState({}, '', url.toString());
        }}
        inkKey={inkKey}
        onReplay={() => {
          if (phase !== 'done' || !expandedMember) return;
          setInkKey(k => k + 1);
          setPhase('dot');
          setTimeout(() => setPhase('line'), 80);
          setTimeout(() => setPhase('expand'), 250);
          setTimeout(() => setPhase('done'), 600);
        }}
      />
    </>
  );
}
