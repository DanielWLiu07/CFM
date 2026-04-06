'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface LightPillarProps {
  topColor?: string;
  bottomColor?: string;
  intensity?: number;
  rotationSpeed?: number;
  glowAmount?: number;
  pillarWidth?: number;
  pillarHeight?: number;
  noiseIntensity?: number;
  pillarRotation?: number;
  mixBlendMode?: string;
  quality?: 'low' | 'medium' | 'high';
  paused?: boolean;
}

export default function LightPillar({
  topColor = '#22c55e',
  bottomColor = '#0a4a1e',
  intensity = 0.8,
  rotationSpeed = 0.2,
  glowAmount = 0.003,
  pillarWidth = 3.0,
  pillarHeight = 0.4,
  noiseIntensity = 0.4,
  pillarRotation = 15,
  mixBlendMode = 'screen',
  quality = 'medium',
  paused = false,
}: LightPillarProps) {
  const pausedRef = useRef(paused);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
  const timeRef = useRef(0);
  const rotationSpeedRef = useRef(rotationSpeed);
  const [webGLSupported, setWebGLSupported] = useState(true);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) setWebGLSupported(false);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !webGLSupported) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cameraRef.current = camera;

    const settings = {
      low: { iterations: 24, waveIterations: 1, pixelRatio: 0.5, precision: 'mediump', stepMultiplier: 1.5 },
      medium: { iterations: 40, waveIterations: 2, pixelRatio: 0.65, precision: 'mediump', stepMultiplier: 1.2 },
      high: { iterations: 80, waveIterations: 4, pixelRatio: Math.min(window.devicePixelRatio, 2), precision: 'highp', stepMultiplier: 1.0 },
    }[quality];

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false, alpha: true,
        powerPreference: quality === 'high' ? 'high-performance' : 'low-power',
        stencil: false, depth: false,
      });
    } catch { setWebGLSupported(false); return; }

    renderer.setSize(width, height);
    renderer.setPixelRatio(settings.pixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const parseColor = (hex: string) => {
      const c = new THREE.Color(hex);
      return new THREE.Vector3(c.r, c.g, c.b);
    };

    const pillarRotRad = (pillarRotation * Math.PI) / 180;
    const waveSin = Math.sin(0.4);
    const waveCos = Math.cos(0.4);

    const material = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
      fragmentShader: `
        precision ${settings.precision} float;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform float uIntensity;
        uniform float uGlowAmount;
        uniform float uPillarWidth;
        uniform float uPillarHeight;
        uniform float uNoiseIntensity;
        uniform float uRotCos;
        uniform float uRotSin;
        uniform float uPillarRotCos;
        uniform float uPillarRotSin;
        uniform float uWaveSin;
        uniform float uWaveCos;
        varying vec2 vUv;
        const float STEP_MULT = ${settings.stepMultiplier.toFixed(1)};
        const int MAX_ITER = ${settings.iterations};
        const int WAVE_ITER = ${settings.waveIterations};
        void main() {
          vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);
          uv = vec2(uPillarRotCos * uv.x - uPillarRotSin * uv.y, uPillarRotSin * uv.x + uPillarRotCos * uv.y);
          vec3 ro = vec3(0.0, 0.0, -10.0);
          vec3 rd = normalize(vec3(uv, 1.0));
          float rotC = uRotCos;
          float rotS = uRotSin;
          vec3 col = vec3(0.0);
          float t = 0.1;
          for(int i = 0; i < MAX_ITER; i++) {
            vec3 p = ro + rd * t;
            p.xz = vec2(rotC * p.x - rotS * p.z, rotS * p.x + rotC * p.z);
            vec3 q = p;
            q.y = p.y * uPillarHeight + uTime;
            float freq = 1.0;
            float amp = 1.0;
            for(int j = 0; j < WAVE_ITER; j++) {
              q.xz = vec2(uWaveCos * q.x - uWaveSin * q.z, uWaveSin * q.x + uWaveCos * q.z);
              q += cos(q.zxy * freq - uTime * float(j) * 2.0) * amp;
              freq *= 2.0;
              amp *= 0.5;
            }
            float d = length(cos(q.xz)) - 0.2;
            float bound = length(p.xz) - uPillarWidth;
            float k = 4.0;
            float h = max(k - abs(d - bound), 0.0);
            d = max(d, bound) + h * h * 0.0625 / k;
            d = abs(d) * 0.15 + 0.01;
            float grad = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);
            col += mix(uBottomColor, uTopColor, grad) / d;
            t += d * STEP_MULT;
            if(t > 50.0) break;
          }
          float widthNorm = uPillarWidth / 3.0;
          col = tanh(col * uGlowAmount / widthNorm);
          col -= fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 15.0 * uNoiseIntensity;
          gl_FragColor = vec4(col * uIntensity, 1.0);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uTopColor: { value: parseColor(topColor) },
        uBottomColor: { value: parseColor(bottomColor) },
        uIntensity: { value: intensity },
        uGlowAmount: { value: glowAmount },
        uPillarWidth: { value: pillarWidth },
        uPillarHeight: { value: pillarHeight },
        uNoiseIntensity: { value: noiseIntensity },
        uRotCos: { value: 1.0 },
        uRotSin: { value: 0.0 },
        uPillarRotCos: { value: Math.cos(pillarRotRad) },
        uPillarRotSin: { value: Math.sin(pillarRotRad) },
        uWaveSin: { value: waveSin },
        uWaveCos: { value: waveCos },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    geometryRef.current = geometry;
    scene.add(new THREE.Mesh(geometry, material));

    let lastTime = performance.now();
    const frameTime = quality === 'low' ? 1000 / 30 : 1000 / 60;

    const animate = (currentTime: number) => {
      if (!materialRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      rafRef.current = requestAnimationFrame(animate);
      if (pausedRef.current) return;
      const delta = currentTime - lastTime;
      if (delta >= frameTime) {
        timeRef.current += 0.016 * rotationSpeedRef.current;
        const t = timeRef.current;
        materialRef.current.uniforms.uTime.value = t;
        materialRef.current.uniforms.uRotCos.value = Math.cos(t * 0.3);
        materialRef.current.uniforms.uRotSin.value = Math.sin(t * 0.3);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        lastTime = currentTime - (delta % frameTime);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!rendererRef.current || !materialRef.current || !containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        rendererRef.current.setSize(w, h);
        materialRef.current.uniforms.uResolution.value.set(w, h);
      }, 150);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      material.dispose();
      geometry.dispose();
      rendererRef.current = null;
      materialRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      geometryRef.current = null;
    };
  }, [webGLSupported, quality]);

  useEffect(() => { rotationSpeedRef.current = rotationSpeed; }, [rotationSpeed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTopColor.value = new THREE.Vector3(...new THREE.Color(topColor).toArray());
  }, [topColor]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uBottomColor.value = new THREE.Vector3(...new THREE.Color(bottomColor).toArray());
  }, [bottomColor]);

  if (!webGLSupported) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        position: 'absolute', top: 0, left: 0,
        mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode'],
      }}
    />
  );
}
