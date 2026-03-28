'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Navbar, { type NavbarHandle } from './components/Navbar';
import PixelTrail from './components/PixelTrail';
import ReadyOverlay from './components/ReadyOverlay';
import AboutSection from './components/AboutSection';
import MuteButton from './components/MuteButton';
import ClassSection from './components/ClassSection';
import { DEFAULT_CONFIG } from './components/ClassTitle3D';
import WebringSection from './components/WebringSection';
import GithubSection from './components/GithubSection';
import ScrollReveal from './components/ScrollReveal';

const isDev = false; // change to process.env.NODE_ENV === 'development' to re-enable tuners
const GearTuner = isDev ? require('./components/GearTuner').default : () => null;
const DecoTuner = isDev ? require('./components/DecoTuner').default : () => null;
const RingTuner = isDev ? require('./components/RingTuner').default : () => null;
const SizeTuner = isDev ? require('./components/SizeTuner').default : () => null;

const MAX_CRUSH   = 180;
const STIFFNESS   = 0.35;  // spring pull toward target
const DAMPING     = 0.72;  // < 1 = underdamped → overshoot/bounce
const BEAT_INTERVAL = 60 / 93; // ~0.645s — derived from 25 recorded cycles
const BEAT_OFFSET   = 0.229;     // seconds before first beat

