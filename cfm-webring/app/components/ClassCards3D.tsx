'use client';

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

interface Social {
  type: 'github' | 'linkedin' | 'twitter' | 'website';
  url: string;
}

interface ClassMember {
  name: string;
  url: string;
  role: string;
  location: string;
  school: string;
  blurb: string;
  year: string;
  avatar?: string;
  socials?: Social[];
}

interface ClassCards3DProps {
  members: ClassMember[];
}

const ASPECT = 1511 / 716;
const COL_GAP = 30;
const ROW_GAP = 30;
const COLS = 3;
const TILT_DEG = 5;

const SOCIAL_ICONS: Record<string, string> = {
  github: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`,
  linkedin: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
  twitter: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>`,
  website: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase();
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function createCardElement(member: ClassMember, cardW: number, cardH: number, onExpand: (member: ClassMember) => void): HTMLElement {
  // Outer wrapper
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: block; width: ${cardW}px; height: ${cardH}px;
    cursor: pointer; position: relative;
  `;

  // Inner — dark base, TV image as faint overlay
  const inner = document.createElement('div');
  inner.style.cssText = `
    display: flex; flex-direction: column;
    width: 100%; height: 100%; box-sizing: border-box;
    background-image: url(/images/person_tv.webp);
    background-size: 100% 100%; background-repeat: no-repeat;
    position: relative; overflow: hidden;
    padding: 0;
    transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
    border: none;
  `;
  wrapper.appendChild(inner);

  // Scanlines
  const scanline = document.createElement('div');
  scanline.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 1;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px,
      rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px);
  `;
  inner.appendChild(scanline);

  // Cursor-tracking glow
  const glow = document.createElement('div');
  glow.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 2;
    background: radial-gradient(ellipse at var(--mx, 50%) var(--my, 50%),
      rgba(255,255,255,0.04) 0%, transparent 50%);
    opacity: 0; transition: opacity 0.3s ease;
  `;
  inner.appendChild(glow);

  // ── NAME BAR ──
  const nameBar = document.createElement('div');
  nameBar.style.cssText = `
    position: relative; z-index: 4;
    padding: 8px 14px 6px;
    border-bottom: 1px solid #1a1a1a;
    display: flex; align-items: center; justify-content: space-between;
    transition: border-color 0.3s ease;
  `;
  inner.appendChild(nameBar);

  const nameEl = document.createElement('div');
  nameEl.textContent = member.name;
  nameEl.style.cssText = `
    font-family: var(--font-arcade); font-size: 24px; letter-spacing: 0.12em;
    color: #fff;
    text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  `;
  nameBar.appendChild(nameEl);

  const termEl = document.createElement('div');
  termEl.textContent = "'" + member.year;
  termEl.style.cssText = `
    font-family: var(--font-arcade); font-size: 16px; letter-spacing: 0.1em;
    color: #fff; background: #000; padding: 3px 10px;
    transition: background 0.3s ease;
  `;
  nameBar.appendChild(termEl);

  // ── BODY ──
  const body = document.createElement('div');
  body.style.cssText = `
    display: flex; flex: 1; min-height: 0;
    position: relative; z-index: 4;
    padding: 10px 14px 10px 12px;
  `;
  inner.appendChild(body);

  // Avatar — stretches to full height of the body area
  const imgW = Math.floor(cardH * 0.48);
  const imgBox = document.createElement('div');
  imgBox.style.cssText = `
    width: ${imgW}px; align-self: stretch; flex-shrink: 0;
    background: transparent; border: none;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  `;
  if (member.avatar) {
    const img = document.createElement('img');
    img.src = member.avatar;
    img.alt = member.name;
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
    imgBox.appendChild(img);
  } else {
    const initials = document.createElement('span');
    initials.textContent = getInitials(member.name);
    initials.style.cssText = `font-family: var(--font-arcade); font-size: 18px; color: #222; letter-spacing: 0.08em;`;
    imgBox.appendChild(initials);
  }
  body.appendChild(imgBox);

  // Info — dark backdrop for readability against TV static
  const info = document.createElement('div');
  info.style.cssText = `
    flex: 1; min-width: 0; display: flex; flex-direction: column;
    justify-content: center; gap: 2px; padding: 8px 10px;
    margin-left: 10px;
    background: rgba(0,0,0,0.7);
    border-left: 2px solid rgba(0,0,0,0.3);
    transition: background 0.3s ease;
  `;

  const roleEl = document.createElement('div');
  roleEl.textContent = member.role;
  roleEl.style.cssText = `
    font-family: var(--font-arcade); font-size: 12px; letter-spacing: 0.1em;
    color: #ddd; text-transform: uppercase;
    transition: color 0.3s ease;
  `;
  info.appendChild(roleEl);

  // Location + School
  const locEl = document.createElement('div');
  locEl.textContent = `${member.location}  //  ${member.school}`;
  locEl.style.cssText = `
    font-family: var(--font-arcade); font-size: 11px; letter-spacing: 0.06em;
    color: #bbb; transition: color 0.3s ease;
  `;
  info.appendChild(locEl);

  const blurbEl = document.createElement('div');
  blurbEl.textContent = `\u201C${member.blurb}\u201D`;
  blurbEl.style.cssText = `
    font-family: monospace; font-size: 11px; color: #ccc;
    font-style: italic; line-height: 1.5; overflow: hidden;
    margin-top: 4px;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    transition: color 0.3s ease;
  `;
  info.appendChild(blurbEl);

  // Socials — horizontal row, bottom-right of info area
  if (member.socials && member.socials.length > 0) {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex; gap: 4px; margin-top: auto; align-self: flex-end;
    `;
    for (const social of member.socials) {
      const btn = document.createElement('a');
      btn.href = social.url;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      btn.style.cssText = `
        color: #fff; display: flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; background: #000;
        text-decoration: none;
      `;
      btn.innerHTML = SOCIAL_ICONS[social.type] || '';
      btn.addEventListener('mouseenter', () => { btn.style.background = '#333'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = '#000'; });
      btn.addEventListener('click', (e) => e.stopPropagation());
      row.appendChild(btn);
    }
    info.appendChild(row);
  }

  body.appendChild(info);

  // ── CLICK → full-screen expand ──
  wrapper.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) return;
    onExpand(member);
  });

  // ── HOVER ──
  wrapper.addEventListener('mouseenter', () => {
    inner.style.transform = 'scale(1.04)';
    glow.style.opacity = '1';
    termEl.style.background = '#222';
    info.style.background = 'rgba(0,0,0,0.85)';
    roleEl.style.color = '#fff';
    locEl.style.color = '#ddd';
    blurbEl.style.color = '#eee';
  });

  wrapper.addEventListener('mouseleave', () => {
    inner.style.transform = 'scale(1)';
    glow.style.opacity = '0';
    termEl.style.background = '#000';
    info.style.background = 'rgba(0,0,0,0.7)';
    roleEl.style.color = '#ddd';
    locEl.style.color = '#bbb';
    blurbEl.style.color = '#ccc';
  });

  return wrapper;
}

export default function ClassCards3D({ members }: ClassCards3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<CSS3DRenderer | null>(null);
  const objectsRef = useRef<CSS3DObject[]>([]);
  const rafRef = useRef<number>(0);
  const baseYRef = useRef<number[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [expandedMember, setExpandedMember] = useState<ClassMember | null>(null);
  // CRT phases — on: dot → line → expand → done | off: flash → shrink → dotout → afterglow → idle
  const [phase, setPhase] = useState<'idle' | 'dot' | 'line' | 'expand' | 'done' | 'flash' | 'shrink' | 'dotout' | 'afterglow'>('idle');

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
      // Remove old
      objectsRef.current.forEach(obj => {
        scene.remove(obj);
        if (obj.element.parentNode) obj.element.parentNode.removeChild(obj.element);
      });
      objectsRef.current = [];
      baseYRef.current = [];

      const containerW = containerWidth || container.clientWidth;
      if (members.length === 0) { renderer.setSize(containerW, 0); container.style.height = '0px'; renderer.render(scene, camera); return; }

      const responsiveCols = containerW >= 900 ? COLS : containerW >= 550 ? 2 : 1;
      const cols = Math.min(responsiveCols, members.length);
      const rows = Math.ceil(members.length / cols);

      const fillPct = cols === 1 ? 0.85 : 0.95;
      const normalCardW = Math.floor((containerW * 0.95 - (3 - 1) * COL_GAP) / 3);
      const rawCardW = Math.floor((containerW * fillPct - (cols - 1) * COL_GAP) / cols);
      const cardW = Math.min(rawCardW, normalCardW);
      const cardH = Math.floor(cardW / ASPECT);
      const gridH = rows * cardH + (rows - 1) * ROW_GAP;
      const PAD = 40;
      const totalH = gridH + PAD * 2;

      renderer.setSize(containerW, totalH);
      camera.aspect = containerW / totalH;
      camera.updateProjectionMatrix();
      camera.position.z = (totalH / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.updateProjectionMatrix();
      container.style.height = `${totalH}px`;

      members.forEach((member, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const el = createCardElement(member, cardW, cardH, (m) => {
          setExpandedMember(m);
          setPhase('dot');
          const slug = toSlug(m.name);
          const url = new URL(window.location.href);
          url.searchParams.set('member', slug);
          window.history.pushState({ member: slug }, '', url.toString());
          setTimeout(() => setPhase('line'), 80);
          setTimeout(() => setPhase('expand'), 250);
          setTimeout(() => setPhase('done'), 600);
        });

        // Start invisible for fade-in
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s ease';

        const obj = new CSS3DObject(el);
        const x = (col - (cols - 1) / 2) * (cardW + COL_GAP);
        const y = -((row - (rows - 1) / 2) * (cardH + ROW_GAP));
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

      // Fade in new cards staggered
      requestAnimationFrame(() => {
        objectsRef.current.forEach((obj, i) => {
          setTimeout(() => { obj.element.style.opacity = '1'; }, i * 40);
        });
        // Re-render after fade starts
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
      swapTimeoutRef.current = setTimeout(buildNewCards, 220);
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

  const closeExpanded = () => {
    if (phase !== 'done') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('member');
    window.history.pushState({}, '', url.toString());
    // flash → shrink → dotout → afterglow → idle
    setPhase('flash');
    setTimeout(() => setPhase('shrink'), 70);
    setTimeout(() => setPhase('dotout'), 320);
    setTimeout(() => setPhase('afterglow'), 520);
    setTimeout(() => { setPhase('idle'); setExpandedMember(null); }, 900);
  };

  // Open from URL on mount (e.g. ?member=daniel-liu)
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('member');
    if (!slug || members.length === 0) return;
    const match = members.find(m => toSlug(m.name) === slug);
    if (match) {
      setExpandedMember(match);
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
          setPhase('flash');
          setTimeout(() => setPhase('shrink'), 70);
          setTimeout(() => setPhase('dotout'), 320);
          setTimeout(() => setPhase('afterglow'), 520);
          setTimeout(() => { setPhase('idle'); setExpandedMember(null); }, 900);
        }
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [phase]);

  // Lock scroll + ESC to close
  useEffect(() => {
    if (phase === 'idle') return;
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
        style={{ position: 'relative', width: '100%', height: members.length > 0 ? 600 : 0, zIndex: 100 }}
      />

      {/* CRT TV overlay — portaled to body */}
      {phase !== 'idle' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: phase === 'afterglow' ? 'none' : 'auto' }}>
          {/* Main CRT screen */}
          {phase !== 'afterglow' && (
            <div
              onClick={closeExpanded}
              style={{
                position: 'absolute',
                inset: 0,
                cursor: phase === 'done' ? 'pointer' : 'default',
                willChange: phase === 'done' ? 'auto' : 'transform, opacity',
                borderRadius: (phase === 'dot' || phase === 'dotout') ? '50%' : '0',
                overflow: 'hidden',
                background:
                  phase === 'dotout' ? '#a0c4ff'
                  : phase === 'expand' ? '#000'
                  : '#fff',
                ...(phase === 'dot' ? {
                  transform: 'scaleX(0.006) scaleY(0.006)',
                  transition: 'none',
                } : phase === 'line' ? {
                  transform: 'scaleX(1) scaleY(0.006)',
                  transition: 'transform 0.12s cubic-bezier(0.22, 1.3, 0.36, 1), border-radius 0.06s ease',
                } : phase === 'expand' ? {
                  animation: 'crt-expand 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
                } : phase === 'flash' ? {
                  transform: 'scale(1)',
                  filter: 'brightness(2) saturate(0)',
                  transition: 'filter 0.05s ease',
                } : phase === 'shrink' ? {
                  transform: 'scaleX(1) scaleY(0.006)',
                  filter: 'brightness(1.3)',
                  transition: 'transform 0.2s cubic-bezier(0.6,0,1,0.4), filter 0.2s ease, background 0.15s ease',
                } : phase === 'dotout' ? {
                  transform: 'scaleX(0.006) scaleY(0.006)',
                  transition: 'transform 0.18s cubic-bezier(0.7,0,0.84,0), border-radius 0.08s ease, background 0.1s ease',
                } : {
                  transform: 'scale(1)',
                  transition: 'transform 0.1s ease-out',
                }),
                boxShadow:
                  (phase === 'dot' || phase === 'dotout')
                    ? '0 0 100px 40px rgba(160,196,255,1), 0 0 200px 80px rgba(160,196,255,0.5)'
                  : (phase === 'line' || phase === 'shrink')
                    ? '0 0 60px 20px rgba(200,220,255,0.9), 0 0 120px 40px rgba(160,196,255,0.4)'
                  : 'none',
              }}
            >
              {/* ── STATIC NOISE — visible during expand + flash ── */}
              {(phase === 'expand' || phase === 'flash' || phase === 'shrink') && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 3,
                  opacity: phase === 'flash' ? 0.4 : 0.25,
                  backgroundImage: `
                    repeating-conic-gradient(#888 0% 25%, transparent 0% 50%),
                    repeating-conic-gradient(#666 0% 25%, transparent 0% 50%)
                  `,
                  backgroundSize: '4px 4px, 6px 6px',
                  backgroundPosition: '0 0, 2px 2px',
                  animation: 'crt-noise 40ms steps(8) infinite',
                  pointerEvents: 'none',
                  mixBlendMode: 'overlay',
                }} />
              )}

              {/* ── HARD FLICKER — during line + expand ── */}
              {(phase === 'line' || phase === 'expand') && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 4,
                  background: '#fff',
                  animation: 'crt-flicker 0.2s steps(1) 2',
                  pointerEvents: 'none',
                }} />
              )}

              {/* ── HORIZONTAL JITTER — screen shakes during expand ── */}
              {phase === 'expand' && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 2,
                  animation: 'crt-hjitter 0.08s steps(1) 5',
                  pointerEvents: 'none',
                }}>
                  {/* Rolling interference bands */}
                  <div style={{
                    position: 'absolute', inset: 0, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: '100%', height: '12vh',
                      background: 'linear-gradient(transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 70%, transparent 100%)',
                      animation: 'crt-band-scroll 0.35s linear 2',
                    }} />
                  </div>
                </div>
              )}

              {/* ── RGB SPLIT — color separation glitch during transitions ── */}
              {(phase === 'expand' || phase === 'flash' || phase === 'shrink') && (
                <>
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 5,
                    background: 'rgba(255,0,0,0.06)',
                    transform: 'translateX(-3px)',
                    mixBlendMode: 'screen',
                    pointerEvents: 'none',
                    animation: 'crt-rgb-split 0.15s steps(1) 3',
                  }} />
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 5,
                    background: 'rgba(0,150,255,0.06)',
                    transform: 'translateX(3px)',
                    mixBlendMode: 'screen',
                    pointerEvents: 'none',
                    animation: 'crt-rgb-split 0.15s steps(1) 3 reverse',
                  }} />
                </>
              )}

              {/* ── SCANLINES — always visible on the CRT surface ── */}
              {(phase === 'expand' || phase === 'done' || phase === 'flash') && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 6,
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
                  pointerEvents: 'none',
                }} />
              )}

            </div>
          )}

          {/* Phosphor afterglow — blue dot lingers after screen dies */}
          {phase === 'afterglow' && (
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: '300px', height: '300px',
              marginTop: '-150px', marginLeft: '-150px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(160,196,255,0.7) 0%, rgba(160,196,255,0.2) 30%, transparent 60%)',
              animation: 'crt-afterglow 0.45s ease-out forwards',
              pointerEvents: 'none',
            }} />
          )}
        </div>,
        document.body
      )}
    </>
  );
}
