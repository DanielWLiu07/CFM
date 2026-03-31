'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ClassMember } from './types';
import { SOCIAL_ICONS } from './types';

type CRTPhase = 'idle' | 'dot' | 'line' | 'expand' | 'done' | 'flash' | 'shrink' | 'dotout' | 'afterglow';

interface CRTOverlayProps {
  expandedMember: ClassMember | null;
  members: ClassMember[];
  phase: CRTPhase;
  closeExpanded: () => void;
  onNavigate: (member: ClassMember) => void;
  inkKey: number;
  onReplay?: () => void;
}

export default function CRTOverlay({ expandedMember, members, phase, closeExpanded, onNavigate, inkKey, onReplay }: CRTOverlayProps) {
  // Responsive — narrow = image inline with header instead of side panel
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Image tuning
  const [imgX, setImgX] = useState(0);
  const [imgY, setImgY] = useState(0);
  const [imgScale, setImgScale] = useState(100);
  // Mask edges — each side independently (% from that edge)
  const [maskTop, setMaskTop] = useState(5);
  const [maskBottom, setMaskBottom] = useState(5);
  const [maskLeft, setMaskLeft] = useState(5);
  const [maskRight, setMaskRight] = useState(5);
  // Noise
  const [noiseScale, setNoiseScale] = useState(600);
  const [noiseFreq, setNoiseFreq] = useState(10);
  const [showDebug, setShowDebug] = useState(false);
  // Text sizing
  const [blurbSize, setBlurbSize] = useState(18);
  const [hobbySize, setHobbySize] = useState(13);
  const [hobbyPadV, setHobbyPadV] = useState(8);
  const [hobbyPadH, setHobbyPadH] = useState(18);
  const [expSize, setExpSize] = useState(14);
  const [expPadV, setExpPadV] = useState(10);
  const [expPadH, setExpPadH] = useState(16);
  const [labelSize, setLabelSize] = useState(32);

  // Draggable panel
  const [panelPos, setPanelPos] = useState({ x: 10, y: 10 });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const cur = { sx: e.clientX, sy: e.clientY, ox: panelPos.x, oy: panelPos.y };
    dragRef.current = cur;
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPanelPos({ x: dragRef.current.ox + ev.clientX - dragRef.current.sx, y: dragRef.current.oy + ev.clientY - dragRef.current.sy });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelPos]);

  if (phase === 'idle') return null;

  const overlay = createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: phase === 'afterglow' ? 'none' : 'auto' }}>
      {/* Main CRT screen */}
      {phase !== 'afterglow' && (
        <div
          onClick={closeExpanded}
          style={{
            position: 'absolute',
            inset: 0,
            cursor: phase === 'done' ? 'pointer' : 'default',
            willChange: phase === 'done' ? 'auto' : 'transform, opacity',
            borderRadius: (phase === 'dot' || phase === 'dotout') ? '50%' : '0',
            overflow: 'hidden',
            background:
              phase === 'dotout' ? '#a0c4ff'
              : phase === 'expand' ? '#000'
              : phase === 'done' ? '#000'
              : '#fff',
            ...(phase === 'dot' ? {
              transform: 'scaleX(0.006) scaleY(0.006)',
              transition: 'none',
            } : phase === 'line' ? {
              transform: 'scaleX(1) scaleY(0.006)',
              transition: 'transform 0.12s cubic-bezier(0.22, 1.3, 0.36, 1), border-radius 0.06s ease',
            } : phase === 'expand' ? {
              animation: 'crt-expand 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
            } : phase === 'flash' ? {
              transform: 'scale(1)',
              filter: 'brightness(2) saturate(0)',
              transition: 'filter 0.05s ease',
            } : phase === 'shrink' ? {
              transform: 'scaleX(1) scaleY(0.006)',
              filter: 'brightness(1.3)',
              transition: 'transform 0.2s cubic-bezier(0.6,0,1,0.4), filter 0.2s ease, background 0.15s ease',
            } : phase === 'dotout' ? {
              transform: 'scaleX(0.006) scaleY(0.006)',
              transition: 'transform 0.18s cubic-bezier(0.7,0,0.84,0), border-radius 0.08s ease, background 0.1s ease',
            } : {
              transform: 'scale(1)',
              transition: 'transform 0.1s ease-out',
            }),
            boxShadow:
              (phase === 'dot' || phase === 'dotout')
                ? '0 0 100px 40px rgba(160,196,255,1), 0 0 200px 80px rgba(160,196,255,0.5)'
              : (phase === 'line' || phase === 'shrink')
                ? '0 0 60px 20px rgba(200,220,255,0.9), 0 0 120px 40px rgba(160,196,255,0.4)'
              : 'none',
          }}
        >
          {/* ── STATIC NOISE — visible during expand + flash ── */}
          {(phase === 'expand' || phase === 'flash' || phase === 'shrink') && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              opacity: phase === 'flash' ? 0.4 : 0.25,
              backgroundImage: `
                repeating-conic-gradient(#888 0% 25%, transparent 0% 50%),
                repeating-conic-gradient(#666 0% 25%, transparent 0% 50%)
              `,
              backgroundSize: '4px 4px, 6px 6px',
              backgroundPosition: '0 0, 2px 2px',
              animation: 'crt-noise 40ms steps(8) infinite',
              pointerEvents: 'none',
              mixBlendMode: 'overlay',
            }} />
          )}

          {/* ── HARD FLICKER — during line + expand ── */}
          {(phase === 'line' || phase === 'expand') && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 4,
              background: '#fff',
              animation: 'crt-flicker 0.2s steps(1) 2',
              pointerEvents: 'none',
            }} />
          )}

          {/* ── HORIZONTAL JITTER — screen shakes during expand ── */}
          {phase === 'expand' && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              animation: 'crt-hjitter 0.08s steps(1) 5',
              pointerEvents: 'none',
            }}>
              {/* Rolling interference bands */}
              <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden',
              }}>
                <div style={{
                  width: '100%', height: '12vh',
                  background: 'linear-gradient(transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 70%, transparent 100%)',
                  animation: 'crt-band-scroll 0.35s linear 2',
                }} />
              </div>
            </div>
          )}

          {/* ── RGB SPLIT — color separation glitch during transitions ── */}
          {(phase === 'expand' || phase === 'flash' || phase === 'shrink') && (
            <>
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                background: 'rgba(255,0,0,0.06)',
                transform: 'translateX(-3px)',
                mixBlendMode: 'screen',
                pointerEvents: 'none',
                animation: 'crt-rgb-split 0.15s steps(1) 3',
              }} />
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                background: 'rgba(0,150,255,0.06)',
                transform: 'translateX(3px)',
                mixBlendMode: 'screen',
                pointerEvents: 'none',
                animation: 'crt-rgb-split 0.15s steps(1) 3 reverse',
              }} />
            </>
          )}

          {/* ── SCANLINES — visible on the CRT surface including close phases ── */}
          {(phase === 'expand' || phase === 'done' || phase === 'flash' || phase === 'shrink') && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 6,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
              pointerEvents: 'none',
            }} />
          )}

          {/* ── MEMBER CONTENT — left: avatar with ink reveal, right: staggered info ── */}
          {(phase === 'done' || phase === 'flash' || phase === 'shrink' || phase === 'dotout') && expandedMember && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 8,
              display: 'flex', flexDirection: 'row',
              opacity: (phase === 'done' || phase === 'flash') ? 1 : 0,
              transition: phase === 'flash' ? 'opacity 0.25s ease 0.05s' : phase === 'shrink' ? 'opacity 0.2s ease' : 'opacity 0.35s ease',
              pointerEvents: phase === 'done' ? 'auto' : 'none',
            }}>
              {/* Left — avatar with ink noise reveal (hidden on narrow) */}
              {!isNarrow && <div onClick={closeExpanded} style={{
                width: '40%', height: '100%', flexShrink: 0,
                overflow: 'hidden', position: 'relative', background: '#080808',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                ...(phase === 'done' ? {
                  animation: 'panel-in 0.8s ease 0.1s both',
                } : (phase === 'flash' || phase === 'shrink') ? {
                  animation: 'panel-out 0.3s ease forwards',
                } : {}),
              }}>
                {/* Screen bezel frame */}
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRight: '3px solid #222',
                  boxShadow: 'inset 0 0 60px 20px rgba(0,0,0,0.8), inset 0 0 120px 40px rgba(0,0,0,0.4)',
                  pointerEvents: 'none', zIndex: 15,
                }} />
                {/* Screen glare reflection */}
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 14, pointerEvents: 'none',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.015) 100%)',
                }} />
                {expandedMember.avatar ? (
                  <>
                    <svg
                      key={inkKey}
                      width="100%"
                      height="100%"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ position: 'absolute', inset: 0, display: 'block' }}
                    >
                      <defs>
                        <filter id="inkNoiseReveal" x="-20%" y="-20%" width="140%" height="140%">
                          <feTurbulence type="fractalNoise" baseFrequency={noiseFreq / 1000} numOctaves="3" result="noise" />
                          <feDisplacementMap in="SourceGraphic" in2="noise" scale="200" xChannelSelector="R" yChannelSelector="G">
                            <animate attributeName="scale" values={`200;${noiseScale}`} dur="3s" begin="0s" calcMode="spline" keySplines="0.2 0.8 0.3 1" fill="freeze" />
                          </feDisplacementMap>
                        </filter>
                        <mask id="inkMask">
                          <rect x="0" y="0" width="100%" height="100%" fill="black" />
                          <rect x="50%" y="50%" width="0%" height="0%" fill="white" filter="url(#inkNoiseReveal)">
                            <animate attributeName="x" values={`50%;${maskLeft}%`} dur="3s" begin="0s" calcMode="spline" keySplines="0.2 0.8 0.3 1" fill="freeze" />
                            <animate attributeName="y" values={`50%;${maskTop}%`} dur="3s" begin="0s" calcMode="spline" keySplines="0.2 0.8 0.3 1" fill="freeze" />
                            <animate attributeName="width" values={`0%;${100 - maskLeft - maskRight}%`} dur="3s" begin="0s" calcMode="spline" keySplines="0.2 0.8 0.3 1" fill="freeze" />
                            <animate attributeName="height" values={`0%;${100 - maskTop - maskBottom}%`} dur="3s" begin="0s" calcMode="spline" keySplines="0.2 0.8 0.3 1" fill="freeze" />
                          </rect>
                        </mask>
                      </defs>
                      <image
                        href={expandedMember.avatar}
                        x={`${imgX}%`}
                        y={`${imgY}%`}
                        width={`${imgScale}%`}
                        height={`${imgScale}%`}
                        preserveAspectRatio="xMidYMid slice"
                        mask="url(#inkMask)"
                      />
                      {/* Debug: green dashed = mask boundary */}
                      {showDebug && (
                        <rect
                          x={`${maskLeft}%`} y={`${maskTop}%`}
                          width={`${100 - maskLeft - maskRight}%`} height={`${100 - maskTop - maskBottom}%`}
                          fill="none" stroke="lime" strokeWidth="2" strokeDasharray="6 4"
                        />
                      )}
                    </svg>
                    {/* Debug: red = image container boundary */}
                    {showDebug && (
                      <div style={{ position: 'absolute', inset: 0, border: '2px solid red', pointerEvents: 'none', zIndex: 10 }} />
                    )}
                    {/* CRT scanline overlay on image */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
                      pointerEvents: 'none',
                    }} />
                  </>
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#000',
                    fontFamily: 'var(--font-arcade)', fontSize: 64, color: '#333', letterSpacing: '0.1em',
                    animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both',
                  }}>
                    {expandedMember.name.split(' ').map(w => w[0]).join('')}
                  </div>
                )}
              </div>}

              {/* Right — name top, socials bottom, middle scrolls */}
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                overflow: 'hidden', background: '#0c0c0c', position: 'relative',
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.03) 39px, rgba(255,255,255,0.03) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.03) 39px, rgba(255,255,255,0.03) 40px)',
                ...(phase === 'done' ? {
                  animation: 'panel-in 1.2s ease 0.2s both',
                } : (phase === 'flash' || phase === 'shrink') ? {
                  animation: 'panel-out 0.3s ease forwards',
                } : {}),
              }}>
                {/* Scrolling ticker tape */}
                <div style={{
                  overflow: 'hidden', background: '#000', borderBottom: '2px solid #000',
                  flexShrink: 0, height: 28, display: 'flex', alignItems: 'center',
                  animation: 'fade-in 0.3s ease 0.1s both',
                }}>
                  <div style={{
                    display: 'flex', gap: 40, whiteSpace: 'nowrap',
                    animation: 'ticker-scroll 20s linear infinite',
                    fontFamily: 'var(--font-arcade)', fontSize: 11, letterSpacing: '0.05em',
                  }}>
                    {[...Array(2)].map((_, rep) => (
                      <span key={rep} style={{ display: 'flex', gap: 40 }}>
                        <span style={{ color: '#22c55e' }}>CFM ▲ 142.69 +3.21%</span>
                        <span style={{ color: '#ef4444' }}>UWAT ▼ 87.30 -1.04%</span>
                        <span style={{ color: '#22c55e' }}>ALGO ▲ 2048.00 +7.77%</span>
                        <span style={{ color: '#eab308' }}>SYS.OK ● UPTIME 99.97%</span>
                        <span style={{ color: '#22c55e' }}>NODE ▲ 18.3.0 STABLE</span>
                        <span style={{ color: '#ef4444' }}>HEAP ▼ 412MB -2.1%</span>
                        <span style={{ color: '#22c55e' }}>REQ/S ▲ 14.2K +12%</span>
                        <span style={{ color: '#eab308' }}>LATENCY ● 23ms P99</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Header — name + role + location pinned to top */}
                <div style={{
                  padding: isNarrow ? '16px 20px 10px' : '20px 56px 10px', flexShrink: 0,
                  display: 'flex', flexDirection: isNarrow ? 'row' : 'column', gap: isNarrow ? 16 : 4,
                  borderBottom: '1px solid #333',
                  animation: 'fade-in 0.4s cubic-bezier(0.16,1,0.3,1) 0.12s both',
                  alignItems: isNarrow ? 'center' : undefined,
                }}>
                  {/* Inline avatar on narrow screens */}
                  {isNarrow && expandedMember.avatar && (
                    <div style={{
                      width: 130, height: 130, flexShrink: 0,
                      border: '2px solid #444', boxShadow: '4px 4px 0px rgba(0,0,0,0.5)',
                      overflow: 'hidden',
                      animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.12s both',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={expandedMember.avatar} alt={expandedMember.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  {isNarrow && !expandedMember.avatar && (
                    <div style={{
                      width: 130, height: 130, flexShrink: 0,
                      border: '2px solid #444', boxShadow: '4px 4px 0px rgba(0,0,0,0.5)',
                      background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-arcade)', fontSize: 32, color: '#333',
                      animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.12s both',
                    }}>
                      {expandedMember.name.split(' ').map(w => w[0]).join('')}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: isNarrow ? 2 : 4, flex: 1, minWidth: 0 }}>
                  <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both' }}>
                    <h2 style={{
                      fontFamily: 'var(--font-arcade)', fontSize: isNarrow ? 48 : 80,
                      color: '#fff', letterSpacing: '0.01em', margin: 0,
                      WebkitTextStroke: isNarrow ? '2px #000' : '2.5px #000',
                      paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
                      textShadow: isNarrow
                        ? '2px 2px 0 #000, 3px 3px 0 rgba(0,0,0,0.4)'
                        : '3px 3px 0 #000, 4px 4px 0 #000, 5px 5px 0 rgba(0,0,0,0.4), 6px 6px 0 rgba(0,0,0,0.2)',
                    }}>
                      {expandedMember.name}
                    </h2>
                  </div>
                  <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.22s both', marginTop: isNarrow ? -24 : -43 }}>
                    <p style={{
                      fontFamily: 'var(--font-arcade)', fontSize: isNarrow ? 22 : 32, color: '#fff',
                      letterSpacing: '0.12em', margin: 0, textTransform: 'uppercase',
                    }}>
                      {expandedMember.role}
                    </p>
                  </div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 2,
                    animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.29s both',
                    marginTop: isNarrow ? -8 : -13,
                  }}>
                    <p style={{ fontFamily: 'var(--font-arcade)', fontSize: isNarrow ? 14 : 16, color: '#777', letterSpacing: '0.08em', margin: 0 }}>
                      {expandedMember.location}  //  {expandedMember.school}
                    </p>
                    <p style={{ fontFamily: 'var(--font-arcade)', fontSize: isNarrow ? 14 : 16, color: '#777', letterSpacing: '0.08em', margin: 0 }}>
                      CLASS OF &apos;{expandedMember.year}
                    </p>
                  </div>
                  </div>{/* close inner name/info column wrapper */}
                </div>

                {/* Scrollable middle content */}
                <div
                  style={{
                    flex: 1, overflowY: 'auto', padding: isNarrow ? '20px 20px 24px' : '28px 56px 32px',
                    display: 'flex', flexDirection: 'column', gap: 28,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Blurb — terminal style */}
                  <div style={{
                    background: '#0a0a0a', border: '2px solid #333', padding: '16px 20px',
                    boxShadow: '4px 4px 0px #000, inset 0 0 30px rgba(0,255,100,0.03)',
                    animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.36s both',
                  }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#555', marginBottom: 8, letterSpacing: '0.1em' }}>
                      {'>'} cat ~/about.txt
                    </div>
                    <p style={{
                      fontFamily: 'monospace', fontSize: blurbSize, color: '#22c55e',
                      lineHeight: 1.8, margin: 0,
                    }}>
                      {expandedMember.blurb}
                      <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: '#22c55e', marginLeft: 4, animation: 'blink 1s steps(1) infinite', verticalAlign: 'text-bottom' }} />
                    </p>
                  </div>

                  {/* About Me */}
                  {expandedMember.hobbies && expandedMember.hobbies.length > 0 && (
                    <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.43s both', marginTop: 0 }}>
                      <p style={{ fontFamily: 'var(--font-arcade)', fontSize: labelSize, color: '#fff', letterSpacing: '0.18em', margin: '0 0 12px', textTransform: 'uppercase' }}>
                        <span style={{ color: '#22c55e', marginRight: 8 }}>$</span>INTERESTS
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {expandedMember.hobbies.map((h, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: '#1a1a1a', border: '1px solid #333', padding: `${hobbyPadV}px ${hobbyPadH}px`,
                            boxShadow: '3px 3px 0px rgba(0,0,0,0.4)',
                          }}>
                            <span style={{ color: '#22c55e', fontFamily: 'var(--font-arcade)', fontSize: hobbySize }}>&gt;</span>
                            <span style={{ fontFamily: 'var(--font-arcade)', fontSize: hobbySize, letterSpacing: '0.06em', color: '#e0e0e0' }}>
                              {h}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experiences */}
                  {expandedMember.experiences && expandedMember.experiences.length > 0 && (
                    <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.5s both', marginTop: 0 }}>
                      <p style={{ fontFamily: 'var(--font-arcade)', fontSize: labelSize, color: '#fff', letterSpacing: '0.18em', margin: '0 0 12px', textTransform: 'uppercase' }}>
                        <span style={{ color: '#22c55e', marginRight: 8 }}>$</span>EXPERIENCE
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {expandedMember.experiences.map((exp, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: '#1a1a1a', border: '1px solid #333', padding: `${expPadV}px ${expPadH}px`,
                            boxShadow: '3px 3px 0px rgba(0,0,0,0.4)',
                          }}>
                            <span style={{ color: '#22c55e', fontFamily: 'var(--font-arcade)', fontSize: expSize }}>&gt;</span>
                            <span style={{ fontFamily: 'var(--font-arcade)', fontSize: expSize, color: '#e0e0e0' }}>{exp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Socials + Nav — pinned to bottom */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: isNarrow ? 8 : 14, padding: isNarrow ? '16px 20px' : '24px 56px', borderTop: '1px solid #333',
                  flexShrink: 0,
                  animation: 'content-fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.55s both',
                }}>
                  {expandedMember.socials?.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        color: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 44, height: 44, border: '1px solid #444', background: '#1a1a1a',
                        boxShadow: '3px 3px 0px rgba(0,0,0,0.4)',
                        textDecoration: 'none', transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#333'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#ccc'; }}
                      onClick={e => e.stopPropagation()}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: (SOCIAL_ICONS[s.type] || '').replace(/width="12" height="12"/g, 'width="18" height="18"') }} />
                    </a>
                  ))}

                  {/* Prev / Next arrows — wrap around */}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {(() => {
                      const idx = members.findIndex(m => m.name === expandedMember.name);
                      const prev = members[(idx - 1 + members.length) % members.length];
                      const next = members[(idx + 1) % members.length];
                      return (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); onNavigate(prev); }}
                            style={{
                              fontFamily: 'var(--font-arcade)', fontSize: 20,
                              color: '#ccc', border: '1px solid #444',
                              width: 44, height: 44,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              padding: 0,
                              background: '#1a1a1a', boxShadow: '3px 3px 0px rgba(0,0,0,0.4)',
                              cursor: 'pointer', transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#333'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#ccc'; }}
                          >
                            &lt;
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); onNavigate(next); }}
                            style={{
                              fontFamily: 'var(--font-arcade)', fontSize: 20,
                              color: '#ccc', border: '1px solid #444',
                              width: 44, height: 44,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              padding: 0,
                              background: '#1a1a1a', boxShadow: '3px 3px 0px rgba(0,0,0,0.4)',
                              cursor: 'pointer', transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#333'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#ccc'; }}
                          >
                            &gt;
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Terminal status bar */}
                <div style={{
                  background: '#0a0a0a', padding: '6px 20px', flexShrink: 0,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontFamily: 'monospace', fontSize: 10, color: '#555', letterSpacing: '0.05em',
                  borderTop: '1px solid #333',
                }}>
                  <span>CFM://members/{expandedMember.name.toLowerCase().replace(/\s+/g, '-')}</span>
                  <span style={{ display: 'flex', gap: 16 }}>
                    <span><span style={{ color: '#22c55e' }}>●</span> CONNECTED</span>
                    <span>CLASS &apos;{expandedMember.year}</span>
                    <span>{(() => { const idx = members.findIndex(m => m.name === expandedMember.name); return `${idx + 1}/${members.length}`; })()}</span>
                  </span>
                </div>

                {/* CRT scanlines + vignette on right panel */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20,
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.01) 3px, rgba(255,255,255,0.01) 4px)',
                }} />
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 21,
                  background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%)',
                }} />
              </div>
            </div>
          )}

          {/* ── WHITE FLASH on close — CRT brightness spike ── */}
          {phase === 'flash' && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: '#fff',
              opacity: 0.8,
              animation: 'crt-flicker 0.07s steps(1) 1',
              pointerEvents: 'none',
            }} />
          )}

          {/* ── SUBTLE CRT NOISE — visible during done + close phases ── */}
          {(phase === 'expand' || phase === 'done' || phase === 'flash' || phase === 'shrink') && (
            <>
              {/* Persistent TV static noise */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                opacity: 0.035,
                backgroundImage: `
                  repeating-conic-gradient(#aaa 0% 25%, transparent 0% 50%),
                  repeating-conic-gradient(#999 0% 25%, transparent 0% 50%)
                `,
                backgroundSize: '3px 3px, 5px 5px',
                backgroundPosition: '0 0, 1px 1px',
                animation: 'crt-noise 50ms steps(8) infinite',
                pointerEvents: 'none',
                mixBlendMode: 'overlay',
              }} />

              {/* Rolling interference band — slow loop */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                overflow: 'hidden', pointerEvents: 'none',
              }}>
                <div style={{
                  width: '100%', height: '10vh',
                  background: 'linear-gradient(transparent 0%, rgba(255,255,255,0.02) 20%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 80%, transparent 100%)',
                  animation: 'tv-band-slow 5s linear infinite',
                }} />
              </div>
            </>
          )}

        </div>
      )}

      {/* Phosphor afterglow — blue dot lingers after screen dies */}
      {phase === 'afterglow' && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: '300px', height: '300px',
          marginTop: '-150px', marginLeft: '-150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(160,196,255,0.7) 0%, rgba(160,196,255,0.2) 30%, transparent 60%)',
          animation: 'crt-afterglow 0.45s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}
    </div>,
    document.body
  );

  const controlsPanel = (phase === 'done' || phase === 'flash') && createPortal(
    <div onClick={e => e.stopPropagation()} style={{
      position: 'fixed', top: panelPos.y, left: panelPos.x, zIndex: 999999,
      background: 'rgba(0,0,0,0.92)', color: '#fff', padding: '12px 16px',
      borderRadius: 8, width: 280, fontFamily: 'system-ui', fontSize: 11,
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      <div
        onMouseDown={startDrag}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'grab', userSelect: 'none' }}
      >
        <strong>Text Controls</strong>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => {
            const out = JSON.stringify({ blurbSize, hobbySize, hobbyPadV, hobbyPadH, expSize, expPadV, expPadH, labelSize }, null, 2);
            navigator.clipboard.writeText(out); alert(out);
          }} style={{ background: '#333', color: '#fff', border: 'none', padding: '3px 8px', cursor: 'pointer', fontSize: 10, borderRadius: 4 }}>Copy</button>
          {onReplay && (
            <button onClick={onReplay} style={{ background: '#06c', color: '#fff', border: 'none', padding: '3px 8px', cursor: 'pointer', fontSize: 10, borderRadius: 4 }}>▶ Replay</button>
          )}
        </div>
      </div>
      {([
        ['Blurb Size', blurbSize, setBlurbSize, 10, 32],
        ['Label Size', labelSize, setLabelSize, 8, 48],
        ['Hobby Size', hobbySize, setHobbySize, 8, 24],
        ['Hobby Pad V', hobbyPadV, setHobbyPadV, 2, 20],
        ['Hobby Pad H', hobbyPadH, setHobbyPadH, 4, 36],
        ['Exp Size', expSize, setExpSize, 8, 24],
        ['Exp Pad V', expPadV, setExpPadV, 2, 20],
        ['Exp Pad H', expPadH, setExpPadH, 4, 36],
      ] as [string, number, React.Dispatch<React.SetStateAction<number>>, number, number][]).map(([label, val, setter, min, max]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ width: 80, flexShrink: 0 }}>{label}</label>
          <input type="range" min={min} max={max} step={1}
            value={val}
            onChange={e => setter(parseInt(e.target.value))}
            style={{ flex: 1, height: 14 }}
          />
          <span style={{ width: 30, textAlign: 'right', fontFamily: 'monospace' }}>{val}</span>
        </div>
      ))}
    </div>,
    document.body
  );

  return <>{overlay}{controlsPanel}</>;
}
