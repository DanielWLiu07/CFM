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

// ── Wireframe Shapes ────────────────────────────────────────────────────────

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
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.3 + position[0]) * 0.4;
    const s = 1 + beat * 0.15;
    ref.current.scale.setScalar(s);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.05 + beat * 0.08;
  });

  return (
    <mesh ref={ref} position={position}>
      {geo === 'icosa' && <icosahedronGeometry args={[size, 1]} />}
      {geo === 'octa' && <octahedronGeometry args={[size]} />}
      {geo === 'dodeca' && <dodecahedronGeometry args={[size]} />}
      <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.05} depthWrite={false} />
    </mesh>
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

        // Main radial glow — white core fading out
        float glow = smoothstep(0.7, 0.0, dist) * (0.06 + uBeat * 0.04);

        // Secondary wider halo
        float halo = smoothstep(1.0, 0.2, dist) * (0.02 + uBeat * 0.015);

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
    const beat = beatRef.current ?? 0;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.05 + Math.sin(clock.elapsedTime * 0.3) * 0.02 + beat * 0.06;
    ref.current.scale.setScalar(8 + Math.sin(clock.elapsedTime * 0.25) * 1 + beat * 2);
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
        <NebulaClouds count={4} />
        <ShootingStars count={2} />
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

        <WireframeShape position={[-9, 3, -6]} size={1.8} speedX={0.04} speedY={0.03} geo="icosa" />
        <WireframeShape position={[10, -3, -8]} size={2} speedX={0.03} speedY={0.025} geo="octa" />
        <WireframeShape position={[0, 6, -12]} size={1.5} speedX={0.05} speedY={0.02} geo="dodeca" />

        <GridFloor />
        <CameraRig />
        </BeatContext.Provider>
      </Canvas>
    </div>
  );
}
