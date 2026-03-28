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

// ── Wireframe Shapes ─────────────────────────────────────────────────────────

function WireframeShape({ position, size, speedX, speedY, geo }: {
  position: [number, number, number];
  size: number;
  speedX: number;
  speedY: number;
  geo: 'icosa' | 'octa' | 'dodeca';
}) {
  const ref = useRef<THREE.Mesh>(null);
  const beatRef = useContext(BeatContext);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const beat = beatRef.current ?? 0;
    ref.current.rotation.x = clock.elapsedTime * speedX;
    ref.current.rotation.y = clock.elapsedTime * speedY;
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.25 + position[0]) * 0.3;
    ref.current.scale.setScalar(1 + beat * 0.12);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.04 + beat * 0.06;
  });

  return (
    <mesh ref={ref} position={position}>
      {geo === 'icosa' && <icosahedronGeometry args={[size, 1]} />}
      {geo === 'octa' && <octahedronGeometry args={[size]} />}
      {geo === 'dodeca' && <dodecahedronGeometry args={[size]} />}
      <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.04} depthWrite={false} />
    </mesh>
  );
}

// ── Grid Planes (tilted graph paper) ─────────────────────────────────────────

function GridPlanes() {
  const ref1 = useRef<THREE.GridHelper>(null);
  const ref2 = useRef<THREE.GridHelper>(null);

  useFrame(({ clock }) => {
    if (ref1.current) {
      ref1.current.rotation.y = clock.elapsedTime * 0.005;
    }
    if (ref2.current) {
      ref2.current.rotation.y = -clock.elapsedTime * 0.004;
    }
  });

  return (
    <>
      <group position={[0, -1, -8]} rotation={[0.3, 0.2, 0]}>
        <gridHelper ref={ref1} args={[30, 30, '#333333', '#222222']}>
          <meshBasicMaterial attach="material" color="#ffffff" transparent opacity={0.025} depthWrite={false} />
        </gridHelper>
      </group>
      <group position={[-5, 4, -14]} rotation={[0.6, -0.3, 0.1]}>
        <gridHelper ref={ref2} args={[20, 20, '#333333', '#222222']}>
          <meshBasicMaterial attach="material" color="#ffffff" transparent opacity={0.015} depthWrite={false} />
        </gridHelper>
      </group>
    </>
  );
}

// ── Floating Code Lines (horizontal data streams) ────────────────────────────

function FloatingCodeLines({ count = 14 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const lines = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const len = 1.5 + Math.random() * 5;
      const y = (Math.random() - 0.5) * 10;
      const z = -4 - Math.random() * 12;
      const x = (Math.random() - 0.5) * 16;
      const speed = 0.1 + Math.random() * 0.2;
      const opacity = 0.02 + Math.random() * 0.03;
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(len, 0, 0)];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      return { geo, x, y, z, speed, opacity, len };
    });
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const beat = beatRef.current ?? 0;
    groupRef.current.children.forEach((child, i) => {
      const line = lines[i];
      const mesh = child as THREE.Line;
      // Drift right, wrap around
      const offset = (clock.elapsedTime * line.speed) % 20 - 10;
      mesh.position.x = line.x + offset;
      mesh.position.y = line.y;
      mesh.position.z = line.z;
      const mat = mesh.material as THREE.LineBasicMaterial;
      mat.opacity = line.opacity + beat * 0.02;
    });
  });

  return (
    <group ref={groupRef}>
      {lines.map((ln, i) => {
        const lineObj = new THREE.Line(ln.geo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: ln.opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
        return <primitive key={i} object={lineObj} />;
      })}
    </group>
  );
}

// ── Floating Brackets (code aesthetic) ───────────────────────────────────────

function FloatingBrackets() {
  const groupRef = useRef<THREE.Group>(null);
  const beatRef = useContext(BeatContext);

  const brackets = useMemo(() => {
    const items: { points: THREE.Vector3[]; position: [number, number, number]; scale: number; rotSpeed: number }[] = [];
    // Curly braces { }
    const makeCurly = (open: boolean): THREE.Vector3[] => {
      const dir = open ? 1 : -1;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = (i / 12) * Math.PI;
        const x = dir * (Math.sin(t) * 0.15 + (t < Math.PI / 2 || t > Math.PI * 3 / 4 ? 0.05 : -0.05));
        const y = (i / 12) * 1.2 - 0.6;
        pts.push(new THREE.Vector3(x, y, 0));
      }
      return pts;
    };
    // Square brackets [ ]
    const makeSquare = (open: boolean): THREE.Vector3[] => {
      const d = open ? -0.15 : 0.15;
      return [
        new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(d, -0.5, 0),
        new THREE.Vector3(d, -0.5, 0), new THREE.Vector3(d, 0.5, 0),
        new THREE.Vector3(d, 0.5, 0), new THREE.Vector3(0, 0.5, 0),
      ];
    };

    // Place 4 bracket pairs at various positions
    items.push({ points: makeCurly(true), position: [-7, 2, -6], scale: 1.5, rotSpeed: 0.08 });
    items.push({ points: makeCurly(false), position: [-5.5, 2, -6], scale: 1.5, rotSpeed: 0.08 });
    items.push({ points: makeSquare(true), position: [8, -1, -8], scale: 1.8, rotSpeed: -0.06 });
    items.push({ points: makeSquare(false), position: [9.5, -1, -8], scale: 1.8, rotSpeed: -0.06 });
    items.push({ points: makeCurly(true), position: [3, 4, -10], scale: 1.2, rotSpeed: 0.05 });
    items.push({ points: makeCurly(false), position: [4.2, 4, -10], scale: 1.2, rotSpeed: 0.05 });

    return items.map(item => ({
      ...item,
      geo: new THREE.BufferGeometry().setFromPoints(item.points),
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const beat = beatRef.current ?? 0;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Line;
      const data = brackets[i];
      mesh.rotation.y = Math.sin(clock.elapsedTime * data.rotSpeed + i) * 0.3;
      mesh.position.y = data.position[1] + Math.sin(clock.elapsedTime * 0.2 + i * 2) * 0.3;
      const mat = mesh.material as THREE.LineBasicMaterial;
      mat.opacity = 0.04 + beat * 0.03;
    });
  });

  return (
    <group ref={groupRef}>
      {brackets.map((b, i) => {
        const lineObj = new THREE.Line(b.geo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.04, depthWrite: false, blending: THREE.AdditiveBlending }));
        lineObj.position.set(...b.position);
        lineObj.scale.setScalar(b.scale);
        return <primitive key={i} object={lineObj} />;
      })}
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
          <Stars count={200} />
          <FloatingDust count={100} />
          <ConcentricRings />
          <GridPlanes />
          <FloatingCodeLines count={14} />
          <FloatingBrackets />
          <WireframeShape position={[-8, 3, -7]} size={1.5} speedX={0.06} speedY={0.04} geo="icosa" />
          <WireframeShape position={[9, -2, -9]} size={1.8} speedX={0.04} speedY={0.05} geo="dodeca" />
          <WireframeShape position={[0, 5, -12]} size={1.3} speedX={0.05} speedY={0.03} geo="octa" />
          <CameraRig />
        </BeatContext.Provider>
      </Canvas>
    </div>
  );
}
