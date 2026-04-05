'use client';

import type { WebringEntry } from './types';

export interface SearchPanelProps {
  panelRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  selectedNode: number;
  panelPos: { x: number; y: number };
  panelSize: { w: number; h: number };
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedCohorts: Set<string>;
  setSelectedCohorts: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleCohort: (cohort: string) => void;
  matchingIndices: Set<number>;
  hoveredNode: number;
  setHoveredNode: React.Dispatch<React.SetStateAction<number>>;
  handleDragStart: (e: React.MouseEvent) => void;
  handleResizeStart: (e: React.MouseEvent) => void;
  handleListClick: (e: React.MouseEvent, i: number) => void;
  handleListDoubleClick: (e: React.MouseEvent, i: number) => void;
  allCohorts: string[];
  webringEntries: WebringEntry[];
  listMaxHeight: number;
  simValues?: Record<number, number>;
  simTick?: number;
}

export default function SearchPanel({
  panelRef,
  isMobile,
  selectedNode,
  panelPos,
  panelSize,
  collapsed,
  setCollapsed,
  search,
  setSearch,
  selectedCohorts,
  setSelectedCohorts,
  toggleCohort,
  matchingIndices,
  hoveredNode,
  setHoveredNode,
  handleDragStart,
  handleResizeStart,
  handleListClick,
  handleListDoubleClick,
  allCohorts,
  webringEntries,
  listMaxHeight,
  simValues,
  simTick,
}: SearchPanelProps) {
  return (
    <div
      ref={panelRef}
      className="absolute z-[60]"
      style={{
        ...(isMobile
          ? { bottom: 0, left: 0, right: 0, width: '100%', top: 'auto',
              transform: (selectedNode >= 0) ? 'translateY(100%)' : 'translateY(0)',
              transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            }
          : { top: panelPos.y, left: panelPos.x, width: panelSize.w }
        ),
        userSelect: 'none',
      }}
    >
      <div
        style={{
          border: '2px solid #000',
          background: 'rgba(0, 0, 0, 1)',
          backdropFilter: 'blur(8px)',
          boxShadow: '3px 3px 0 #000',
          height: collapsed ? 'auto' : (isMobile ? 'auto' : panelSize.h),
          maxHeight: isMobile && !collapsed ? '50vh' : undefined,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
          zIndex: 1,
        }} />

        <div
          onMouseDown={isMobile ? undefined : handleDragStart}
          className="flex items-center justify-between px-4 py-2 relative z-10"
          style={{ borderBottom: '1px solid #222', background: '#0a0a0a', cursor: isMobile ? 'default' : 'grab', flexShrink: 0 }}
        >
          <div className="flex items-center gap-2">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
            <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, letterSpacing: '0.1em', color: '#fff' }}>SEARCH</span>
            <span style={{ display: 'inline-block', width: 7, height: 12, background: '#fff', animation: 'terminal-cursor-blink 1s step-end infinite' }} />
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 8, color: '#444', letterSpacing: '0.1em' }}>
              {matchingIndices.size}/{webringEntries.length}
            </span>
            <button
              className="cta-btn"
              onClick={(e) => { e.stopPropagation(); setCollapsed(prev => !prev); }}
              style={{ background: 'transparent', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-arcade)', fontSize: 9, padding: '2px 7px', lineHeight: 1, letterSpacing: '0.1em' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
            >
              {collapsed ? '+' : '\u2212'}
            </button>
          </div>
        </div>

        <div
          className="flex flex-col relative z-10"
          style={{
            maxHeight: collapsed ? 0 : (isMobile ? 'calc(50vh - 44px)' : 600),
            opacity: collapsed ? 0 : 1,
            padding: collapsed ? '0 16px' : '12px 16px',
            overflow: collapsed ? 'hidden' : 'auto',
            transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, padding 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            flex: collapsed ? 'none' : '1',
          }}
        >
          <div style={{ border: '1px solid #333', background: '#111', display: 'flex', alignItems: 'center', padding: '0 12px', flexShrink: 0 }}>
            <span style={{ color: '#888', fontFamily: 'var(--font-mono)', fontSize: 13, marginRight: 8 }}>{'>'}</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="search..." spellCheck={false}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e0e0e0', fontFamily: 'var(--font-mono)', fontSize: 13, padding: '8px 0', flex: 1, minWidth: 0, caretColor: '#fff' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '0 4px' }}>x</button>}
          </div>

          <div className="flex flex-wrap gap-1 mt-2" style={{ flexShrink: 0 }}>
            {allCohorts.map(cohort => {
              const active = selectedCohorts.has(cohort);
              return (
                <button key={cohort} className="cohort-chip" onClick={() => toggleCohort(cohort)}
                  style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, letterSpacing: '0.08em', padding: '3px 10px', border: `1px solid ${active ? '#fff' : '#333'}`, background: active ? '#fff' : 'transparent', color: active ? '#000' : '#666', cursor: 'pointer', transition: 'all 0.15s ease' }}
                >{cohort}</button>
              );
            })}
            {selectedCohorts.size > 0 && <button
  onClick={() => setSelectedCohorts(new Set())}
  style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, padding: '3px 8px', border: '2px solid #fff', background: 'transparent', color: '#fff', cursor: 'pointer', letterSpacing: '0.1em', transition: 'all 0.15s ease' }}
  onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
