'use client';

import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import LetterGlitch from './LetterGlitch';

// ── Candlestick ──────────────────────────────────────────────────────────────
interface CandleData { bull: boolean; totalH: number; bodyH: number; bodyTopPx: number; elevation: number; }

// Stacked box-shadow extrusion — mirrors the CFM text-shadow technique
function makeCandleShadow(elevation: number, color: string) {
  const steps = Array.from({ length: elevation }, (_, j) => {
    const y = (j + 1) * 2;
    const x = Math.round(y * 0.4);
    const v = Math.max(0, 50 - j * 4);
    return `${x}px ${y}px 0 rgb(${v},${v},${v})`;
  }).join(', ');
  const rimY = elevation * 2 + 1;
  const rimX = Math.round(rimY * 0.4);
  return `${steps}, ${rimX}px ${rimY}px 0 rgba(255,255,255,0.35), 0 0 18px ${color}55`;
}

function Candle({ bull, totalH, bodyH, bodyTopPx, elevation }: CandleData) {
  const color = bull ? '#22c55e' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: 68, height: totalH, flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, width: 2, height: '100%',
        background: color, opacity: 0.8, transform: 'translateX(-50%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: bodyTopPx, height: bodyH,
        background: color, border: '1px solid rgba(255,255,255,0.45)',
        boxShadow: makeCandleShadow(elevation, color) }} />
    </div>
  );
}

// Candles form a continuous diagonal: bottom-left → ascending through C/F/M → top-right.
// Per-candle margins (LEFT_MARGINS / RIGHT_MARGINS) position each candle so its top
// aligns with the diagonal, computed as: totalH + marginBot = container_bottom - target_top.

const LEFT_CANDLES: CandleData[] = [
  { bull: true,  totalH: 250, bodyH: 100, bodyTopPx: 90,  elevation: 10 },  // outermost — bottom-left
  { bull: false, totalH: 280, bodyH: 70,  bodyTopPx: 160, elevation: 3  },  // outer — bottom-left corner
  { bull: false, totalH: 330, bodyH: 180, bodyTopPx: 40,  elevation: 18 },  // ascending
  { bull: false, totalH: 290, bodyH: 40,  bodyTopPx: 110, elevation: 4  },  // ascending
  { bull: true,  totalH: 360, bodyH: 120, bodyTopPx: 20,  elevation: 14 },  // ascending
  { bull: true,  totalH: 380, bodyH: 160, bodyTopPx: 90,  elevation: 5  },  // inner — aligns with C
];
const LEFT_MARGINS = [-70, 0, 5, 100, 85, 120];

const RIGHT_CANDLES: CandleData[] = [
  { bull: true,  totalH: 390, bodyH: 160, bodyTopPx: 100, elevation: 5  },  // inner — aligns with M
  { bull: true,  totalH: 370, bodyH: 180, bodyTopPx: 60,  elevation: 12 },  // ascending outward
  { bull: false, totalH: 340, bodyH: 30,  bodyTopPx: 170, elevation: 21 },  // ascending
  { bull: false, totalH: 310, bodyH: 70,  bodyTopPx: 24,  elevation: 8  },  // ascending
  { bull: false, totalH: 330, bodyH: 200, bodyTopPx: 40,  elevation: 26 },  // outer — top-right corner
  { bull: true,  totalH: 270, bodyH: 90,  bodyTopPx: 30,  elevation: 15 },  // outermost — top-right
];
const RIGHT_MARGINS = [165, 240, 325, 270, 445, 460];

// Shadow goes primarily DOWNWARD — longer shadow = letter is higher off the surface
// x offset is ~40% of y offset so it reads as depth, not just diagonal smear
function make3dShadow(layers: number) {
  const steps = Array.from({ length: layers }, (_, j) => {
    const y = (j + 1) * 3;
    const x = Math.round(y * 0.4);
    const v = Math.max(0, 50 - j * 3);
    return `${x}px ${y}px 0 rgb(${v},${v},${v})`;
  }).join(', ');
  // white rim at the very edge of the extrusion + outer glow
  const rimX = Math.round(layers * 3 * 0.4) + 1;
  const rimY = layers * 3 + 1;
  return `${steps}, ${rimX}px ${rimY}px 0 rgba(255,255,255,0.35), 0 0 60px rgba(255,255,255,0.5), 0 0 120px rgba(255,255,255,0.2)`;
}

