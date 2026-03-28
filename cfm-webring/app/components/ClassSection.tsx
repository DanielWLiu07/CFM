'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { DEFAULT_CONFIG } from './ClassTitle3D';

const ClassCards3D = dynamic(() => import('./ClassCards3D'), { ssr: false });
const ClassTitle3D = dynamic(() => import('./ClassTitle3D'), { ssr: false });

interface ClassSectionProps {
  onVisibilityChange: (visible: boolean) => void;
}

interface Social {
  type: 'github' | 'linkedin' | 'twitter' | 'website';
  url: string;
}

interface ClassMember {
  name: string;
  url: string;
  role: string;
  location: string;
  school: string;
  blurb: string;
  year: string;
  avatar?: string;
  socials?: Social[];
}

const MEMBERS: ClassMember[] = [
  { name: 'Daniel Liu', url: 'https://danielwliu.com', role: 'Software Engineer', location: 'Windsor, ON', school: 'Massey Secondary', blurb: 'Full-stack dev. Loves React, Three.js, and making pixels dance.', year: '26', avatar: '/images/avatars/daniel.png', socials: [{ type: 'github', url: 'https://github.com/DanielWLiu07' }, { type: 'linkedin', url: 'https://linkedin.com/in/danielwliu' }, { type: 'website', url: 'https://danielwliu.com' }] },
  { name: 'Timothy Zheng', url: 'https://timothyzheng.ca', role: 'Alumni', location: 'Waterloo, ON', school: 'UWaterloo', blurb: 'Power trading.', year: '26', avatar: '/images/avatars/timothyz.png' },
  { name: 'Aadya Khanna', url: '#', role: 'Backend Engineer', location: 'Waterloo, ON', school: 'Cameron Heights CI', blurb: 'API whisperer. Flask, FastAPI, and too many databases.', year: '26', avatar: '/images/avatars/aadya.svg', socials: [{ type: 'github', url: '#' }, { type: 'linkedin', url: '#' }] },
  { name: 'Marcus Chen', url: '#', role: 'Quant Developer', location: 'Vancouver, BC', school: 'Point Grey SS', blurb: 'Turning market noise into signal. Python + C++ daily.', year: '26', avatar: '/images/avatars/marcus.svg', socials: [{ type: 'github', url: '#' }, { type: 'twitter', url: '#' }] },
  { name: 'Priya Sharma', url: '#', role: 'ML Engineer', location: 'Mississauga, ON', school: 'John Fraser SS', blurb: 'Training transformers and fine-tuning everything in sight.', year: '25', avatar: '/images/avatars/priya.svg', socials: [{ type: 'github', url: '#' }, { type: 'linkedin', url: '#' }, { type: 'website', url: '#' }] },
  { name: 'Jordan Park', url: '#', role: 'Systems Engineer', location: 'Calgary, AB', school: 'Western Canada HS', blurb: 'Low-level tinkerer. Rust, kernels, and bare metal.', year: '25', avatar: '/images/avatars/jordan.svg', socials: [{ type: 'github', url: '#' }] },
  { name: 'Sophie Wang', url: '#', role: 'Data Scientist', location: 'Toronto, ON', school: 'Marc Garneau CI', blurb: 'Finding patterns where others see noise. Stats + viz.', year: '25', avatar: '/images/avatars/sophie.svg', socials: [{ type: 'linkedin', url: '#' }, { type: 'twitter', url: '#' }] },
  { name: 'Ethan Zhao', url: '#', role: 'Product Designer', location: 'Ottawa, ON', school: 'Colonel By SS', blurb: 'Designing interfaces people actually want to use.', year: '25', avatar: '/images/avatars/ethan.svg', socials: [{ type: 'github', url: '#' }, { type: 'website', url: '#' }] },
  { name: 'Nina Patel', url: '#', role: 'DevOps / Infra', location: 'Brampton, ON', school: 'Heart Lake SS', blurb: 'Terraform, K8s, CI/CD. If it deploys, it\'s her fault.', year: '26', avatar: '/images/avatars/nina.svg', socials: [{ type: 'github', url: '#' }, { type: 'linkedin', url: '#' }] },
];

const YEARS = ['ALL', ...Array.from(new Set(MEMBERS.map(m => m.year))).sort()];