// ── Asset preloader ────────────────────────────────────────────────────────
// Tracks loading of all critical assets so the overlay can show true progress.
function useAssetPreloader(audioRef: React.RefObject<HTMLAudioElement | null>, videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [progress, setProgress] = useState(0);   // 0–1
  const [ready, setReady] = useState(false);
  const trackerRef = useRef({ loaded: 0, total: 0, done: false });

  useEffect(() => {
    const tracker = trackerRef.current;
    if (tracker.done) return;

    // -- Critical images to preload --
    const criticalImages = [
      '/images/side_wires.webp',
      '/images/sepereate_wires.webp',
      '/images/left_gear.webp',
      '/images/right_gear.webp',
      '/images/goose-ascii.webp',
      '/images/waterloo-ascii.svg',
      '/images/about_bg.webp',
      '/images/about_title.webp',
      '/images/nav_bg.webp',
      '/images/cat_watching.webp',
      '/images/title_bg.webp',
    ];

    // Set total BEFORE creating promises (prevents division by zero if something resolves synchronously)
    // 1 (fonts) + 1 (audio) + 1 (video) + N (images)
    tracker.total = 3 + criticalImages.length;
    tracker.loaded = 0;
    setProgress(0);

    const tick = () => {
      tracker.loaded++;
      setProgress(tracker.loaded / tracker.total);
    };

    const promises: Promise<void>[] = [];

    // 1. Fonts — wait for all fonts to finish loading
    promises.push(
      document.fonts.ready.then(() => { tick(); })
    );

    // 2. Audio — wait for canplaythrough
    promises.push(new Promise<void>(resolve => {
      const el = audioRef.current;
      if (!el) { tick(); resolve(); return; }
      if (el.readyState >= 4) { tick(); resolve(); return; } // HAVE_ENOUGH_DATA
      const handler = () => { el.removeEventListener('canplaythrough', handler); tick(); resolve(); };
      el.addEventListener('canplaythrough', handler);
      // Nudge browser to actually preload
      el.load();
    }));

    // 3. Video — wait for canplaythrough
    promises.push(new Promise<void>(resolve => {
      const el = videoRef.current;
      if (!el) { tick(); resolve(); return; }
      if (el.readyState >= 4) { tick(); resolve(); return; }
      const handler = () => { el.removeEventListener('canplaythrough', handler); tick(); resolve(); };
      el.addEventListener('canplaythrough', handler);
      el.load();
    }));

    // 4. Critical images
    for (const src of criticalImages) {
      promises.push(new Promise<void>(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => { tick(); resolve(); };
        img.src = src;
      }));
    }

    // When all done
    Promise.all(promises).then(() => {
      tracker.done = true;
      setProgress(1);
      setReady(true);
    });

    // Safety timeout — after 15s, allow start even if something stalled
    const timeout = setTimeout(() => {
      if (!tracker.done) {
        tracker.done = true;
        setProgress(1);
        setReady(true);
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [audioRef, videoRef]);

  return { progress, ready };
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const reducedMotionRef = useRef(false);
  const navbarRef = useRef<NavbarHandle>(null);
  const [githubPos, setGithubPos] = useState({ mt: 0, bgH: 0, pt: 5, pb: 2 });
  const [githubTunerOpen, setGithubTunerOpen] = useState(false);
  const visibleSections = useRef(new Set<string>());
  const routeUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRouteRef = useRef('/');

  const updateActiveRoute = useCallback(() => {
    // Use rAF — aligns with paint cycle, no React re-render needed
    if (routeUpdateTimer.current) cancelAnimationFrame(routeUpdateTimer.current as unknown as number);
    routeUpdateTimer.current = requestAnimationFrame(() => {
      const priority = ['/github', '/webring', '/class', '/about'];
      let next = '';
      for (const route of priority) {
        if (visibleSections.current.has(route)) { next = route; break; }
      }
      // Only go to '/' if nothing visible AND we're near the top
      if (!next) {
        if (window.scrollY < window.innerHeight * 0.5) next = '/';
        else return; // between sections — keep current route
      }
      if (next !== lastRouteRef.current) {
        lastRouteRef.current = next;
        navbarRef.current?.setActiveRoute(next);
        window.history.replaceState(null, '', next);
      }
    }) as unknown as ReturnType<typeof setTimeout>;
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

  const handleGithubVisibility = useCallback((visible: boolean) => {
    if (visible) visibleSections.current.add('/github');
    else visibleSections.current.delete('/github');
    updateActiveRoute();
  }, [updateActiveRoute]);

  const audioRef       = useRef<HTMLAudioElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const { progress: loadProgress, ready: assetsReady } = useAssetPreloader(audioRef, videoRef);
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
  const spongeRef       = useRef<HTMLImageElement>(null);
  const wallRef         = useRef<HTMLImageElement>(null);
  const webringBeatRef  = useRef<number>(0);
  const classBeatRef    = useRef<number>(0);
  const webringWrapRef  = useRef<HTMLDivElement>(null);
  const webringSectionRef = useRef<HTMLElement>(null);
  // Cached deco base values — avoids parseFloat from dataset every frame
  const decoBasesRef = useRef<{ opacity: number; rotation: number }[]>([]);

  // ── rAF loop ───────────────────────────────────────────────────────────────
  // Beats are driven from audio.currentTime — perfectly locked to the music.
  // On music loop, beat index resets so sync is restored every cycle.
  // Intro offset decays to 0 over the first ~0.8s, then crush runs unaffected.
  const startLoop = () => {
    let lastAudioTime = 0;
    let lastFiredIdx  = -1;
    const introStart  = performance.now();
    const INTRO_DUR   = 800; // ms for wires to slide in

    // Track previous written values to skip redundant DOM writes
    let prevScale = -1, prevAngle = -1, prevAngle2 = -1, prevAngle3 = -1;
    let prevWb = -1, prevSepCrush = -1, prevCrush = -1, prevIntroOffset = -1;

    const loop = () => {
      const t = audioRef.current?.currentTime ?? 0;

      // audio loop detected → hold crush pose, restart beat sequence
      if (t < lastAudioTime - 1) {
        crushTargetRef.current = MAX_CRUSH;
        lastFiredIdx = -1;
      }
      lastAudioTime = t;

      if (t >= BEAT_OFFSET && !reducedMotionRef.current) {
        const beatIdx = Math.floor((t - BEAT_OFFSET) / BEAT_INTERVAL);
        if (beatIdx > lastFiredIdx) {
          lastFiredIdx = beatIdx;
          crushTargetRef.current = beatIdx % 2 === 0 ? 0 : MAX_CRUSH;
          sepTargetRef.current = beatIdx % 2 === 0 ? 0 : 1;
          if (beatIdx % 2 === 1) shakeRef.current = 0.04;
          webringBeatRef.current = 1;
          classBeatRef.current = 1;
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
      const scale = Math.round((1 + shakeRef.current) * 1000) / 1000;
      if (scale !== prevScale) {
        prevScale = scale;
        if (videoWrapRef.current) videoWrapRef.current.style.transform = `scale(${scale})`;
      }

      // Gear rotation — only write when angle changes
      const angle = gearAngleRef.current;
      if (angle !== prevAngle) {
        prevAngle = angle;
        if (leftGearRef.current) leftGearRef.current.style.transform = `rotate(${angle}deg)`;
        if (rightGearRef.current) rightGearRef.current.style.transform = `rotate(${-angle}deg)`;
      }
      const angle2 = gear2AngleRef.current;
      if (angle2 !== prevAngle2) {
        prevAngle2 = angle2;
        if (leftGear2Ref.current) leftGear2Ref.current.style.transform = `rotate(${angle2}deg)`;
        if (rightGear2Ref.current) rightGear2Ref.current.style.transform = `rotate(${-angle2}deg)`;
      }
      const angle3 = gear3AngleRef.current;
      if (angle3 !== prevAngle3) {
        prevAngle3 = angle3;
        if (leftGear3Ref.current) leftGear3Ref.current.style.transform = `rotate(${angle3}deg)`;
        if (rightGear3Ref.current) rightGear3Ref.current.style.transform = `rotate(${-angle3}deg)`;
      }

      // Webring title — beat-driven scale + glow
      webringBeatRef.current *= 0.92;
      const wb = Math.round(webringBeatRef.current * 100) / 100;
      if (wb !== prevWb) {
        prevWb = wb;
        if (webringTitleRef.current) {
          const s = 1 + wb * 0.02;
          const y = -wb * 2;
          webringTitleRef.current.style.transform = `translateX(-50%) translateY(${y}px) scale(${s})`;
        }
        // Decos — only update when beat value changes
        const decoRefs = [starLeftRef, starRightRef, spongeRef, wallRef];
        if (decoBasesRef.current.length === 0) {
          decoBasesRef.current = decoRefs.map(ref => ({
            opacity: parseFloat(ref.current?.dataset.baseOpacity ?? '0.2'),
            rotation: parseFloat(ref.current?.dataset.baseRotation ?? '0'),
          }));
        }
        for (let di = 0; di < decoRefs.length; di++) {
          const el = decoRefs[di].current;
          if (!el) continue;
          const base = decoBasesRef.current[di];
          el.style.opacity = `${base.opacity + wb * 0.08}`;
          el.style.transform = `rotate(${base.rotation}deg) translateY(${-wb * 1.5}px) scale(${1 + wb * 0.02})`;
        }
      }

      // Separate wires — spring-driven scaleY pulse on beat
      sepCrushVelRef.current += (sepTargetRef.current - sepCrushRef.current) * STIFFNESS;
      sepCrushVelRef.current *= DAMPING;
      sepCrushRef.current += sepCrushVelRef.current;
      const sepCrushRounded = Math.round(sepCrushRef.current * 100) / 100;
      if (sepCrushRounded !== prevSepCrush) {
        prevSepCrush = sepCrushRounded;
        if (sepWiresRef.current)
          sepWiresRef.current.style.transform = `translateY(-45%) scaleY(${1 + sepCrushRef.current * 0.3})`;
      }

      // Intro slide-in: easeOut from 800 → 0
      const elapsed = performance.now() - introStart;
      const progress = Math.min(1, elapsed / INTRO_DUR);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      introOffsetRef.current = Math.round(800 * (1 - eased));

      const crushRounded = Math.round(crushRef.current);
      if (crushRounded !== prevCrush || introOffsetRef.current !== prevIntroOffset) {
        prevCrush = crushRounded;
        prevIntroOffset = introOffsetRef.current;
        if (leftWireRef.current)
          leftWireRef.current.style.transform = `translateX(${crushRef.current - introOffsetRef.current}px)`;
        if (rightWireRef.current)
          rightWireRef.current.style.transform = `translateX(${-crushRef.current + introOffsetRef.current}px)`;
      }

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

  const toggleReducedMotion = useCallback(() => {
    setReducedMotion(prev => {
      const next = !prev;
      reducedMotionRef.current = next;
      if (videoRef.current) {
        if (next) videoRef.current.pause();
        else videoRef.current.play();
      }
      return next;
    });
  }, []);

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
    navbarRef.current?.setActiveRoute('/');
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
    <div className={`bg-black${reducedMotion ? ' reduced-motion' : ''}`} style={{ overflowX: 'clip' }}>
      <ScrollReveal />

      <div className="fixed top-4 left-3 z-[100]">
        <Navbar ref={navbarRef} />
      </div>

      <audio ref={audioRef} src="/music/thick_of_it_thomas_remix.mp3" loop preload="auto" />

      {!started && <ReadyOverlay onStart={handleStart} muted={muted} onToggleMute={toggleMute} volume={volume} onVolumeChange={handleVolumeChange} assetsReady={assetsReady} loadProgress={loadProgress} />}

      <div ref={videoWrapRef} className="relative h-screen" style={{ willChange: 'transform', zIndex: 2 }}>

        <img ref={leftWireRef} src="/images/side_wires.webp"
          className="absolute top-0 h-full w-auto z-20 pointer-events-none"
          style={{ right: 'calc(50% + 100vh * 1512 / 1964)', willChange: 'transform', transform: 'translateX(-800px)' }}
        />
        <img ref={rightWireRef} src="/images/side_wires.webp"
          className="absolute top-0 h-full w-auto z-20 pointer-events-none"
          style={{ left: 'calc(50% + 100vh * 1512 / 1964)', willChange: 'transform', transform: 'translateX(800px)' }}
        />

        <div className="absolute inset-x-0 top-0 pointer-events-none z-30" style={{ height: '5%', background: 'linear-gradient(to bottom, black, transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none z-30" style={{ height: '5%', background: 'linear-gradient(to top, black, transparent)' }} />

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 h-full" style={{ aspectRatio: '3024 / 1964' }}>
            <video ref={videoRef} src="/videos/landing_page.mp4"
              loop muted playsInline preload="auto" className="h-full w-full"
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
          src="/images/sepereate_wires.webp"
          alt="" decoding="async"
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
            src="/images/left_gear.webp"
            alt="" decoding="async"
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
            src="/images/right_gear.webp"
            alt="" decoding="async"
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
            src="/images/left_gear.webp"
            alt="" decoding="async"
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
            src="/images/right_gear.webp"
            alt="" decoding="async"
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
            src="/images/left_gear.webp"
            alt="" decoding="async"
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
            src="/images/right_gear.webp"
            alt="" decoding="async"
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
              transformOrigin: '25% 89%', animation: reducedMotion ? 'none' : 'cat-bob 3s ease-in-out infinite',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/cat_watching.webp"
              alt="" decoding="async"
              style={{
                height: '100%', width: 'auto', maxWidth: 'none',
                WebkitMaskImage: 'linear-gradient(to bottom, black 65%, rgba(0,0,0,0) 85%)',
                maskImage: 'linear-gradient(to bottom, black 65%, rgba(0,0,0,0) 85%)',
              }}
            />
          </div>
        </div>
      </div>

      <div id="about" className="scroll-reveal reveal-scale-up" style={{ position: 'relative', zIndex: 50 }}>
        <AboutSection onVisibilityChange={handleAboutVisibility} audioRef={audioRef} reducedMotion={reducedMotion} />
      </div>

      <div style={{ position: 'relative' }}>
        {/* Title bg glow — between gears (z60) and class content (z65) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/title_bg.webp"
          alt="" decoding="async"
          className="pointer-events-none select-none"
          id="class-title-bg"
          style={{
            position: 'absolute',
            top: DEFAULT_CONFIG.bgY,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${DEFAULT_CONFIG.bgScale}%`,
            height: 'auto',
            opacity: DEFAULT_CONFIG.bgOpacity,
            mixBlendMode: 'screen',
            zIndex: 62,
          }}
        />
        <div id="class" className="scroll-reveal reveal-glitch" style={{ position: 'relative', zIndex: 65 }}>
          <ClassSection onVisibilityChange={handleClassVisibility} beatRef={classBeatRef} />
        </div>
      </div>

      <div id="webring" ref={webringWrapRef} className="scroll-reveal reveal-blur-in" style={{ position: 'relative', zIndex: 70, height: '156vh' }}>
        {/* Sticky container — confines everything to the viewport-sized area */}
        {/* Sticky container — only 3JS scene + search portal */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', zIndex: 1 }}>
          <WebringSection onVisibilityChange={handleWebringVisibility} audioRef={audioRef} reducedMotion={reducedMotion} sectionRefOut={webringSectionRef} />
        </div>

        {/* Everything below is outside sticky container — not clipped */}

        {/* Rings */}
        <RingTuner
          beatRef={webringBeatRef}
          initialCenter={68}
          initialRings={[
            { top: 0, left: 50, size: 113, rotation: 0, opacity: 0.35, borderW: 3, full: true },
            { top: 0, left: 50, size: 90, rotation: 0, opacity: 0.3, borderW: 2.5, full: true },
          ]}
        />

        {/* Stars */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={starLeftRef}
          src="/images/star_left.webp"
          alt="" decoding="async"
          className="absolute pointer-events-none select-none"
          data-base-opacity="0.2" data-base-rotation="-136"
          style={{ top: '2%', left: '3%', width: 'auto', height: '340px', maxWidth: 'none', zIndex: 3, opacity: 0.2, transform: 'rotate(-136deg)' }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={starRightRef}
          src="/images/star_right.webp"
          alt="" decoding="async"
          className="absolute pointer-events-none select-none"
          data-base-opacity="0.2" data-base-rotation="0"
          style={{ top: '2%', left: '75%', width: 'auto', height: '340px', maxWidth: 'none', zIndex: 3, opacity: 0.2, transform: 'rotate(0deg)' }}
        />

        {/* Webring title */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={webringTitleRef}
          src="/images/webring_text.webp"
          alt="WEBRING" decoding="async"
          className="absolute pointer-events-none"
          style={{
            top: '4%', left: '50%', transform: 'translateX(-50%)',
            width: 'clamp(350px, 55vw, 700px)', height: 'auto', zIndex: 4,
            filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3)) drop-shadow(0 0 60px rgba(255,255,255,0.15)) brightness(1.1)',
          }}
        />
        {/* Sponge + wall — outside sticky container so they're not clipped */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={spongeRef}
          src="/images/sponge.webp"
          alt="" decoding="async"
          className="absolute pointer-events-none select-none"
          data-base-opacity="0.1" data-base-rotation="0"
          style={{ left: '52%', top: '78%', height: '678px', width: 'auto', maxWidth: 'none', zIndex: 2, opacity: 0.1, transform: 'rotate(0deg)' }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={wallRef}
          src="/images/wall.webp"
          alt="" decoding="async"
          className="absolute pointer-events-none select-none"
          data-base-opacity="0.2" data-base-rotation="-10"
          style={{ left: '-20%', top: '84%', height: '604px', width: 'auto', maxWidth: 'none', zIndex: 2, opacity: 0.2, transform: 'rotate(-10deg)' }}
        />

        {/* Github bg — extends below webring, behind all webring deco */}
        <div className="bg-black" style={{ position: 'relative', zIndex: 0, height: `${githubPos.bgH}vh` }} />
      </div>

      {/* Github content — below webring (z:65 < webring z:70) */}
      {/* GitHub — content above webring decos, bg below */}
      <div id="github" style={{ position: 'relative', marginTop: `${githubPos.mt}vh`, paddingTop: `${githubPos.pt}vh`, paddingBottom: `${githubPos.pb}vh`, overflow: 'clip' }}>
        {/* Background — below webring (z-65 < webring z-70) */}
        <div className="absolute inset-0 bg-black" style={{ zIndex: 65 }} />
        {/* Content — above webring (z-75 > webring z-70) */}
        <div style={{ position: 'relative', zIndex: 75 }}>
          <GithubSection onVisibilityChange={handleGithubVisibility} audioRef={audioRef} reducedMotion={reducedMotion} />
        </div>
      </div>

      {/* Github position tuner — dev only */}
      {isDev && (!githubTunerOpen ? (
        <button
          onClick={() => setGithubTunerOpen(true)}
          style={{
            position: 'fixed', top: 10, right: 180, zIndex: 9999,
            background: '#222', color: '#fff', border: '1px solid #555',
            padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12,
          }}
        >
          GITHUB
        </button>
      ) : (
        <div style={{
          position: 'fixed', top: 10, right: 180, zIndex: 9999,
          background: 'rgba(0,0,0,0.95)', border: '1px solid #333',
          padding: '12px 16px', fontFamily: 'monospace', fontSize: 11,
          color: '#fff', width: 280,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>GITHUB POS</strong>
            <button onClick={() => setGithubTunerOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>X</button>
          </div>
          {[
            { label: 'margin-top vh', key: 'mt', min: -120, max: 0, step: 1 },
            { label: 'padding-top vh', key: 'pt', min: 0, max: 60, step: 1 },
            { label: 'padding-bot vh', key: 'pb', min: 0, max: 60, step: 1 },
            { label: 'bg height vh', key: 'bgH', min: 0, max: 120, step: 1 },
          ].map(c => (
            <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 90 }}>{c.label}</span>
              <input type="range" min={c.min} max={c.max} step={c.step}
                value={githubPos[c.key as keyof typeof githubPos]}
                onChange={e => setGithubPos(prev => ({ ...prev, [c.key]: +e.target.value }))}
                style={{ flex: 1 }} />
              <span style={{ width: 45, textAlign: 'right' }}>{githubPos[c.key as keyof typeof githubPos]}vh</span>
            </label>
          ))}
          <div style={{ background: '#111', border: '1px solid #333', padding: 6, fontSize: 10, color: '#ccc', marginTop: 6 }}>
            {`mt: ${githubPos.mt}vh, pt: ${githubPos.pt}vh, pb: ${githubPos.pb}vh, bgH: ${githubPos.bgH}vh`}
          </div>
        </div>
      ))}

      <DecoTuner items={[
        { ref: starLeftRef, label: 'STAR LEFT', defaults: { x: 3, y: 2, size: 340, rotation: -136, opacity: 0.2 } },
        { ref: starRightRef, label: 'STAR RIGHT', defaults: { x: 75, y: 2, size: 340, rotation: 0, opacity: 0.2 } },
        { ref: spongeRef, label: 'SPONGE', defaults: { x: 52, y: 78, size: 678, rotation: 0, opacity: 0.1 } },
        { ref: wallRef, label: 'WALL', defaults: { x: -20, y: 84, size: 604, rotation: -10, opacity: 0.2 } },
      ]} />

      <SizeTuner wrapperRef={webringWrapRef} sectionRef={webringSectionRef} defaultWrapperH={156} defaultSectionH={100} />

      <div className="fixed bottom-4 right-4 z-[999] flex items-end gap-2">
        <button
          onClick={toggleReducedMotion}
          className="mute-btn flex items-center justify-center w-10 h-10 rounded-lg border border-white/20 bg-white/10 backdrop-blur-md text-white/70 hover:text-white cursor-pointer"
          aria-label={reducedMotion ? 'Enable effects' : 'Reduce motion'}
          title={reducedMotion ? 'Enable effects' : 'Reduce motion'}
        >
          {reducedMotion ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" opacity="0.3" />
              <line x1="4" y1="4" x2="20" y2="20" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          )}
        </button>
        <MuteButton muted={muted} onToggle={toggleMute} volume={volume} onVolumeChange={handleVolumeChange} />
      </div>

      <GearTuner gears={[
        { ref1: leftGearRef, ref2: rightGearRef, label: 'GEAR 1 (top)', defaults: { bottom: -1200, lr: -10, height: 900, z: 2 } },
        { ref1: leftGear2Ref, ref2: rightGear2Ref, label: 'GEAR 2 (mid)', defaults: { bottom: -1650, lr: -6, height: 500, z: 3 } },
        { ref1: leftGear3Ref, ref2: rightGear3Ref, label: 'GEAR 3 (bot)', defaults: { bottom: -2500, lr: -8, height: 650, z: 2 } },
      ]} />

      {/* Search panel portal — top level, above everything */}
      <div id="webring-panel-root" className="fixed inset-0 pointer-events-none" style={{ zIndex: 9990 }} />

    </div>
  );
}