>CLEAR</button>}
          </div>

          <div className="mt-3 flex flex-col gap-1 flex-1 overflow-y-auto" style={{ maxHeight: Math.max(80, listMaxHeight), marginRight: -16, paddingRight: 16 }}>
            {webringEntries.map((entry, i) => {
              if (!matchingIndices.has(i)) return null;
              const isSelected = selectedNode === i;
              return (
                <div key={i} className="block no-underline webring-item" role="button" tabIndex={0}
                  onClick={(e) => handleListClick(e, i)}
                  onDoubleClick={(e) => handleListDoubleClick(e, i)}
                  onMouseEnter={() => setHoveredNode(i)} onMouseLeave={() => setHoveredNode(-1)}
                  style={{ padding: '6px 8px', cursor: 'pointer', background: (hoveredNode === i || isSelected) ? 'rgba(255,255,255,0.08)' : 'transparent', border: `1px solid ${isSelected ? 'rgba(255,255,255,0.4)' : hoveredNode === i ? 'rgba(255,255,255,0.2)' : 'transparent'}`, transition: 'all 0.15s ease', flexShrink: 0 }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 11, letterSpacing: '0.06em', color: '#fff' }}>{entry.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {simValues && simValues[i] !== undefined && (() => {
                        const val = simValues[i];
                        const prev = (simValues[i] ?? 100);
                        const isUp = val >= 100;
                        return (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: isUp ? '#00e676' : '#ff5252', letterSpacing: '0.04em' }}>
                            ${val.toFixed(0)}
                          </span>
                        );
                      })()}
                      <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, color: '#444', letterSpacing: '0.08em' }}>{entry.cohort}</span>
                    </div>
                  </div>
                  {entry.tagline && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#666', margin: 0, marginTop: 2 }}>{entry.tagline}</p>}
                </div>
              );
            })}
            {matchingIndices.size === 0 && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444', padding: '12px 0', textAlign: 'center' }}>no results found</p>}
          </div>

          <div className="mt-3 pt-2 flex items-center gap-2" style={{ borderTop: '1px solid #222', flexShrink: 0 }}>
            <a href="https://github.com/DanielWLiu07/CFM" target="_blank" rel="noopener noreferrer"
              className="inline-block no-underline cta-btn"
              style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, letterSpacing: '0.15em', color: '#fff', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', padding: '5px 14px', background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#000'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            >ADD YOUR SITE</a>
          </div>
        </div>

        {!collapsed && !isMobile && (
          <div onMouseDown={handleResizeStart} style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, cursor: 'nwse-resize', zIndex: 10 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" style={{ opacity: 0.3 }}>
              <line x1="14" y1="4" x2="4" y2="14" stroke="#fff" strokeWidth="1" />
              <line x1="14" y1="8" x2="8" y2="14" stroke="#fff" strokeWidth="1" />
              <line x1="14" y1="12" x2="12" y2="14" stroke="#fff" strokeWidth="1" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
