import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { mulberry32 } from './utils';

export function createDecoElements(
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
