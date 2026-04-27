'use client';

import React from 'react';
import type { ClassMember } from './types';
import { SOCIAL_ICONS } from './types';

// CRT panel chrome — colors used in many places.
const GREEN = '#22c55e';
const GREEN_GLOW = 'rgba(34,197,94,0.5)';
const RED = '#ef4444';
const RED_GLOW = 'rgba(239,68,68,0.5)';
const BTN_BG = '#1a1a1a';
const BTN_BORDER = '#444';
const BTN_SHADOW = '3px 3px 0px rgba(0,0,0,0.4)';

// Tuned text sizes — previously dev-controlled.
const BLURB_SIZE = 18;
const LABEL_SIZE = 48;

// Stock-style ticker entries — purely decorative.
const TICKER_ITEMS = [
  { color: GREEN, text: 'CFM ▲ 142.69 +3.21%' },
  { color: RED, text: 'UWAT ▼ 87.30 -1.04%' },
  { color: GREEN, text: 'ALGO ▲ 2048.00 +7.77%' },
  { color: '#eab308', text: 'SYS.OK ● UPTIME 99.97%' },
  { color: GREEN, text: 'NODE ▲ 18.3.0 STABLE' },
  { color: RED, text: 'HEAP ▼ 412MB -2.1%' },
  { color: GREEN, text: 'REQ/S ▲ 14.2K +12%' },
  { color: '#eab308', text: 'LATENCY ● 23ms P99' },
] as const;

// Shared base style for the boxed terminal buttons (socials, prev/next, close).
const baseButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-arcade)',
  color: '#fff',
  border: `1px solid ${BTN_BORDER}`,
  background: BTN_BG,
  boxShadow: BTN_SHADOW,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

/** Hover handlers shared by green-themed buttons (socials + prev/next). */
const greenHoverHandlers = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
    const t = e.currentTarget;
    t.style.background = GREEN; t.style.color = '#000';
    t.style.borderColor = GREEN;
    t.style.boxShadow = `0 0 12px ${GREEN_GLOW}, ${BTN_SHADOW}`;
  },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
    const t = e.currentTarget;
    t.style.background = BTN_BG; t.style.color = '#fff';
    t.style.borderColor = BTN_BORDER;
    t.style.boxShadow = BTN_SHADOW;
  },
};

/** Hover handlers for the destructive close button. */
const redHoverHandlers = {
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    const t = e.currentTarget;
    t.style.background = RED; t.style.color = '#000';
    t.style.borderColor = RED;
    t.style.boxShadow = `0 0 12px ${RED_GLOW}, ${BTN_SHADOW}`;
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    const t = e.currentTarget;
    t.style.background = BTN_BG; t.style.color = '#fff';
    t.style.borderColor = BTN_BORDER;
    t.style.boxShadow = BTN_SHADOW;
  },
};

interface Props {
  member: ClassMember;
  members: ClassMember[];
  isNarrow: boolean;
  closeExpanded: () => void;
  onNavigate: (member: ClassMember) => void;
  /** True for `done`/`flash`, false for `shrink`/`dotout` — drives panel-in/out animations. */
  panelIn: boolean;
}

