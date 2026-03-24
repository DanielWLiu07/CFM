'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

interface ClassMember {
  name: string;
  url: string;
  role: string;
  blurb: string;
  school: string;
  term: string;
  avatar?: string;
}

interface ClassCards3DProps {
  members: ClassMember[];
}

const ASPECT = 1511 / 716; // person_tv.png aspect ratio
const COL_GAP = 30;
const ROW_GAP = 30;
const COLS = 3;
const TILT_DEG = 5; // rotateY for side columns

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase();
}

function createCardElement(member: ClassMember, cardW: number, cardH: number): HTMLElement {
  const a = document.createElement('a');
  a.href = member.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.style.cssText = `
    display: flex; align-items: center; gap: 16px;
    width: ${cardW}px; height: ${cardH}px; padding: 20px; box-sizing: border-box;
    background-image: url(/images/person_tv.png);
    background-size: 100% 100%; background-position: center; background-repeat: no-repeat;
    text-decoration: none; cursor: pointer;
    transition: box-shadow 0.2s ease;
    position: relative; overflow: hidden;
  `;
  a.addEventListener('mouseenter', () => {
    a.style.boxShadow = '0 0 30px rgba(255,255,255,0.1)';
  });
  a.addEventListener('mouseleave', () => {
    a.style.boxShadow = 'none';
  });

  // Scanline overlay
  const scanline = document.createElement('div');
  scanline.style.cssText = `
    position: absolute; inset: 0; pointer-events: none;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px);
  `;
  a.appendChild(scanline);

  // Left side — full-height avatar image
  const imgSide = document.createElement('div');
  const imgW = Math.floor(cardH * 0.85);
  imgSide.style.cssText = `
    width: ${imgW}px; height: ${Math.floor(cardH * 0.85)}px; flex-shrink: 0;
    background: #111; border: 2px solid #333; border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  `;
  if (member.avatar) {
    const img = document.createElement('img');
    img.src = member.avatar;
    img.alt = member.name;
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
    imgSide.appendChild(img);
  } else {
    const initials = document.createElement('span');
    initials.textContent = getInitials(member.name);
    initials.style.cssText = `font-family: var(--font-arcade); font-size: 14px; color: #444; letter-spacing: 0.05em;`;
    imgSide.appendChild(initials);
  }
  a.appendChild(imgSide);

  // Right side — name, term, blurb
  const info = document.createElement('div');
  info.style.cssText = 'flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 4px;';

  const nameEl = document.createElement('div');
  nameEl.textContent = member.name;
  nameEl.style.cssText = `font-family: var(--font-arcade); font-size: 13px; letter-spacing: 0.06em; color: #fff;`;
  info.appendChild(nameEl);

  const termEl = document.createElement('div');
  termEl.textContent = member.term;
  termEl.style.cssText = `font-family: var(--font-arcade); font-size: 9px; color: #555; letter-spacing: 0.08em;`;
  info.appendChild(termEl);

  const roleEl = document.createElement('div');
  roleEl.textContent = member.role;
  roleEl.style.cssText = `font-family: monospace; font-size: 11px; color: #555; margin-top: 2px;`;
  info.appendChild(roleEl);

  const blurbEl = document.createElement('div');
  blurbEl.textContent = member.blurb;
  blurbEl.style.cssText = `font-family: monospace; font-size: 10px; color: #444; margin-top: 6px; line-height: 1.4;`;
  info.appendChild(blurbEl);

  a.appendChild(info);
  return a;
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

  // Setup scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Prevent double-init in strict mode
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

    // Animation loop
    const animate = () => {
      const time = Date.now() * 0.001;
      objectsRef.current.forEach((obj, i) => {
        const baseY = baseYRef.current[i] ?? 0;
        obj.position.y = baseY + Math.sin(time * 1.5 + i * 0.7) * 8;
      });
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

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

  // Layout cards when members or container width change
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const container = containerRef.current;
    if (!scene || !camera || !renderer || !container) return;

    // Clear old objects
    objectsRef.current.forEach(obj => {
      scene.remove(obj);
      if (obj.element.parentNode) obj.element.parentNode.removeChild(obj.element);
    });
    objectsRef.current = [];
    baseYRef.current = [];

    const containerW = containerWidth || container.clientWidth;

    if (members.length === 0) {
      renderer.setSize(containerW, 0);
      return;
    }

    // Responsive columns: 3 on wide, 2 on medium, 1 on narrow
    const responsiveCols = containerW >= 900 ? COLS : containerW >= 550 ? 2 : 1;
    const cols = Math.min(responsiveCols, members.length);
    const rows = Math.ceil(members.length / cols);

    const fillPct = cols === 1 ? 0.85 : 0.95;
    const cardW = Math.floor((containerW * fillPct - (cols - 1) * COL_GAP) / cols);
    const cardH = Math.floor(cardW / ASPECT);
    const gridH = rows * cardH + (rows - 1) * ROW_GAP;
    // Extra padding for bobbing animation (±8px) and tilt overshoot
    const PAD = 40;
    const totalH = gridH + PAD * 2;

    // Size renderer to match
    renderer.setSize(containerW, totalH);
    camera.aspect = containerW / totalH;
    camera.updateProjectionMatrix();

    // Position camera so that the grid fits with padding
    const fovRad = THREE.MathUtils.degToRad(camera.fov / 2);
    camera.position.z = (totalH / 2) / Math.tan(fovRad);
    camera.updateProjectionMatrix();

    // Update container height
    container.style.height = `${totalH}px`;

    members.forEach((member, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const el = createCardElement(member, cardW, cardH);
      const obj = new CSS3DObject(el);

      // Position: center the grid at origin
      const x = (col - (cols - 1) / 2) * (cardW + COL_GAP);
      const y = -((row - (rows - 1) / 2) * (cardH + ROW_GAP));

      // Middle column pushed back in z for depth
      const isMiddle = cols >= 3 && col > 0 && col < cols - 1;
      const z = isMiddle ? -20 : 0;

      obj.position.set(x, y, z);
      baseYRef.current.push(y);

      // Tilt columns toward center
      if (cols >= 2) {
        if (col === 0) obj.rotation.y = THREE.MathUtils.degToRad(TILT_DEG);
        if (col === cols - 1) obj.rotation.y = THREE.MathUtils.degToRad(-TILT_DEG);
      }

      scene.add(obj);
      objectsRef.current.push(obj);
    });
  }, [members, containerWidth]);

  // Resize handler — track width to trigger full re-layout
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onResize = () => {
      setContainerWidth(container.clientWidth);
    };
    // Set initial width
    setContainerWidth(container.clientWidth);

    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: members.length > 0 ? 600 : 0, // will be set dynamically by layout effect
        zIndex: 100,
      }}
    />
  );
}
