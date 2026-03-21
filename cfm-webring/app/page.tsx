'use client';

import { useState, useRef, useEffect } from 'react';
import Navbar from './components/Navbar';
import PixelTrail from './components/PixelTrail';
import ReadyOverlay from './components/ReadyOverlay';

const MAX_CRUSH   = 180;
const STIFFNESS   = 0.35;  // spring pull toward target
const DAMPING     = 0.72;  // < 1 = underdamped → overshoot/bounce
const BEAT_INTERVAL = 60 / 93; // ~0.645s — derived from 25 recorded cycles
const BEAT_OFFSET   = 0.229;     // seconds before first beat

export default function Home() {
  const [started, setStarted] = useState(false);

  const audioRef       = useRef<HTMLAudioElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const animFrameRef   = useRef<number>(0);
  const crushRef       = useRef<number>(0);
  const crushVelRef    = useRef<number>(0);
  const crushTargetRef = useRef<number>(0);
  const leftWireRef    = useRef<HTMLImageElement>(null);
  const rightWireRef   = useRef<HTMLImageElement>(null);
  const introOffsetRef = useRef<number>(800); // wires start 800px off-screen

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
        }
      }

      crushVelRef.current += (crushTargetRef.current - crushRef.current) * STIFFNESS;
      crushVelRef.current *= DAMPING;
      crushRef.current += crushVelRef.current;

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
    // Ensure both are actually playing before starting the beat loop
    await Promise.all([
      videoRef.current!.play(),
      audioRef.current!.play(),
    ]);
    startLoop();
  };

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', !started);
    document.documentElement.classList.toggle('overflow-hidden', !started);
  }, [started]);

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
    <div className="bg-black">

      <div className="fixed top-4 left-3 z-50">
        <Navbar />
      </div>

      <audio ref={audioRef} src="/music/thick_of_it_thomas_remix.mp3" loop />

      {!started && <ReadyOverlay onStart={handleStart} />}

      <div className="relative h-screen">

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

      <section className="relative min-h-screen text-white flex items-center justify-center">
        HELLO
      </section>

    </div>
  );
}
