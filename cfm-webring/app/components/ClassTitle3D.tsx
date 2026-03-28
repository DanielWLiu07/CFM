'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text3D, Edges } from '@react-three/drei';
import * as THREE from 'three';

export interface ClassTitle3DConfig {
  size: number;
  depth: number;
  tiltX: number;
  tiltY: number;
  edgeWidth: number;
  fov: number;
  dpr: number;
  frontLight: number;
  topLight: number;
  ambient: number;
  titleGap: number;
  bgScale: number;
  bgOpacity: number;
  bgY: number;
  titleY: number;
  searchY: number;
}

export const DEFAULT_CONFIG: ClassTitle3DConfig = {
  size: 6.5,
  depth: 4.0,
  tiltX: -0.25,
  tiltY: 0,
  edgeWidth: 8,
  fov: 42,
  dpr: 0.5,
  frontLight: 7.0,
  topLight: 2.5,
  ambient: 0.15,
  titleGap: -130,
  bgScale: 90,
  bgOpacity: 1.0,
  bgY: 135,
  titleY: 0,
  searchY: 0,
};

function AutoCamera({ textWidth }: { textWidth: number }) {
  const { camera, size } = useThree();
  const prevW = useRef(0);
  const prevH = useRef(0);

  useFrame(() => {
    // Only update when size changes
    if (size.width === prevW.current && size.height === prevH.current) return;
    prevW.current = size.width;
    prevH.current = size.height;
    const cam = camera as THREE.OrthographicCamera;
    const aspect = size.width / size.height;
    const halfW = (textWidth / 2) * 1.45;
    const halfH = halfW / aspect;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.position.set(0, 0, 100);
    cam.updateProjectionMatrix();
    cam.lookAt(0, 0, 0);
  });

  return null;
}

// Character width lookup for the arcade classic font
const CHAR_WIDTH: Record<string, number> = {
  C: 764, L: 460, A: 764, S: 764, O: 764, F: 500, T: 480, M: 764,
  '0': 764, '1': 460, '2': 764, '3': 764, '4': 764,
  '5': 764, '6': 764, '7': 764, '8': 764, '9': 764,
  ' ': 178,
};

// Single component that manages ALL letters in one useFrame
function AllLetters({ year, config, twoLine, beatRef }: { year: string; config: ClassTitle3DConfig; twoLine: boolean; beatRef?: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const letterRefs = useRef<THREE.Group[]>([]);
  // No internal animation — CSS wrapper handles fade transitions
  const displayYear = year;

  // Simple bright white — MeshStandardMaterial is MUCH cheaper than Physical
  const frontMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 0.6,
    metalness: 0.1,
    roughness: 0.1,
  }), []);

  const sideMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#6688aa',
    emissive: '#1a2a3a',
    emissiveIntensity: 0.2,
    metalness: 0.5,
    roughness: 0.2,
  }), []);

  const materials = useMemo(() => [frontMat, sideMat], [frontMat, sideMat]);

  const layoutLines = useMemo(() => {
    const yearLabel = displayYear;
    const lines = twoLine
      ? ['CLASS', `OF ${yearLabel}`]
      : [`CLASS OF ${yearLabel}`];

    return lines.map((line, lineIdx) => {
      const chars = line.split('');
      const spacing = 0.06;
      let totalWidth = 0;
      const charData = chars.map((ch) => {
        const w = ((CHAR_WIDTH[ch] || 764) / 1000) * config.size;
        const entry = { char: ch, width: w, x: totalWidth };
        totalWidth += w + spacing * config.size;
        return entry;
      });
      totalWidth -= spacing * config.size;
      const halfW = totalWidth / 2;
      const lineGap = config.size * 1.3;
      const yOff = twoLine ? (lineIdx === 0 ? lineGap / 2 : -lineGap / 2) : 0;
      return charData.map((d, i) => ({
        char: d.char,
        x: d.x - halfW,
        y: yOff,
        normalizedPos: chars.length > 1 ? (i / (chars.length - 1)) * 2 - 1 : 0,
        index: lineIdx * 20 + i,
      }));
    }).flat();
  }, [twoLine, displayYear, config.size]);

  // Store ref callback
  const setRef = useCallback((el: THREE.Group | null, idx: number) => {
    if (el) letterRefs.current[idx] = el;
  }, []);

  const beatLocal = useRef(0);
  const prevBeat = useRef(0);

  // Single useFrame for ALL letters
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Read beat from ref and decay locally
    if (beatRef?.current && beatRef.current > prevBeat.current + 0.5) {
      beatLocal.current = 1;
    }
    prevBeat.current = beatRef?.current ?? 0;
    beatLocal.current *= 0.9;
    const beat = beatLocal.current;

    for (let i = 0; i < layoutLines.length; i++) {
      const ref = letterRefs.current[i];
      if (!ref) continue;
      const d = layoutLines[i];
      const seed = d.index * 137.5;
      const np = d.normalizedPos;

      const splayY = np * 0.35;
      const splayX = Math.abs(np) * 0.08;
      const zBase = -Math.abs(np) * 1.8;

      // 8-bit style: quantize to steps for pixel-snappy feel
      const stepSize = 0.15;
      const rawFloat = Math.sin(t * (0.5 + (d.index % 4) * 0.08) + seed) * 0.1;
      const quantFloat = Math.round(rawFloat / stepSize) * stepSize;

      // Beat pulse — scale bump + upward push, staggered per letter
      const beatDelay = Math.sin(seed * 0.2) * 0.15;
      const b = Math.max(0, beat - beatDelay);
      const beatScale = 1 + b * 0.06;
      const beatY = b * 0.4;

      ref.position.x = d.x;
      ref.position.y = d.y + quantFloat + beatY;
      ref.position.z = zBase;

      ref.rotation.x = splayX;
      ref.rotation.y = splayY;

      ref.scale.setScalar(beatScale);
    }
  });

  return (
    <group ref={groupRef} rotation={[config.tiltX, config.tiltY, 0]}>
      {layoutLines.map((d, i) => (
        d.char === ' ' ? null : (
          <group
            key={`${i}-${d.char}`}
            ref={(el) => setRef(el, i)}
            position={[d.x, d.y, -Math.abs(d.normalizedPos) * 1.8]}
            rotation={[Math.abs(d.normalizedPos) * 0.08, d.normalizedPos * 0.35, 0]}
          >
            <Text3D
              font="/fonts/arcadeclassic.typeface.json"
              size={config.size}
              height={config.depth}
              letterSpacing={0}
              curveSegments={1}
              bevelEnabled={false}
              material={materials}
            >
              {d.char}
              <Edges threshold={1} color="#000000" lineWidth={config.edgeWidth} />
            </Text3D>
          </group>
        )
      ))}
    </group>
  );
}

