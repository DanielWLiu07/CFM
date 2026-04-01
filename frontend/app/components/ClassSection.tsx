'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DEFAULT_CONFIG } from './ClassTitle3D';
import { useMembers } from '../hooks/useMembers';

const ClassCards3D = dynamic(() => import('./ClassCards3D'), { ssr: false });
const ClassTitle3D = dynamic(() => import('./ClassTitle3D'), { ssr: false });
const ClassBackground = dynamic(() => import('./ClassBackground'), { ssr: false });

interface ClassSectionProps {
  onVisibilityChange: (visible: boolean) => void;
  beatRef?: React.RefObject<number>;
}


export default function ClassSection({ onVisibilityChange, beatRef }: ClassSectionProps) {
  const { members: MEMBERS } = useMembers();
  const YEARS = useMemo(() => ['ALL', ...Array.from(new Set(MEMBERS.map(m => m.year))).sort()], [MEMBERS]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
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
    const result = MEMBERS.filter(m => {
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
    if (shuffleSeed > 0) {
      const shuffled = [...result];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(((Math.sin(i * shuffleSeed * 9301 + 49297) % 1) + 1) % 1 * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return result;
  }, [selectedYear, search, shuffleSeed]);

  const hasFilters = selectedYear !== 'ALL' || search !== '';

  return (
    <section
      className="relative min-h-screen pt-0 pb-6 sm:pb-10 px-4 sm:px-6 md:px-12 lg:px-20 flex flex-col items-center"
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
          maskImage: 'radial-gradient(ellipse 50% 50% at center, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at center, black 30%, transparent 100%)',
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
          marginTop: `clamp(${titleConfig.titleGap}px, -10vw, ${titleConfig.titleGap / 3}px)`,
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
              marginTop: -3,
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

        {/* Shuffle */}
        <button
          onClick={() => setShuffleSeed(s => s + 1)}
          title="Shuffle members"
          style={{
            fontFamily: 'var(--font-arcade)',
            fontSize: 'clamp(22px, 2.8vw, 28px)',
            padding: 'clamp(5px, 0.8vw, 8px) clamp(10px, 1.4vw, 14px)',
            border: '3px solid #000',
            background: '#fff',
            color: '#000',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
        >
          ⟳
        </button>

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

      {/* BG Tuner — disabled for production */}
    </section>
  );
}
