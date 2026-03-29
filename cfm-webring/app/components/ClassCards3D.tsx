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
  hobbies?: string[];
  experiences?: string[];
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

// ── Seeded PRNG (mulberry32) for deterministic deco placement ──
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createDecoElements(
  containerW: number,
  totalH: number,
  cols: number,
): CSS3DObject[] {
  const objects: CSS3DObject[] = [];
  const halfW = containerW / 2;
  const halfH = totalH / 2;
  const isMobile = cols === 1;
  const rng = mulberry32(containerW * 1000 + totalH);

  function pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }
  function range(min: number, max: number) { return min + rng() * (max - min); }

  function addDeco(el: HTMLElement, x: number, y: number, z: number, rotY = 0, rotZ = 0) {
    el.style.pointerEvents = 'none';
    const obj = new CSS3DObject(el);
    obj.position.set(x, y, z);
    if (rotY) obj.rotation.y = THREE.MathUtils.degToRad(rotY);
    if (rotZ) obj.rotation.z = THREE.MathUtils.degToRad(rotZ);
    objects.push(obj);
  }

  // ── 1. Grid backdrop ──
  for (let i = 0; i < 2; i++) {
    const el = document.createElement('div');
    const spacing = i === 0 ? 60 : 35;
    const z = i === 0 ? -520 : -380;
    const alpha = i === 0 ? 0.035 : 0.025;
    const scale = 3.5 - i * 0.5;
    el.style.cssText = `
      width: ${containerW * scale}px; height: ${totalH * scale}px;
      background:
        repeating-linear-gradient(0deg, transparent, transparent ${spacing - 1}px, rgba(68,170,255,${alpha}) ${spacing - 1}px, rgba(68,170,255,${alpha}) ${spacing}px),
        repeating-linear-gradient(90deg, transparent, transparent ${spacing - 1}px, rgba(68,170,255,${alpha}) ${spacing - 1}px, rgba(68,170,255,${alpha}) ${spacing}px);
    `;
    addDeco(el, 0, 0, z);
  }

  // Spread factor — push decorations far beyond the card grid
  const spreadX = 2.2;
  const spreadY = 1.8;

  // ── 2. Pixel dots ──
  const dotCount = isMobile ? 15 : 28;
  const dotColors = ['#fff', '#4af', '#36c', '#26a', '#5bf'];
  for (let i = 0; i < dotCount; i++) {
    const size = Math.round(range(2, 6));
    const el = document.createElement('div');
    const color = pick(dotColors);
    const round = rng() > 0.5;
    const opacity = range(0.15, 0.5);
    const dur = range(3, 7);
    const delay = range(0, 8);
    el.style.cssText = `
      width: ${size}px; height: ${size}px;
      background: ${color};
      ${round ? 'border-radius: 50%;' : ''}
      --deco-opacity: ${opacity};
      animation: deco-pulse ${dur}s ease-in-out ${delay}s infinite;
      ${rng() > 0.6 ? `box-shadow: 0 0 ${size * 2}px ${color};` : ''}
    `;
    const x = range(-halfW * spreadX, halfW * spreadX);
    const y = range(-halfH * spreadY, halfH * spreadY);
    const z = range(-500, -50);
    addDeco(el, x, y, z);
  }

  // ── 3. Wireframe shapes ──
  const shapeCount = isMobile ? 6 : 10;
  const shapeTypes = ['square', 'circle', 'diamond'] as const;
  for (let i = 0; i < shapeCount; i++) {
    const type = pick([...shapeTypes]);
    const size = Math.round(range(25, 75));
    const el = document.createElement('div');
    const alpha = range(0.08, 0.2);
    const dur = range(20, 55);
    const delay = range(0, 10);
    const color = pick(['rgba(68,170,255,' + alpha + ')', 'rgba(255,255,255,' + alpha + ')']);
    el.style.cssText = `
      width: ${size}px; height: ${size}px;
      border: 1px solid ${color};
      background: transparent;
      ${type === 'circle' ? 'border-radius: 50%;' : ''}
      ${type === 'diamond' ? 'transform: rotate(45deg);' : ''}
      animation: ${type === 'diamond' ? 'deco-float' : 'deco-rotate'} ${dur}s ${type === 'diamond' ? 'ease-in-out' : 'linear'} ${delay}s infinite;
      --float-distance: ${range(-15, -5)}px;
    `;
    const x = range(-halfW * spreadX, halfW * spreadX);
    const y = range(-halfH * spreadY, halfH * spreadY);
    const z = range(-350, -60);
    addDeco(el, x, y, z);
  }

  // ── 4. Data/code fragments ──
  const fragments = ['0x4F2A', '>>_', '10110', 'SYS.OK', 'CFM://', 'MEM.64K', 'LOAD *', 'RUN >', '00FF', 'ACK', '0xDEAD', 'NOP', 'PING', 'EOF'];
  const fragCount = isMobile ? 6 : 10;
  for (let i = 0; i < fragCount; i++) {
    const el = document.createElement('div');
    const opacity = range(0.06, 0.18);
    const dur = range(6, 14);
    const delay = range(0, 8);
    const fontSize = range(8, 12);
    const color = pick(['#4af', '#fff', '#6cf']);
    el.textContent = pick(fragments);
    el.style.cssText = `
      font-family: var(--font-arcade); font-size: ${fontSize}px;
      color: ${color}; letter-spacing: 0.1em; white-space: nowrap;
      --deco-opacity: ${opacity};
      animation: deco-flicker ${dur}s steps(1) ${delay}s infinite;
    `;
    const x = range(-halfW * spreadX, halfW * spreadX);
    const y = range(-halfH * spreadY, halfH * spreadY);
    const z = range(-350, -80);
    addDeco(el, x, y, z);
  }

  // ── 5. Floating scan lines ──
  const lineCount = isMobile ? 3 : 5;
  for (let i = 0; i < lineCount; i++) {
    const el = document.createElement('div');
    const height = pick([1, 1, 2]);
    const alpha = range(0.03, 0.07);
    const color = pick([`rgba(68,170,255,${alpha})`, `rgba(255,255,255,${alpha})`]);
    const dur = range(15, 30);
    const drift = range(40, 80);
    el.style.cssText = `
      width: ${containerW * 2.5}px; height: ${height}px;
      background: ${color};
      --drift-distance: ${drift}px;
      animation: deco-drift-y ${dur}s linear ${range(0, 10)}s infinite alternate;
    `;
    const y = range(-halfH * spreadY, halfH * spreadY);
    const z = range(-150, -40);
    addDeco(el, 0, y, z);
  }

  // ── 6. Glowing orbs ──
  const orbCount = isMobile ? 2 : 4;
  for (let i = 0; i < orbCount; i++) {
    const size = Math.round(range(60, 130));
    const el = document.createElement('div');
    const opacity = range(0.04, 0.1);
    const dur = range(5, 12);
    el.style.cssText = `
      width: ${size}px; height: ${size}px; border-radius: 50%;
      background: radial-gradient(circle, rgba(68,170,255,0.15) 0%, rgba(68,170,255,0.04) 40%, transparent 70%);
      --deco-opacity: ${opacity};
      animation: deco-glow ${dur}s ease-in-out ${range(0, 6)}s infinite;
    `;
    const x = range(-halfW * spreadX, halfW * spreadX);
    const y = range(-halfH * spreadY, halfH * spreadY);
    const z = range(-500, -200);
    addDeco(el, x, y, z);
  }

  // ── 7. Cross/plus markers ──
  const crossCount = isMobile ? 4 : 7;
  for (let i = 0; i < crossCount; i++) {
    const size = Math.round(range(14, 28));
    const el = document.createElement('div');
    const alpha = range(0.1, 0.25);
    const color = `rgba(255,255,255,${alpha})`;
    el.style.cssText = `
      width: ${size}px; height: ${size}px; position: relative;
      --deco-opacity: ${alpha};
      animation: deco-pulse ${range(4, 8)}s ease-in-out ${range(0, 5)}s infinite;
    `;
    const hBar = document.createElement('div');
    hBar.style.cssText = `position:absolute; top:50%; left:0; width:100%; height:1px; background:${color}; transform:translateY(-50%);`;
    const vBar = document.createElement('div');
    vBar.style.cssText = `position:absolute; top:0; left:50%; width:1px; height:100%; background:${color}; transform:translateX(-50%);`;
    el.appendChild(hBar);
    el.appendChild(vBar);
    const x = range(-halfW * spreadX, halfW * spreadX);
    const y = range(-halfH * spreadY, halfH * spreadY);
    const z = range(-300, -50);
    addDeco(el, x, y, z);
  }

  // ── 8. Connection lines ──
  const connCount = isMobile ? 3 : 5;
  for (let i = 0; i < connCount; i++) {
    const el = document.createElement('div');
    const height = Math.round(range(100, 300));
    const alpha = range(0.04, 0.1);
    el.style.cssText = `
      width: 1px; height: ${height}px;
      background: linear-gradient(to bottom, transparent 0%, rgba(68,170,255,${alpha}) 20%, rgba(68,170,255,${alpha}) 80%, transparent 100%);
      --deco-opacity: ${alpha};
      animation: deco-pulse ${range(6, 14)}s ease-in-out ${range(0, 8)}s infinite;
    `;
    const x = range(-halfW * spreadX, halfW * spreadX);
    const y = range(-halfH * spreadY, halfH * spreadY);
    const z = range(-350, -100);
    const rotZ = range(0, 180);
    addDeco(el, x, y, z, 0, rotZ);
  }

  return objects;
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

  const fontScale = Math.min(1, cardW / 450);
  const nameFontSize = Math.max(14, Math.round(24 * fontScale));
  const termFontSize = Math.max(10, Math.round(16 * fontScale));

  const nameEl = document.createElement('div');
  nameEl.textContent = member.name;
  nameEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${nameFontSize}px; letter-spacing: 0.12em;
    color: #fff;
    text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  `;
  nameBar.appendChild(nameEl);

  const termEl = document.createElement('div');
  termEl.textContent = "'" + member.year;
  termEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${termFontSize}px; letter-spacing: 0.1em;
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

  const roleFontSize = Math.max(9, Math.round(12 * fontScale));
  const locFontSize = Math.max(8, Math.round(11 * fontScale));

  const roleEl = document.createElement('div');
  roleEl.textContent = member.role;
  roleEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${roleFontSize}px; letter-spacing: 0.1em;
    color: #ddd; text-transform: uppercase;
    transition: color 0.3s ease;
  `;
  info.appendChild(roleEl);

  // Location + School
  const locEl = document.createElement('div');
  locEl.textContent = `${member.location}  //  ${member.school}`;
  locEl.style.cssText = `
    font-family: var(--font-arcade); font-size: ${locFontSize}px; letter-spacing: 0.06em;
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
  const decoRef = useRef<CSS3DObject[]>([]);
  const rafRef = useRef<number>(0);
  const baseYRef = useRef<number[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [expandedMember, setExpandedMember] = useState<ClassMember | null>(null);
  // CRT phases — on: dot → line → expand → done | off: flash → shrink → dotout → afterglow → idle
  const [phase, setPhase] = useState<'idle' | 'dot' | 'line' | 'expand' | 'done' | 'flash' | 'shrink' | 'dotout' | 'afterglow'>('idle');
  const [inkKey, setInkKey] = useState(0);
  const closeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Dev tuning — hobbies + experience
  const [hobbyLabelSize, setHobbyLabelSize] = useState(12);
  const [hobbyItemSize, setHobbyItemSize] = useState(13);
  const [hobbyPadV, setHobbyPadV] = useState(8);
  const [hobbyPadH, setHobbyPadH] = useState(18);
  const [expLabelSize, setExpLabelSize] = useState(12);
  const [expItemSize, setExpItemSize] = useState(14);
  const [expPadV, setExpPadV] = useState(10);
  const [expPadH, setExpPadH] = useState(16);

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
        });

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

      // Add background decorations
      const decos = createDecoElements(containerW, totalH, cols);
      decos.forEach(obj => {
        scene.add(obj);
        decoRef.current.push(obj);
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
        style={{ position: 'relative', width: '100%', height: members.length > 0 ? 600 : 0, zIndex: 100, overflow: 'visible' }}
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
                  : phase === 'done' ? '#000'
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

              {/* ── SCANLINES — visible on the CRT surface including close phases ── */}
              {(phase === 'expand' || phase === 'done' || phase === 'flash' || phase === 'shrink') && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 6,
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
                  pointerEvents: 'none',
                }} />
              )}

              {/* ── MEMBER CONTENT — left: avatar with ink reveal, right: staggered info ── */}
              {(phase === 'done' || phase === 'flash' || phase === 'shrink' || phase === 'dotout') && expandedMember && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 8,
                  display: 'flex', flexDirection: 'row',
                  opacity: (phase === 'done' || phase === 'flash') ? 1 : 0,
                  transition: phase === 'flash' ? 'opacity 0.25s ease 0.05s' : phase === 'shrink' ? 'opacity 0.2s ease' : 'opacity 0.35s ease',
                  pointerEvents: phase === 'done' ? 'auto' : 'none',
                }}>
                  {/* Left — avatar with ink noise reveal, transparent bg for PNG */}
                  <div style={{
                    width: '40%', height: '100%', flexShrink: 0,
                    overflow: 'hidden', position: 'relative',
                    ...(phase === 'done' ? {
                      animation: 'panel-in 0.8s ease 0.1s both',
                    } : (phase === 'flash' || phase === 'shrink') ? {
                      animation: 'panel-out 0.3s ease forwards',
                    } : {}),
                  }}>
                    {expandedMember.avatar ? (
                      <>
                        <svg
                          key={inkKey}
                          width="100%"
                          height="100%"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ position: 'absolute', inset: 0, display: 'block' }}
                        >
                          <defs>
                            <filter id="inkNoiseReveal" x="-20%" y="-20%" width="140%" height="140%">
                              <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
                              <feDisplacementMap in="SourceGraphic" in2="noise" scale="200" xChannelSelector="R" yChannelSelector="G">
                                <animate attributeName="scale" values="200;50" dur="3s" begin="0s" calcMode="spline" keySplines="0.2 0.8 0.3 1" fill="freeze" />
                              </feDisplacementMap>
                            </filter>
                            <mask id="inkMask">
                              <rect x="0" y="0" width="100%" height="100%" fill="black" />
                              <rect x="50%" y="50%" width="0%" height="0%" fill="white" filter="url(#inkNoiseReveal)">
                                <animate attributeName="x" values="50%;5%" dur="3s" begin="0s" calcMode="spline" keySplines="0.2 0.8 0.3 1" fill="freeze" />
                                <animate attributeName="y" values="50%;5%" dur="3s" begin="0s" calcMode="spline" keySplines="0.2 0.8 0.3 1" fill="freeze" />
                                <animate attributeName="width" values="0%;90%" dur="3s" begin="0s" calcMode="spline" keySplines="0.2 0.8 0.3 1" fill="freeze" />
                                <animate attributeName="height" values="0%;90%" dur="3s" begin="0s" calcMode="spline" keySplines="0.2 0.8 0.3 1" fill="freeze" />
                              </rect>
                            </mask>
                          </defs>
                          <image
                            href={expandedMember.avatar}
                            width="100%"
                            height="100%"
                            preserveAspectRatio="xMidYMid slice"
                            mask="url(#inkMask)"
                          />
                        </svg>
                        {/* CRT scanline overlay on image */}
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
                          pointerEvents: 'none',
                        }} />
                      </>
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#000',
                        fontFamily: 'var(--font-arcade)', fontSize: 64, color: '#333', letterSpacing: '0.1em',
                        animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both',
                      }}>
                        {expandedMember.name.split(' ').map(w => w[0]).join('')}
                      </div>
                    )}
                  </div>

                  {/* Right — name top, socials bottom, middle scrolls */}
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', background: 'rgba(255,255,255,0.85)', position: 'relative',
                    ...(phase === 'done' ? {
                      animation: 'panel-in 1.2s ease 0.2s both',
                    } : (phase === 'flash' || phase === 'shrink') ? {
                      animation: 'panel-out 0.3s ease forwards',
                    } : {}),
                  }}>
                    {/* Header — name + role + location pinned to top */}
                    <div style={{
                      padding: '20px 56px 10px', flexShrink: 0,
                      display: 'flex', flexDirection: 'column', gap: 4,
                      borderBottom: '2px solid #000',
                      animation: 'fade-in 0.4s cubic-bezier(0.16,1,0.3,1) 0.12s both',
                    }}>
                      <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both' }}>
                        <h2 style={{
                          fontFamily: 'var(--font-arcade)', fontSize: 80,
                          color: '#fff', letterSpacing: '0.01em', margin: 0,
                          WebkitTextStroke: '2.5px #000',
                          paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
                          textShadow: '3px 3px 0 #000, 4px 4px 0 #000, 5px 5px 0 rgba(0,0,0,0.4), 6px 6px 0 rgba(0,0,0,0.2)',
                        }}>
                          {expandedMember.name}
                        </h2>
                      </div>
                      <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.22s both', marginTop: -43 }}>
                        <p style={{
                          fontFamily: 'var(--font-arcade)', fontSize: 32, color: '#000',
                          letterSpacing: '0.12em', margin: 0, textTransform: 'uppercase',
                        }}>
                          {expandedMember.role}
                        </p>
                      </div>
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 2,
                        animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.29s both',
                        marginTop: -13,
                      }}>
                        <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 16, color: '#777', letterSpacing: '0.08em', margin: 0 }}>
                          {expandedMember.location}  //  {expandedMember.school}
                        </p>
                        <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 16, color: '#777', letterSpacing: '0.08em', margin: 0 }}>
                          CLASS OF &apos;{expandedMember.year}
                        </p>
                      </div>
                    </div>

                    {/* Scrollable middle content */}
                    <div
                      style={{
                        flex: 1, overflowY: 'auto', padding: '28px 56px 32px',
                        display: 'flex', flexDirection: 'column', gap: 28,
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Blurb */}
                      <p style={{
                        fontFamily: 'monospace', fontSize: 18, color: '#000',
                        lineHeight: 1.9, margin: 0, fontStyle: 'italic',
                        animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.36s both',
                      }}>
                        &ldquo;{expandedMember.blurb}&rdquo;
                      </p>

                      {/* Dev controls — hobbies + experience */}
                      <div onClick={e => e.stopPropagation()} style={{
                        position: 'fixed', top: 10, left: 10, zIndex: 999999,
                        background: 'rgba(0,0,0,0.92)', color: '#fff', padding: '12px 16px',
                        borderRadius: 8, width: 280, fontFamily: 'system-ui', fontSize: 11,
                        display: 'flex', flexDirection: 'column', gap: 5,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong>Hobby + Exp Controls</strong>
                          <button onClick={() => {
                            const out = JSON.stringify({ hobbyLabelSize, hobbyItemSize, hobbyPadV, hobbyPadH, expLabelSize, expItemSize, expPadV, expPadH }, null, 2);
                            navigator.clipboard.writeText(out); alert(out);
                          }} style={{ background: '#333', color: '#fff', border: 'none', padding: '3px 8px', cursor: 'pointer', fontSize: 10, borderRadius: 4 }}>Copy</button>
                        </div>
                        {[
                          ['Hobby Label', hobbyLabelSize, setHobbyLabelSize, 4, 30],
                          ['Hobby Item', hobbyItemSize, setHobbyItemSize, 4, 30],
                          ['Hobby Pad V', hobbyPadV, setHobbyPadV, 0, 30],
                          ['Hobby Pad H', hobbyPadH, setHobbyPadH, 0, 40],
                          ['Exp Label', expLabelSize, setExpLabelSize, 4, 30],
                          ['Exp Item', expItemSize, setExpItemSize, 4, 30],
                          ['Exp Pad V', expPadV, setExpPadV, 0, 30],
                          ['Exp Pad H', expPadH, setExpPadH, 0, 40],
                        ].map(([label, val, setter, min, max]) => (
                          <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <label style={{ width: 80, flexShrink: 0 }}>{label as string}</label>
                            <input type="range" min={min as number} max={max as number} step={1}
                              value={val as number}
                              onChange={e => (setter as React.Dispatch<React.SetStateAction<number>>)(parseInt(e.target.value))}
                              style={{ flex: 1, height: 14 }}
                            />
                            <span style={{ width: 30, textAlign: 'right', fontFamily: 'monospace' }}>{val as number}</span>
                          </div>
                        ))}
                      </div>

                      {/* Hobbies */}
                      {expandedMember.hobbies && expandedMember.hobbies.length > 0 && (
                        <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.43s both', marginTop: 0 }}>
                          <p style={{ fontFamily: 'var(--font-arcade)', fontSize: hobbyLabelSize, color: '#888', letterSpacing: '0.18em', margin: '0 0 12px', textTransform: 'uppercase' }}>
                            HOBBIES
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {expandedMember.hobbies.map((h, i) => (
                              <span key={i} style={{
                                fontFamily: 'var(--font-arcade)', fontSize: hobbyItemSize, letterSpacing: '0.06em',
                                padding: `${hobbyPadV}px ${hobbyPadH}px`, background: '#fff', border: '2px solid #000', color: '#000',
                              }}>
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Experiences */}
                      {expandedMember.experiences && expandedMember.experiences.length > 0 && (
                        <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.5s both', marginTop: 0 }}>
                          <p style={{ fontFamily: 'var(--font-arcade)', fontSize: expLabelSize, color: '#888', letterSpacing: '0.18em', margin: '0 0 12px', textTransform: 'uppercase' }}>
                            EXPERIENCE
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {expandedMember.experiences.map((exp, i) => (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                background: '#fff', border: '2px solid #000', padding: `${expPadV}px ${expPadH}px`,
                              }}>
                                <span style={{ color: '#000', fontFamily: 'var(--font-arcade)', fontSize: expItemSize }}>&gt;</span>
                                <span style={{ fontFamily: 'var(--font-arcade)', fontSize: expItemSize, color: '#000' }}>{exp}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Socials + Visit — pinned to bottom */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '24px 56px', borderTop: '2px solid #000',
                      flexShrink: 0,
                      animation: 'content-fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.55s both',
                    }}>
                      {expandedMember.socials?.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                          style={{
                            color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 40, height: 40, border: '2px solid #000', background: 'transparent',
                            textDecoration: 'none', transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; }}
                          onClick={e => e.stopPropagation()}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: (SOCIAL_ICONS[s.type] || '').replace(/width="12" height="12"/g, 'width="18" height="18"') }} />
                        </a>
                      ))}
                      {expandedMember.url && expandedMember.url !== '#' && (
                        <a href={expandedMember.url} target="_blank" rel="noopener noreferrer"
                          style={{
                            fontFamily: 'var(--font-arcade)', fontSize: 13, letterSpacing: '0.15em',
                            color: '#000', border: '2px solid #000', padding: '10px 24px',
                            background: 'transparent', textDecoration: 'none', transition: 'all 0.15s ease', marginLeft: 'auto',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; }}
                          onClick={e => e.stopPropagation()}
                        >
                          VISIT →
                        </a>
                      )}
                    </div>

                    {/* CRT scanlines + vignette on right panel */}
                    <div style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20,
                      background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.015) 3px, rgba(0,0,0,0.015) 4px)',
                    }} />
                    <div style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 21,
                      background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.08) 100%)',
                    }} />
                  </div>
                </div>
              )}

              {/* ── WHITE FLASH on close — CRT brightness spike ── */}
              {phase === 'flash' && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  background: '#fff',
                  opacity: 0.8,
                  animation: 'crt-flicker 0.07s steps(1) 1',
                  pointerEvents: 'none',
                }} />
              )}

              {/* ── TV BACKGROUND — faded person_tv + glitch effects (visible during done + close phases) ── */}
              {(phase === 'expand' || phase === 'done' || phase === 'flash' || phase === 'shrink') && (
                <>
                  {/* Faded TV background — fades in with stepped animation + color bleed loop */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/person_tv.webp"
                    alt=""
                    style={{
                      position: 'absolute', inset: 0, zIndex: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      imageRendering: 'pixelated' as React.CSSProperties['imageRendering'],
                      pointerEvents: 'none',
                      ...((phase === 'expand' || phase === 'done') ? {
                        animation: 'tv-warmup 0.8s cubic-bezier(0.16,1,0.3,1) forwards, tv-color-bleed 6s ease-in-out infinite 0.8s',
                      } : {
                        animation: 'tv-warmdown 0.3s ease forwards',
                      }),
                    }}
                  />

                  {/* Horizontal glitch tears — looping intermittent tears over the bg */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/person_tv.webp"
                    alt=""
                    style={{
                      position: 'absolute', inset: 0, zIndex: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      opacity: 0.05,
                      filter: 'grayscale(1) contrast(2) brightness(1.5)',
                      imageRendering: 'pixelated' as React.CSSProperties['imageRendering'],
                      pointerEvents: 'none',
                      animation: 'tv-glitch 3s steps(1) infinite',
                    }}
                  />

                  {/* Persistent TV static noise */}
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 1,
                    opacity: 0.035,
                    backgroundImage: `
                      repeating-conic-gradient(#aaa 0% 25%, transparent 0% 50%),
                      repeating-conic-gradient(#999 0% 25%, transparent 0% 50%)
                    `,
                    backgroundSize: '3px 3px, 5px 5px',
                    backgroundPosition: '0 0, 1px 1px',
                    animation: 'crt-noise 50ms steps(8) infinite',
                    pointerEvents: 'none',
                    mixBlendMode: 'overlay',
                  }} />

                  {/* Rolling interference band — slow loop */}
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 1,
                    overflow: 'hidden', pointerEvents: 'none',
                  }}>
                    <div style={{
                      width: '100%', height: '10vh',
                      background: 'linear-gradient(transparent 0%, rgba(255,255,255,0.02) 20%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 80%, transparent 100%)',
                      animation: 'tv-band-slow 5s linear infinite',
                    }} />
                  </div>

                </>
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