// depth drives shadow length — M is highest so it casts the longest shadow
const CFM_CONFIG = [
  { wickTop: 35, wickBot: 35, depth:  8, baseY:   0 },  // C — baseline, short shadow
  { wickTop: 20, wickBot: 65, depth: 14, baseY: -30 },  // F — mid elevation
  { wickTop: 72, wickBot: 12, depth: 22, baseY: -65 },  // M — highest, longest shadow
];

export default function ReadyOverlay({ onStart }: { onStart: () => void }) {
  const [leaving, setLeaving] = useState(false);

  const wrapRef          = useRef<HTMLDivElement>(null);
  const contentRef       = useRef<HTMLDivElement>(null);
  const titleRef         = useRef<HTMLDivElement>(null);
  const subRef           = useRef<HTMLParagraphElement>(null);
  const lineLeftRef      = useRef<HTMLDivElement>(null);
  const lineRightRef     = useRef<HTMLDivElement>(null);
  const labelTopRef      = useRef<HTMLSpanElement>(null);
  const lineBotLeftRef   = useRef<HTMLDivElement>(null);
  const lineBotRightRef  = useRef<HTMLDivElement>(null);
  const labelBotRef      = useRef<HTMLSpanElement>(null);
  const leftCandlesRef   = useRef<HTMLDivElement>(null);
  const rightCandlesRef  = useRef<HTMLDivElement>(null);
  const baselineRef      = useRef<HTMLDivElement>(null);
  const sealRef          = useRef<HTMLImageElement>(null);
  const topBarRef        = useRef<HTMLDivElement>(null);
  const botBarRef        = useRef<HTMLDivElement>(null);
  const gooseRef         = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();

    gsap.set([subRef.current, labelTopRef.current, labelBotRef.current], { opacity: 0 });
    gsap.set(sealRef.current, { opacity: 0, scaleY: 0, transformOrigin: 'center bottom' });
    gsap.set(gooseRef.current, { opacity: 0, scaleY: 0, transformOrigin: 'center bottom' });
    gsap.set([lineLeftRef.current, lineRightRef.current, lineBotLeftRef.current, lineBotRightRef.current],
      { scaleX: 0, opacity: 0 });
    gsap.set(lineLeftRef.current,     { transformOrigin: 'right center' });
    gsap.set(lineRightRef.current,    { transformOrigin: 'left center' });
    gsap.set(lineBotLeftRef.current,  { transformOrigin: 'right center' });
    gsap.set(lineBotRightRef.current, { transformOrigin: 'left center' });
    gsap.set(baselineRef.current, { scaleX: 0, opacity: 0, transformOrigin: 'left center' });

    const charEls  = Array.from(titleRef.current?.children ?? []);
    const leftEls  = Array.from(leftCandlesRef.current?.children ?? []);
    const rightEls = Array.from(rightCandlesRef.current?.children ?? []);

    gsap.set([...charEls, ...leftEls, ...rightEls], { scaleY: 0, transformOrigin: 'center bottom' });

    // ── Intro ─────────────────────────────────────────────────────────────────
    // top bar
    tl
      .to(labelTopRef.current, { opacity: 0.4, duration: 0.5, ease: 'power2.out' }, 0.2)
      .to([lineLeftRef.current, lineRightRef.current], { scaleX: 1, opacity: 0.4, duration: 0.6, ease: 'power2.inOut' }, 0.3);

    // baseline sweeps left→right, then candles grow up from it
    tl.to(baselineRef.current, { scaleX: 1, opacity: 0.25, duration: 0.8, ease: 'power2.inOut' }, 0.5);

    // left-to-right sweep: candles grow up from baseline, CFM letters land at their baseY heights
    const sequence = [...leftEls, ...charEls, ...rightEls];
    sequence.forEach((el, i) => {
      const charIdx = i - leftEls.length;
      const isChar  = charIdx >= 0 && charIdx < charEls.length;
      const baseY   = isChar ? CFM_CONFIG[charIdx].baseY : 0;
      tl.to(el, { scaleY: 1, y: baseY, duration: isChar ? 0.45 : 0.35, ease: 'power2.out' }, 0.9 + i * 0.1);
    });

    const afterAll = 0.9 + sequence.length * 0.1 + 0.4;

    tl
      .to(labelBotRef.current,  { opacity: 0.4, duration: 0.5, ease: 'power2.out' }, afterAll)
      .to([lineBotLeftRef.current, lineBotRightRef.current],
        { scaleX: 1, opacity: 0.4, duration: 0.6, ease: 'power2.inOut' }, afterAll + 0.1)
      .to(subRef.current, { opacity: 0.65, duration: 0.6 }, afterAll + 0.25)
      .to(sealRef.current, { opacity: 0.55, scaleY: 1, duration: 0.45, ease: 'power2.out' }, 0.9 + 10 * 0.1)
      .to(gooseRef.current, { opacity: 0.55, scaleY: 1, duration: 0.45, ease: 'power2.out' }, 0.9 + 5 * 0.1);

    const blinkTween = gsap.to(subRef.current, {
      opacity: 0, duration: 0, repeat: -1, yoyo: true, repeatDelay: 0.7, delay: afterAll + 1.0,
    });

    // ── Idle loop — each element starts its loop immediately after its own spawn completes ──
    // Spawn timing: sequence = [...leftEls(0-5), ...charEls(6-8), ...rightEls(9-14)]
    //   leftEls[i]  spawn finishes at: 0.9 + i*0.1 + 0.35  = 1.25 + i*0.1
    //   charEls[j]  spawn finishes at: 0.9 + (6+j)*0.1 + 0.45 = 1.95 + j*0.1
    //   rightEls[k] spawn finishes at: 0.9 + (9+k)*0.1 + 0.35 = 2.15 + k*0.1
    // ease 'steps(6)' = 6 discrete jumps per cycle → 8-bit stepped look, no smooth interpolation
    const idleTweens: gsap.core.Tween[] = [];

    // Candles: y bob + shadow elevation pulse (steps = no smoothing = 8-bit)
    // bodyDiv = children[1] inside the Candle root (children[0] = wick line)
    leftEls.forEach((el, i) => {
      const data    = LEFT_CANDLES[i];
      const bodyDiv = (el as HTMLElement).firstElementChild?.children[1] as HTMLElement | null;
      const dur     = 1.4 + i * 0.2;
      const delay   = 1.25 + i * 0.1;
      idleTweens.push(gsap.to(el, {
        y: -(14 + i * 6), duration: dur, ease: 'steps(6)',
        repeat: -1, yoyo: true, delay,
      }));
      let lastElev = data.elevation;
      const color = data.bull ? '#22c55e' : '#ef4444';
      const elevObj = { elevation: data.elevation };
      idleTweens.push(gsap.to(elevObj, {
        elevation: data.elevation + 12, duration: dur, ease: 'steps(6)',
        repeat: -1, yoyo: true, delay,
        onUpdate: () => {
          const v = Math.round(elevObj.elevation);
          if (v !== lastElev) { lastElev = v; if (bodyDiv) bodyDiv.style.boxShadow = makeCandleShadow(v, color); }
        },
      }));
    });
    rightEls.forEach((el, i) => {
      const data    = RIGHT_CANDLES[i];
      const bodyDiv = (el as HTMLElement).firstElementChild?.children[1] as HTMLElement | null;
      const dur     = 1.6 + i * 0.2;
      const delay   = 2.15 + i * 0.1;
      idleTweens.push(gsap.to(el, {
        y: -(10 + i * 7), duration: dur, ease: 'steps(6)',
        repeat: -1, yoyo: true, delay,
      }));
      let lastElev = data.elevation;
      const color = data.bull ? '#22c55e' : '#ef4444';
      const elevObj = { elevation: data.elevation };
      idleTweens.push(gsap.to(elevObj, {
        elevation: data.elevation + 12, duration: dur, ease: 'steps(6)',
        repeat: -1, yoyo: true, delay,
        onUpdate: () => {
          const v = Math.round(elevObj.elevation);
          if (v !== lastElev) { lastElev = v; if (bodyDiv) bodyDiv.style.boxShadow = makeCandleShadow(v, color); }
        },
      }));
    });

    // CFM letters: y bob + shadow depth pulse, steps(6) for 8-bit look
    charEls.forEach((el, i) => {
      const baseY     = CFM_CONFIG[i].baseY;
      const baseDepth = CFM_CONFIG[i].depth;
      const span      = el as HTMLElement;
      const dur       = 1.8 + i * 0.3;
      const delay     = 1.95 + i * 0.1;
      idleTweens.push(gsap.to(el, {
        y: baseY - 24, duration: dur, ease: 'steps(6)',
        repeat: -1, yoyo: true, delay,
      }));
      let lastDepth = baseDepth;
      const shadowObj = { depth: baseDepth };
      idleTweens.push(gsap.to(shadowObj, {
        depth: baseDepth + 10, duration: dur, ease: 'steps(6)',
        repeat: -1, yoyo: true, delay,
        onUpdate: () => {
          const v = Math.round(shadowObj.depth);
          if (v !== lastDepth) { lastDepth = v; span.style.textShadow = make3dShadow(v); }
        },
      }));
    });

    // Top & bottom bar idle bob — smooth, starts immediately
    const barDur = 2.2;
    idleTweens.push(gsap.to(topBarRef.current, {
      y: -10, duration: barDur, ease: 'sine.inOut',
      repeat: -1, yoyo: true, delay: 0,
    }));
    idleTweens.push(gsap.to(botBarRef.current, {
      y: -10, duration: barDur, ease: 'sine.inOut',
      repeat: -1, yoyo: true, delay: 0,
    }));

    // Seal idle bob — 8-bit stepped, starts with intro
    idleTweens.push(gsap.to(sealRef.current, {
      y: -18, duration: 2.2, ease: 'steps(6)',
      repeat: -1, yoyo: true, delay: 0.9 + 10 * 0.1,
    }));

    // Goose idle bob — mirrors seal on the left
    idleTweens.push(gsap.to(gooseRef.current, {
      y: -18, duration: 2.0, ease: 'steps(6)',
      repeat: -1, yoyo: true, delay: 0.9 + 5 * 0.1,
    }));

    return () => { tl.kill(); blinkTween.kill(); idleTweens.forEach(t => t.kill()); };
  }, []);

  const handleClick = () => {
    if (leaving) return;
    setLeaving(true);
    const tl = gsap.timeline({ onComplete: onStart });

    // Click to start blinks out
    tl.to(subRef.current, { opacity: 0, duration: 0.1 }, 0);

    // CFM letters shoot upward and fade
    const charEls = Array.from(titleRef.current?.children ?? []);
    charEls.forEach((el, i) => {
      tl.to(el, { y: -300, opacity: 0, duration: 0.4, ease: 'power3.in' }, 0.05 + i * 0.06);
    });

    // Top bar — lines retract, label fades
    tl.to(topBarRef.current, { y: -80, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0.1);

    // Bottom bar — drops down and fades
    tl.to(botBarRef.current, { y: 80, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0.15);

    // Left candles fly left
    const leftEls = Array.from(leftCandlesRef.current?.children ?? []);
    leftEls.forEach((el, i) => {
      tl.to(el, { x: -200 - i * 60, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0.05 + i * 0.04);
    });

    // Right candles fly right
    const rightEls = Array.from(rightCandlesRef.current?.children ?? []);
    rightEls.forEach((el, i) => {
      tl.to(el, { x: 200 + i * 60, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0.05 + i * 0.04);
    });

    // Baseline shrinks
    tl.to(baselineRef.current, { scaleX: 0, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.1);

    // Goose flies off left
    tl.to(gooseRef.current, { x: -400, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0.1);

    // Seal flies off right
    tl.to(sealRef.current, { x: 400, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0.1);

    // Final wrapper fade to black
    tl.to(wrapRef.current, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0.45);
  };

  return (
    <div
      ref={wrapRef}
      onClick={handleClick}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-black"
    >
      <div className="absolute inset-0">
        <LetterGlitch glitchColors={['#2a2a2a', '#3a3a3a', '#4a4a4a', '#5a5a5a']} glitchSpeed={60} outerVignette smooth />
      </div>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, transparent 65%)', zIndex: 1 }} />

      {/* Chart: same -6deg tilt as CFM text — crops from center on narrow viewports */}
      <div className="absolute pointer-events-none" style={{ zIndex: 2, top: '50%', left: '50%', width: 1600, height: '75vh', transform: 'translate(-50%, -44%) rotate(-6deg)', transformOrigin: 'center center' }}>

        {/* Horizontal baseline — the "chart floor" */}
        <div ref={baselineRef} className="absolute inset-x-0 bottom-0"
          style={{ height: 1, background: 'rgba(255,255,255,0.3)' }} />

        <div className="flex h-full">
          {/* Left candles: ascending staircase left→right via marginBottom steps */}
          <div ref={leftCandlesRef} className="flex items-end justify-between px-4" style={{ flex: 1, marginLeft: 40 }}>
            {LEFT_CANDLES.map((c, i) => (
              <div key={i} style={{ marginBottom: `${LEFT_MARGINS[i]}px` }}>
                <Candle {...c} />
              </div>
            ))}
          </div>
          {/* Center gap for CFM text — wide enough to prevent candle shadow overlap */}
          <div style={{ flexShrink: 0, width: 500 }} />
          {/* Right candles: staircase continues ascending */}
          <div ref={rightCandlesRef} className="flex items-end justify-between px-4" style={{ flex: 1 }}>
            {RIGHT_CANDLES.map((c, i) => (
              <div key={i} style={{ marginBottom: `${RIGHT_MARGINS[i]}px` }}>
                <Candle {...c} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div ref={contentRef} className="relative z-10 select-none" style={{ fontFamily: 'var(--font-arcade)' }}>

        {/* Negative margin to shift the text block upward */}
        <div style={{ marginTop: 0 }} />

        {/* Top bar */}
        <div ref={topBarRef} className="flex items-center justify-center gap-6 mb-16">
          <div ref={lineLeftRef}  style={{ width: '60px', height: '1px', background: 'white' }} />
          <span ref={labelTopRef} style={{ fontSize: 16, letterSpacing: '0.3em', color: 'white', whiteSpace: 'nowrap' }}>
            COMPUTING AND FINANCIAL MANAGEMENT
          </span>
          <div ref={lineRightRef} style={{ width: '60px', height: '1px', background: 'white' }} />
        </div>

        {/* CFM — each letter is a candlestick body at a different price level, slight CCW tilt */}
        <div
          ref={titleRef}
          className="text-white flex justify-center"
          style={{ fontSize: 240, lineHeight: 1, gap: '0.1em', transform: 'rotate(-6deg)' }}
        >
          {['C', 'F', 'M'].map((char, i) => {
            const { wickTop, wickBot, depth } = CFM_CONFIG[i];
            return (
              <span key={i} style={{ display: 'inline-block', position: 'relative', textShadow: make3dShadow(depth), WebkitTextStroke: '2px rgba(255,255,255,0.55)' }}>
                <span style={{ display: 'block', position: 'absolute', bottom: '100%', left: '50%',
                  width: 4, height: wickTop, background: 'white', transform: 'translateX(-50%)',
                  boxShadow: '2px 2px 0 #333, 4px 4px 0 #000' }} />
                {char}
                <span style={{ display: 'block', position: 'absolute', top: '100%', left: '50%',
                  width: 4, height: wickBot, background: 'white', transform: 'translateX(-50%)',
                  boxShadow: '2px 2px 0 #333, 4px 4px 0 #000' }} />
              </span>
            );
          })}
        </div>

        {/* Bottom bar */}
        <div ref={botBarRef} className="flex items-center justify-center gap-6 mt-16">
          <div ref={lineBotLeftRef}  style={{ width: '60px', height: '1px', background: 'white' }} />
          <span ref={labelBotRef} style={{ fontSize: 16, letterSpacing: '0.3em', color: 'white', whiteSpace: 'nowrap' }}>
            UNIVERSITY OF WATERLOO
          </span>
          <div ref={lineBotRightRef} style={{ width: '60px', height: '1px', background: 'white' }} />
        </div>

        <p ref={subRef} className="text-white text-center"
          style={{ fontSize: '12px', letterSpacing: '0.4em', marginTop: '2rem' }}>
          ▶&nbsp;&nbsp;CLICK TO START&nbsp;&nbsp;◀
        </p>

      </div>

      {/* Goose — ASCII art SVG, bottom left */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={gooseRef}
        src="/goose-ascii.png"
        alt="UWaterloo Goose"
        className="absolute -left-20 z-[1] -top-20 pointer-events-none select-none w-auto h-[550px] rotate-6"
      />

      {/* UWaterloo seal — ASCII art SVG, bottom right */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={sealRef}
        src="/waterloo-ascii.svg"
        alt="University of Waterloo"
        className="absolute bottom-5 right-15 z-[1] pointer-events-none select-none"
        style={{ width: 380, height: 380, transform: 'rotate(20deg) scaleX(1.05)' }}
      />
    </div>
  );
}
