'use client';

import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ClassMember } from './types';
import { SOCIAL_ICONS } from './types';

type CRTPhase = 'idle' | 'dot' | 'line' | 'expand' | 'done' | 'flash' | 'shrink' | 'dotout' | 'afterglow';

interface CRTOverlayProps {
  expandedMember: ClassMember | null;
  phase: CRTPhase;
  closeExpanded: () => void;
  inkKey: number;
  onReplay?: () => void;
}

export default function CRTOverlay({ expandedMember, phase, closeExpanded, inkKey, onReplay }: CRTOverlayProps) {
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
  const [noiseScale, setNoiseScale] = useState(50);
  const [noiseFreq, setNoiseFreq] = useState(10);
  const [showDebug, setShowDebug] = useState(true);

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
              {/* Left — avatar with ink noise reveal, transparent bg for PNG */}
              <div style={{
                width: '40%', height: '100%', flexShrink: 0,
                overflow: 'hidden', position: 'relative',
                ...(phase === 'done' ? {
                  animation: 'panel-in 0.8s ease 0.1s both',
                } : (phase === 'flash' || phase === 'shrink') ? {
                  animation: 'panel-out 0.3s ease forwards',
                } : {}),
              }}>
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
              </div>

              {/* Right — name top, socials bottom, middle scrolls */}
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                overflow: 'hidden', background: 'rgba(255,255,255,0.85)', position: 'relative',
                ...(phase === 'done' ? {
                  animation: 'panel-in 1.2s ease 0.2s both',
                } : (phase === 'flash' || phase === 'shrink') ? {
                  animation: 'panel-out 0.3s ease forwards',
                } : {}),
              }}>
                {/* Header — name + role + location pinned to top */}
                <div style={{
                  padding: '20px 56px 10px', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', gap: 4,
                  borderBottom: '2px solid #000',
                  animation: 'fade-in 0.4s cubic-bezier(0.16,1,0.3,1) 0.12s both',
                }}>
                  <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both' }}>
                    <h2 style={{
                      fontFamily: 'var(--font-arcade)', fontSize: 80,
                      color: '#fff', letterSpacing: '0.01em', margin: 0,
                      WebkitTextStroke: '2.5px #000',
                      paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
                      textShadow: '3px 3px 0 #000, 4px 4px 0 #000, 5px 5px 0 rgba(0,0,0,0.4), 6px 6px 0 rgba(0,0,0,0.2)',
                    }}>
                      {expandedMember.name}
                    </h2>
                  </div>
                  <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.22s both', marginTop: -43 }}>
                    <p style={{
                      fontFamily: 'var(--font-arcade)', fontSize: 32, color: '#000',
                      letterSpacing: '0.12em', margin: 0, textTransform: 'uppercase',
                    }}>
                      {expandedMember.role}
                    </p>
                  </div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 2,
                    animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.29s both',
                    marginTop: -13,
                  }}>
                    <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 16, color: '#777', letterSpacing: '0.08em', margin: 0 }}>
                      {expandedMember.location}  //  {expandedMember.school}
                    </p>
                    <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 16, color: '#777', letterSpacing: '0.08em', margin: 0 }}>
                      CLASS OF &apos;{expandedMember.year}
                    </p>
                  </div>
                </div>

                {/* Scrollable middle content */}
                <div
                  style={{
                    flex: 1, overflowY: 'auto', padding: '28px 56px 32px',
                    display: 'flex', flexDirection: 'column', gap: 28,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Blurb */}
                  <p style={{
                    fontFamily: 'monospace', fontSize: 18, color: '#000',
                    lineHeight: 1.9, margin: 0, fontStyle: 'italic',
                    animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.36s both',
                  }}>
                    &ldquo;{expandedMember.blurb}&rdquo;
                  </p>

                  {/* Hobbies */}
                  {expandedMember.hobbies && expandedMember.hobbies.length > 0 && (
                    <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.43s both', marginTop: 0 }}>
                      <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, color: '#888', letterSpacing: '0.18em', margin: '0 0 12px', textTransform: 'uppercase' }}>
                        HOBBIES
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {expandedMember.hobbies.map((h, i) => (
                          <span key={i} style={{
                            fontFamily: 'var(--font-arcade)', fontSize: 13, letterSpacing: '0.06em',
                            padding: '8px 18px', background: '#fff', border: '2px solid #000', color: '#000',
                          }}>
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experiences */}
                  {expandedMember.experiences && expandedMember.experiences.length > 0 && (
                    <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.5s both', marginTop: 0 }}>
                      <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, color: '#888', letterSpacing: '0.18em', margin: '0 0 12px', textTransform: 'uppercase' }}>
                        EXPERIENCE
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {expandedMember.experiences.map((exp, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: '#fff', border: '2px solid #000', padding: '10px 16px',
                          }}>
                            <span style={{ color: '#000', fontFamily: 'var(--font-arcade)', fontSize: 14 }}>&gt;</span>
                            <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 14, color: '#000' }}>{exp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Socials + Visit — pinned to bottom */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '24px 56px', borderTop: '2px solid #000',
                  flexShrink: 0,
                  animation: 'content-fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.55s both',
                }}>
                  {expandedMember.socials?.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 40, height: 40, border: '2px solid #000', background: 'transparent',
                        textDecoration: 'none', transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; }}
                      onClick={e => e.stopPropagation()}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: (SOCIAL_ICONS[s.type] || '').replace(/width="12" height="12"/g, 'width="18" height="18"') }} />
                    </a>
                  ))}
                  {expandedMember.url && expandedMember.url !== '#' && (
                    <a href={expandedMember.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        fontFamily: 'var(--font-arcade)', fontSize: 13, letterSpacing: '0.15em',
                        color: '#000', border: '2px solid #000', padding: '10px 24px',
                        background: 'transparent', textDecoration: 'none', transition: 'all 0.15s ease', marginLeft: 'auto',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; }}
                      onClick={e => e.stopPropagation()}
                    >
                      VISIT →
                    </a>
                  )}
                </div>

                {/* CRT scanlines + vignette on right panel */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20,
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.015) 3px, rgba(0,0,0,0.015) 4px)',
                }} />
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 21,
                  background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.08) 100%)',
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

          {/* ── TV BACKGROUND — faded person_tv + glitch effects (visible during done + close phases) ── */}
          {(phase === 'expand' || phase === 'done' || phase === 'flash' || phase === 'shrink') && (
            <>
              {/* Faded TV background — fades in with stepped animation + color bleed loop */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/person_tv.webp"
                alt=""
                style={{
                  position: 'absolute', inset: 0, zIndex: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  imageRendering: 'pixelated' as React.CSSProperties['imageRendering'],
                  pointerEvents: 'none',
                  ...((phase === 'expand' || phase === 'done') ? {
                    animation: 'tv-warmup 0.8s cubic-bezier(0.16,1,0.3,1) forwards, tv-color-bleed 6s ease-in-out infinite 0.8s',
                  } : {
                    animation: 'tv-warmdown 0.3s ease forwards',
                  }),
                }}
              />

              {/* Horizontal glitch tears — looping intermittent tears over the bg */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/person_tv.webp"
                alt=""
                style={{
                  position: 'absolute', inset: 0, zIndex: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  opacity: 0.05,
                  filter: 'grayscale(1) contrast(2) brightness(1.5)',
                  imageRendering: 'pixelated' as React.CSSProperties['imageRendering'],
                  pointerEvents: 'none',
                  animation: 'tv-glitch 3s steps(1) infinite',
                }}
              />

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
        <strong>Image + Mask Controls</strong>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowDebug(d => !d)} style={{ background: showDebug ? '#0a0' : '#333', color: '#fff', border: 'none', padding: '3px 8px', cursor: 'pointer', fontSize: 10, borderRadius: 4 }}>
            {showDebug ? 'Debug ON' : 'Debug OFF'}
          </button>
          <button onClick={() => {
            const out = JSON.stringify({ imgX, imgY, imgScale, maskTop, maskBottom, maskLeft, maskRight, noiseScale, noiseFreq }, null, 2);
            navigator.clipboard.writeText(out); alert(out);
          }} style={{ background: '#333', color: '#fff', border: 'none', padding: '3px 8px', cursor: 'pointer', fontSize: 10, borderRadius: 4 }}>Copy</button>
          {onReplay && (
            <button onClick={onReplay} style={{ background: '#06c', color: '#fff', border: 'none', padding: '3px 8px', cursor: 'pointer', fontSize: 10, borderRadius: 4 }}>▶ Replay</button>
          )}
        </div>
      </div>
      {([
        ['Img X', imgX, setImgX, -50, 50],
        ['Img Y', imgY, setImgY, -50, 50],
        ['Img Scale', imgScale, setImgScale, 50, 200],
        ['Mask Top', maskTop, setMaskTop, -20, 50],
        ['Mask Bottom', maskBottom, setMaskBottom, -20, 50],
        ['Mask Left', maskLeft, setMaskLeft, -20, 50],
        ['Mask Right', maskRight, setMaskRight, -20, 50],
        ['Noise Scale', noiseScale, setNoiseScale, 0, 200],
        ['Noise Freq', noiseFreq, setNoiseFreq, 1, 100],
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
