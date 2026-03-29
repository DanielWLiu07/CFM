'use client';

import { useRef, useEffect, useState, useCallback, type RefObject } from 'react';

const REPO_URL = 'https://github.com/DanielWLiu07/CFM';
const BEAT_INTERVAL = 60 / 93;
const BEAT_OFFSET = 0.229;

const TICKER_ITEMS = [
  { sym: 'NEXT', val: '16.1.7', change: '+2.4%', up: true },
  { sym: 'REACT', val: '19.2.3', change: '-0.3%', up: false },
  { sym: 'THREE', val: '0.183', change: '+3.1%', up: true },
  { sym: 'TS', val: '5.7', change: '+0.9%', up: true },
  { sym: 'TAIL', val: '4.1', change: '-1.5%', up: false },
  { sym: 'NODE', val: '22.x', change: '+0.6%', up: true },
  { sym: 'VCRL', val: 'Vercel', change: '-0.8%', up: false },
  { sym: 'ESLNT', val: '9.x', change: '+0.4%', up: true },
  { sym: 'BLNDR', val: '4.3', change: '-2.1%', up: false },
  { sym: 'TBPK', val: '2.x', change: '+1.7%', up: true },
];

const POSITIONS = [
  { asset: 'Next.js 16', alloc: '18%', status: 'ACTIVE' },
  { asset: 'React 19', alloc: '16%', status: 'ACTIVE' },
  { asset: 'Three.js', alloc: '14%', status: 'ACTIVE' },
  { asset: 'TypeScript', alloc: '12%', status: 'ACTIVE' },
  { asset: 'Tailwind CSS 4', alloc: '10%', status: 'ACTIVE' },
  { asset: 'Vercel', alloc: '7%', status: 'ACTIVE' },
  { asset: 'Node.js', alloc: '6%', status: 'ACTIVE' },
  { asset: 'Turbopack', alloc: '5%', status: 'ACTIVE' },
  { asset: 'ESLint', alloc: '4%', status: 'ACTIVE' },
  { asset: 'Blender', alloc: '4%', status: 'ACTIVE' },
];

// Weekly commit bar chart — fetches real data, renders as vertical bars
function CommitBarChart({ green, visible, reducedMotion = false }: { green: string; visible: boolean; reducedMotion?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    fetch('https://api.github.com/repos/DanielWLiu07/CFM/stats/commit_activity')
      .then(r => r.json())
      .then(weeks => {
        if (Array.isArray(weeks) && weeks.length > 0) {
          dataRef.current = weeks.map((w: { total: number }) => w.total);
        } else {
          dataRef.current = generateFallbackWeeks();
        }
      })
      .catch(() => {
        dataRef.current = generateFallbackWeeks();
      });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = dataRef.current;
    if (data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    const padding = { top: 8, bottom: 16, left: 4, right: 4 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const maxVal = Math.max(1, ...data);
    const barCount = data.length;
    const gap = 2;
    const barW = Math.max(1, (chartW - gap * (barCount - 1)) / barCount);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) {
      const gy = padding.top + chartH * (1 - i / 4);
      ctx.beginPath();
      ctx.moveTo(padding.left, gy);
      ctx.lineTo(w - padding.right, gy);
      ctx.stroke();
    }

    // Bars
    for (let i = 0; i < barCount; i++) {
      const val = data[i];
      const barH = (val / maxVal) * chartH;
      const x = padding.left + i * (barW + gap);
      const y = padding.top + chartH - barH;

      // Gradient fill per bar
      const grad = ctx.createLinearGradient(0, y, 0, padding.top + chartH);
      grad.addColorStop(0, val > 0 ? 'rgba(0,230,118,0.8)' : 'rgba(255,255,255,0.04)');
      grad.addColorStop(1, val > 0 ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.02)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW, barH || 1);
    }

    // Highlight last bar with pulse
    const lastIdx = barCount - 1;
    const lastVal = data[lastIdx];
    const lastBarH = (lastVal / maxVal) * chartH;
    const lastX = padding.left + lastIdx * (barW + gap);
    const lastY = padding.top + chartH - lastBarH;
    const pulse = Math.sin(Date.now() * 0.004) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(0,230,118,${0.15 + pulse * 0.15})`;
    ctx.fillRect(lastX - 1, lastY - 1, barW + 2, lastBarH + 2);

    // Label: latest week count
    ctx.fillStyle = green;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${lastVal} this week`, w - padding.right, padding.top + chartH + 12);

    // Label: total
    const total = data.reduce((a, b) => a + b, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'left';
    ctx.fillText(`${total} total`, padding.left, padding.top + chartH + 12);
  }, [green]);

  useEffect(() => {
    if (!visible || reducedMotion) {
      // Draw once if visible but reduced motion
      if (visible) draw();
      return;
    }
    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, draw, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

function generateFallbackWeeks(): number[] {
  const weeks: number[] = [];
  for (let w = 0; w < 52; w++) {
    const recency = w > 40 ? 2.5 : w > 30 ? 1.5 : 0.8;
    const burst = Math.random() < 0.1 ? 5 + Math.floor(Math.random() * 10) : 0;
    weeks.push(Math.max(0, Math.floor(Math.random() * 4 * recency + burst)));
  }
  return weeks;
}

// Pixel noise overlay for the title — subtle shifting static grain
function TitleNoise({ visible, reducedMotion = false }: { visible: boolean; reducedMotion?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!visible || reducedMotion) return;
    let frame = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Only update every 3rd frame for that chunky pixel look
      frame++;
      if (frame % 3 !== 0) { rafRef.current = requestAnimationFrame(draw); return; }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      // Use low resolution for chunky pixels
      const scale = 0.15;
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);

      const w = canvas.width;
      const h = canvas.height;
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random();
        if (noise > 0.92) {
          // Bright white speckle
          const v = 180 + Math.floor(Math.random() * 75);
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = 18 + Math.floor(Math.random() * 14);
        } else if (noise > 0.88) {
          // Dim speckle
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 6 + Math.floor(Math.random() * 8);
        }
        // else: transparent
      }

      ctx.putImageData(imgData, 0, 0);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        imageRendering: 'pixelated',
        mixBlendMode: 'screen',
        opacity: 0.7,
      }}
    />
  );
}