export default function ClassSection({ onVisibilityChange }: ClassSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [dropdownOpen]);
  // Animate title_bg in sync with 3D text swap
  const prevYearRef = useRef(selectedYear);
  useEffect(() => {
    if (prevYearRef.current === selectedYear) return;
    prevYearRef.current = selectedYear;
    const bg = document.getElementById('class-title-bg') as HTMLElement | null;
    if (!bg) return;
    // Exit: scale down + fade out
    bg.style.transition = 'opacity 0.35s ease-in, transform 0.35s ease-in';
    bg.style.opacity = '0';
    bg.style.transform = 'translate(-50%, -50%) scale(0.85)';
    // Enter: scale up + fade in (timed to match 3D letter enter phase)
    const timer = setTimeout(() => {
      bg.style.transition = 'opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.16,1,0.3,1)';
      bg.style.opacity = String(DEFAULT_CONFIG.bgOpacity);
      bg.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedYear]);

  const [bgScale, setBgScale] = useState(DEFAULT_CONFIG.bgScale);
  const [bgOpacity, setBgOpacity] = useState(DEFAULT_CONFIG.bgOpacity);
  const [bgY, setBgY] = useState(DEFAULT_CONFIG.bgY);
  const [titleY, setTitleY] = useState(DEFAULT_CONFIG.titleY);
  const [searchY, setSearchY] = useState(DEFAULT_CONFIG.searchY);
  const titleConfig = { ...DEFAULT_CONFIG, bgScale, bgOpacity, bgY, titleY, searchY };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => onVisibilityChange(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

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
      style={{ backgroundColor: 'transparent' }}
    >
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-24" />

      {/* ── Title — full 3D "CLASS OF 26" ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 70,
          marginBottom: 0,
          width: '100%',
          transform: `translateY(${titleConfig.titleY}px)`,
        }}
      >
        <ClassTitle3D year={selectedYear === 'ALL' ? 'CFM' : selectedYear} config={titleConfig} />
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
          marginTop: titleConfig.titleGap,
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
        <p
          style={{
            fontFamily: 'var(--font-arcade)',
            fontSize: 13,
            color: '#555',
            letterSpacing: '0.1em',
            zIndex: 20,
          }}
        >
          NO  MEMBERS  FOUND
        </p>
      )}

      {/* Dev-only BG tuner — draggable */}
      {process.env.NODE_ENV === 'development' && (
        <div
          ref={(el) => {
            if (!el || el.dataset.dragInit) return;
            el.dataset.dragInit = '1';
            let dragging = false, ox = 0, oy = 0;
            const handle = el.querySelector('[data-drag-handle]') as HTMLElement;
            (handle || el).addEventListener('mousedown', (e: MouseEvent) => {
              if ((e.target as HTMLElement).tagName === 'INPUT') return;
              dragging = true;
              ox = e.clientX - el.offsetLeft;
              oy = e.clientY - el.offsetTop;
              e.preventDefault();
            });
            document.addEventListener('mousemove', (e: MouseEvent) => {
              if (!dragging) return;
              el.style.left = `${e.clientX - ox}px`;
              el.style.top = `${e.clientY - oy}px`;
              el.style.bottom = 'auto';
            });
            document.addEventListener('mouseup', () => { dragging = false; });
          }}
          style={{
            position: 'fixed',
            bottom: 12,
            left: 12,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid #333',
            padding: '10px 14px',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#aaa',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderRadius: 4,
            cursor: 'grab',
          }}
        >
          <span data-drag-handle="" style={{ color: '#666', fontSize: 10, letterSpacing: '0.1em', cursor: 'grab' }}>TITLE BG ⠿</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            SCALE
            <input
              type="range" min={20} max={300} step={5} value={bgScale}
              onChange={e => {
                const v = Number(e.target.value);
                setBgScale(v);
                const el = document.getElementById('class-title-bg') as HTMLElement | null;
                if (el) el.style.width = `${v}%`;
              }}
              style={{ width: 100 }}
            />
            <span style={{ color: '#fff', minWidth: 36 }}>{bgScale}%</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            OPACITY
            <input
              type="range" min={0} max={100} step={1} value={Math.round(bgOpacity * 100)}
              onChange={e => {
                const v = Number(e.target.value) / 100;
                setBgOpacity(v);
                const el = document.getElementById('class-title-bg') as HTMLElement | null;
                if (el) el.style.opacity = String(v);
              }}
              style={{ width: 100 }}
            />
            <span style={{ color: '#fff', minWidth: 36 }}>{(bgOpacity * 100).toFixed(0)}%</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Y
            <input
              type="range" min={-200} max={500} step={5} value={bgY}
              onChange={e => {
                const v = Number(e.target.value);
                setBgY(v);
                const el = document.getElementById('class-title-bg') as HTMLElement | null;
                if (el) el.style.top = `${v}px`;
              }}
              style={{ width: 100 }}
            />
            <span style={{ color: '#fff', minWidth: 36 }}>{bgY}px</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            TITLE Y
            <input
              type="range" min={-200} max={200} step={5} value={titleY}
              onChange={e => setTitleY(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <span style={{ color: '#fff', minWidth: 36 }}>{titleY}px</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            SEARCH Y
            <input
              type="range" min={-200} max={200} step={5} value={searchY}
              onChange={e => setSearchY(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <span style={{ color: '#fff', minWidth: 36 }}>{searchY}px</span>
          </label>
        </div>
      )}
    </section>
  );
}
