'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { DEFAULT_CONFIG } from './ClassTitle3D';
import membersData from '../../data/members.json';
import type { ClassMember } from './class/types';

const ClassCards3D = dynamic(() => import('./ClassCards3D'), { ssr: false });
const ClassTitle3D = dynamic(() => import('./ClassTitle3D'), { ssr: false });
const ClassBackground = dynamic(() => import('./ClassBackground'), { ssr: false });

interface ClassSectionProps {
  onVisibilityChange: (visible: boolean) => void;
  beatRef?: React.RefObject<number>;
}

const MEMBERS: ClassMember[] = membersData as ClassMember[];

const YEARS = ['ALL', ...Array.from(new Set(MEMBERS.map(m => m.year))).sort()];


export default function ClassSection({ onVisibilityChange, beatRef }: ClassSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleWrapRef = useRef<HTMLDivElement>(null);
  const titleBgRef = useRef<HTMLImageElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [dropdownOpen]);

  const [bgScale, setBgScale] = useState(DEFAULT_CONFIG.bgScale);
  const [bgOpacity, setBgOpacity] = useState(DEFAULT_CONFIG.bgOpacity);
  const [bgX, setBgX] = useState(DEFAULT_CONFIG.bgX);
  const [bgY, setBgY] = useState(DEFAULT_CONFIG.bgY);
  const [bgMaxW, setBgMaxW] = useState(DEFAULT_CONFIG.bgMaxW);
  const [titleY, setTitleY] = useState(DEFAULT_CONFIG.titleY);
  const [searchY, setSearchY] = useState(DEFAULT_CONFIG.searchY);
  const [showTuner, setShowTuner] = useState(false);
  const [tunerPos, setTunerPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const titleConfig = { ...DEFAULT_CONFIG, bgScale, bgOpacity, bgX, bgY, bgMaxW, titleY, searchY };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { setSectionVisible(entry.isIntersecting); onVisibilityChange(entry.isIntersecting); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

  // Position title_bg to track the title wrapper center
  useEffect(() => {
    const update = () => {
      const wrap = titleWrapRef.current;
      const bg = titleBgRef.current;
      const section = wrap?.closest('section');
      if (!wrap || !bg || !section) return;
      const wrapRect = wrap.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      const centerX = wrapRect.left + wrapRect.width / 2 - sectionRect.left + bgX;
      const centerY = wrapRect.top + wrapRect.height / 2 - sectionRect.top + bgY;
      const w = Math.min(wrapRect.width * bgScale / 100, bgMaxW);
      bg.style.width = `${w}px`;
      bg.style.height = 'auto';
      bg.style.left = `${centerX}px`;
      bg.style.top = `${centerY}px`;
      bg.style.transform = 'translate(-50%, -50%)';
      bg.style.opacity = String(bgOpacity);
    };
    update();
    window.addEventListener('resize', update);
    // Also update on scroll in case of layout shifts
    window.addEventListener('scroll', update, { passive: true });
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update); };
  }, [bgX, bgY, bgScale, bgMaxW, bgOpacity, titleY]);

  const filtered = useMemo(() => {
    return MEMBERS.filter(m => {
      const matchesYear = selectedYear === 'ALL' || m.year === selectedYear;
      const q = search.toLowerCase();
      const matchesSearch = !q
        || m.name.toLowerCase().includes(q)
        || m.role.toLowerCase().includes(q)
        || m.location.toLowerCase().includes(q)
        || m.school.toLowerCase().includes(q)
        || m.blurb.toLowerCase().includes(q);
      return matchesYear && matchesSearch;
    });
  }, [selectedYear, search]);

  const hasFilters = selectedYear !== 'ALL' || search !== '';

  return (
    <section
      className="relative min-h-screen py-6 sm:py-10 px-4 sm:px-6 md:px-12 lg:px-20 flex flex-col items-center"
      style={{ backgroundColor: 'transparent', transformStyle: 'flat' as const }}
    >
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-24" />

      {/* Three.js background decoration */}
      <ClassBackground beatRef={beatRef} paused={!sectionVisible} />

      {/* Title bg glow — between ClassBackground (z:0) and title (z:70) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/title_bg.webp"
        alt="" decoding="async"
        className="pointer-events-none select-none absolute"
        id="class-title-bg"
        ref={titleBgRef}
        style={{
          zIndex: 1,
          mixBlendMode: 'screen',
        }}
      />

      {/* ── Title — full 3D "CLASS OF 26" ── */}
      <div
        ref={titleWrapRef}
        style={{
          position: 'relative',
          zIndex: 70,
          marginBottom: 0,
          width: '100%',
          transform: `translateY(${titleConfig.titleY}px)`,
        }}
      >
        <ClassTitle3D year={selectedYear === 'ALL' ? 'CFM' : selectedYear} config={titleConfig} beatRef={beatRef} />
      </div>

      {/* ── Filter bar ── */}
      <div
        className="class-filter-bar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(4px, 0.8vw, 8px)',
          zIndex: 200,
          width: '100%',
          maxWidth: 600,
          marginTop: `clamp(${titleConfig.titleGap}px, -8vw, -20px)`,
          transform: `translateY(${titleConfig.searchY}px)`,
          marginBottom: 'clamp(8px, 1.2vw, 14px)',
          position: 'relative',
          pointerEvents: 'auto',
        }}
      >
        {/* Custom year dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              fontFamily: 'var(--font-arcade)',
              fontSize: 'clamp(15px, 1.8vw, 18px)',
              letterSpacing: '0.1em',
              padding: 'clamp(8px, 1.2vw, 11px) clamp(28px, 3.4vw, 38px) clamp(8px, 1.2vw, 11px) clamp(12px, 1.6vw, 18px)',
              border: '3px solid #000',
              background: '#fff',
              color: '#000',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              position: 'relative',
            }}
          >
            {selectedYear === 'ALL' ? 'ALL' : `'${selectedYear}`}
            <span style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: `translateY(-50%) rotate(${dropdownOpen ? '180deg' : '0deg'})`,
              fontSize: 8,
              color: '#000',
              lineHeight: 1,
            }}>▼</span>
          </button>
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 2,
              background: '#fff',
              border: '3px solid #000',
              zIndex: 9999,
              minWidth: '100%',
            }}>
              {['ALL', ...YEARS.filter(y => y !== 'ALL')].map(y => (
                <button
                  key={y}
                  onClick={() => { setSelectedYear(y); setDropdownOpen(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'var(--font-arcade)',
                    fontSize: 'clamp(15px, 1.8vw, 18px)',
                    letterSpacing: '0.1em',
                    padding: '8px 14px',
                    border: 'none',
                    background: selectedYear === y ? '#000' : '#fff',
                    color: selectedYear === y ? '#fff' : '#000',
                    cursor: 'pointer',
                    borderBottom: '1px solid #ddd',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selectedYear === y ? '#000' : '#fff'; e.currentTarget.style.color = selectedYear === y ? '#fff' : '#000'; }}
                >
                  {y === 'ALL' ? 'ALL' : `'${y}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: '3px solid #000',
            background: '#fff',
            padding: 'clamp(7px, 1vw, 10px) clamp(10px, 1.4vw, 14px)',
            gap: 8,
            flex: '1 1 180px',
            minWidth: 150,
          }}
        >
          <span style={{ color: '#000', fontSize: 15, fontFamily: 'var(--font-arcade)', flexShrink: 0 }}>&gt;</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="SEARCH..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-arcade)',
              fontSize: 'clamp(15px, 1.8vw, 18px)',
              letterSpacing: '0.1em',
              color: '#000',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              minWidth: 0,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontFamily: 'var(--font-arcade)',
                fontSize: 15,
                padding: 0,
                lineHeight: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#000'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#999'; }}
            >
              X
            </button>
          )}
        </div>

        {/* Clear all */}
        {hasFilters && (
          <button
            onClick={() => { setSelectedYear('ALL'); setSearch(''); }}
            style={{
              fontFamily: 'var(--font-arcade)',
              fontSize: 'clamp(14px, 1.6vw, 16px)',
              letterSpacing: '0.1em',
              padding: 'clamp(8px, 1.2vw, 11px) clamp(12px, 1.6vw, 16px)',
              border: '3px solid #000',
              background: '#000',
              color: '#fff',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Result count */}
      {hasFilters && (
        <p
          style={{
            fontFamily: 'var(--font-arcade)',
            fontSize: 'clamp(14px, 1.6vw, 16px)',
            color: '#444',
            letterSpacing: '0.12em',
            zIndex: 20,
            marginTop: -6,
            marginBottom: 'clamp(4px, 0.8vw, 10px)',
          }}
        >
          {filtered.length} {filtered.length === 1 ? 'MEMBER' : 'MEMBERS'}
        </p>
      )}

      {/* 3D Card grid */}
      <ClassCards3D members={filtered} />

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          style={{
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            marginTop: 'clamp(40px, 8vw, 80px)',
            marginBottom: 'clamp(40px, 8vw, 80px)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-arcade)',
              fontSize: 'clamp(28px, 4vw, 48px)',
              color: '#000',
              WebkitTextStroke: '1.5px #fff',
              paintOrder: 'stroke fill',
              letterSpacing: '0.12em',
              margin: 0,
              textAlign: 'center',
            }}
          >
            NO MEMBERS FOUND
          </p>
          <p
            style={{
              fontFamily: 'var(--font-arcade)',
              fontSize: 'clamp(10px, 1.4vw, 14px)',
              color: '#666',
              letterSpacing: '0.15em',
              margin: 0,
            }}
          >
            TRY A DIFFERENT SEARCH
          </p>
        </div>
      )}

      {/* BG Tuner */}
      <button
        onClick={() => setShowTuner(t => !t)}
        style={{
          position: 'fixed', bottom: 10, right: 10, zIndex: 99999,
          background: '#000', color: '#fff', border: '2px solid #fff',
          fontFamily: 'var(--font-arcade)', fontSize: 12, padding: '6px 12px', cursor: 'pointer',
        }}
      >
        {showTuner ? 'HIDE' : 'TUNE BG'}
      </button>
      {showTuner && (
        <div
          style={{
            position: 'fixed', bottom: 50 - tunerPos.y, right: 10 - tunerPos.x, zIndex: 99999,
            background: 'rgba(0,0,0,0.9)', border: '2px solid #fff', padding: 0,
            fontFamily: 'var(--font-arcade)', fontSize: 11, color: '#fff',
            display: 'flex', flexDirection: 'column', minWidth: 220,
          }}
        >
          {/* Drag handle */}
          <div
            style={{
              padding: '6px 12px', cursor: 'grab', borderBottom: '1px solid #555',
              userSelect: 'none', background: 'rgba(255,255,255,0.1)', fontSize: 10,
              letterSpacing: '0.15em',
            }}
            onMouseDown={e => {
              e.preventDefault();
              dragRef.current = { startX: e.clientX, startY: e.clientY, originX: tunerPos.x, originY: tunerPos.y };
              const onMove = (ev: MouseEvent) => {
                if (!dragRef.current) return;
                setTunerPos({
                  x: dragRef.current.originX + (ev.clientX - dragRef.current.startX),
                  y: dragRef.current.originY + (ev.clientY - dragRef.current.startY),
                });
              };
              const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            ≡ DRAG TO MOVE
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label>BG X: {bgX}px<input type="range" min={-200} max={200} value={bgX} onChange={e => setBgX(+e.target.value)} style={{ width: '100%' }} /></label>
            <label>BG Y: {bgY}px<input type="range" min={-200} max={200} value={bgY} onChange={e => setBgY(+e.target.value)} style={{ width: '100%' }} /></label>
            <label>BG Scale: {bgScale}%<input type="range" min={30} max={200} value={bgScale} onChange={e => setBgScale(+e.target.value)} style={{ width: '100%' }} /></label>
            <label>BG MaxW: {bgMaxW}px<input type="range" min={400} max={1600} value={bgMaxW} onChange={e => setBgMaxW(+e.target.value)} style={{ width: '100%' }} /></label>
            <label>BG Opacity: {bgOpacity}<input type="range" min={0} max={100} value={bgOpacity * 100} onChange={e => setBgOpacity(+e.target.value / 100)} style={{ width: '100%' }} /></label>
            <label>Title Y: {titleY}px<input type="range" min={-200} max={200} value={titleY} onChange={e => setTitleY(+e.target.value)} style={{ width: '100%' }} /></label>
            <p style={{ fontSize: 9, color: '#888', margin: 0 }}>Copy values to DEFAULT_CONFIG when done</p>
          </div>
        </div>
      )}
    </section>
  );
}
