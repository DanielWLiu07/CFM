'use client';

import { useRef, useMemo, createContext, useContext, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const BeatContext = createContext<RefObject<number>>({ current: 0 });

// ── Twinkling Stars (fewer, subtler) ─────────────────────────────────────────

function Stars({ count = 200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const [positions, randoms] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4 + Math.random() * 20;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      rnd[i] = Math.random();
    }
    return [pos, rnd];
  }, [count]);

  const shaderArgs = useMemo(() => ({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: `
      attribute float aRandom;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vTwinkle;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        float twinkle = sin(uTime * (0.8 + aRandom * 2.0) + aRandom * 62.83) * 0.5 + 0.5;
        vTwinkle = twinkle;
        gl_PointSize = (1.5 + aRandom * 3.0) * twinkle * uPixelRatio * (1.0 / -mvPos.z) * 8.0;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d) * (0.3 + vTwinkle * 0.5);
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.008;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.004) * 0.04;
    matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={matRef} args={[shaderArgs]} />
    </points>
  );
}

// ── Floating Dust ────────────────────────────────────────────────────────────

function FloatingDust({ count = 100 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const geo = ref.current.geometry;
    const posArr = geo.getAttribute('position').array as Float32Array;
    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 1] += 0.0015;
      posArr[i * 3] += Math.sin(clock.elapsedTime * 0.2 + i) * 0.0008;
      if (posArr[i * 3 + 1] > 7) posArr[i * 3 + 1] = -7;
    }
    geo.getAttribute('position').needsUpdate = true;
    ref.current.rotation.y = clock.elapsedTime * 0.003;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.01} sizeAttenuation transparent opacity={0.2} color="#ffffff" depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ── Concentric Rings ─────────────────────────────────────────────────────────

function ConcentricRings() {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const rings = useMemo(() => [
    { radius: 2.5, opacity: 0.05 },
    { radius: 4, opacity: 0.035 },
    { radius: 6, opacity: 0.02 },
    { radius: 8.5, opacity: 0.012 },
  ], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const beat = beatRef.current ?? 0;
    groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.08) * 0.06;
    groupRef.current.rotation.z = clock.elapsedTime * 0.015;
    groupRef.current.scale.setScalar(1 + beat * 0.06);
    groupRef.current.children.forEach((child) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (mat.userData.baseOpacity === undefined) mat.userData.baseOpacity = mat.opacity;
      mat.opacity = mat.userData.baseOpacity + beat * 0.03;
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, -3]}>
      {rings.map((ring, i) => (
        <mesh key={i}>
          <ringGeometry args={[ring.radius - 0.01, ring.radius + 0.01, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={ring.opacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ── Candlestick Charts (finance aesthetic) ───────────────────────────────────

function CandlestickChart({ position, rotation: rot, scale: s = 1, count = 12 }: { position: [number, number, number]; rotation?: [number, number, number]; scale?: number; count?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const candles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (i - count / 2) * 0.45,
      baseH: 0.4 + Math.random() * 1.5,
      speed: 0.15 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      bullish: Math.random() > 0.4,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.position.x = position[0] + Math.sin(t * 0.02 + position[2]) * 1.5;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.015 + position[0]) * 1.0;
    groupRef.current.position.z = position[2] + Math.cos(t * 0.012 + position[0]) * 0.8;

    let idx = 0;
    groupRef.current.children.forEach(child => {
      if (!(child as THREE.Mesh).isMesh) return;
      const c = candles[Math.floor(idx / 2)];
      if (!c) return;
      const h = c.baseH * (0.6 + 0.4 * Math.sin(t * c.speed + c.phase));
      child.scale.y = Math.max(0.1, h);
      child.position.y = h * 0.25 - 0.8;
      idx++;
    });
  });

  return (
    <group ref={groupRef} position={position} rotation={rot} scale={[s, s, s]}>
      {candles.map((c, i) => (
        <group key={i}>
          <mesh position={[c.x, 0, 0]}>
            <boxGeometry args={[0.2, 1, 0.01]} />
            <meshBasicMaterial color={c.bullish ? '#00e676' : '#ff5252'} transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh position={[c.x, 0, 0]}>
            <boxGeometry args={[0.03, 1.5, 0.01]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.03} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Line Chart (stock chart aesthetic) ───────────────────────────────────────

function LineChart({ position, rotation: rot, scale: s = 1 }: { position: [number, number, number]; rotation?: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Line>(null);

  const geo = useMemo(() => {
    const points: THREE.Vector3[] = [];
    let price = 1;
    for (let i = 0; i < 50; i++) {
      price += (Math.random() - 0.48) * 0.18;
      price = Math.max(0.1, price);
      points.push(new THREE.Vector3((i / 50) * 8 - 4, price - 1, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = position[0] + Math.sin(clock.elapsedTime * 0.018 + position[2]) * 1.5;
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.013 + position[0]) * 1.0;
    ref.current.position.z = position[2] + Math.cos(clock.elapsedTime * 0.01 + position[0]) * 0.8;
  });

  const line = useMemo(() => {
    return new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: '#00e676', transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
  }, [geo]);

  return (
    <group position={position} rotation={rot} scale={[s, s, s]}>
      <primitive ref={ref} object={line} />
    </group>
  );
}

// ── Bar Chart (vertical bars like a histogram) ──────────────────────────────

function BarChart({ position, rotation: rot, scale: s = 1, count = 14 }: { position: [number, number, number]; rotation?: [number, number, number]; scale?: number; count?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const bars = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (i - count / 2) * 0.35,
      baseH: 0.3 + Math.random() * 2,
      speed: 0.1 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
      green: Math.random() > 0.35,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.position.x = position[0] + Math.sin(t * 0.018 + position[0]) * 1.5;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.014 + position[2]) * 1.0;
    groupRef.current.position.z = position[2] + Math.cos(t * 0.011 + position[2]) * 0.8;

    let idx = 0;
    groupRef.current.children.forEach(child => {
      if (!(child as THREE.Mesh).isMesh) return;
      const b = bars[idx];
      if (!b) return;
      const h = b.baseH * (0.5 + 0.5 * Math.sin(t * b.speed + b.phase));
      child.scale.y = Math.max(0.05, h);
      child.position.y = h * 0.3 - 0.6;
      idx++;
    });
  });

  return (
    <group ref={groupRef} position={position} rotation={rot} scale={[s, s, s]}>
      {bars.map((b, i) => (
        <mesh key={i} position={[b.x, 0, 0]}>
          <boxGeometry args={[0.2, 1, 0.01]} />
          <meshBasicMaterial color={b.green ? '#00e676' : '#ff5252'} transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

// ── Floating Numbers (scrolling financial data) ─────────────────────────────

function FloatingNumbers({ count = 20 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const items = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    return Array.from({ length: count }, () => {
      const texts = ['$142.87', '+3.2%', '0x4F2A', 'BTC', 'ETH', '$89.41', '-1.7%', 'AAPL', 'SPY', '10Y:4.2%', 'VIX:18', 'P/E:24', 'ROI:12%', 'EPS:3.41', 'YTD:+8%'];
      const text = texts[Math.floor(Math.random() * texts.length)];
      const green = !text.startsWith('-');

      ctx.clearRect(0, 0, 128, 32);
      ctx.fillStyle = green ? '#00e676' : '#ff5252';
      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 16);

      const texture = new THREE.CanvasTexture(canvas.cloneNode(true) as HTMLCanvasElement);
      // Copy pixel data
      const clone = texture.image as HTMLCanvasElement;
      const cloneCtx = clone.getContext('2d')!;
      cloneCtx.clearRect(0, 0, 128, 32);
      cloneCtx.fillStyle = green ? '#00e676' : '#ff5252';
      cloneCtx.font = '18px monospace';
      cloneCtx.textAlign = 'center';
      cloneCtx.textBaseline = 'middle';
      cloneCtx.fillText(text, 64, 16);
      texture.needsUpdate = true;

      return {
        texture,
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 12,
          -4 - Math.random() * 14,
        ] as [number, number, number],
        speed: 0.05 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const beat = beatRef.current ?? 0;
    groupRef.current.children.forEach((child, i) => {
      const item = items[i];
      const mesh = child as THREE.Mesh;
      mesh.position.y = item.position[1] + Math.sin(clock.elapsedTime * item.speed + item.phase) * 0.5;
      mesh.rotation.y = Math.sin(clock.elapsedTime * 0.04 + item.phase) * 0.15;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.04 + beat * 0.02;
    });
  });

  return (
    <group ref={groupRef}>
      {items.map((item, i) => (
        <mesh key={i} position={item.position}>
          <planeGeometry args={[1.6, 0.4]} />
          <meshBasicMaterial map={item.texture} transparent opacity={0.04} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ── Ticker Tape (scrolling horizontal price lines) ──────────────────────────

function TickerTape({ count = 10 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const tapes = useMemo(() => {
    return Array.from({ length: count }, () => {
      const len = 2 + Math.random() * 5;
      const y = (Math.random() - 0.5) * 10;
      const z = -3 - Math.random() * 14;
      const speed = 0.15 + Math.random() * 0.35;
      const green = Math.random() > 0.4;
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(len, 0, 0)];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      return { geo, y, z, speed, green, startX: (Math.random() - 0.5) * 20 };
    });
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const beat = beatRef.current ?? 0;
    groupRef.current.children.forEach((child, i) => {
      const t = tapes[i];
      const mesh = child as THREE.Line;
      const offset = (clock.elapsedTime * t.speed) % 24 - 12;
      mesh.position.set(t.startX + offset, t.y, t.z);
      const mat = mesh.material as THREE.LineBasicMaterial;
      mat.opacity = 0.025 + beat * 0.015;
    });
  });

  return (
    <group ref={groupRef}>
      {tapes.map((t, i) => {
        const line = new THREE.Line(t.geo, new THREE.LineBasicMaterial({
          color: t.green ? '#00e676' : '#ff5252',
          transparent: true, opacity: 0.025, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        line.position.set(t.startX, t.y, t.z);
        return <primitive key={i} object={line} />;
      })}
    </group>
  );
}

// ── Grid Floor (trading floor grid) ─────────────────────────────────────────

function GridFloor() {
  const ref = useRef<THREE.GridHelper>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.005;
  });

  return (
    <group position={[0, -4, -6]} rotation={[0.2, 0, 0]}>
      <gridHelper ref={ref} args={[40, 40, '#333333', '#222222']}>
        <meshBasicMaterial attach="material" color="#ffffff" transparent opacity={0.02} depthWrite={false} />
      </gridHelper>
    </group>
  );
}

// ── Radial Glow ──────────────────────────────────────────────────────────────

function RadialGlow() {
  const ref = useRef<THREE.Mesh>(null);
  const beatRef = useContext(BeatContext);

  const shaderArgs = useMemo(() => ({
    uniforms: { uTime: { value: 0 }, uBeat: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uBeat;
      void main() {
        vec2 center = vec2(0.5, 0.5);
        center.x += sin(uTime * 0.12) * 0.04;
        center.y += cos(uTime * 0.1) * 0.03;
        float dist = distance(vUv, center);
        float glow = smoothstep(0.6, 0.0, dist) * (0.04 + uBeat * 0.03);
        float halo = smoothstep(0.9, 0.2, dist) * (0.015 + uBeat * 0.01);
        float alpha = glow + halo;
        vec3 warm = vec3(0.95, 0.92, 0.88);
        vec3 cool = vec3(0.82, 0.85, 1.0);
        vec3 color = mix(cool, warm, smoothstep(0.4, 0.0, dist));
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uBeat.value = beatRef.current ?? 0;
  });

  return (
    <mesh ref={ref} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial args={[shaderArgs]} />
    </mesh>
  );
}

// ── Camera Rig (mouse parallax) ──────────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });

  useFrame(({ pointer }) => {
    target.current.x = pointer.x * 0.4;
    target.current.y = pointer.y * 0.25;
    camera.position.x += (target.current.x - camera.position.x) * 0.01;
    camera.position.y += (target.current.y - camera.position.y) * 0.01;
    camera.lookAt(0, 0, -2);
  });

  return null;
}

// ── Main Export ──────────────────────────────────────────────────────────────

export default function ClassBackground({ beatRef, paused }: { beatRef?: RefObject<number>; paused?: boolean }) {
  const fallbackRef = useRef(0);
  const activeBeatRef = beatRef ?? fallbackRef;

  return (
    <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: 'none', transformStyle: 'flat' as const }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 65 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        dpr={[0.75, 1]}
        frameloop={paused ? 'demand' : 'always'}
      >
        <BeatContext.Provider value={activeBeatRef}>
          <fog attach="fog" args={['#000000', 12, 30]} />
          <RadialGlow />
          <Stars count={150} />
          <FloatingDust count={60} />
          <ConcentricRings />
          <GridFloor />

          {/* Finance: candlesticks — spread out, angled */}
          <CandlestickChart position={[-9, 3, -7]} rotation={[0.1, 0.25, -0.05]} scale={1.5} />
          <CandlestickChart position={[8, -3, -10]} rotation={[-0.1, -0.3, 0.08]} scale={1.3} />
          <CandlestickChart position={[3, 5, -14]} rotation={[0.15, 0.1, 0.1]} scale={1.0} />

          {/* Finance: line charts — angled */}
          <LineChart position={[-6, -2, -9]} rotation={[0.08, -0.2, 0.04]} scale={1.4} />
          <LineChart position={[6, 3, -12]} rotation={[-0.05, 0.25, -0.08]} scale={1.1} />

          {/* Finance: bar charts */}
          <BarChart position={[-4, 1, -10]} rotation={[0.05, 0.15, 0]} scale={1.2} />

          {/* Finance: floating numbers */}
          <FloatingNumbers count={12} />

          {/* Finance: ticker tape streams */}
          <TickerTape count={10} />
          <CameraRig />
        </BeatContext.Provider>
      </Canvas>
    </div>
  );
}
