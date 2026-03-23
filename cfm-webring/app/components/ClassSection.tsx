'use client';

import { useRef, useEffect, useState, useMemo } from 'react';

interface ClassSectionProps {
  onVisibilityChange: (visible: boolean) => void;
}

interface ClassMember {
  name: string;
  url: string;
  role: string;
  year: string;
}

const MEMBERS: ClassMember[] = [
  { name: 'Daniel Liu', url: 'https://danielwliu.com', role: 'SWE', year: '2029' },
  { name: 'Bob Zhang', url: '#', role: 'Fintech', year: '2029' },
  { name: 'Eve Singh', url: '#', role: 'Distributed Systems', year: '2029' },
  { name: 'Alice Chen', url: '#', role: 'Quant Dev', year: '2028' },
  { name: 'David Park', url: '#', role: 'Systems', year: '2028' },
  { name: 'Grace Kim', url: '#', role: 'Data Science', year: '2028' },
  { name: 'Carol Wu', url: '#', role: 'ML', year: '2027' },
  { name: 'Frank Li', url: '#', role: 'Product', year: '2027' },
];

const YEARS = ['ALL', ...Array.from(new Set(MEMBERS.map(m => m.year))).sort((a, b) => b.localeCompare(a))];

export default function ClassSection({ onVisibilityChange }: ClassSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [search, setSearch] = useState('');

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
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
      return matchesYear && matchesSearch;
    });
  }, [selectedYear, search]);

  return (
    <section
      className="relative min-h-screen py-24 px-6 md:px-12 lg:px-20 flex flex-col items-center"
      style={{ backgroundColor: 'transparent' }}
    >
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-24" />

      {/* Title */}
      <h2
        style={{
          fontFamily: 'var(--font-arcade)',
          fontSize: 48,
          letterSpacing: '0.15em',
          color: '#fff',
          textShadow: '2px 4px 0 #111, 4px 8px 0 #000',
          marginBottom: 32,
          zIndex: 20,
        }}
      >
        CLASS
      </h2>

      {/* Search bar */}
      <div style={{ zIndex: 20, width: '100%', maxWidth: 600, marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH  MEMBERS..."
            style={{
              width: '100%',
              padding: '10px 16px',
              fontFamily: 'var(--font-arcade)',
              fontSize: 12,
              letterSpacing: '0.1em',
              color: '#fff',
              background: '#0a0a0a',
              border: '2px solid #333',
              outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#fff'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#333'; }}
          />
        </div>
      </div>

      {/* Year filter */}
      <div className="flex gap-3 mb-10" style={{ zIndex: 20 }}>
        {YEARS.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            style={{
              fontFamily: 'var(--font-arcade)',
              fontSize: 13,
              letterSpacing: '0.1em',
              padding: '6px 16px',
              border: selectedYear === year ? '2px solid #fff' : '2px solid #333',
              background: selectedYear === year ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: selectedYear === year ? '#fff' : '#555',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Member cards grid */}
      <div
        className="grid gap-4 w-full"
        style={{
          maxWidth: 1000,
          zIndex: 20,
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        }}
      >
        {filtered.map((member, i) => (
          <a
            key={`${member.name}-${member.year}`}
            href={member.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block no-underline"
            style={{
              border: '2px solid #222',
              background: '#0a0a0a',
              position: 'relative',
              overflow: 'hidden',
              padding: '16px 20px',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#222';
              e.currentTarget.style.background = '#0a0a0a';
            }}
          >
            {/* Scanline */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
              }}
            />

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'inline-block',
                    boxShadow: '0 0 6px rgba(255,255,255,0.4)',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-arcade)',
                    fontSize: 14,
                    letterSpacing: '0.06em',
                    color: '#fff',
                  }}
                >
                  {member.name}
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-arcade)',
                  fontSize: 9,
                  color: '#444',
                  letterSpacing: '0.1em',
                }}
              >
                {member.year}
              </span>
            </div>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: '#666',
              }}
            >
              {member.role}
            </span>
          </a>
        ))}
      </div>

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
    </section>
  );
}