interface ClassTitle3DProps {
  year?: string;
  config?: ClassTitle3DConfig;
  beatRef?: React.RefObject<number>;
}

export default function ClassTitle3D({ year = '26', config = DEFAULT_CONFIG, beatRef }: ClassTitle3DProps) {
  const [screenW, setScreenW] = useState(1200);
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [displayedYear, setDisplayedYear] = useState(year);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => setScreenW(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // When year prop changes, fade out canvas → swap text → fade in canvas
  // Target the canvas div (child), NOT the wrapper (which has CSS animations that override opacity)
  useEffect(() => {
    if (year === displayedYear) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const wrap = wrapRef.current;
    const canvas = wrap?.querySelector('div') as HTMLElement | null;
    if (!canvas) { setDisplayedYear(year); return; }

    // Fade out
    canvas.style.transition = 'opacity 0.25s steps(6)';
    requestAnimationFrame(() => {
      canvas.style.opacity = '0';

      // After fade out, swap text and fade in
      timeoutRef.current = setTimeout(() => {
        setDisplayedYear(year);
        canvas.style.transition = 'opacity 0.3s steps(6)';

        requestAnimationFrame(() => {
          canvas.style.opacity = '1';

          timeoutRef.current = setTimeout(() => {
            canvas.style.transition = '';
          }, 350);
        });
      }, 280);
    });

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [year, displayedYear]);

  const isMobile = screenW < 640;

  const charCount = isMobile ? 5 : 9;
  const spaceCount = isMobile ? 0 : 2;
  const textWidth = ((charCount * 764 + spaceCount * 178) / 1000 + (charCount + spaceCount - 1) * 0.06) * config.size;

  const containerHeight = isMobile ? 'clamp(180px, 50vw, 300px)' : 'clamp(160px, 24vw, 300px)';

  return (
    <div
      ref={wrapRef}
      className="class-title-3d-wrap"
      style={{
        width: '100%',
        height: containerHeight,
        position: 'relative',
        zIndex: 70,
        pointerEvents: 'none',
        imageRendering: 'pixelated',
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 100], zoom: 1 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        style={{
          background: 'transparent',
          imageRendering: 'pixelated',
        }}
        className="class-title-canvas"
        dpr={config.dpr}
        frameloop={visible ? 'always' : 'demand'}
      >
        <AutoCamera textWidth={textWidth} />
        <ambientLight intensity={config.ambient} />
        <directionalLight position={[0, 0, 10]} intensity={config.frontLight} />
        <directionalLight position={[0, 14, 2]} intensity={config.topLight} />
        <directionalLight position={[-12, 4, 6]} intensity={0.6} color="#4488ff" />
        <directionalLight position={[12, -2, 6]} intensity={0.4} color="#ffaa44" />
        <directionalLight position={[0, 2, -10]} intensity={0.3} color="#7766ff" />
        <AllLetters year={displayedYear} config={config} twoLine={isMobile} beatRef={beatRef} />
      </Canvas>
    </div>
  );
}
