'use client';

import { useRef, useMemo, createContext, useContext, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const BeatContext = createContext<RefObject<number>>({ current: 0 });

// ── Twinkling Stars ─────────────────────────────────────────────────────────

function Stars({ count = 150 }: { count?: number }) {
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

function FloatingDust({ count = 60 }: { count?: number }) {
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

// ── Floating Code Snippets ──────────────────────────────────────────────────

function FloatingCode({ count = 16 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const items = useMemo(() => {
    const snippets = [
      'const x = await fetch()', 'if (n % 2 === 0) {', 'return arr.filter(Boolean)',
      'export default function', 'import { useState }', '<div className="grid">',
      'async function main() {', 'for (let i = 0; i < n; i++)', '.then(res => res.json())',
      'type Props = { id: string }', 'npm run build', 'git push origin main',
      'SELECT * FROM users', 'console.log("hello")', 'def train(model, data):',
      'class Node<T> {', '} catch (err) {', 'useEffect(() => {}, [])',
      'fn main() -> Result<()>', 'while (left < right) {', 'docker compose up -d',
    ];

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    return Array.from({ length: count }, () => {
      const text = snippets[Math.floor(Math.random() * snippets.length)];
      const green = Math.random() > 0.3;

      ctx.clearRect(0, 0, 512, 32);
      ctx.fillStyle = green ? '#00e676' : '#888888';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 16);

      const clone = document.createElement('canvas');
      clone.width = 512;
      clone.height = 32;
      const cloneCtx = clone.getContext('2d')!;
      cloneCtx.drawImage(canvas, 0, 0);
      const texture = new THREE.CanvasTexture(clone);
      texture.needsUpdate = true;

      return {
        texture,
        position: [(Math.random() - 0.5) * 24, (Math.random() - 0.5) * 16, -4 - Math.random() * 14] as [number, number, number],
        speed: 0.03 + Math.random() * 0.1,
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
      mesh.rotation.y = Math.sin(clock.elapsedTime * 0.03 + item.phase) * 0.1;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.045 + beat * 0.02;
    });
  });

  return (
    <group ref={groupRef}>
      {items.map((item, i) => (
        <mesh key={i} position={item.position}>
          <planeGeometry args={[4, 0.3]} />
          <meshBasicMaterial map={item.texture} transparent opacity={0.045} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ── Floating Brackets & Symbols ─────────────────────────────────────────────

function FloatingSymbols({ count = 20 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const items = useMemo(() => {
    const symbols = ['{ }', '< />', '( )', '[ ]', '=>', ';', '#', '$', '&&', '||', '!=', '==', '::', '/**/'];

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    return Array.from({ length: count }, () => {
      const text = symbols[Math.floor(Math.random() * symbols.length)];

      ctx.clearRect(0, 0, 128, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 32);

      const clone = document.createElement('canvas');
      clone.width = 128;
      clone.height = 64;
      const cloneCtx = clone.getContext('2d')!;
      cloneCtx.drawImage(canvas, 0, 0);
      const texture = new THREE.CanvasTexture(clone);
      texture.needsUpdate = true;

      return {
        texture,
        position: [(Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, -3 - Math.random() * 16] as [number, number, number],
        rotSpeed: (Math.random() - 0.5) * 0.1,
        floatSpeed: 0.04 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
        scale: 0.6 + Math.random() * 1.0,
      };
    });
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const beat = beatRef.current ?? 0;
    groupRef.current.children.forEach((child, i) => {
      const item = items[i];
      const mesh = child as THREE.Mesh;
      mesh.position.y = item.position[1] + Math.sin(clock.elapsedTime * item.floatSpeed + item.phase) * 0.8;
      mesh.position.x = item.position[0] + Math.cos(clock.elapsedTime * item.floatSpeed * 0.7 + item.phase) * 0.4;
      mesh.rotation.z = Math.sin(clock.elapsedTime * item.rotSpeed + item.phase) * 0.15;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.035 + beat * 0.02;
    });
  });

  return (
    <group ref={groupRef}>
      {items.map((item, i) => (
        <mesh key={i} position={item.position} scale={[item.scale, item.scale, 1]}>
          <planeGeometry args={[1.2, 0.6]} />
          <meshBasicMaterial map={item.texture} transparent opacity={0.035} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ── Scrolling Terminal Lines ────────────────────────────────────────────────

function TerminalLines({ count = 8 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const lines = useMemo(() => {
    return Array.from({ length: count }, () => {
      const len = 3 + Math.random() * 6;
      const y = (Math.random() - 0.5) * 12;
      const z = -3 - Math.random() * 14;
      const speed = 0.08 + Math.random() * 0.2;
      const green = Math.random() > 0.3;
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(len, 0, 0)];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      return { geo, y, z, speed, green, startX: (Math.random() - 0.5) * 20 };
    });
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const beat = beatRef.current ?? 0;
    groupRef.current.children.forEach((child, i) => {
      const t = lines[i];
      const mesh = child as THREE.Line;
      const offset = (clock.elapsedTime * t.speed) % 24 - 12;
      mesh.position.set(t.startX + offset, t.y, t.z);
      const mat = mesh.material as THREE.LineBasicMaterial;
      mat.opacity = 0.025 + beat * 0.015;
    });
  });

  return (
    <group ref={groupRef}>
      {lines.map((t, i) => {
        const line = new THREE.Line(t.geo, new THREE.LineBasicMaterial({
          color: t.green ? '#00e676' : '#555555',
          transparent: true, opacity: 0.025, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        line.position.set(t.startX, t.y, t.z);
        return <primitive key={i} object={line} />;
      })}
    </group>
  );
}

// ── Grid Floor ──────────────────────────────────────────────────────────────

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

// ── Radial Glow ─────────────────────────────────────────────────────────────

function RadialGlow() {
  const ref = useRef<THREE.Mesh>(null);
  const beatRef = useContext(BeatContext);

  const shaderArgs = useMemo(() => ({
    uniforms: { uTime: { value: 0 }, uBeat: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uBeat;
      void main() {
        vec2 center = vec2(0.5 + sin(uTime * 0.12) * 0.04, 0.5 + cos(uTime * 0.1) * 0.03);
        float dist = distance(vUv, center);
        float glow = smoothstep(0.6, 0.0, dist) * (0.04 + uBeat * 0.03);
        float halo = smoothstep(0.9, 0.2, dist) * (0.015 + uBeat * 0.01);
        vec3 color = mix(vec3(0.82, 0.85, 1.0), vec3(0.95, 0.92, 0.88), smoothstep(0.4, 0.0, dist));
        gl_FragColor = vec4(color, glow + halo);
      }
    `,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
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

// ── Camera Rig ──────────────────────────────────────────────────────────────

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

// ── Main Export ─────────────────────────────────────────────────────────────

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
          <Stars />
          <FloatingDust />
          <TerminalLines />
          <CameraRig />
        </BeatContext.Provider>
      </Canvas>
    </div>
  );
}
