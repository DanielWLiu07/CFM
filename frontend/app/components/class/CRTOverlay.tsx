'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import type { ClassMember } from './types';
import { SOCIAL_ICONS } from './types';

const LightPillar = dynamic(() => import('./LightPillar'), { ssr: false });

type CRTPhase = 'idle' | 'dot' | 'line' | 'expand' | 'done' | 'flash' | 'shrink' | 'dotout' | 'afterglow';

interface CRTOverlayProps {
  expandedMember: ClassMember | null;
  members: ClassMember[];
  phase: CRTPhase;
  closeExpanded: () => void;
  onNavigate: (member: ClassMember) => void;
}

// Tuned text sizes — previously dev-controlled, now fixed.
const BLURB_SIZE = 18;
const LABEL_SIZE = 48;

export default function CRTOverlay({ expandedMember, members, phase, closeExpanded, onNavigate }: CRTOverlayProps) {
  // Responsive — narrow = image inline with header instead of side panel
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Pre-warm LightPillar WebGL context even during idle — hidden 1x1 offscreen
  if (phase === 'idle') return (
    <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}>
      <LightPillar paused quality="low" />
    </div>
  );

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
            background: '#000',
            ...(phase === 'dot' ? {
              transform: 'scaleX(0.008) scaleY(0.008)',
              transition: 'none',
            } : phase === 'line' ? {
              transform: 'scaleX(1) scaleY(0.008)',
              transition: 'transform 0.14s cubic-bezier(0.22, 1.3, 0.36, 1), border-radius 0.06s ease',
            } : phase === 'expand' ? {
              animation: 'crt-expand 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
            } : phase === 'flash' ? {
              transform: 'scale(1)',
              filter: 'brightness(1.5)',
              transition: 'filter 0.08s ease',
            } : phase === 'shrink' ? {
              transform: 'scaleX(1) scaleY(0.008)',
              transition: 'transform 0.2s cubic-bezier(0.6,0,1,0.4), filter 0.2s ease, background 0.15s ease',
            } : phase === 'dotout' ? {
              transform: 'scaleX(0.008) scaleY(0.008)',
              transition: 'transform 0.18s cubic-bezier(0.7,0,0.84,0), border-radius 0.08s ease, background 0.1s ease',
            } : {
              transform: 'scale(1)',
              transition: 'transform 0.1s ease-out, box-shadow 0.4s ease',
            }),
            boxShadow:
              (phase === 'dot' || phase === 'dotout')
                ? '0 0 120px 50px rgba(34,197,94,1), 0 0 200px 80px rgba(34,197,94,0.4), inset 0 0 60px 20px rgba(34,197,94,0.6)'
              : (phase === 'line' || phase === 'shrink')
                ? '0 0 80px 25px rgba(34,197,94,0.8), 0 0 150px 50px rgba(34,197,94,0.3), inset 0 0 40px 10px rgba(34,197,94,0.4)'
              : '0 0 0px 0px rgba(34,197,94,0), 0 0 0px 0px rgba(34,197,94,0), inset 0 0 0px 0px rgba(34,197,94,0)',
          }}
        >
          {/* ── STATIC NOISE — visible during expand, fades out into done ── */}
          {(phase === 'expand' || phase === 'done' || phase === 'flash' || phase === 'shrink') && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              opacity: phase === 'flash' ? 0.4 : phase === 'done' ? 0 : 0.25,
              transition: phase === 'done' ? 'opacity 0.4s ease' : 'none',
              backgroundImage: `
                repeating-conic-gradient(#888 0% 25%, transparent 0% 50%),
                repeating-conic-gradient(#666 0% 25%, transparent 0% 50%)
              `,
              backgroundSize: '4px 4px, 6px 6px',
              backgroundPosition: '0 0, 2px 2px',
              animation: phase === 'done' ? 'none' : 'crt-noise 40ms steps(8) infinite',
              pointerEvents: 'none',
              mixBlendMode: 'overlay',
            }} />
          )}

          {/* ── GREEN PHOSPHOR WASH — glows during open, fades out smoothly ── */}
          {(phase === 'dot' || phase === 'line' || phase === 'expand' || phase === 'done') && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 4,
              background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.25) 0%, rgba(34,197,94,0.1) 40%, transparent 70%)',
              opacity: phase === 'done' ? 0 : phase === 'dot' ? 0.6 : phase === 'line' ? 1 : 0.7,
              transition: phase === 'done' ? 'opacity 0.6s ease' : 'opacity 0.15s ease',
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
                  background: 'linear-gradient(transparent 0%, rgba(34,197,94,0.06) 30%, rgba(34,197,94,0.1) 50%, rgba(34,197,94,0.06) 70%, transparent 100%)',
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
              {/* Left — floating terminal phone card (hidden on narrow) */}
              {!isNarrow && <div onClick={closeExpanded} style={{
                width: '40%', height: '100%', flexShrink: 0,
                overflow: 'hidden', position: 'relative', background: '#080808',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                borderRight: '3px solid #222',
                ...(phase === 'done' ? {
                  animation: 'panel-in 0.8s ease 0.1s both',
                } : (phase === 'flash' || phase === 'shrink') ? {
                  animation: 'panel-out 0.3s ease forwards',
                } : {}),
              }}>
                {/* Perspective container holds: rotating/floating card rig, then static nav buttons. */}
                <div style={{
                  width: 'min(380px, 85%)',
                  position: 'relative',
                  zIndex: 10,
                  transformStyle: 'preserve-3d',
                  perspective: 900,
                  animation: 'content-fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both',
                }}>
                  {/* 3D rotated rig — holds card AND nav buttons so they share the same tilted,
                      floating plane. Buttons use pure CSS :hover (no JS), so the rig's animation
                      no longer interferes with hover state. */}
                  <div style={{
                    width: '100%',
                    position: 'relative',
                    transform: 'rotateY(5deg)',
                    transformStyle: 'preserve-3d',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                    animation: 'crt-card-float 6s ease-in-out infinite',
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease',
                  }}>
                    {/* Card slot — holds depth layers + bezel + screen. Carries `.crt-phone-card`
                        so :hover styles only apply when hovering the card itself, not the buttons. */}
                    <div className="crt-phone-card" style={{
                      width: '100%',
                      aspectRatio: '3 / 4',
                      position: 'relative',
                      transformStyle: 'preserve-3d',
                    }}>
                    {/* Depth layers — shift left (dx=-1 for left column card) */}
                    {[6,5,4,3,2,1].map(i => {
                      const v = Math.round(140 + (i/6) * 115);
                      return (
                        <div key={i} style={{
                          position: 'absolute', inset: 0,
                          background: `rgb(${v}, ${v}, ${v})`,
                          borderRadius: 8,
                          transform: `translate(${i * -1}px, ${i}px)`,
                          zIndex: -1,
                        }} />
                      );
                    })}

                    {/* Outer bezel */}
                    <div style={{
                      width: '100%', height: '100%',
                      boxSizing: 'border-box',
                      display: 'flex', flexDirection: 'column',
                      background: 'rgba(12,12,12,0.7)',
                      backdropFilter: 'blur(20px) saturate(1.3)',
                      WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8,
                      padding: 6,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 30px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.04)',
                      position: 'relative',
                      transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
                    }}>
                      {/* Power LED */}
                      <div style={{
                        position: 'absolute', bottom: -1, left: 14, zIndex: 10,
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#22c55e', boxShadow: '0 0 4px rgba(34,197,94,0.6)',
                        transition: 'box-shadow 0.3s ease',
                      }} />

                      {/* Inner screen */}
                      <div style={{
                        display: 'flex', flexDirection: 'column',
                        width: '100%', flex: 1, minHeight: 0, boxSizing: 'border-box',
                        background: '#0a0a0a',
                        borderRadius: 3,
                        position: 'relative', overflow: 'hidden',
                        animation: 'crt-screen-flicker 4s ease-in-out infinite',
                      }}>
                        {/* Scanlines */}
                        <div style={{
                          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
                          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
                        }} />
                        {/* Vignette */}
                        <div style={{
                          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
                          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
                          borderRadius: 3,
                        }} />
                        {/* Sweep bar */}
                        <div style={{
                          position: 'absolute', left: 0, right: 0, height: 80, pointerEvents: 'none', zIndex: 7,
                          background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 80%, transparent 100%)',
                          animation: 'crt-scanline-sweep 3s linear infinite',
                        }} />

                        {/* Avatar region */}
                        <div style={{
                          flex: 1, minHeight: 0, overflow: 'hidden',
                          position: 'relative', background: '#0a0a0a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {expandedMember.avatar ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={expandedMember.avatar}
                                alt={expandedMember.name}
                                style={{
                                  width: '100%', height: '100%', objectFit: 'cover',
                                  filter: 'saturate(0.8) contrast(1.1) brightness(0.95)',
                                }}
                              />
                              {/* RGB pixel grid */}
                              <div style={{
                                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
                                backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,0,0,0.03) 0px, rgba(255,0,0,0.03) 1px, rgba(0,255,0,0.03) 1px, rgba(0,255,0,0.03) 2px, rgba(0,100,255,0.03) 2px, rgba(0,100,255,0.03) 3px, transparent 3px, transparent 4px)',
                                mixBlendMode: 'screen',
                              }} />
                            </>
                          ) : (
                            <div style={{
                              fontFamily: 'var(--font-arcade)', fontSize: 64, color: '#333', letterSpacing: '0.1em',
                            }}>
                              {expandedMember.name.split(' ').map(w => w[0]).join('')}
                            </div>
                          )}
                        </div>

                        {/* Name bar */}
                        <div style={{
                          position: 'relative',
                          padding: '8px 12px 7px',
                          borderTop: '1px solid #222',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          flexShrink: 0,
                        }}>
                          <div style={{
                            fontFamily: 'var(--font-arcade)', fontSize: 16, letterSpacing: '0.1em',
                            color: '#fff', textShadow: '2px 2px 0 #000',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            <span style={{ color: '#22c55e', textShadow: '0 0 6px rgba(34,197,94,0.5)' }}>&gt; </span>
                            {expandedMember.name}
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-arcade)', fontSize: 12, letterSpacing: '0.1em',
                            color: '#fff', background: 'rgba(255,255,255,0.08)', padding: '2px 8px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            flexShrink: 0, marginLeft: 8,
                          }}>
                            &apos;{expandedMember.year}
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                    {/* end card slot */}
                  </div>
                </div>

                {/* ── Background effects ── */}
                {/* Light pillar — WebGL pre-warmed during idle, just unpauses here */}
                <div style={{
                  position: 'absolute', inset: -20, zIndex: 1, pointerEvents: 'none',
                  opacity: 0.85,
                }}>
                  <LightPillar
                    topColor="#22c55e"
                    bottomColor="#0a3d1a"
                    intensity={1.0}
                    rotationSpeed={0.3}
                    glowAmount={0.004}
                    pillarWidth={4.0}
                    pillarHeight={0.4}
                    noiseIntensity={0.4}
                    pillarRotation={25}
                    mixBlendMode="screen"
                    quality="low"
                  />
                </div>

                {/* Scrolling grid overlay */}
                <div className="crt-bg-grid" style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
                }} />

                {/* Rotating rings */}
                <div className="crt-bg-ring" style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: '120%', height: '120%',
                  pointerEvents: 'none', zIndex: 2,
                }} />
                <div className="crt-bg-ring" style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: '80%', height: '80%',
                  borderStyle: 'dashed',
                  pointerEvents: 'none', zIndex: 2,
                }} />

                {/* Corner decorations */}
                {[[0,0],[1,0],[0,1],[1,1]].map(([x,y], i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    [y ? 'bottom' : 'top']: 30,
                    [x ? 'right' : 'left']: 30,
                    width: 20, height: 20,
                    borderTop: y ? 'none' : '1px solid rgba(34,197,94,0.15)',
                    borderBottom: y ? '1px solid rgba(34,197,94,0.15)' : 'none',
                    borderLeft: x ? 'none' : '1px solid rgba(34,197,94,0.15)',
                    borderRight: x ? '1px solid rgba(34,197,94,0.15)' : 'none',
                    pointerEvents: 'none', zIndex: 3,
                  }} />
                ))}

                {/* Crosshair center */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 1, height: 40,
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(34,197,94,0.1)',
                  pointerEvents: 'none', zIndex: 2,
                }} />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 40, height: 1,
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(34,197,94,0.1)',
                  pointerEvents: 'none', zIndex: 2,
                }} />

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
                {/* Corner brackets — terminal frame chrome. Top-right omitted; the close
                    button visually anchors that corner instead. */}
                {!isNarrow && [
                  { top: 36, left: 16, brT: 1, brL: 1 },
                  { bottom: 36, left: 16, brB: 1, brL: 1 },
                  { bottom: 36, right: 16, brB: 1, brR: 1 },
                ].map((p, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    top: p.top, bottom: p.bottom, left: p.left, right: p.right,
                    width: 14, height: 14,
                    borderTop: p.brT ? '1px solid rgba(34,197,94,0.4)' : 'none',
                    borderBottom: p.brB ? '1px solid rgba(34,197,94,0.4)' : 'none',
                    borderLeft: p.brL ? '1px solid rgba(34,197,94,0.4)' : 'none',
                    borderRight: p.brR ? '1px solid rgba(34,197,94,0.4)' : 'none',
                    pointerEvents: 'none', zIndex: 22,
                  }} />
                ))}

                {/* Exit button — top right, closes the overlay */}
                <button
                  onClick={e => { e.stopPropagation(); closeExpanded(); }}
                  aria-label="Close"
                  style={{
                    position: 'absolute', top: 40, right: 16, zIndex: 30,
                    fontFamily: 'var(--font-arcade)', fontSize: 18,
                    color: '#fff', border: '1px solid #444',
                    width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0,
                    background: '#1a1a1a', boxShadow: '3px 3px 0px rgba(0,0,0,0.4)',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.boxShadow = '0 0 12px rgba(239,68,68,0.5), 3px 3px 0px rgba(0,0,0,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.boxShadow = '3px 3px 0px rgba(0,0,0,0.4)'; }}
                >
                  ×
                </button>

                {/* Fake code-editor line rail — static decoration, top to bottom on left edge */}
                {!isNarrow && (
                  <div style={{
                    position: 'absolute', left: 16, top: 60, bottom: 60,
                    width: 22, fontFamily: 'monospace', fontSize: 9,
                    color: 'rgba(255,255,255,0.18)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-around',
                    paddingRight: 6, textAlign: 'right',
                    pointerEvents: 'none', zIndex: 19, letterSpacing: '0.05em',
                  }}>
                    {Array.from({ length: 18 }, (_, i) => (
                      <span key={i}>{String(i + 1).padStart(2, '0')}</span>
                    ))}
                  </div>
                )}
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
                        ? '1px 1px 0 #000, 2px 2px 0 #000, 3px 3px 0 #111, 4px 4px 0 #111, 5px 5px 0 rgba(0,0,0,0.4), 6px 6px 0 rgba(255,255,255,0.35), 0 0 20px rgba(255,255,255,0.15)'
                        : '1px 1px 0 #000, 2px 2px 0 #000, 3px 3px 0 #000, 4px 4px 0 #111, 5px 5px 0 #111, 6px 6px 0 #111, 7px 7px 0 #222, 8px 8px 0 rgba(0,0,0,0.4), 9px 9px 0 rgba(0,0,0,0.2), 10px 10px 0 rgba(255,255,255,0.35), 0 0 30px rgba(255,255,255,0.1)',
                    }}>
                      {expandedMember.name}
                    </h2>
                  </div>
                  <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.22s both', marginTop: isNarrow ? -24 : -43 }}>
                    <p style={{
                      fontFamily: 'var(--font-arcade)', fontSize: isNarrow ? 22 : 32, color: '#22c55e',
                      letterSpacing: '0.12em', margin: 0, textTransform: 'uppercase',
                      WebkitTextStroke: isNarrow ? '1px #000' : '1.5px #000',
                      paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
                      textShadow: '2px 2px 0 #000, 0 0 12px rgba(34,197,94,0.3)',
                    }}>
                      {expandedMember.role}
                    </p>
                  </div>
                  {expandedMember.tagline && (
                    <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.26s both', marginTop: isNarrow ? -6 : -10 }}>
                      <p style={{ fontFamily: 'monospace', fontSize: isNarrow ? 13 : 15, color: '#22c55e', letterSpacing: '0.04em', margin: 0, fontStyle: 'italic', textShadow: '0 0 8px rgba(34,197,94,0.3)' }}>
                        {expandedMember.tagline}
                      </p>
                    </div>
                  )}

                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 2,
                    animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.29s both',
                    marginTop: isNarrow ? -4 : -6,
                  }}>
                    <p style={{ fontFamily: 'var(--font-arcade)', fontSize: isNarrow ? 14 : 16, color: '#999', letterSpacing: '0.08em', margin: 0, textShadow: '1px 1px 0 #000' }}>
                      {expandedMember.location}  //  {expandedMember.school}
                    </p>
                    <p style={{ fontFamily: 'var(--font-arcade)', fontSize: isNarrow ? 14 : 16, color: '#999', letterSpacing: '0.08em', margin: 0, textShadow: '1px 1px 0 #000' }}>
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
                  {/* Blurb terminal box */}
                  <div style={{
                    background: '#0a0a0a', border: '2px solid #333', padding: '16px 20px',
                    boxShadow: '4px 4px 0px #000, inset 0 0 30px rgba(0,255,100,0.03)',
                    animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.34s both',
                  }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#555', marginBottom: 8, letterSpacing: '0.1em' }}>
                      {'>'} cat ~/about.txt
                    </div>
                    <p style={{
                      fontFamily: 'monospace', fontSize: BLURB_SIZE, color: '#22c55e',
                      lineHeight: 1.8, margin: 0,
                    }}>
                      {expandedMember.blurb}
                      <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: '#22c55e', marginLeft: 4, animation: 'blink 1s steps(1) infinite', verticalAlign: 'text-bottom' }} />
                    </p>
                  </div>

                  {/* About Me */}
                  {expandedMember.description && (
                    <>
                      <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.36s both' }}>
                        <p style={{
                          fontFamily: 'var(--font-arcade)', fontSize: LABEL_SIZE, letterSpacing: '0.18em', margin: '0 0 4px', textTransform: 'uppercase',
                          color: '#fff',
                          WebkitTextStroke: '1.5px #000',
                          paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
                          textShadow: '1px 1px 0 #000, 2px 2px 0 #000, 3px 3px 0 #111, 4px 4px 0 rgba(0,0,0,0.4), 5px 5px 0 rgba(255,255,255,0.35), 0 0 15px rgba(255,255,255,0.1)',
                        }}>
                          <span style={{ color: '#22c55e', WebkitTextStroke: '0px', textShadow: '1px 1px 0 #000, 2px 2px 0 #000, 3px 3px 0 rgba(0,0,0,0.4), 4px 4px 0 rgba(34,197,94,0.35), 0 0 12px rgba(34,197,94,0.6)', marginRight: 10 }}>$</span>ABOUT ME
                        </p>
                      </div>
                      <div style={{
                        background: '#0a0a0a', border: '2px solid #333', padding: '16px 20px',
                        boxShadow: '4px 4px 0px #000, inset 0 0 30px rgba(0,255,100,0.03)',
                        animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.38s both',
                        marginTop: -16,
                      }}>
                        <p style={{
                          fontFamily: 'monospace', fontSize: 14, color: '#aaa',
                          lineHeight: 1.7, margin: 0,
                        }}>
                          {expandedMember.description}
                        </p>
                      </div>
                    </>
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
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 44, height: 44, border: '1px solid #444', background: '#1a1a1a',
                        boxShadow: '3px 3px 0px rgba(0,0,0,0.4)',
                        textDecoration: 'none', transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#22c55e'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 12px rgba(34,197,94,0.5), 3px 3px 0px rgba(0,0,0,0.4)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.boxShadow = '3px 3px 0px rgba(0,0,0,0.4)'; }}
                      onClick={e => e.stopPropagation()}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: (SOCIAL_ICONS[s.type] || '').replace(/width="12" height="12"/g, 'width="18" height="18"') }} />
                    </a>
                  ))}

                  {/* Prev / Next arrows — flat 2D, right side of socials row, all viewports */}
                  {(
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
                                color: '#fff', border: '1px solid #444',
                                width: 44, height: 44,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: 0,
                                background: '#1a1a1a', boxShadow: '3px 3px 0px rgba(0,0,0,0.4)',
                                cursor: 'pointer', transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#22c55e'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 12px rgba(34,197,94,0.5), 3px 3px 0px rgba(0,0,0,0.4)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.boxShadow = '3px 3px 0px rgba(0,0,0,0.4)'; }}
                            >
                              &lt;
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); onNavigate(next); }}
                              style={{
                                fontFamily: 'var(--font-arcade)', fontSize: 20,
                                color: '#fff', border: '1px solid #444',
                                width: 44, height: 44,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: 0,
                                background: '#1a1a1a', boxShadow: '3px 3px 0px rgba(0,0,0,0.4)',
                                cursor: 'pointer', transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#22c55e'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 12px rgba(34,197,94,0.5), 3px 3px 0px rgba(0,0,0,0.4)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.boxShadow = '3px 3px 0px rgba(0,0,0,0.4)'; }}
                            >
                              &gt;
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  )}
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

          {/* ── GREEN FLASH on close — CRT phosphor spike ── */}
          {phase === 'flash' && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(34,197,94,0.3)',
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

      {/* Phosphor afterglow — green dot lingers after screen dies */}
      {phase === 'afterglow' && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: '300px', height: '300px',
          marginTop: '-150px', marginLeft: '-150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.6) 0%, rgba(34,197,94,0.15) 30%, transparent 60%)',
          animation: 'crt-afterglow 0.45s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}
    </div>,
    document.body
  );

  return overlay;
}
