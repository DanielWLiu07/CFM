'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import TerminalCard from './TerminalCard';

const BEAT_INTERVAL = 60 / 93;
const BEAT_OFFSET = 0.229;

interface AboutSectionProps {
  onVisibilityChange: (visible: boolean) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  reducedMotion?: boolean;
}

function G({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#fff' }}>{children}</span>;
}

function Dim({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#555' }}>{children}</span>;
}

const CARDS = [
  {
    title: 'WHAT  IS  CFM',
    image: '/images/uwaterloo-seal.svg',
    content: (
      <div className="space-y-2">
        <p style={{ color: '#fff', fontFamily: 'var(--font-arcade)', fontSize: 'clamp(11px, 1.8vw, 15px)', letterSpacing: '0.05em' }}>
          Computing and Financial Management
        </p>
        <p style={{ color: '#333' }}>{'─'.repeat(50)}</p>
        <p><Dim>{'>'} </Dim>The <G>only program of its kind in Canada</G> combining computer science and finance into a single interdisciplinary degree.</p>
        <p><Dim>{'>'} </Dim>Degree: <G>Bachelor of Computing and Financial Management (BCFM)</G></p>
        <p><Dim>{'>'} </Dim>Double Major: <G>Computer Science & Finance</G></p>
        <p><Dim>{'>'} </Dim>Duration: <G>5 years</G> (co-op only)</p>
        <p><Dim>{'>'} </Dim>Faculties: <G>Mathematics (David R. Cheriton School of Computer Science)</G> + <G>Accounting and Finance</G></p>
        <p style={{ color: '#333' }}>{'─'.repeat(50)}</p>
        <p><Dim>{'>'} </Dim><G>86%</G> graduation rate. <G>90%+</G> employed within 6 months of graduating.</p>
      </div>
    ),
  },
  {
    title: 'CURRICULUM',
    image: '/images/nav_bg.webp',
    content: (
      <div className="space-y-2">
        <p style={{ color: '#fff', fontFamily: 'var(--font-arcade)', fontSize: 'clamp(11px, 1.8vw, 15px)', letterSpacing: '0.05em' }}>
          Courses Across Three Departments
        </p>
        <p style={{ color: '#333' }}>{'─'.repeat(50)}</p>
        <p><Dim>{'>'} </Dim><G>Computer Science</G> — CS 135/136, algorithms, AI/ML, systems design, software analysis</p>
        <p><Dim>{'>'} </Dim><G>Accounting and Finance</G> — Financial reporting, derivative securities, fixed income, financial data analytics</p>
        <p><Dim>{'>'} </Dim><G>Mathematics</G> — Algebra, calculus, linear algebra, statistics, quantitative methods</p>
        <p style={{ color: '#333' }}>{'─'.repeat(50)}</p>
        <p><Dim>{'>'} </Dim>Spotlight: <G>CFM 101</G> — Introduction to Financial Markets and Data Analytics</p>
      </div>
    ),
  },
  {
    title: 'COOP  PROGRAM',
    image: '/images/goose-ascii.webp',
    content: (
      <div className="space-y-2">
        <p style={{ color: '#fff', fontFamily: 'var(--font-arcade)', fontSize: 'clamp(11px, 1.8vw, 15px)', letterSpacing: '0.05em' }}>
          World Leading Coop Program
        </p>
        <p style={{ color: '#333' }}>{'─'.repeat(50)}</p>
        <p><Dim>{'>'} </Dim><G>6 work terms</G> — 2 full years of paid experience, starting after Year 1</p>
        <p><Dim>{'>'} </Dim>Alternate 4-month study and work blocks throughout the program</p>
        <p style={{ color: '#333' }}>{'─'.repeat(50)}</p>
        <p><Dim>{'// '}where CFM students work</Dim></p>
        <p><Dim>{'>'} </Dim>[<G> Tech    </G>] Google, Meta, Amazon, Shopify</p>
        <p><Dim>{'>'} </Dim>[<G> Finance </G>] RBC, TD, BMO, CIBC, Manulife</p>
        <p><Dim>{'>'} </Dim>[<G> Fintech </G>] Stripe, Plaid, Wealthsimple</p>
        <p><Dim>{'>'} </Dim>[<G> Quant   </G>] Citadel, Jane Street, HRT</p>
      </div>
    ),
  },
  {
    title: 'CAREERS',
    image: '/images/waterloo-ascii.svg',
    content: (
      <div className="space-y-2">
        <p style={{ color: '#fff', fontFamily: 'var(--font-arcade)', fontSize: 'clamp(11px, 1.8vw, 15px)', letterSpacing: '0.05em' }}>
          Where CFM Graduates End Up
        </p>
        <p style={{ color: '#333' }}>{'─'.repeat(50)}</p>
        <p><Dim>{'>'} </Dim><G>Investment Analyst</G> · <G>Software Engineer</G> · <G>Quantitative Developer</G></p>
        <p><Dim>{'>'} </Dim><G>Fintech Engineer</G> · <G>Trading / Portfolio Management</G></p>
        <p><Dim>{'>'} </Dim><G>Data Science / ML Engineering</G></p>
        <p style={{ color: '#333' }}>{'─'.repeat(50)}</p>
        <p><Dim>{'>'} </Dim>Direct pathway to the <G>CFA</G> designation.</p>
        <p><Dim>{'>'} </Dim>Graduate with <G>2 years of experience</G> and a degree that bridges both worlds.</p>
      </div>
    ),
  },
];

// Slot positions for the card stack — front card is slot 0
function getSlot(index: number, total: number) {
  // Reduce spread on narrow screens
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 640;
  const CARD_DIST = isNarrow ? 25 : 50;
  const VERT_DIST = isNarrow ? 15 : 30;
  return {
    x: index * CARD_DIST,
    y: index * -VERT_DIST,
    scale: 1 - index * 0.06,
    opacity: index === 0 ? 1 : Math.max(0.15, 0.7 - index * 0.2),
    zIndex: index === 0 ? 70 : total - index,
  };
}

export default function AboutSection({ onVisibilityChange, audioRef, reducedMotion }: AboutSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const titleRef = useRef<HTMLImageElement>(null);

  // Kill gsap animations and reset title when reduced motion turns on
  useEffect(() => {
    if (reducedMotion && titleRef.current) {
      gsap.killTweensOf(titleRef.current);
      gsap.set(titleRef.current, { y: 0, scaleX: 1, scaleY: 1 });
    }
  }, [reducedMotion]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stackRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [stackPos, setStackPos] = useState({ ml: 30, mt: -45, rot: -3, rotZ: 2, w: 800, h: 460 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnimatingRef = useRef(false);
  const titleAnimStarted = useRef(false);
  const titleBeatRef = useRef({ lastFiredIdx: -1, rafId: 0 });

  // IntersectionObserver for URL routing + intro trigger
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onVisibilityChange(entry.isIntersecting);
        if (entry.isIntersecting && !titleAnimStarted.current && titleRef.current) {
          titleAnimStarted.current = true;
          const img = titleRef.current;

          // Intro: slam in from above
          const tl = gsap.timeline();
          tl.fromTo(img,
            { y: -120, scaleY: 0, opacity: 0, transformOrigin: 'center bottom' },
            { y: 0, scaleY: 1, opacity: 1, duration: 0.5, ease: 'power3.out' }
          );
          tl.to(img, { scaleX: 1.08, scaleY: 0.92, duration: 0.08, ease: 'power4.in' });
          tl.to(img, { scaleX: 1, scaleY: 1, duration: 0.15, ease: 'elastic.out(1, 0.4)' });

          // After intro completes, start the audio-driven beat loop
          tl.add(() => startBeatLoop());
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

  // Audio-driven beat loop — same math as the wire crush in page.tsx
  const startBeatLoop = useCallback(() => {
    const state = titleBeatRef.current;

    const loop = () => {
      const img = titleRef.current;
      const audio = audioRef.current;
      if (!img || !audio) {
        state.rafId = requestAnimationFrame(loop);
        return;
      }

      const t = audio.currentTime;

      // Reset on audio loop
      if (t < 0.1) state.lastFiredIdx = -1;

      if (t >= BEAT_OFFSET && !reducedMotionRef.current) {
        const beatIdx = Math.floor((t - BEAT_OFFSET) / BEAT_INTERVAL);
        if (beatIdx > state.lastFiredIdx) {
          state.lastFiredIdx = beatIdx;

          if (beatIdx % 2 === 1) {
            // Slam beat — fast drop + squash
            gsap.killTweensOf(img);
            gsap.to(img, { y: 6, scaleY: 0.88, scaleX: 1.12, duration: 0.07, ease: 'power4.in',
              onComplete: () => {
                gsap.to(img, { y: 0, scaleY: 1, scaleX: 1, duration: 0.2, ease: 'elastic.out(1, 0.4)' });
              }
            });
          } else {
            // Rise beat — slow lift
            gsap.killTweensOf(img);
            gsap.to(img, { y: -18, scaleY: 1.04, duration: BEAT_INTERVAL * 0.85, ease: 'power1.out' });
          }
        }
      }

      state.rafId = requestAnimationFrame(loop);
    };

    state.rafId = requestAnimationFrame(loop);
  }, [audioRef]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (titleBeatRef.current.rafId) cancelAnimationFrame(titleBeatRef.current.rafId);
    };
  }, []);

  // Position all cards into their slots
  const layoutCards = useCallback((current: number, animate: boolean) => {
    const total = CARDS.length;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      // Calculate which slot this card is in relative to current
      const slot = (i - current + total) % total;
      const pos = getSlot(slot, total);
      if (animate) {
        gsap.to(el, {
          x: pos.x,
          y: pos.y,
          scale: pos.scale,
          opacity: pos.opacity,
          zIndex: pos.zIndex,
          duration: 0.6,
          ease: 'power2.out',
        });
      } else {
        gsap.set(el, {
          x: pos.x,
          y: pos.y,
          scale: pos.scale,
          opacity: pos.opacity,
          zIndex: pos.zIndex,
        });
      }
    });
  }, []);

  // Initial layout
  useEffect(() => {
    layoutCards(0, false);
  }, [layoutCards]);

  const goTo = useCallback((index: number) => {
    if (isAnimatingRef.current || index === activeIndex) return;
    isAnimatingRef.current = true;
    setActiveIndex(index);
    layoutCards(index, true);
    setTimeout(() => { isAnimatingRef.current = false; }, 650);
  }, [activeIndex, layoutCards]);

  const handleNext = useCallback(() => {
    goTo((activeIndex + 1) % CARDS.length);
  }, [activeIndex, goTo]);

  const handlePrev = useCallback(() => {
    goTo((activeIndex - 1 + CARDS.length) % CARDS.length);
  }, [activeIndex, goTo]);

  // Arrow key navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') handleNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') handlePrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNext, handlePrev]);

  return (
    <section
      className="relative min-h-screen pt-16 sm:pt-24 pb-10 sm:pb-15 px-4 sm:px-6 flex flex-col items-center"
      style={{ backgroundColor: 'black', zIndex: 1, overflow: 'clip' }}
    >
      {/* Sentinel for intersection observer */}
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-24" />

      {/* Centered spinning background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/about_bg.webp"
        alt=""
        className="absolute pointer-events-none select-none"
        style={{
          top: '50%',
          left: '50%',
          height: '100vh',
          width: 'auto',
          maxWidth: 'none',
          transform: 'translate(-50%, -50%)',
          animation: reducedMotion ? 'none' : 'about-bg-spin 120s linear infinite',
          zIndex: 1,
        }}
      />

      {/* Vignette — linear fades on all sides, same style as hero */}
      <div className="absolute inset-x-0 top-0 pointer-events-none z-[80]" style={{ height: '15%', background: 'linear-gradient(to bottom, black, transparent)' }} />
      <div className="absolute inset-x-0 bottom-0 pointer-events-none z-[80]" style={{ height: '15%', background: 'linear-gradient(to top, black, transparent)' }} />
      <div className="absolute inset-y-0 left-0 pointer-events-none z-[80]" style={{ width: '10%', background: 'linear-gradient(to right, black, transparent)' }} />
      <div className="absolute inset-y-0 right-0 pointer-events-none z-[80]" style={{ width: '10%', background: 'linear-gradient(to left, black, transparent)' }} />

      {/* Section header */}
      <div className="relative mb-10 sm:mb-20" style={{ zIndex: 85 }}>
        {/* Glow behind title */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.03) 40%, transparent 70%)',
          transform: 'scale(3.5, 4)',
          filter: 'blur(30px)',
        }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={titleRef}
          src="/images/about_title.webp"
          alt="ABOUT"
          className="relative w-auto"
          style={{ height: 'clamp(100px, 12vw, 160px)', maxWidth: 'none', opacity: 0 }}
        />
      </div>

      {/* Card stack container */}
      <div
        ref={stackRef}
        className="relative cursor-pointer"
        style={{
          width: 'clamp(300px, 85vw, 800px)',
          minHeight: 'clamp(360px, 50vw, 500px)',
          zIndex: 85,
          marginTop: stackPos.mt,
          perspective: 1200,
          transformStyle: 'preserve-3d' as const,
          transform: `rotateY(${stackPos.rot}deg) rotateZ(${stackPos.rotZ}deg)`,
        }}
        onClick={handleNext}
      >
        {CARDS.map((card, i) => (
          <TerminalCard
            key={i}
            ref={el => { cardRefs.current[i] = el; }}
            title={card.title}
            image={card.image}
            className="absolute top-0 left-0 w-full"
            style={{ willChange: 'transform, opacity', minHeight: 'clamp(360px, 50vw, 500px)' }}
          >
            {card.content}
          </TerminalCard>
        ))}
      </div>

      {/* Navigation dots + hint */}
      <div className="flex flex-col items-center mt-6 sm:mt-10" style={{ zIndex: 85 }}>
        <div className="flex gap-4">
          {CARDS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: activeIndex === i ? 24 : 12,
                height: 4,
                border: 'none',
                borderRadius: 2,
                background: activeIndex === i ? '#fff' : 'rgba(255,255,255,0.25)',
                boxShadow: activeIndex === i ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
              aria-label={`Go to card ${i + 1}`}
            />
          ))}
        </div>
        <p
          className="mt-3"
          style={{
            fontFamily: 'var(--font-arcade)',
            fontSize: 12,
            letterSpacing: '0.25em',
            color: 'rgba(255,255,255,0.5)',
            textShadow: '0 0 4px #000, 0 0 8px #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
          }}
        >
          CLICK  CARD  TO  CYCLE
        </p>
      </div>

      {/* Card stack position tuner — dev only */}
      {process.env.NODE_ENV === 'development' && (!tunerOpen ? (
        <button
          onClick={() => setTunerOpen(true)}
          style={{
            position: 'fixed', top: 10, right: 100, zIndex: 9999,
            background: '#222', color: '#fff', border: '1px solid #555',
            padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12,
          }}
        >
          CARDS
        </button>
      ) : (
        <div style={{
          position: 'fixed', top: 10, right: 100, zIndex: 9999,
          background: 'rgba(0,0,0,0.95)', border: '1px solid #333',
          padding: '12px 16px', fontFamily: 'monospace', fontSize: 11,
          color: '#fff', width: 340,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>CARD STACK</strong>
            <button onClick={() => setTunerOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>X</button>
          </div>
          {[
            { label: 'margin-left %', key: 'ml', min: -30, max: 50, step: 1, suffix: '%' },
            { label: 'margin-top px', key: 'mt', min: -200, max: 200, step: 5, suffix: 'px' },
            { label: 'rotateY deg', key: 'rot', min: -15, max: 15, step: 0.5, suffix: 'deg' },
            { label: 'rotateZ deg', key: 'rotZ', min: -15, max: 15, step: 0.5, suffix: 'deg' },
            { label: 'width px', key: 'w', min: 300, max: 800, step: 10, suffix: 'px' },
            { label: 'height px', key: 'h', min: 200, max: 700, step: 10, suffix: 'px' },
          ].map(c => (
            <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 90 }}>{c.label}</span>
              <input type="range" min={c.min} max={c.max} step={c.step}
                value={stackPos[c.key as keyof typeof stackPos]}
                onChange={e => setStackPos(prev => ({ ...prev, [c.key]: +e.target.value }))}
                style={{ flex: 1 }} />
              <span style={{ width: 55, textAlign: 'right' }}>{stackPos[c.key as keyof typeof stackPos]}{c.suffix}</span>
            </label>
          ))}
          <div style={{ background: '#111', border: '1px solid #333', padding: 6, fontSize: 10, whiteSpace: 'pre', color: '#ccc', marginTop: 6 }}>
{`marginLeft: '${stackPos.ml}%'
marginTop: ${stackPos.mt}
rotateY: ${stackPos.rot}deg
rotateZ: ${stackPos.rotZ}deg
maxWidth: ${stackPos.w}
height: ${stackPos.h}`}
          </div>
        </div>
      ))}
    </section>
  );
}
