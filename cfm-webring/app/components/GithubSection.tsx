'use client';

import { useRef, useEffect } from 'react';

const FRONTEND_REPO = 'https://github.com/DanielWLiu07/CFM';
const BACKEND_REPO = 'https://github.com/AadyaCFM/CFM-backend';

const TECH_STACK = {
  frontend: [
    'Next.js 16',
    'React 19',
    'TypeScript',
    'Tailwind CSS 4',
    'Three.js / R3F',
  ],
  backend: [
    'Vercel Edge',
    'Node.js',
  ],
  tools: [
    'Turbopack',
    'ESLint',
    'Blender',
    'Claude Code',
  ],
};

export default function GithubSection({ onVisibilityChange }: { onVisibilityChange?: (visible: boolean) => void }) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onVisibilityChange || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => onVisibilityChange(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

  return (
    <section className="relative flex flex-col items-center justify-center py-20 px-6" style={{ background: '#000' }}>
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-24" />

      {/* Terminal box */}
      <div style={{
        width: '100%',
        maxWidth: 700,
        border: '2px solid #333',
        background: 'rgba(0,0,0,0.9)',
        boxShadow: '3px 3px 0 #000, 0 0 40px rgba(255,255,255,0.03)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
          zIndex: 1,
        }} />

        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid #222', background: '#0a0a0a' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
          <span style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, letterSpacing: '0.1em', color: '#fff' }}>SOURCE CODE</span>
          <span style={{ display: 'inline-block', width: 7, height: 12, background: '#fff', animation: 'terminal-cursor-blink 1s step-end infinite' }} />
        </div>

        {/* Content */}
        <div className="relative p-6" style={{ zIndex: 2 }}>
          {/* Prompt line */}
          <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 20, letterSpacing: '0.08em' }}>
            {'>'} cat tech_stack.txt
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Frontend */}
            <div>
              <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, color: '#fff', letterSpacing: '0.1em', marginBottom: 12 }}>
                FRONTEND
              </div>
              {TECH_STACK.frontend.map((item) => (
                <div key={item} style={{ fontFamily: 'var(--font-arcade)', fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.05em' }}>
                  {'> '}{item}
                </div>
              ))}
            </div>

            {/* Backend */}
            <div>
              <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, color: '#fff', letterSpacing: '0.1em', marginBottom: 12 }}>
                BACKEND
              </div>
              {TECH_STACK.backend.map((item) => (
                <div key={item} style={{ fontFamily: 'var(--font-arcade)', fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.05em' }}>
                  {'> '}{item}
                </div>
              ))}
            </div>

            {/* Tools */}
            <div>
              <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 12, color: '#fff', letterSpacing: '0.1em', marginBottom: 12 }}>
                TOOLS
              </div>
              {TECH_STACK.tools.map((item) => (
                <div key={item} style={{ fontFamily: 'var(--font-arcade)', fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 6, letterSpacing: '0.05em' }}>
                  {'> '}{item}
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #222', margin: '24px 0' }} />

          {/* Repo links — two separate repos */}
          <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 16 }}>
            {'>'} ls repos/
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={FRONTEND_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-btn flex-1"
              style={{
                fontFamily: 'var(--font-arcade)',
                fontSize: 10,
                letterSpacing: '0.1em',
                color: '#fff',
                border: '1px solid #444',
                padding: '10px 16px',
                background: 'transparent',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 11 }}>FRONTEND</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>Daniel Liu</span>
            </a>
            <a
              href={BACKEND_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-btn flex-1"
              style={{
                fontFamily: 'var(--font-arcade)',
                fontSize: 10,
                letterSpacing: '0.1em',
                color: '#fff',
                border: '1px solid #444',
                padding: '10px 16px',
                background: 'transparent',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 11 }}>BACKEND</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>Aadya</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ fontFamily: 'var(--font-arcade)', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 32, letterSpacing: '0.1em', textAlign: 'center' }}>
        BUILT BY CFM STUDENTS  //  2026
      </div>
    </section>
  );
}