// Auto-scrolling positions panel — CSS animation for reliable infinite scroll
function PositionsPanel({ mono, dim, mid, bright, green }: {
  mono: string; dim: string; mid: string; bright: string; green: string;
}) {
  const row = (p: typeof POSITIONS[0], i: number) => (
    <div key={i} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 0',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontFamily: mono, fontSize: 11, color: mid, width: '55%' }}>{p.asset}</span>
      <span style={{ fontFamily: mono, fontSize: 11, color: bright, width: '25%', textAlign: 'right' }}>{p.alloc}</span>
      <span style={{ fontFamily: mono, fontSize: 8, color: green, width: '20%', textAlign: 'right', letterSpacing: '0.05em' }}>{p.status}</span>
    </div>
  );

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 260 }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        Positions
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 4 }}>
        <span style={{ fontFamily: mono, fontSize: 8, color: dim, width: '55%' }}>ASSET</span>
        <span style={{ fontFamily: mono, fontSize: 8, color: dim, width: '25%', textAlign: 'right' }}>ALLOC</span>
        <span style={{ fontFamily: mono, fontSize: 8, color: dim, width: '20%', textAlign: 'right' }}>STATUS</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div className="positions-marquee">
          <div>{POSITIONS.map(row)}</div>
          <div>{POSITIONS.map(row)}</div>
        </div>
      </div>
    </div>
  );
}