export default function CRTInfoPanel({ member, members, isNarrow, closeExpanded, onNavigate, panelIn }: Props) {
  const idx = members.findIndex(m => m.name === member.name);
  const prev = members[(idx - 1 + members.length) % members.length];
  const next = members[(idx + 1) % members.length];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: '#0c0c0c', position: 'relative',
      backgroundImage:
        'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.03) 39px, rgba(255,255,255,0.03) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.03) 39px, rgba(255,255,255,0.03) 40px)',
      animation: panelIn
        ? 'panel-in 1.2s ease 0.2s both'
        : 'panel-out 0.3s ease forwards',
    }}>
      {/* Corner brackets — top-right omitted (close button anchors that corner). */}
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

      {/* Close button — top right */}
      <button
        onClick={e => { e.stopPropagation(); closeExpanded(); }}
        aria-label="Close"
        style={{
          ...baseButtonStyle,
          position: 'absolute', top: 40, right: 16, zIndex: 30,
          fontSize: 18,
          width: 36, height: 36,
        }}
        {...redHoverHandlers}
      >
        ×
      </button>

      {/* Code-editor line rail */}
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
          {[0, 1].map(rep => (
            <span key={rep} style={{ display: 'flex', gap: 40 }}>
              {TICKER_ITEMS.map((item, i) => (
                <span key={i} style={{ color: item.color }}>{item.text}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Header — name + role + location */}
      <div style={{
        padding: isNarrow ? '16px 20px 10px' : '20px 56px 10px', flexShrink: 0,
        display: 'flex', flexDirection: isNarrow ? 'row' : 'column', gap: isNarrow ? 16 : 4,
        borderBottom: '1px solid #333',
        animation: 'fade-in 0.4s cubic-bezier(0.16,1,0.3,1) 0.12s both',
        alignItems: isNarrow ? 'center' : undefined,
      }}>
        {isNarrow && <NarrowAvatar member={member} />}
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
              {member.name}
            </h2>
          </div>
          {member.role && (
            <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.22s both', marginTop: isNarrow ? -24 : -43 }}>
              <p style={{
                fontFamily: 'var(--font-arcade)', fontSize: isNarrow ? 22 : 32, color: GREEN,
                letterSpacing: '0.12em', margin: 0, textTransform: 'uppercase',
                WebkitTextStroke: isNarrow ? '1px #000' : '1.5px #000',
                paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
                textShadow: '2px 2px 0 #000, 0 0 12px rgba(34,197,94,0.3)',
              }}>
                {member.role}
              </p>
            </div>
          )}
          {member.tagline && (
            <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.26s both', marginTop: isNarrow ? -6 : -10 }}>
              <p style={{ fontFamily: 'monospace', fontSize: isNarrow ? 13 : 15, color: GREEN, letterSpacing: '0.04em', margin: 0, fontStyle: 'italic', textShadow: '0 0 8px rgba(34,197,94,0.3)' }}>
                {member.tagline}
              </p>
            </div>
          )}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 2,
            animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.29s both',
            marginTop: isNarrow ? -4 : -6,
          }}>
            <p style={{ fontFamily: 'var(--font-arcade)', fontSize: isNarrow ? 14 : 16, color: '#999', letterSpacing: '0.08em', margin: 0, textShadow: '1px 1px 0 #000' }}>
              {member.school ? `${member.location}  //  ${member.school}` : member.location}
            </p>
            {member.year && (
              <p style={{ fontFamily: 'var(--font-arcade)', fontSize: isNarrow ? 14 : 16, color: '#999', letterSpacing: '0.08em', margin: 0, textShadow: '1px 1px 0 #000' }}>
                CLASS OF &apos;{member.year}
              </p>
            )}
          </div>
        </div>
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
            fontFamily: 'monospace', fontSize: BLURB_SIZE, color: GREEN,
            lineHeight: 1.8, margin: 0,
          }}>
            {member.quote}
            <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: GREEN, marginLeft: 4, animation: 'blink 1s steps(1) infinite', verticalAlign: 'text-bottom' }} />
          </p>
        </div>

        {/* About Me */}
        {member.description && (
          <>
            <div style={{ animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.36s both' }}>
              <p style={{
                fontFamily: 'var(--font-arcade)', fontSize: LABEL_SIZE, letterSpacing: '0.18em', margin: '0 0 4px', textTransform: 'uppercase',
                color: '#fff',
                WebkitTextStroke: '1.5px #000',
                paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
                textShadow: '1px 1px 0 #000, 2px 2px 0 #000, 3px 3px 0 #111, 4px 4px 0 rgba(0,0,0,0.4), 5px 5px 0 rgba(255,255,255,0.35), 0 0 15px rgba(255,255,255,0.1)',
              }}>
                <span style={{ color: GREEN, WebkitTextStroke: '0px', textShadow: '1px 1px 0 #000, 2px 2px 0 #000, 3px 3px 0 rgba(0,0,0,0.4), 4px 4px 0 rgba(34,197,94,0.35), 0 0 12px rgba(34,197,94,0.6)', marginRight: 10 }}>$</span>ABOUT ME
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
                {member.description}
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
        {member.socials?.map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
            style={{ ...baseButtonStyle, width: 44, height: 44 }}
            {...greenHoverHandlers}
            onClick={e => e.stopPropagation()}
          >
            <span
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: (SOCIAL_ICONS[s.type] || '').replace(/width="12" height="12"/g, 'width="18" height="18"') }}
            />
          </a>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <NavArrow onClick={e => { e.stopPropagation(); onNavigate(prev); }}>&lt;</NavArrow>
          <NavArrow onClick={e => { e.stopPropagation(); onNavigate(next); }}>&gt;</NavArrow>
        </div>
      </div>

      {/* Terminal status bar */}
      <div style={{
        background: '#0a0a0a', padding: '6px 20px', flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'monospace', fontSize: 10, color: '#555', letterSpacing: '0.05em',
        borderTop: '1px solid #333',
      }}>
        <span>CFM://members/{member.name.toLowerCase().replace(/\s+/g, '-')}</span>
        <span style={{ display: 'flex', gap: 16 }}>
          <span><span style={{ color: GREEN }}>●</span> CONNECTED</span>
          {member.year && <span>CLASS &apos;{member.year}</span>}
          <span>{idx + 1}/{members.length}</span>
        </span>
      </div>

      {/* CRT scanlines + vignette overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.01) 3px, rgba(255,255,255,0.01) 4px)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 21,
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%)',
      }} />
    </div>
  );
}

/** Inline avatar shown only on narrow viewports inside the header. */
function NarrowAvatar({ member }: { member: ClassMember }) {
  const baseStyle: React.CSSProperties = {
    width: 130, height: 130, flexShrink: 0,
    border: '2px solid #444', boxShadow: '4px 4px 0px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    animation: 'content-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.12s both',
  };
  if (member.avatar) {
    return (
      <div style={baseStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={member.avatar} alt={member.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div style={{
      ...baseStyle,
      background: BTN_BG, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-arcade)', fontSize: 32, color: '#333',
    }}>
      {member.name.split(' ').map(w => w[0]).join('')}
    </div>
  );
}

/** Square arrow button used for prev/next navigation. */
function NavArrow({ onClick, children }: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ ...baseButtonStyle, fontSize: 20, width: 44, height: 44 }}
      {...greenHoverHandlers}
    >
      {children}
    </button>
  );
}
