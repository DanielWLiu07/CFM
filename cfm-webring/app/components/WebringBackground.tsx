'use client';

import { useRef, useMemo, createContext, useContext, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const BeatContext = createContext<RefObject<number>>({ current: 0 });

// ── Twinkling Star Field ────────────────────────────────────────────────────

function Stars({ count = 800 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const [positions, randoms] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 22;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      rnd[i] = Math.random();
    }
    return [pos, rnd];
  }, [count]);

  const shaderArgs = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
    },
    vertexShader: `
      attribute float aRandom;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vTwinkle;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        float twinkle = sin(uTime * (1.0 + aRandom * 3.0) + aRandom * 62.83) * 0.5 + 0.5;
        vTwinkle = twinkle;
        gl_PointSize = (2.0 + aRandom * 4.0) * twinkle * uPixelRatio * (1.0 / -mvPos.z) * 8.0;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d) * (0.4 + vTwinkle * 0.6);
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.01;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.005) * 0.06;
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

// ── Shooting Stars ──────────────────────────────────────────────────────────

function ShootingStars({ count = 3 }: { count?: number }) {
  const ref = useRef<THREE.Group>(null);

  const trails = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      delay: i * 4 + Math.random() * 6,
      duration: 0.8 + Math.random() * 0.6,
      startX: -8 + Math.random() * 6,
      startY: 3 + Math.random() * 4,
      startZ: -5 - Math.random() * 10,
      angle: -0.3 - Math.random() * 0.4,
      speed: 12 + Math.random() * 8,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const trail = trails[i];
      const period = trail.delay + trail.duration + 2;
      const t = (clock.elapsedTime % period) - trail.delay;
      if (t < 0 || t > trail.duration) {
        child.visible = false;
        return;
      }
      child.visible = true;
      const progress = t / trail.duration;
      const mesh = child as THREE.Mesh;
      mesh.position.x = trail.startX + Math.cos(trail.angle) * trail.speed * progress;
      mesh.position.y = trail.startY + Math.sin(trail.angle) * trail.speed * progress;
      mesh.position.z = trail.startZ;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(progress * Math.PI) * 0.6;
      mesh.scale.x = 1 + progress * 3;
    });
  });

  return (
    <group ref={ref}>
      {trails.map((_, i) => (
        <mesh key={i} visible={false}>
          <planeGeometry args={[0.8, 0.01]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ── Floating Dust ───────────────────────────────────────────────────────────

function FloatingDust({ count = 250 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const geo = ref.current.geometry;
    const posArr = geo.getAttribute('position').array as Float32Array;
    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 1] += 0.002;
      posArr[i * 3] += Math.sin(clock.elapsedTime * 0.3 + i) * 0.001;
      if (posArr[i * 3 + 1] > 6) posArr[i * 3 + 1] = -6;
    }
    geo.getAttribute('position').needsUpdate = true;
    ref.current.rotation.y = clock.elapsedTime * 0.004;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.012} sizeAttenuation transparent opacity={0.25} color="#ffffff" depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ── Nebula Clouds ───────────────────────────────────────────────────────────

function NebulaClouds({ count = 8 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const clouds = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 18,
        -6 - Math.random() * 16,
      ] as [number, number, number],
      scale: 1 + Math.random() * 2,
      opacity: 0.012 + Math.random() * 0.018,
      speed: 0.05 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const cloud = clouds[i];
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = cloud.opacity + Math.sin(clock.elapsedTime * cloud.speed + cloud.phase) * 0.01;
      mesh.rotation.z = clock.elapsedTime * 0.01 + cloud.phase;
      mesh.scale.setScalar(cloud.scale + Math.sin(clock.elapsedTime * 0.15 + cloud.phase) * 0.3);
    });
  });

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <mesh key={i} position={cloud.position}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? '#6677aa' : i % 3 === 1 ? '#8866aa' : '#557799'}
            transparent
            opacity={cloud.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Concentric Rings ────────────────────────────────────────────────────────

function ConcentricRings({ position = [0, 0, -2] as [number, number, number], baseRotX = 0, rotSpeed = 0.02, rings: ringDefs }: {
  position?: [number, number, number];
  baseRotX?: number;
  rotSpeed?: number;
  rings?: { radius: number; opacity: number }[];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const rings = useMemo(() => ringDefs ?? [
    { radius: 3, opacity: 0.06 },
    { radius: 5, opacity: 0.04 },
    { radius: 7, opacity: 0.025 },
    { radius: 9, opacity: 0.015 },
    { radius: 12, opacity: 0.008 },
  ], [ringDefs]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const beat = beatRef.current ?? 0;
    groupRef.current.rotation.x = baseRotX + Math.sin(clock.elapsedTime * 0.1) * 0.05;
    groupRef.current.rotation.z = clock.elapsedTime * rotSpeed;
    const s = 1 + beat * 0.08;
    groupRef.current.scale.setScalar(s);
    groupRef.current.children.forEach((child) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (mat.userData.baseOpacity === undefined) mat.userData.baseOpacity = mat.opacity;
      mat.opacity = mat.userData.baseOpacity + beat * 0.04;
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {rings.map((ring, i) => (
        <mesh key={i}>
          <ringGeometry args={[ring.radius - 0.01, ring.radius + 0.01, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={ring.opacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ── Floating Lines (network tendrils) ───────────────────────────────────────

function FloatingLines({ count = 18 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const lineData = useMemo(() => {
    return Array.from({ length: count }, () => {
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 12 - 2
      );
      const end = new THREE.Vector3(
        start.x + (Math.random() - 0.5) * 8,
        start.y + (Math.random() - 0.5) * 5,
        start.z + (Math.random() - 0.5) * 5
      );
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mid.x += (Math.random() - 0.5) * 3;
      mid.y += (Math.random() - 0.5) * 3;
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(12));
      return { geo, opacity: 0.02 + Math.random() * 0.04 };
    });
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * 0.006;
  });

  return (
    <group ref={groupRef}>
      {lineData.map((line, i) => (
        <line key={i}>
          <primitive object={line.geo} attach="geometry" />
          <lineBasicMaterial color="#ffffff" transparent opacity={line.opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
        </line>
      ))}
    </group>
  );
}

// ── Candlestick Charts (finance aesthetic) ──────────────────────────────────

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
    // Gentle floating
    groupRef.current.position.x = position[0] + Math.sin(t * 0.02 + position[2]) * 1.5;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.015 + position[0]) * 1.0;
    groupRef.current.position.z = position[2] + Math.cos(t * 0.012 + position[0]) * 0.8;
    groupRef.current.rotation.y = (rot?.[1] ?? 0) + Math.sin(t * 0.018 + position[0]) * 0.1;

    // Animate each bar's height via scale.y
    let idx = 0;
    groupRef.current.children.forEach(child => {
      if (!(child as THREE.Mesh).isMesh) return;
      const c = candles[Math.floor(idx / 2)]; // 2 meshes per candle (body + wick)
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
            <meshBasicMaterial color={c.bullish ? '#00e676' : '#ff5252'} transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh position={[c.x, 0, 0]}>
            <boxGeometry args={[0.03, 1.5, 0.01]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.035} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Scrolling Ticker Numbers (finance data stream) ──────────────────────────

function TickerStream({ count = 6 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const streams = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const y = (Math.random() - 0.5) * 10;
      const z = -5 - Math.random() * 10;
      const speed = 0.3 + Math.random() * 0.5;
      const len = 2 + Math.random() * 4;
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(len, 0, 0)];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const green = Math.random() > 0.5;
      return { geo, y, z, speed, len, green, startX: (Math.random() - 0.5) * 20 };
    });
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const beat = beatRef.current ?? 0;
    groupRef.current.children.forEach((child, i) => {
      const s = streams[i];
      const mesh = child as THREE.Line;
      const offset = (clock.elapsedTime * s.speed) % 24 - 12;
      mesh.position.set(s.startX + offset, s.y, s.z);
      const mat = mesh.material as THREE.LineBasicMaterial;
      mat.opacity = 0.025 + beat * 0.015;
    });
  });

  return (
    <group ref={groupRef}>
      {streams.map((s, i) => {
        const line = new THREE.Line(s.geo, new THREE.LineBasicMaterial({
          color: s.green ? '#00e676' : '#ff5252',
          transparent: true, opacity: 0.025, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        line.position.set(s.startX, s.y, s.z);
        return <primitive key={i} object={line} />;
      })}
    </group>
  );
}

// ── Line Chart (stock chart aesthetic) ──────────────────────────────────────

function LineChart({ position, rotation: rot, scale: s = 1 }: { position: [number, number, number]; rotation?: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Line>(null);
  const beatRef = useContext(BeatContext);

  const geo = useMemo(() => {
    const points: THREE.Vector3[] = [];
    let price = 1;
    for (let i = 0; i < 60; i++) {
      price += (Math.random() - 0.48) * 0.18;
      price = Math.max(0.1, price);
      points.push(new THREE.Vector3((i / 60) * 10 - 5, price - 1, 0));
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
      color: '#00e676', transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
  }, [geo]);

  return (
    <group position={position} rotation={rot} scale={[s, s, s]}>
      <primitive ref={ref} object={line} />
    </group>
  );
}

// ── Bar Chart ───────────────────────────────────────────────────────────────

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
    // Float around
    groupRef.current.position.x = position[0] + Math.sin(t * 0.018 + position[0]) * 1.5;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.014 + position[2]) * 1.0;
    groupRef.current.position.z = position[2] + Math.cos(t * 0.011 + position[2]) * 0.8;
    groupRef.current.rotation.y = (rot?.[1] ?? 0) + Math.sin(t * 0.016 + position[0]) * 0.1;

    // Animate bar heights
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
          <meshBasicMaterial color={b.green ? '#00e676' : '#ff5252'} transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

// ── Floating Numbers ────────────────────────────────────────────────────────

function FloatingNumbers({ count = 16 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const items = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;

    return Array.from({ length: count }, () => {
      const texts = ['$142.87', '+3.2%', '0x4F2A', 'BTC 64,210', 'ETH 3,847', '$89.41', '-1.7%', 'AAPL 189.2', 'SPY 512', '10Y:4.2%', 'VIX:18.3', 'P/E:24.1', 'ROI:+12%', 'EPS:3.41', 'YTD:+8.7%', 'MSFT 421', 'NVDA 892', 'const x =', 'return {}', 'async fn'];
      const text = texts[Math.floor(Math.random() * texts.length)];
      const green = !text.startsWith('-');

      const clone = canvas.cloneNode(true) as HTMLCanvasElement;
      const ctx = clone.getContext('2d')!;
      ctx.clearRect(0, 0, 256, 48);
      ctx.fillStyle = green ? '#00e676' : '#ff5252';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 24);

      const texture = new THREE.CanvasTexture(clone);
      texture.needsUpdate = true;

      return {
        texture,
        position: [
          (Math.random() - 0.5) * 28,
          (Math.random() - 0.5) * 16,
          -3 - Math.random() * 16,
        ] as [number, number, number],
        speed: 0.03 + Math.random() * 0.08,
        driftSpeed: 0.01 + Math.random() * 0.03,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const item = items[i];
      const mesh = child as THREE.Mesh;
      mesh.position.x = item.position[0] + Math.sin(clock.elapsedTime * item.driftSpeed + item.phase) * 2;
      mesh.position.y = item.position[1] + Math.sin(clock.elapsedTime * item.speed + item.phase) * 0.8;
      mesh.rotation.y = Math.sin(clock.elapsedTime * 0.02 + item.phase) * 0.2;
    });
  });

  return (
    <group ref={groupRef}>
      {items.map((item, i) => (
        <mesh key={i} position={item.position}>
          <planeGeometry args={[2.4, 0.5]} />
          <meshBasicMaterial map={item.texture} transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ── Grid Floor ──────────────────────────────────────────────────────────────

function GridFloor() {
  const ref = useRef<THREE.GridHelper>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.008;
  });

  return (
    <gridHelper ref={ref} args={[50, 50, '#333333', '#222222']} position={[0, -5, 0]}>
      <meshBasicMaterial attach="material" color="#ffffff" transparent opacity={0.03} depthWrite={false} />
    </gridHelper>
  );
}

// ── Radial Gradient Glow (fullscreen quad with radial gradient shader) ───────

function RadialGlow() {
  const ref = useRef<THREE.Mesh>(null);
  const beatRef = useContext(BeatContext);

  const shaderArgs = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uBeat: { value: 0 },
    },
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
        // Shift center subtly with time
        center.x += sin(uTime * 0.15) * 0.05;
        center.y += cos(uTime * 0.12) * 0.04;

        float dist = distance(vUv, center);

        // Main radial glow — white core fading out (static, no beat)
        float glow = smoothstep(0.7, 0.0, dist) * 0.06;

        // Secondary wider halo
        float halo = smoothstep(1.0, 0.2, dist) * 0.02;

        // Subtle vignette brightening from center
        float vig = 1.0 - smoothstep(0.0, 0.9, dist);

        float alpha = glow + halo + vig * 0.015;

        // Slight warmth toward center, cooler at edges
        vec3 warm = vec3(1.0, 0.97, 0.92);
        vec3 cool = vec3(0.85, 0.88, 1.0);
        vec3 color = mix(cool, warm, smoothstep(0.5, 0.0, dist));

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

// ── Pulsing Central Glow ────────────────────────────────────────────────────

function CentralGlow() {
  const ref = useRef<THREE.Mesh>(null);
  const beatRef = useContext(BeatContext);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.05 + Math.sin(clock.elapsedTime * 0.15) * 0.015;
    ref.current.scale.setScalar(8 + Math.sin(clock.elapsedTime * 0.1) * 0.5);
  });

  return (
    <mesh ref={ref} position={[0, 0, -4]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#8899cc" transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

// ── Camera Controller ───────────────────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });

  useFrame(({ pointer }) => {
    target.current.x = pointer.x * 0.5;
    target.current.y = pointer.y * 0.3;
    camera.position.x += (target.current.x - camera.position.x) * 0.012;
    camera.position.y += (target.current.y - camera.position.y) * 0.012;
    camera.lookAt(0, 0, -2);
  });

  return null;
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function WebringBackground({ beatRef, paused }: { beatRef?: RefObject<number>; paused?: boolean }) {
  const fallbackRef = useRef(0);
  const activeBeatRef = beatRef ?? fallbackRef;

  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 65 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        dpr={[0.75, 1]}
        frameloop={paused ? 'demand' : 'always'}
      >
        <BeatContext.Provider value={activeBeatRef}>
        <fog attach="fog" args={['#000000', 12, 32]} />

        {/* Fullscreen radial gradient glow — renders behind everything */}
        <RadialGlow />

        <Stars count={300} />
        <FloatingDust count={80} />
        {/* Center rings */}
        <ConcentricRings />
        {/* Scattered ring groups */}
        <ConcentricRings
          position={[7, -2, -8]}
          baseRotX={Math.PI * 0.6}
          rotSpeed={0.01}
          rings={[{ radius: 2, opacity: 0.04 }, { radius: 3, opacity: 0.025 }, { radius: 4.5, opacity: 0.015 }]}
        />
        <FloatingLines count={8} />
        <CentralGlow />

        {/* Finance: candlesticks — spread out, angled, animated heights */}
        <CandlestickChart position={[-10, 3, -8]} rotation={[0.1, 0.3, -0.05]} scale={1.5} />
        <CandlestickChart position={[9, -3, -12]} rotation={[-0.1, -0.4, 0.08]} scale={1.2} />
        <CandlestickChart position={[2, 6, -15]} rotation={[0.15, 0.1, 0.1]} scale={1.0} />

        {/* Finance: line charts — angled differently */}
        <LineChart position={[-7, -4, -10]} rotation={[0.1, -0.2, 0.05]} scale={1.4} />
        <LineChart position={[7, 4, -14]} rotation={[-0.05, 0.3, -0.1]} scale={1.1} />

        {/* Finance: bar charts */}
        <BarChart position={[0, -1, -11]} rotation={[0.05, 0.15, 0]} scale={1.2} />

        {/* Finance/code: floating numbers + tickers */}
        <FloatingNumbers count={12} />
        <TickerStream count={5} />

        <GridFloor />
        <CameraRig />
        </BeatContext.Provider>
      </Canvas>
    </div>
  );
}
