'use client';

import { useRef, useEffect, useState, useCallback, type RefObject } from 'react';
import { BEAT_INTERVAL, BEAT_OFFSET } from '../lib/beats';
import { FONT, COLOR } from '../lib/theme';
import { REPO_URL, TICKER_ITEMS } from './github/data';
import { CommitBarChart } from './github/CommitBarChart';
import { TitleNoise } from './github/TitleNoise';
import { PositionsPanel } from './github/PositionsPanel';
import './github/GithubSection.css';

interface AnimSettings {
  titleDuration: number;   // ms
  titleDelay: number;      // ms
  terminalDuration: number;
  terminalDelay: number;
  catDuration: number;
  catDelay: number;
  gearDuration: number;
  gearDelay: number;
  overshoot: number;       // 0-2 (bounce intensity)
}

const DEFAULT_SETTINGS: AnimSettings = {
  titleDuration: 800,
  titleDelay: 0,
  terminalDuration: 900,
  terminalDelay: 200,
  catDuration: 1000,
  catDelay: 300,
  gearDuration: 1200,
  gearDelay: 400,
  overshoot: 1,
};

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
  const [replayKey, setReplayKey] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [animSettings, setAnimSettings] = useState<AnimSettings>(DEFAULT_SETTINGS);
  const [ghStats, setGhStats] = useState<{ stars: number; forks: number; commits: number } | null>(null);
  const [catPos, setCatPos] = useState({ left: -415, bottom: -95, size: 435, rotate: 13 });
  const [gearPos, setGearPos] = useState({ right: -490, bottom: -280, size: 830 });
  const [titlePos] = useState({ height: 715, mt: -50, mb: 20 });

  const replay = useCallback(() => {
    setVisible(false);
    // Cancel ongoing animation frames
    cancelAnimationFrame(gearRafRef.current);
    cancelAnimationFrame(catRafRef.current);
    cancelAnimationFrame(titleRafRef.current);
    // Reset transforms
    if (titleRef.current) titleRef.current.style.opacity = '0';
    if (catRef.current) catRef.current.style.opacity = '0';
    if (gearRef.current) gearRef.current.style.opacity = '0';
    setTimeout(() => {
      setReplayKey(k => k + 1);
      setVisible(true);
    }, 100);
  }, []);

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
    const { gearDuration, gearDelay, overshoot } = animSettings;
    const loop = () => {
      const gear = gearRef.current;
      if (!gear) { gearRafRef.current = requestAnimationFrame(loop); return; }

      const elapsed = Math.max(0, (Date.now() - startTime - gearDelay)) / gearDuration;
      const introT = Math.min(1, elapsed);
      const ease = 1 - Math.pow(1 - introT, 3);
      const introX = 80 * (1 - ease) * overshoot;
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
  }, [visible, audioRef, reducedMotion, replayKey, animSettings]);

  // Beat-synced cat bob — intro slide from left + smash down on beat
  useEffect(() => {
    if (!visible || reducedMotion) return;
    const baseRotate = 13;
    let smoothY = 0;
    let lastBeatIdx = -1;
    let velocity = 0;
    const startTime = Date.now();
    let introX = -80;
    const { catDuration, catDelay, overshoot } = animSettings;
    const loop = () => {
      const cat = catRef.current;
      if (!cat) { catRafRef.current = requestAnimationFrame(loop); return; }

      const elapsed = Math.max(0, (Date.now() - startTime - catDelay)) / catDuration;
      const introT = Math.min(1, elapsed);
      const ease = 1 - Math.pow(1 - introT, 3);
      introX = -80 * (1 - ease) * overshoot;

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
  }, [visible, audioRef, reducedMotion, replayKey, animSettings]);

  // Beat-synced title — intro slide + scale pulse + glow
  useEffect(() => {
    if (!visible || reducedMotion) return;
    let smoothScale = 1;
    let smoothGlow = 0;
    let lastBeatIdx = -1;
    const startTime = Date.now();
    let introY = -40;
    let introScale = 1.1;
    const { titleDuration, titleDelay, overshoot } = animSettings;
    const loop = () => {
      const el = titleRef.current;
      if (!el) { titleRafRef.current = requestAnimationFrame(loop); return; }

      const elapsed = Math.max(0, (Date.now() - startTime - titleDelay)) / titleDuration;
      const introT = Math.min(1, elapsed);
      const ease = 1 - Math.pow(1 - introT, 3);
      introY = -40 * (1 - ease) * overshoot;
      introScale = 1 + 0.1 * (1 - ease) * overshoot;

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
  }, [visible, audioRef, reducedMotion, replayKey, animSettings]);

  const { mono, arcade } = FONT;
  const { green, dim, mid, bright } = COLOR;

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

      <div key={`terminal-${replayKey}`} style={{
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
        animation: visible ? `github-terminal-rise ${animSettings.terminalDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${animSettings.terminalDelay}ms both` : 'none',
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
              <CommitBarChart green={green} visible={visible} reducedMotion={reducedMotion} totalCommits={ghStats?.commits} />
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

      {/* Replay & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button
          onClick={replay}
          style={{
            fontFamily: arcade,
            fontSize: 11,
            letterSpacing: '0.1em',
            color: green,
            background: 'rgba(0,230,118,0.08)',
            border: '1px solid rgba(0,230,118,0.25)',
            borderRadius: 8,
            padding: '8px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,230,118,0.15)'; e.currentTarget.style.borderColor = 'rgba(0,230,118,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,230,118,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,230,118,0.25)'; }}
        >
          ▶ REPLAY
        </button>
        <button
          onClick={() => setShowControls(s => !s)}
          style={{
            fontFamily: mono,
            fontSize: 10,
            color: dim,
            background: showControls ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {showControls ? '✕ CLOSE' : '⚙ SETTINGS'}
        </button>
        <button
          onClick={() => setAnimSettings(DEFAULT_SETTINGS)}
          style={{
            fontFamily: mono,
            fontSize: 10,
            color: dim,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '8px 12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          RESET
        </button>
      </div>

      {showControls && (
        <div style={{
          marginTop: 12,
          width: '100%',
          maxWidth: 720,
          background: 'rgba(10,14,10,0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px 24px',
        }}>
          <div style={{ gridColumn: '1 / -1', fontFamily: arcade, fontSize: 10, color: green, letterSpacing: '0.1em', marginBottom: 4 }}>
            ANIMATION CONTROLS
          </div>

          {([
            { label: 'Title Duration', key: 'titleDuration' as const, min: 100, max: 3000, step: 50, unit: 'ms' },
            { label: 'Title Delay', key: 'titleDelay' as const, min: 0, max: 2000, step: 50, unit: 'ms' },
            { label: 'Terminal Duration', key: 'terminalDuration' as const, min: 100, max: 3000, step: 50, unit: 'ms' },
            { label: 'Terminal Delay', key: 'terminalDelay' as const, min: 0, max: 2000, step: 50, unit: 'ms' },
            { label: 'Cat Duration', key: 'catDuration' as const, min: 100, max: 3000, step: 50, unit: 'ms' },
            { label: 'Cat Delay', key: 'catDelay' as const, min: 0, max: 2000, step: 50, unit: 'ms' },
            { label: 'Gear Duration', key: 'gearDuration' as const, min: 100, max: 3000, step: 50, unit: 'ms' },
            { label: 'Gear Delay', key: 'gearDelay' as const, min: 0, max: 2000, step: 50, unit: 'ms' },
            { label: 'Overshoot', key: 'overshoot' as const, min: 0, max: 2, step: 0.1, unit: 'x' },
          ]).map(({ label, key, min, max, step, unit }) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: mono, fontSize: 9, color: dim, letterSpacing: '0.05em' }}>{label}</span>
                <span style={{ fontFamily: mono, fontSize: 9, color: mid }}>{animSettings[key]}{unit}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={animSettings[key]}
                onChange={e => setAnimSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                style={{
                  width: '100%',
                  accentColor: green,
                  height: 4,
                  cursor: 'pointer',
                }}
              />
            </div>
          ))}
        </div>
      )}

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
    </section>
  );
}
