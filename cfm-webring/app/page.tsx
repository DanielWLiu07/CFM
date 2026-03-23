'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import PixelTrail from './components/PixelTrail';
import ReadyOverlay from './components/ReadyOverlay';
import AboutSection from './components/AboutSection';
import MuteButton from './components/MuteButton';
import ClassSection from './components/ClassSection';
import WebringSection from './components/WebringSection';
import GearTuner from './components/GearTuner';
import GithubSection from './components/GithubSection';

const MAX_CRUSH   = 180;
const STIFFNESS   = 0.35;  // spring pull toward target
const DAMPING     = 0.72;  // < 1 = underdamped → overshoot/bounce
const BEAT_INTERVAL = 60 / 93; // ~0.645s — derived from 25 recorded cycles
const BEAT_OFFSET   = 0.229;     // seconds before first beat

export default function Home() {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [activeRoute, setActiveRoute] = useState('/');
  const visibleSections = useRef(new Set<string>());

  const updateActiveRoute = useCallback(() => {
    // Priority: bottommost visible section wins
    const priority = ['/webring', '/class', '/about'];
    for (const route of priority) {
      if (visibleSections.current.has(route)) {
        setActiveRoute(route);
        window.history.replaceState(null, '', route);
        return;
      }
    }
    setActiveRoute('/');
    window.history.replaceState(null, '', '/');
  }, []);

  const handleAboutVisibility = useCallback((visible: boolean) => {
    if (visible) visibleSections.current.add('/about');
    else visibleSections.current.delete('/about');
    updateActiveRoute();
  }, [updateActiveRoute]);

  const handleClassVisibility = useCallback((visible: boolean) => {
    if (visible) visibleSections.current.add('/class');
    else visibleSections.current.delete('/class');
    updateActiveRoute();
  }, [updateActiveRoute]);

  const handleWebringVisibility = useCallback((visible: boolean) => {
    if (visible) visibleSections.current.add('/webring');
    else visibleSections.current.delete('/webring');
    updateActiveRoute();
  }, [updateActiveRoute]);

  const audioRef       = useRef<HTMLAudioElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const animFrameRef   = useRef<number>(0);
  const crushRef       = useRef<number>(0);
  const crushVelRef    = useRef<number>(0);
  const crushTargetRef = useRef<number>(0);
  const leftWireRef    = useRef<HTMLImageElement>(null);
  const rightWireRef   = useRef<HTMLImageElement>(null);
  const introOffsetRef = useRef<number>(800); // wires start 800px off-screen
  const shakeRef       = useRef<number>(0);   // screen shake intensity
  const videoWrapRef   = useRef<HTMLDivElement>(null);
  const leftGearRef    = useRef<HTMLImageElement>(null);
  const rightGearRef   = useRef<HTMLImageElement>(null);
  const leftGear2Ref   = useRef<HTMLImageElement>(null);
  const rightGear2Ref  = useRef<HTMLImageElement>(null);
  const leftGear3Ref   = useRef<HTMLImageElement>(null);
  const rightGear3Ref  = useRef<HTMLImageElement>(null);
  const sepWiresRef    = useRef<HTMLImageElement>(null);
  const sepCrushRef    = useRef<number>(0);
  const sepCrushVelRef = useRef<number>(0);
  const sepTargetRef   = useRef<number>(0);
  const gearAngleRef   = useRef<number>(0);
  const gear2AngleRef  = useRef<number>(0);
  const gear3AngleRef  = useRef<number>(0);
  const webringTitleRef = useRef<HTMLImageElement>(null);
  const starLeftRef     = useRef<HTMLImageElement>(null);
  const starRightRef    = useRef<HTMLImageElement>(null);
  const webringBeatRef  = useRef<number>(0);

  // ── rAF loop ───────────────────────────────────────────────────────────────
  // Beats are driven from audio.currentTime — perfectly locked to the music.
  // On music loop, beat index resets so sync is restored every cycle.
  // Intro offset decays to 0 over the first ~0.8s, then crush runs unaffected.
  const startLoop = () => {
    let lastAudioTime = 0;
    let lastFiredIdx  = -1;
    const introStart  = performance.now();
    const INTRO_DUR   = 800; // ms for wires to slide in

    const loop = () => {
      const t = audioRef.current?.currentTime ?? 0;

      // audio loop detected → hold crush pose, restart beat sequence
      if (t < lastAudioTime - 1) {
        crushTargetRef.current = MAX_CRUSH;
        lastFiredIdx = -1;
      }
      lastAudioTime = t;

      if (t >= BEAT_OFFSET) {
        const beatIdx = Math.floor((t - BEAT_OFFSET) / BEAT_INTERVAL);
        if (beatIdx > lastFiredIdx) {
          lastFiredIdx = beatIdx;
          crushTargetRef.current = beatIdx % 2 === 0 ? 0 : MAX_CRUSH;
          sepTargetRef.current = beatIdx % 2 === 0 ? 0 : 1;
          // Trigger shake on slam beats (odd = crush inward)
          if (beatIdx % 2 === 1) {
            shakeRef.current = 0.04;
          }
          // Webring title beat pulse
          webringBeatRef.current = 1;
          // Gears swing between -15 and 15 on beat
          if (beatIdx % 2 === 1) {
            gearAngleRef.current = 15;
            gear2AngleRef.current = 15;
            gear3AngleRef.current = 15;
          } else {
            gearAngleRef.current = -15;
            gear2AngleRef.current = -15;
            gear3AngleRef.current = -15;
          }
        }
      }

      crushVelRef.current += (crushTargetRef.current - crushRef.current) * STIFFNESS;
      crushVelRef.current *= DAMPING;
      crushRef.current += crushVelRef.current;

      // Screen shake — scale bump that decays quickly
      if (shakeRef.current > 0.001) {
        shakeRef.current *= 0.88;
      } else {
        shakeRef.current = 0;
      }
      const scale = 1 + shakeRef.current;
      if (videoWrapRef.current)
        videoWrapRef.current.style.transform = `scale(${scale})`;

      // Gear rotation — smooth transition applied via CSS, rAF just sets the angle
      const angle = gearAngleRef.current;
      if (leftGearRef.current)
        leftGearRef.current.style.transform = `rotate(${angle}deg)`;
      if (rightGearRef.current)
        rightGearRef.current.style.transform = `rotate(${-angle}deg)`;
      // Gear 2
      const angle2 = gear2AngleRef.current;
      if (leftGear2Ref.current)
        leftGear2Ref.current.style.transform = `rotate(${angle2}deg)`;
      if (rightGear2Ref.current)
        rightGear2Ref.current.style.transform = `rotate(${-angle2}deg)`;
      // Gear 3
      const angle3 = gear3AngleRef.current;
      if (leftGear3Ref.current)
        leftGear3Ref.current.style.transform = `rotate(${angle3}deg)`;
      if (rightGear3Ref.current)
        rightGear3Ref.current.style.transform = `rotate(${-angle3}deg)`;

      // Webring title — beat-driven scale + glow
      webringBeatRef.current *= 0.92;
      const wb = webringBeatRef.current;
      if (webringTitleRef.current) {
        const s = 1 + wb * 0.04;
        const y = -wb * 4;
        const bright = 1.1 + wb * 0.15;
        const glow1 = 30 + wb * 15;
        const glowA1 = 0.3 + wb * 0.15;
        const glow2 = 60 + wb * 20;
        const glowA2 = 0.15 + wb * 0.1;
        webringTitleRef.current.style.transform = `translateX(-50%) translateY(${y}px) scale(${s})`;
        webringTitleRef.current.style.filter = `drop-shadow(0 0 ${glow1}px rgba(255,255,255,${glowA1})) drop-shadow(0 0 ${glow2}px rgba(255,255,255,${glowA2})) brightness(${bright})`;
      }

      // Stars — beat-driven opacity + scale + glow
      const starOpacity = 0.75 + wb * 0.25; // 0.75 → 1.0 on beat
      const starScale = 1 + wb * 0.12;
      const starBright = 1 + wb * 0.4;
      const starGlow = 10 + wb * 30;
      const starGlowA = 0.2 + wb * 0.5;
      if (starLeftRef.current) {
        starLeftRef.current.style.opacity = `${starOpacity}`;
        starLeftRef.current.style.transform = `translateY(${-wb * 3}px) scale(${starScale})`;
        starLeftRef.current.style.filter = `drop-shadow(0 0 ${starGlow}px rgba(255,255,255,${starGlowA})) brightness(${starBright})`;
      }
      if (starRightRef.current) {
        starRightRef.current.style.opacity = `${starOpacity}`;
        starRightRef.current.style.transform = `translateY(${-wb * 3}px) scale(${starScale})`;
        starRightRef.current.style.filter = `drop-shadow(0 0 ${starGlow}px rgba(255,255,255,${starGlowA})) brightness(${starBright})`;
      }

      // Separate wires — spring-driven scaleY pulse on beat
      sepCrushVelRef.current += (sepTargetRef.current - sepCrushRef.current) * STIFFNESS;
      sepCrushVelRef.current *= DAMPING;
      sepCrushRef.current += sepCrushVelRef.current;
      if (sepWiresRef.current)
        sepWiresRef.current.style.transform = `translateY(-45%) scaleY(${1 + sepCrushRef.current * 0.3})`;

      // Intro slide-in: easeOut from 800 → 0
      const elapsed = performance.now() - introStart;
      const progress = Math.min(1, elapsed / INTRO_DUR);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      introOffsetRef.current = 800 * (1 - eased);

      if (leftWireRef.current)
        leftWireRef.current.style.transform = `translateX(${crushRef.current - introOffsetRef.current}px)`;
      if (rightWireRef.current)
        rightWireRef.current.style.transform = `translateX(${-crushRef.current + introOffsetRef.current}px)`;

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  };

  // ── "ready?" click — start everything immediately ─────────────────────────
  const handleStart = async () => {
    setStarted(true);
    videoRef.current!.currentTime = 0;
    audioRef.current!.currentTime = 0;
    audioRef.current!.muted = muted;
    // Ensure both are actually playing before starting the beat loop
    await Promise.all([
      videoRef.current!.play(),
      audioRef.current!.play(),
    ]);
    startLoop();
  };

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      localStorage.setItem('cfm-muted', String(next));
      return next;
    });
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    if (v === 0) {
      setMuted(true);
      if (audioRef.current) audioRef.current.muted = true;
    } else if (muted) {
      setMuted(false);
      if (audioRef.current) audioRef.current.muted = false;
    }
    localStorage.setItem('cfm-volume', String(v));
  }, [muted]);

  // Restore mute/volume preferences from localStorage after hydration
  useEffect(() => {
    const storedMuted = localStorage.getItem('cfm-muted') === 'true';
    if (storedMuted) {
      setMuted(true);
      if (audioRef.current) audioRef.current.muted = true;
    }
    const storedVol = localStorage.getItem('cfm-volume');
    if (storedVol !== null) {
      const v = parseFloat(storedVol);
      setVolume(v);
      if (audioRef.current) audioRef.current.volume = v;
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', !started);
    document.documentElement.classList.toggle('overflow-hidden', !started);
  }, [started]);

  // Always start at top with overlay on load
  useEffect(() => {
    window.scrollTo(0, 0);
    window.history.replaceState(null, '', '/');
    setActiveRoute('/');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const CLICKABLE_PANELS = [
    { id: 'cfm',       href: 'https://uwaterloo.ca/future-students/programs/computing-and-financial-management', x: 0.7,  y: 8.0,  w: 32.3, h: 20.8 },
    { id: 'waterloo',  href: 'https://uwaterloo.ca/', x: 63.8, y: 7.7,  w: 33.4, h: 21.5 },
    { id: 'cs',        href: '#', x: 1.9,  y: 36.4, w: 33.7, h: 22.3 },
    { id: 'finance',   href: '#', x: 64.1, y: 38.8, w: 33.4, h: 22.4 },
  ];

  return (
    <div className="bg-black" style={{ overflowX: 'clip' }}>

      <div className="fixed top-4 left-3 z-[100]">
        <Navbar activeRoute={activeRoute} />
      </div>

      <audio ref={audioRef} src="/music/thick_of_it_thomas_remix.mp3" loop />

      {!started && <ReadyOverlay onStart={handleStart} muted={muted} onToggleMute={toggleMute} volume={volume} onVolumeChange={handleVolumeChange} />}

      <div ref={videoWrapRef} className="relative h-screen" style={{ willChange: 'transform', zIndex: 2 }}>

        <img ref={leftWireRef} src="/images/side_wires.png"
          className="absolute top-0 h-full w-auto z-20 pointer-events-none"
          style={{ right: 'calc(50% + 100vh * 1512 / 1964)', willChange: 'transform', transform: 'translateX(-800px)' }}
        />
        <img ref={rightWireRef} src="/images/side_wires.png"
          className="absolute top-0 h-full w-auto z-20 pointer-events-none"
          style={{ left: 'calc(50% + 100vh * 1512 / 1964)', willChange: 'transform', transform: 'translateX(800px)' }}
        />

        <div className="absolute inset-x-0 top-0 pointer-events-none z-30" style={{ height: '5%', background: 'linear-gradient(to bottom, black, transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none z-30" style={{ height: '5%', background: 'linear-gradient(to top, black, transparent)' }} />

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 h-full" style={{ aspectRatio: '3024 / 1964' }}>
            <video ref={videoRef} src="/videos/landing_page.mp4"
              loop muted playsInline className="h-full w-full"
            />
            <div className="absolute inset-y-0 left-0 w-24 pointer-events-none" style={{ background: 'linear-gradient(to right, black, transparent)' }} />
            <div className="absolute inset-y-0 right-0 w-24 pointer-events-none" style={{ background: 'linear-gradient(to left, black, transparent)' }} />
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <PixelTrail gridSize={100} trailSize={0.02} maxAge={250} interpolate={2} color="#ffffff" />
          </div>
          {/* Clickable panel areas */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 h-full" style={{ aspectRatio: '3024 / 1964', zIndex: 40 }}>
            {CLICKABLE_PANELS.map(p => (
              <a key={p.id} href={p.href} target="_blank" rel="noopener noreferrer"
                className="absolute block cursor-pointer"
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Black gap between hero and about — with gears straddling the boundary */}
      <div className="relative h-12 bg-black" style={{ zIndex: 60, overflow: 'visible' }}>
        {/* Horizontal wires spanning the boundary */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={sepWiresRef}
          src="/images/sepereate_wires.png"
          alt=""
          className="absolute left-0 w-full pointer-events-none select-none"
          style={{
            top: '50%',
            transform: 'translateY(-45%)',
            width: '100%',
            height: 'auto',
            zIndex: 0,
            willChange: 'transform',
          }}
        />
        {/* Fixed-width gear container — crops from center on narrow screens */}
        <div className="absolute pointer-events-none" style={{ left: '50%', transform: 'translateX(-50%)', width: 1440, height: '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={leftGearRef}
            src="/images/left_gear.png"
            alt=""
            className="absolute pointer-events-none select-none"
            style={{
              bottom: '-1200%',
              left: '-10%',
              height: '900px',
              minHeight: '900px',
              width: 'auto',
              maxWidth: 'none',
              transformOrigin: '10% 50%',
              transition: 'transform 0.15s ease-out',
              zIndex: 2,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={rightGearRef}
            src="/images/right_gear.png"
            alt=""
            className="absolute pointer-events-none select-none"
            style={{
              bottom: '-1200%',
              right: '-10%',
              height: '900px',
              minHeight: '900px',
              width: 'auto',
              maxWidth: 'none',
              transformOrigin: '90% 50%',
              transition: 'transform 0.15s ease-out',
              zIndex: 2,
            }}
          />
          {/* Center gears — behind the others */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={leftGear2Ref}
            src="/images/left_gear.png"
            alt=""
            className="absolute pointer-events-none select-none"
            style={{
              bottom: '-1650%',
              left: '-6%',
              height: '500px',
              minHeight: '500px',
              width: 'auto',
              maxWidth: 'none',
              transformOrigin: '10% 50%',
              transition: 'transform 0.15s ease-out',
              zIndex: 3,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={rightGear2Ref}
            src="/images/right_gear.png"
            alt=""
            className="absolute pointer-events-none select-none"
            style={{
              bottom: '-1650%',
              right: '-6%',
              height: '500px',
              minHeight: '500px',
              width: 'auto',
              maxWidth: 'none',
              transformOrigin: '90% 50%',
              transition: 'transform 0.15s ease-out',
              zIndex: 3,
            }}
          />
          {/* Third gears — same size as first, different sync */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={leftGear3Ref}
            src="/images/left_gear.png"
            alt=""
            className="absolute pointer-events-none select-none"
            style={{
              bottom: '-2500%',
              left: '-8%',
              height: '650px',
              minHeight: '650px',
              width: 'auto',
              maxWidth: 'none',
              transformOrigin: '10% 50%',
              transition: 'transform 0.15s ease-out',
              zIndex: 2,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={rightGear3Ref}
            src="/images/right_gear.png"
            alt=""
            className="absolute pointer-events-none select-none"
            style={{
              bottom: '-2500%',
              right: '-8%',
              height: '650px',
              minHeight: '650px',
              width: 'auto',
              maxWidth: 'none',
              transformOrigin: '90% 50%',
              transition: 'transform 0.15s ease-out',
              zIndex: 2,
            }}
          />
          {/* Cat watching — above gears */}
          <div
            className="absolute pointer-events-none select-none"
            style={{
              bottom: '-2400%', left: '-22%',
              height: '900px', width: 'auto', zIndex: 5,
              transformOrigin: '25% 89%', animation: 'cat-bob 3s ease-in-out infinite',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/cat_watching.png"
              alt=""
              style={{
                height: '100%', width: 'auto', maxWidth: 'none',
                WebkitMaskImage: 'linear-gradient(to bottom, black 65%, rgba(0,0,0,0) 85%)',
                maskImage: 'linear-gradient(to bottom, black 65%, rgba(0,0,0,0) 85%)',
              }}
            />
          </div>
        </div>
      </div>

      <div id="about" style={{ position: 'relative', zIndex: 50 }}>
        <AboutSection onVisibilityChange={handleAboutVisibility} audioRef={audioRef} />
      </div>

      <div id="class" className="relative">
        {/* Black background — behind gears/cat (z:50 < gears z:60) */}
        <div className="absolute inset-0 bg-black" style={{ position: 'absolute', zIndex: 50 }} />
        {/* Content — above gears/cat (z:65 > gears z:60) */}
        <div style={{ position: 'relative', zIndex: 65 }}>
          <ClassSection onVisibilityChange={handleClassVisibility} />
        </div>
      </div>

      <div id="webring" style={{ position: 'relative', zIndex: 70 }}>
        {/* Webring title — JS-driven beat animation synced to audio */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={webringTitleRef}
          src="/images/webring_text.png"
          alt="WEBRING"
          style={{
            position: 'absolute',
            top: '-4vw',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'clamp(350px, 55vw, 700px)',
            height: 'auto',
            zIndex: 50,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3)) drop-shadow(0 0 60px rgba(255,255,255,0.15)) brightness(1.1)',
          }}
        />
        {/* Stars flanking the title */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={starLeftRef}
          src="/images/star_left.png"
          alt=""
          style={{
            position: 'absolute',
            top: '-6vw',
            left: 'calc(50% - clamp(250px, 38vw, 500px))',
            width: 'clamp(100px, 12vw, 180px)',
            height: 'auto',
            maxWidth: 'none',
            zIndex: 50,
            pointerEvents: 'none',
            opacity: 0.75,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={starRightRef}
          src="/images/star_right.png"
          alt=""
          style={{
            position: 'absolute',
            top: '-6vw',
            right: 'calc(50% - clamp(250px, 38vw, 500px))',
            width: 'clamp(100px, 12vw, 180px)',
            height: 'auto',
            maxWidth: 'none',
            zIndex: 50,
            pointerEvents: 'none',
            opacity: 0.75,
          }}
        />
        <WebringSection onVisibilityChange={handleWebringVisibility} audioRef={audioRef} />
      </div>

      <div id="github" style={{ position: 'relative', zIndex: 75 }}>
        <GithubSection />
      </div>

      <div className="fixed bottom-4 right-4 z-[999]">
        <MuteButton muted={muted} onToggle={toggleMute} volume={volume} onVolumeChange={handleVolumeChange} />
      </div>

      <GearTuner gears={[
        { ref1: leftGearRef, ref2: rightGearRef, label: 'GEAR 1 (top)', defaults: { bottom: -1200, lr: -10, height: 900, z: 2 } },
        { ref1: leftGear2Ref, ref2: rightGear2Ref, label: 'GEAR 2 (mid)', defaults: { bottom: -1650, lr: -6, height: 500, z: 3 } },
        { ref1: leftGear3Ref, ref2: rightGear3Ref, label: 'GEAR 3 (bot)', defaults: { bottom: -2500, lr: -8, height: 650, z: 2 } },
      ]} />

    </div>
  );
}