export default function GithubSection({ onVisibilityChange, audioRef, reducedMotion = false }: { onVisibilityChange?: (visible: boolean) => void; audioRef?: RefObject<HTMLAudioElement | null>; reducedMotion?: boolean }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const gearRef = useRef<HTMLImageElement>(null);
  const gearRafRef = useRef<number>(0);
  const gearAngleRef = useRef(0);
  const catRef = useRef<HTMLImageElement>(null);
  const catRafRef = useRef<number>(0);
  const titleRef = useRef<HTMLImageElement>(null);
  const titleRafRef = useRef<number>(0);
  const [visible, setVisible] = useState(false);
  const [ghStats, setGhStats] = useState<{ stars: number; forks: number; commits: number } | null>(null);
  const [catPos, setCatPos] = useState({ left: -415, bottom: -95, size: 435, rotate: 13 });
  const [gearPos, setGearPos] = useState({ right: -490, bottom: -280, size: 830 });
  const [titlePos] = useState({ height: 715, mt: -50, mb: 20 });

  // Fetch live GitHub stats
  useEffect(() => {
    fetch('https://api.github.com/repos/DanielWLiu07/CFM')
      .then(r => r.json())
      .then(d => {
        if (d.stargazers_count !== undefined) {
          setGhStats({ stars: d.stargazers_count, forks: d.forks_count, commits: 0 });
          // Fetch commit count
          fetch('https://api.github.com/repos/DanielWLiu07/CFM/contributors')
            .then(r => r.json())
            .then(contributors => {
              if (Array.isArray(contributors)) {
                const total = contributors.reduce((sum: number, c: { contributions?: number }) => sum + (c.contributions || 0), 0);
                setGhStats(prev => prev ? { ...prev, commits: total } : prev);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!onVisibilityChange || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => onVisibilityChange(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTimeout(() => setVisible(true), 100); },
      { threshold: 0.15 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Beat-synced gear rotation — intro spin from right + smooth beat snap
  useEffect(() => {
    if (!visible || reducedMotion) return;
    let lastFiredIdx = -1;
    const startTime = Date.now();
    let targetAngle = 0;
    let smoothAngle = 0;
    const loop = () => {
      const gear = gearRef.current;
      if (!gear) { gearRafRef.current = requestAnimationFrame(loop); return; }

      // Intro: spin in from right over 1.2s with 0.4s delay
      const elapsed = Math.max(0, (Date.now() - startTime - 400)) / 1200;
      const introT = Math.min(1, elapsed);
      const ease = 1 - Math.pow(1 - introT, 3);
      const introX = 80 * (1 - ease);
      const introRot = -180 * (1 - ease);

      const audio = audioRef?.current;
      if (audio && !audio.paused && audio.currentTime > 0) {
        const t = audio.currentTime;
        if (t >= BEAT_OFFSET) {
          const beatIdx = Math.floor((t - BEAT_OFFSET) / BEAT_INTERVAL);
          if (beatIdx > lastFiredIdx) {
            lastFiredIdx = beatIdx;
            targetAngle = beatIdx % 2 === 1 ? -15 : 15;
          }
        }
      }

      // Smooth lerp toward target angle
      smoothAngle += (targetAngle - smoothAngle) * 0.15;
      gearAngleRef.current = smoothAngle;

      gear.style.transform = `translateX(${introX.toFixed(1)}px) rotate(${(smoothAngle + introRot).toFixed(1)}deg)`;

      gearRafRef.current = requestAnimationFrame(loop);
    };
    gearRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gearRafRef.current);
  }, [visible, audioRef, reducedMotion]);

  // Beat-synced cat bob — intro slide from left + smash down on beat
  useEffect(() => {
    if (!visible || reducedMotion) return;
    const baseRotate = 13;
    let smoothY = 0;
    let lastBeatIdx = -1;
    let velocity = 0;
    const startTime = Date.now();
    let introX = -80;
    const loop = () => {
      const cat = catRef.current;
      if (!cat) { catRafRef.current = requestAnimationFrame(loop); return; }

      // Intro: slide in from left over 1s with 0.3s delay
      const elapsed = Math.max(0, (Date.now() - startTime - 300)) / 1000;
      const introT = Math.min(1, elapsed);
      const ease = 1 - Math.pow(1 - introT, 3);
      introX = -80 * (1 - ease);

      const audio = audioRef?.current;
      const hasMusic = audio && !audio.paused && audio.currentTime > 0;

      if (hasMusic) {
        const t = audio.currentTime;
        if (t >= BEAT_OFFSET) {
          const beatIdx = Math.floor((t - BEAT_OFFSET) / BEAT_INTERVAL);
          if (beatIdx > lastBeatIdx) {
            lastBeatIdx = beatIdx;
            velocity = 8;
          }
        }
        smoothY += velocity;
        velocity *= 0.85;
        smoothY *= 0.92;
      } else {
        smoothY = Math.sin(Date.now() * 0.001) * 5;
      }

      const rot = baseRotate + Math.sin(Date.now() * 0.0006) * 6 + Math.sin(Date.now() * 0.0015) * 2;

      cat.style.transform = `translateX(${introX.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) translateY(${smoothY.toFixed(1)}px)`;

      catRafRef.current = requestAnimationFrame(loop);
    };
    catRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(catRafRef.current);
  }, [visible, audioRef, reducedMotion]);

  // Beat-synced title — intro slide + scale pulse + glow
  useEffect(() => {
    if (!visible || reducedMotion) return;
    let smoothScale = 1;
    let smoothGlow = 0;
    let lastBeatIdx = -1;
    const startTime = Date.now();
    let introY = -40;
    let introScale = 1.1;
    const loop = () => {
      const el = titleRef.current;
      if (!el) { titleRafRef.current = requestAnimationFrame(loop); return; }

      // Intro ease-out over first 800ms
      const elapsed = (Date.now() - startTime) / 800;
      const introT = Math.min(1, elapsed);
      const ease = 1 - Math.pow(1 - introT, 3); // cubic ease-out
      introY = -40 * (1 - ease);
      introScale = 1 + 0.1 * (1 - ease);

      const audio = audioRef?.current;
      let beat = 0;
      if (audio && !audio.paused && audio.currentTime > 0) {
        const t = audio.currentTime;
        if (t >= BEAT_OFFSET) {
          const beatIdx = Math.floor((t - BEAT_OFFSET) / BEAT_INTERVAL);
          if (beatIdx > lastBeatIdx) {
            lastBeatIdx = beatIdx;
            beat = 1;
          }
        }
        const beatElapsed = ((audio.currentTime - BEAT_OFFSET) % BEAT_INTERVAL) / BEAT_INTERVAL;
        beat = beatElapsed < 0.1 ? 1 - beatElapsed / 0.1 : 0;
      }

      smoothScale += ((introScale + beat * 0.06) - smoothScale) * 0.3;
      smoothGlow += (beat - smoothGlow) * 0.3;

      const glowStrength = 30 + smoothGlow * 50;
      const glowStrength2 = 60 + smoothGlow * 80;
      const brightness = 1.1 + smoothGlow * 0.3;

      el.style.transform = `translateY(${introY.toFixed(1)}px) scale(${smoothScale.toFixed(3)})`;
      el.style.filter = `drop-shadow(0 0 ${glowStrength.toFixed(0)}px rgba(255,255,255,${(0.3 + smoothGlow * 0.4).toFixed(2)})) drop-shadow(0 0 ${glowStrength2.toFixed(0)}px rgba(255,255,255,${(0.15 + smoothGlow * 0.25).toFixed(2)})) brightness(${brightness.toFixed(2)})`;

      titleRafRef.current = requestAnimationFrame(loop);
    };
    titleRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(titleRafRef.current);
  }, [visible, audioRef, reducedMotion]);

  const mono = 'var(--font-geist-mono)';
  const arcade = 'var(--font-arcade)';

  const green = '#00e676';
  const dim = 'rgba(255,255,255,0.25)';
  const mid = 'rgba(255,255,255,0.5)';
  const bright = 'rgba(255,255,255,0.85)';

  return (
    <section ref={sectionRef} className="relative flex flex-col items-center justify-center px-6" style={{ background: 'transparent', paddingTop: '6vh', paddingBottom: 0 }}>
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-24" />

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: titlePos.mt, marginBottom: titlePos.mb, width: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={titleRef}
          src="/images/github_text.webp"
          alt="GitHub"
          className="pointer-events-none"
          style={{
            width: 'min(715px, 90vw)',
            height: 'auto',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.6s ease',
            filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3)) drop-shadow(0 0 60px rgba(255,255,255,0.15)) brightness(1.1)',
          }}
        />
        {/* Pixel noise overlay */}
        <TitleNoise visible={visible} reducedMotion={reducedMotion} />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 720, borderRadius: 12, boxShadow: '10px 14px 30px rgba(255,255,255,0.15), 4px 6px 10px rgba(255,255,255,0.1)', overflow: 'visible' }}>
      {/* Cat — left side, outside terminal clip */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={catRef}
        src="/images/cat_github.webp"
        alt=""
        style={{
          position: 'absolute',
          left: catPos.left,
          bottom: catPos.bottom,
          width: catPos.size,
          height: 'auto',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease 0.3s',
          pointerEvents: 'none',
          zIndex: -1,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
        }}
      />

      {/* Gear — right side, outside terminal clip */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={gearRef}
        src="/images/right_gear.webp"
        alt=""
        style={{
          position: 'absolute',
          right: gearPos.right,
          bottom: gearPos.bottom,
          height: gearPos.size,
          width: 'auto',
          maxWidth: 'none',
          opacity: visible ? 1 : 0,
          transformOrigin: '90% 50%',
          transition: 'opacity 0.8s ease 0.4s',
          pointerEvents: 'none',
          zIndex: -1,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
        }}
      />

      <div style={{
        width: '100%',
        maxWidth: 720,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,14,10,0.65)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 12,
        opacity: visible ? 1 : 0,
        animation: visible ? 'github-terminal-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both' : 'none',
      }}>

        {/* Slow-moving gradient overlay */}
        <div className="terminal-gradient" style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 90% 70% at 20% 30%, rgba(0,230,118,0.09) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 80% 70%, rgba(80,120,255,0.07) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,230,118,0.04) 0%, transparent 60%)',
          backgroundSize: '200% 200%',
          zIndex: 0,
          pointerEvents: 'none',
        }} />

        {/* Slow metal shine sweep */}
        <div className="terminal-shine" style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '50%',
          height: '100%',
          background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.04) 44%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 56%, transparent 65%)',
          zIndex: 10,
          pointerEvents: 'none',
        }} />

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: arcade, fontSize: 11, color: green, letterSpacing: '0.1em' }}>CFM WEBRING</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: dim, letterSpacing: '0.05em' }}>TERMINAL</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: mono, fontSize: 10, color: green }}>● LIVE</span>
            <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>v1.0.0</span>
          </div>
        </div>

        {/* Ticker tape */}
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '6px 0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <div style={{
            display: 'inline-flex', gap: 24, paddingLeft: 16,
            animation: visible ? 'ticker-scroll 20s linear infinite' : 'none',
          }}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
              <span key={i} style={{ fontFamily: mono, fontSize: 10, whiteSpace: 'nowrap' }}>
                <span style={{ color: mid, fontWeight: 600 }}>{t.sym}</span>
                <span style={{ color: dim }}> {t.val} </span>
                <span style={{ color: t.up ? green : '#ff5252' }}>{t.change}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Main content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

          {/* Left panel — Contribution Graph */}
          <div style={{ padding: '16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontFamily: mono, fontSize: 9, color: dim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Commits / Week</span>
              <span style={{ fontFamily: mono, fontSize: 9, color: dim }}>1Y</span>
            </div>

            <div style={{ position: 'relative', width: '100%', height: 140, marginBottom: 12 }}>
              <CommitBarChart green={green} visible={visible} reducedMotion={reducedMotion} />
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'COMMITS', value: ghStats ? String(ghStats.commits || '—') : '—' },
                { label: 'FORKS', value: ghStats ? String(ghStats.forks) : '—' },
                { label: 'STARS', value: ghStats ? String(ghStats.stars) : '—' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: mono, fontSize: 8, color: dim, letterSpacing: '0.08em', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontFamily: mono, fontSize: 14, color: bright, fontWeight: 600 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — Positions (auto-scroll) */}
          <PositionsPanel mono={mono} dim={dim} mid={mid} bright={bright} green={green} />
        </div>

        {/* Bottom panel — Contributors + CTAs */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px', display: 'flex', gap: 16 }}>

          {/* Contributors */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Traders
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { name: 'Daniel W. Liu', role: 'Frontend · Design · 3D', stat: 'CFM 2030' },
                { name: 'Aadya Khanna', role: 'Backend · API · Marketing', stat: 'CFM 2030' },
              ].map((c, i) => (
                <div key={i}>
                  <div style={{ fontFamily: mono, fontSize: 12, color: bright, marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: dim, marginBottom: 1 }}>{c.role}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: green }}>{c.stat}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="github-cta-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, minWidth: 180 }}>
            {/* Star label — 8-bit bounce loop, changes on button hover */}
            <span className="star-on-github" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: arcade, fontSize: 10, letterSpacing: '0.1em',
              color: green,
            }}>
              <span className="star-icon-wrap" style={{ display: 'inline-flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffd700" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <span className="star-text">STAR ON GITHUB</span>
            </span>

            {/* Contribute button */}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="github-contribute-btn"
              style={{
                fontFamily: arcade,
                fontSize: 14,
                letterSpacing: '0.12em',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '12px 28px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 24px rgba(0,230,118,0.06)',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ position: 'relative', zIndex: 1 }}>
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span style={{ position: 'relative', zIndex: 1 }}>CONTRIBUTE</span>
            </a>
          </div>
        </div>
      </div>
      </div>

      {/* Footer */}
      <div style={{
        fontFamily: arcade,
        fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
        marginTop: '2vh',
        letterSpacing: '0.12em',
        textAlign: 'center',
      }}>
        BUILT BY CFM STUDENTS  //  2026
      </div>


      <style>{`
        /* Intro animations */
        @keyframes github-title-drop {
          0%   { opacity: 0; transform: translateY(-40px) scale(1.1); }
          60%  { opacity: 1; transform: translateY(4px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes github-terminal-rise {
          0%   { opacity: 0; transform: translateY(50px); }
          50%  { opacity: 1; }
          75%  { opacity: 1; transform: translateY(-3px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes github-cat-enter {
          0%   { opacity: 0; transform: translateX(-80px) rotate(25deg); }
          60%  { opacity: 1; transform: translateX(8px) rotate(10deg); }
          80%  { transform: translateX(-3px) rotate(14deg); }
          100% { opacity: 1; transform: translateX(0) rotate(13deg); }
        }
        @keyframes github-gear-enter {
          0%   { opacity: 0; transform: translateX(80px) rotate(-180deg); }
          60%  { opacity: 1; transform: translateX(-5px) rotate(10deg); }
          80%  { transform: translateX(2px) rotate(-5deg); }
          100% { opacity: 1; transform: translateX(0) rotate(0deg); }
        }

        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes terminal-gradient-drift {
          0%   { background-position: 0% 0%; }
          25%  { background-position: 100% 50%; }
          50%  { background-position: 50% 100%; }
          75%  { background-position: 0% 50%; }
          100% { background-position: 0% 0%; }
        }
        .terminal-gradient {
          animation: terminal-gradient-drift 10s ease infinite;
        }
        @keyframes terminal-shine-sweep {
          0%, 70% { left: -100%; }
          100% { left: 200%; }
        }
        .terminal-shine {
          animation: terminal-shine-sweep 8s ease-in-out infinite;
        }
        @keyframes positions-scroll-up {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .positions-marquee {
          animation: positions-scroll-up 20s linear infinite;
          will-change: transform;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        .positions-marquee:hover {
          animation-play-state: paused;
        }

        .github-contribute-btn {
          box-shadow: 0 4px 20px rgba(0,0,0,0.35), 0 2px 8px rgba(0,230,118,0.08), inset 0 1px 0 rgba(255,255,255,0.15) !important;
        }
        .github-contribute-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 60%; height: 100%;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 48%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.12) 52%, transparent 60%);
          transition: left 0.5s ease;
        }
        .github-contribute-btn:hover::before {
          left: 150%;
        }
        .github-contribute-btn:hover {
          background: linear-gradient(135deg, rgba(0,230,118,0.18) 0%, rgba(0,230,118,0.06) 100%) !important;
          border-color: rgba(0,230,118,0.4) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(0,230,118,0.2), 0 0 80px rgba(0,230,118,0.08), inset 0 1px 0 rgba(255,255,255,0.2) !important;
          transform: translateY(-2px);
        }
        .github-contribute-btn:active {
          transform: translateY(0px) scale(0.97);
          box-shadow: 0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1) !important;
        }
        .github-star-link:hover {
          background: rgba(255,215,0,0.06) !important;
          border-color: rgba(255,215,0,0.2) !important;
          box-shadow: 0 0 12px rgba(255,215,0,0.08);
        }
        /* 8-bit bounce — snappy steps like a pixel sprite */
        @keyframes star-8bit-bounce {
          0%, 100% { transform: translateY(0); }
          15% { transform: translateY(-6px); }
          30% { transform: translateY(0); }
          40% { transform: translateY(-3px); }
          50% { transform: translateY(0); }
        }
        @keyframes star-spin {
          0%, 100% { transform: rotateY(0deg); }
          25% { transform: rotateY(180deg); }
          50% { transform: rotateY(360deg); }
        }
        @keyframes star-text-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        /* Default idle: 8-bit bounce */
        .star-on-github {
          animation: star-8bit-bounce 1.2s steps(6) infinite;
        }
        .star-icon-wrap {
          animation: star-spin 3s linear infinite;
        }
        .star-text {
          text-shadow: 0 0 8px rgba(0,230,118,0.3);
        }
        /* On contribute button hover */
        .github-cta-group:hover .star-on-github {
          animation: star-8bit-bounce 0.7s steps(6) infinite;
          transform: scale(1.3);
          transition: transform 0.2s ease;
          color: #39ff7f;
        }
        .github-cta-group:hover .star-icon-wrap {
          animation: star-spin 1.5s linear infinite;
        }
        .github-cta-group:hover .star-text {
          color: #39ff7f;
          text-shadow: 0 0 16px rgba(57,255,127,0.8), 0 0 32px rgba(57,255,127,0.4);
        }
      `}</style>
    </section>
  );
}
