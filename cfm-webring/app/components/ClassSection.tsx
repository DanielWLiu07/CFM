'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const ClassCards3D = dynamic(() => import('./ClassCards3D'), { ssr: false });

interface ClassSectionProps {
  onVisibilityChange: (visible: boolean) => void;
}

interface ClassMember {
  name: string;
  url: string;
  role: string;
  blurb: string;
  school: string;
  term: string;
  avatar?: string;
}

const MEMBERS: ClassMember[] = [
  { name: 'Daniel Liu', url: 'https://danielwliu.com', role: 'SWE', blurb: 'Building things on the web and beyond.', school: 'UWaterloo', term: '1B', avatar: '/images/avatars/daniel.png' },
  { name: 'Timothy Zheng', url: 'https://timothyzheng.ca', role: 'Alumni', blurb: 'Power trading', school: 'UWaterloo', term: '4B', avatar: '/images/avatars/timothyz.png' },
  { name: 'Bob Zhang', url: '#', role: 'Fintech', blurb: 'Exploring the intersection of finance and tech.', school: 'UWaterloo', term: '1B' },
  { name: 'Eve Singh', url: '#', role: 'Distributed Systems', blurb: 'Making systems that scale and don\'t break.', school: 'UWaterloo', term: '1B' },
  { name: 'Alice Chen', url: '#', role: 'Quant Dev', blurb: 'Turning math into money, one model at a time.', school: 'UWaterloo', term: '1A' },
  { name: 'David Park', url: '#', role: 'Systems', blurb: 'Low-level tinkerer. Kernel enthusiast.', school: 'UWaterloo', term: '1A' },
  { name: 'Grace Kim', url: '#', role: 'Data Science', blurb: 'Finding patterns where others see noise.', school: 'UWaterloo', term: '1A' },
  { name: 'Carol Wu', url: '#', role: 'ML', blurb: 'Training models and chasing benchmarks.', school: 'UWaterloo', term: '1A' },
  { name: 'Frank Li', url: '#', role: 'Product', blurb: 'Designing experiences people actually want.', school: 'UWaterloo', term: '1B' },
];

const TERMS = ['ALL', ...Array.from(new Set(MEMBERS.map(m => m.term))).sort()];

export default function ClassSection({ onVisibilityChange }: ClassSectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [selectedTerm, setSelectedTerm] = useState('ALL');
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
      const matchesTerm = selectedTerm === 'ALL' || m.term === selectedTerm;
      const q = search.toLowerCase();
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
      return matchesTerm && matchesSearch;
    });
  }, [selectedTerm, search]);

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

      {/* Term filter */}
      <div className="flex gap-3 mb-10" style={{ zIndex: 20 }}>
        {TERMS.map(term => (
          <button
            key={term}
            onClick={() => setSelectedTerm(term)}
            style={{
              fontFamily: 'var(--font-arcade)',
              fontSize: 13,
              letterSpacing: '0.1em',
              padding: '6px 16px',
              border: selectedTerm === term ? '2px solid #fff' : '2px solid #333',
              background: selectedTerm === term ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: selectedTerm === term ? '#fff' : '#555',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {term}
          </button>
        ))}
      </div>

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
    </section>
  );
}
