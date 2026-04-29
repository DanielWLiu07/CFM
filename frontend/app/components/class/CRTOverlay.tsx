'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import type { ClassMember } from './types';
import CRTInfoPanel from './CRTInfoPanel';

const LightPillar = dynamic(() => import('./LightPillar'), { ssr: false });

type CRTPhase = 'idle' | 'dot' | 'line' | 'expand' | 'done' | 'flash' | 'shrink' | 'dotout' | 'afterglow';

interface CRTOverlayProps {
  expandedMember: ClassMember | null;
  members: ClassMember[];
  phase: CRTPhase;
  closeExpanded: () => void;
  onNavigate: (member: ClassMember) => void;
}

export default function CRTOverlay({ expandedMember, members, phase, closeExpanded, onNavigate }: CRTOverlayProps) {
  // Responsive — narrow = image inline with header instead of side panel
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Pre-warm LightPillar WebGL context even during idle — hidden 1x1 offscreen.
  // Always rendered (even when overlay is open) so the WebGL context is allocated
  // exactly once for the lifetime of this component, instead of churning on every
  // phase transition. WebGL context creation/teardown is expensive and browsers
  // cap concurrent contexts (~8-16); repeated remounts here can exhaust that
  // budget and cause downstream canvases to render blank.
  const prewarm = (
    <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}>
      <LightPillar paused quality="low" />
    </div>
  );

  if (phase === 'idle') return prewarm;

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
                          {expandedMember.cohort && (
                            <div style={{
                              fontFamily: 'var(--font-arcade)', fontSize: 12, letterSpacing: '0.1em',
                              color: '#fff', background: 'rgba(255,255,255,0.08)', padding: '2px 8px',
                              border: '1px solid rgba(255,255,255,0.2)',
                              flexShrink: 0, marginLeft: 8,
                            }}>
                              &apos;{expandedMember.cohort.slice(-2)}
                            </div>
                          )}
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

              {/* Right — name top, socials bottom, middle scrolls. Extracted into its own component. */}
              <CRTInfoPanel
                member={expandedMember}
                members={members}
                isNarrow={isNarrow}
                closeExpanded={closeExpanded}
                onNavigate={onNavigate}
                panelIn={phase === 'done'}
              />
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

  return <>{prewarm}{overlay}</>;
}
