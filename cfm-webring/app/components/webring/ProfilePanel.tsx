'use client';

import type { WebringEntry } from './types';

export interface ProfilePanelProps {
  rightPanelRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  isOpen: boolean;
  entry: WebringEntry | null;
  rightDragged: boolean;
  rightPos: { x: number; y: number };
  rightCollapsed: boolean;
  setRightCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  handleRightDragStart: (e: React.MouseEvent) => void;
  handleDeselect: () => void;
}

export default function ProfilePanel({
  rightPanelRef,
  isMobile,
  isOpen,
  entry,
  rightDragged,
  rightPos,
  rightCollapsed,
  setRightCollapsed,
  handleRightDragStart,
  handleDeselect,
}: ProfilePanelProps) {
  return (
    <div
      ref={rightPanelRef}
      className="absolute z-[60]"
      style={{
        ...(isMobile
          ? { bottom: 0, left: 0, right: 0, width: '100%', top: 'auto', transform: isOpen ? 'translateY(0)' : 'translateY(100%)' }
          : rightDragged
            ? { top: rightPos.y, left: rightPos.x }
            : { top: '50%', right: 24, transform: isOpen ? 'translateY(-50%)' : 'translateY(-50%) translateX(30px)' }
        ),
        width: isMobile ? '100%' : 280,
        opacity: isMobile ? (isOpen ? 1 : 0) : (isOpen ? 1 : 0),
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease, width 0.25s ease',
        userSelect: 'none',
        zIndex: isMobile ? 70 : undefined,
      }}
    >
      <div style={{
        border: '2px solid #000', background: 'rgba(0,0,0,1)', boxShadow: '3px 3px 0 #000',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        height: rightCollapsed ? 'auto' : undefined,
        maxHeight: isMobile ? '60vh' : undefined,
      }}>
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
          zIndex: 3,
        }} />

        {/* Title bar — draggable */}
        <div
          onMouseDown={isMobile ? undefined : handleRightDragStart}
          className="flex items-center justify-between px-4 py-2 relative z-10"
          style={{ borderBottom: '1px solid #222', background: '#0a0a0a', flexShrink: 0, cursor: isMobile ? 'default' : 'grab' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
            <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, letterSpacing: '0.1em', color: '#fff' }}>PROFILE</span>
            <span style={{ display: 'inline-block', width: 7, height: 12, background: '#fff', animation: 'terminal-cursor-blink 1s step-end infinite' }} />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setRightCollapsed(prev => !prev); }}
              className="cta-btn"
              style={{ background: 'transparent', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-arcade)', fontSize: 9, padding: '2px 7px', lineHeight: 1, letterSpacing: '0.1em' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
            >
              {rightCollapsed ? '+' : '\u2212'}
            </button>
            <button
              onClick={handleDeselect}
              className="cta-btn"
              style={{ background: 'transparent', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-arcade)', fontSize: 9, padding: '2px 7px', lineHeight: 1, letterSpacing: '0.1em' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
            >
              X
            </button>
          </div>
        </div>

        {entry && (
          <div
            className="flex flex-col relative z-10"
            style={{
              maxHeight: rightCollapsed ? 0 : (isMobile ? 'calc(60vh - 44px)' : 600),
              opacity: rightCollapsed ? 0 : 1,
              overflow: rightCollapsed ? 'hidden' : 'auto',
              transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
            }}
          >
            {/* Website screenshot or avatar fallback */}
            {(entry.websiteImage || entry.avatar) && (
              <div style={{ width: '100%', height: 160, overflow: 'hidden', borderBottom: '1px solid #222', position: 'relative', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.websiteImage || entry.avatar!} alt={`${entry.name}'s website`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
              </div>
            )}

            {/* Info */}
            <div style={{ padding: '14px 16px' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#888' }}>&gt;</span>
                <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 14, color: '#fff', letterSpacing: '0.1em' }}>{entry.name}</span>
              </div>

              {entry.role && (
                <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 10, color: '#888', margin: 0, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {entry.role}
                </p>
              )}

              <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, color: '#555', margin: 0, marginTop: 4, letterSpacing: '0.1em' }}>
                // CLASS OF &apos;{entry.year || entry.cohort}
              </p>

              {(entry.location || entry.school) && (
                <p style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, color: '#555', margin: 0, marginTop: 2, letterSpacing: '0.06em' }}>
                  {entry.location}{entry.location && entry.school ? '  //  ' : ''}{entry.school}
                </p>
              )}

              {entry.blurb && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#e0e0e0', margin: 0, marginTop: 10, lineHeight: 1.7 }}>
                  &ldquo;{entry.blurb}&rdquo;
                </p>
              )}

              {/* Socials (website filtered out — shown as VISIT button) */}
              {entry.socials && entry.socials.filter(s => s.type !== 'website').length > 0 && (
                <div className="flex gap-2 mt-3">
                  {entry.socials.filter(s => s.type !== 'website').map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="cta-btn"
                      style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: '2px solid #fff', boxShadow: '2px 2px 0 #000', background: 'transparent', textDecoration: 'none', transition: 'all 0.15s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
                      dangerouslySetInnerHTML={{ __html:
                        s.type === 'github' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>'
                        : s.type === 'linkedin' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>'
                        : s.type === 'twitter' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>'
                        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Visit */}
              <div className="flex items-center gap-2" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #222' }}>
                <a href={entry.url} target="_blank" rel="noopener noreferrer" className="cta-btn"
                  style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, letterSpacing: '0.15em', color: '#fff', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', padding: '5px 14px', background: 'transparent', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
                >VISIT &rarr;</a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
